// TP (Türkiye Petrolleri) — ilçe bazında pompa fiyatları, her il ayrı sayfa:
//   ana sayfa: https://www.tppd.com.tr/akaryakit-fiyatlari  -> <a href="/ankara-akaryakit-fiyatlari">ANKARA GÜNCEL ...</a>
//   il sayfası tablo başlığı: İLÇE | KURŞUNSUZ BENZİN | GAZ YAĞI | MOTORİN | MOTORİN | ... | GAZ
//   hücreler: <td data-title="KURŞUNSUZ BENZİN (TL/LT)" class="numeric">77,19</td>  ("-" = satılmıyor)
import { getirMetin, ilKayitlari, ilPlakalari, sadelestir, sayi, bekle } from './ortak.js';

export const DAGITICI = 'tp';
const KOK = 'https://www.tppd.com.tr';
const temiz = (s) => s.replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).trim();

/** Ana sayfadan [{ad, yol}] il bağlantıları */
export function ilBaglantilari(ham) {
  // Ham sayfada Türkçe harfler &#220; gibi kodlu gelebiliyor
  const html = ham.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
  const gorulen = new Set();
  const sonuc = [];
  for (const m of html.matchAll(/<a href="(\/[a-z0-9-]+-akaryakit-fiyatlari)"[^>]*>\s*([^<]+?)\s+G[ÜU]NCEL/gi)) {
    if (gorulen.has(m[1])) continue;
    gorulen.add(m[1]);
    sonuc.push({ yol: m[1], ad: temiz(m[2]) });
  }
  return sonuc;
}

export function tabloCoz(ham) {
  const html = ham.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
  const tablo = html.match(/<table[\s\S]*?<\/table>/)?.[0];
  if (!tablo) return [];
  const satirlar = [];
  for (const tr of (tablo.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? '').split(/<tr[^>]*>/).slice(1)) {
    const hucre = (baslik) => {
      const m = tr.match(new RegExp(`data-title="${baslik}[^"]*"[^>]*>([\\s\\S]*?)</td>`));
      return m ? temiz(m[1]) : null;
    };
    const ilce = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/)?.[1];
    if (!ilce) continue;
    satirlar.push({
      ilce: temiz(ilce),
      benzin: sayi(hucre('KURŞUNSUZ BENZİN')),
      motorin: sayi(hucre('MOTORİN')),
      lpg: sayi(tr.match(/data-title="GAZ"[^>]*>([\s\S]*?)<\/td>/)?.[1]),
    });
  }
  return satirlar;
}

export async function cek() {
  const plaka = await ilPlakalari();
  const liste = [];
  for (const { ad, yol } of ilBaglantilari(await getirMetin(`${KOK}/akaryakit-fiyatlari`))) {
    const il_id = plaka.get(sadelestir(ad));
    if (!il_id) { console.warn(`[${DAGITICI}] il eşleşmedi: ${ad}`); continue; }
    try {
      const satirlar = tabloCoz(await getirMetin(KOK + yol));
      if (satirlar.length) liste.push(...ilKayitlari(il_id, satirlar));
    } catch (e) {
      console.error(`[tp] ${ad}:`, e.message);
    }
    await bekle(300);
  }
  return { tarih: null, liste: liste.filter((s) => s.benzin || s.motorin || s.lpg) };
}
