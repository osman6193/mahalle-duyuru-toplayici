// Uşak Eczacı Odası — https://www.usakeczaciodasi.org.tr/usak-nobetci-eczaneler
// Her eczane kartında veri öznitelikleri var:
//   <div data-pharmacy-name="GÜRAN" data-pharmacy-address="…" data-pharmacy-phone="224 80 44" data-pharmacy-district="Merkez" data-pharmacy-map="…">
import { getir } from './epano.js';

export const KAYNAK = 'eczane-usak';
export const IL_ID = 64;
const URL = 'https://www.usakeczaciodasi.org.tr/usak-nobetci-eczaneler';

const coz1 = (h) => h.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

export function coz(html) {
  const sonuc = [];
  const gorulen = new Set();
  for (const m of html.matchAll(/<div[^>]+data-pharmacy-name=["']([^"']+)["'][^>]*>/gi)) {
    const etiket = m[0];
    const al = (ad) => coz1(etiket.match(new RegExp(`data-pharmacy-${ad}=["']([^"']*)["']`, 'i'))?.[1] ?? '') || null;
    let ad = coz1(m[1]);
    if (!/eczane/i.test(ad)) ad = `${ad} ECZANESİ`;
    const tel = al('phone');
    // Uşak sabit hatlarında alan kodu yazılmıyor ("224 80 44")
    const telefon = tel && /^\d{3} \d{2} \d{2}$/.test(tel) ? `0276 ${tel}` : tel;
    const anahtar = `${ad}|${telefon}`;
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    const harita = al('map');
    const konum = harita?.match(/(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/);
    sonuc.push({
      ad,
      ilce: al('district'),
      adres: al('address'),
      telefon,
      enlem: konum ? Number(konum[1]) : null,
      boylam: konum ? Number(konum[2]) : null,
      baslangic: null,
      bitis: null,
    });
  }
  return sonuc;
}

export const cek = async () => coz(await getir(URL));
