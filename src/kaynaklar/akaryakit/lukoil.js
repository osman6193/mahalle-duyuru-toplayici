// Lukoil — ilçe bazında benzin/motorin (il başına bir sayfa) + il bazında LPG (tek sayfa):
//   https://www.lukoil.com.tr/akaryakit-fiyatlari?priceType=pompa&cityName=ANKARA
//     <table class="fuel_prices_table"> İLÇE | K.Benzin 95 Oktan | Ecto Motorin | Motorin | ...
//     <td>AKYURT</td><td><span class="fuel_price_value">77.30</span></td>...
//   https://www.lukoil.com.tr/akaryakit-fiyatlari?priceType=lpg
//     ŞEHİR | FİYAT  -> <td>ADANA</td><td><span class="fuel_price_value">42.98</span></td>
// İl adları seçim kutusunda sadeleştirilmiş gelir (AFYON, K.MARAS); başlıklar &#x130; gibi kodlu.
import { getirMetin, ilKayitlari, ilPlakalari, sadelestir, sayi, bekle } from './ortak.js';

export const DAGITICI = 'lukoil';
const ADRES = 'https://www.lukoil.com.tr/akaryakit-fiyatlari';

const coz16 = (s) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
const temiz = (s) => coz16(s.replace(/<[^>]+>/g, '')).trim();

function tablo(html) {
  const t = coz16(html).match(/<table class="fuel_prices_table"[\s\S]*?<\/table>/)?.[0];
  if (!t) return null;
  const basliklar = [...t.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => sadelestir(temiz(m[1])));
  const satirlar = (t.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? '')
    .split(/<tr[^>]*>/)
    .slice(1)
    .map((tr) => [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => temiz(m[1])))
    .filter((h) => h.length >= 2);
  return { basliklar, satirlar };
}

export function sehirler(html) {
  const secim = html.match(/<select[^>]*id="cityName"[\s\S]*?<\/select>/)?.[0] ?? html;
  return [...new Set([...secim.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]).filter(Boolean))];
}

export function ilTablosu(html) {
  const t = tablo(html);
  if (!t) return [];
  const iBenzin = t.basliklar.findIndex((b) => b.includes('BENZIN'));
  const iMotorin = t.basliklar.findIndex((b) => b.startsWith('MOTORIN'));
  return t.satirlar.map((h) => ({ ilce: h[0], benzin: sayi(h[iBenzin]), motorin: sayi(h[iMotorin]), lpg: null }));
}

/** LPG sayfası: sadeleştirilmiş il adı -> fiyat */
export function lpgTablosu(html) {
  const t = tablo(html);
  return new Map((t?.satirlar ?? []).map((h) => [sadelestir(h[0]), sayi(h[1])]));
}

export async function cek() {
  const plaka = await ilPlakalari();
  const ilk = await getirMetin(ADRES);
  let lpg = new Map();
  try {
    lpg = lpgTablosu(await getirMetin(`${ADRES}?priceType=lpg`));
  } catch (e) {
    console.error('[lukoil] LPG:', e.message);
  }
  const liste = [];
  for (const sehir of sehirler(ilk)) {
    const ad = sadelestir(sehir);
    const il_id = plaka.get(ad);
    if (!il_id) { console.warn(`[${DAGITICI}] il eşleşmedi: ${sehir}`); continue; }
    try {
      const satirlar = ilTablosu(await getirMetin(`${ADRES}?priceType=pompa&cityName=${encodeURIComponent(sehir)}`));
      const ilLpg = (yaka) =>
        lpg.get(yaka ? `${ad} ${yaka.toUpperCase()}` : ad) ?? lpg.get(ad) ??
        [...lpg.entries()].find(([k]) => plaka.get(k) === il_id)?.[1] ?? null;
      for (const k of ilKayitlari(il_id, satirlar)) liste.push({ ...k, lpg: ilLpg(k.bolge) });
    } catch (e) {
      console.error(`[lukoil] ${sehir}:`, e.message);
    }
    await bekle(300);
  }
  return { tarih: null, liste: liste.filter((s) => s.benzin || s.motorin || s.lpg) };
}
