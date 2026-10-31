// Alpet — ilçe bazında pompa fiyatları. İl seçilerek açılan sayfa (81 istek, aralarında kısa bekleme):
//   GET https://www.alpet.com.tr/tr-TR/akaryakit-fiyatlari?dt=YYYY-MM-DD&city=ANKARA
//   <table class="... prices"> başlık: [il, ilçe, Motorin, Motorin Performans +, 95 Oktan Kurşunsuz, Fuel Oil 4, ...]
//   satır: <td><b>ANKARA</b></td><td><b>AKYURT</b></td><td>97,90 TL/LT</td>...
// Alpet otogaz (LPG) satmıyor.
import { getirMetin, ilKayitlari, ilPlakalari, sadelestir, sayi, bekle } from './ortak.js';

export const DAGITICI = 'alpet';
const ADRES = 'https://www.alpet.com.tr/tr-TR/akaryakit-fiyatlari';
const temiz = (s) => s.replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).trim();

export function sehirler(html) {
  const secim = html.match(/<select name="city"[\s\S]*?<\/select>/)?.[0] ?? '';
  return [...secim.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]).filter(Boolean);
}

/** Bir il sayfasının tablosundan ilçe satırları */
export function tabloCoz(html) {
  const tablo = html.match(/<table[^>]*prices[\s\S]*?<\/table>/)?.[0];
  if (!tablo) return [];
  const basliklar = [...(tablo.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? '').matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => sadelestir(temiz(m[1])));
  const iMotorin = basliklar.findIndex((b) => b === 'MOTORIN');
  const iBenzin = basliklar.findIndex((b) => b.includes('KURSUNSUZ'));
  const satirlar = [];
  for (const tr of (tablo.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? '').split(/<tr[^>]*>/).slice(1)) {
    const h = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => temiz(m[1]));
    if (h.length < 3) continue;
    satirlar.push({ il: h[0], ilce: h[1], benzin: sayi(h[iBenzin]), motorin: sayi(h[iMotorin]), lpg: null });
  }
  return satirlar;
}

export async function cek() {
  const tarih = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
  const plaka = await ilPlakalari();
  const ilk = await getirMetin(ADRES);
  const liste = [];
  for (const sehir of sehirler(ilk)) {
    const il_id = plaka.get(sadelestir(sehir));
    if (!il_id) { console.warn(`[${DAGITICI}] il eşleşmedi: ${sehir}`); continue; }
    try {
      const satirlar = tabloCoz(await getirMetin(`${ADRES}?dt=${tarih}&city=${encodeURIComponent(sehir)}`));
      if (satirlar.length) liste.push(...ilKayitlari(il_id, satirlar));
    } catch (e) {
      console.error(`[alpet] ${sehir}:`, e.message);
    }
    await bekle(300);
  }
  return { tarih, liste: liste.filter((s) => s.benzin || s.motorin) };
}
