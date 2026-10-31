// Aytemiz — il bazında pompa fiyatları, iki sayfa (81 il tek tabloda):
//   /akaryakit-fiyatlari/benzin-fiyatlari : İl | Benzin (Optimum 95) | Motorin (Dizel) | Motorin (Optimum Dizel) | ...
//   /akaryakit-fiyatlari/lpg-fiyatlari    : İl | Oto LPG
//   satır: <td><a href="...">Adana</a></td><td>78,18</td>...   İstanbul: "İstanbul / Anadolu", "İstanbul / Avrupa"
import { getirMetin, ilPlakalari, sadelestir, sayi } from './ortak.js';

export const DAGITICI = 'aytemiz';
const KOK = 'https://www.aytemiz.com.tr/akaryakit-fiyatlari';
const temiz = (s) => s.replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).trim();

/** [[il adı, hücre1, hücre2, ...], ...]
 *  Ham sayfa sıkıştırılmış: tırnaksız öznitelikler (id=fuel-price-table), </td> ve </tr> yok.
 *  Bu yüzden satırları "<tr", hücreleri "<td" ile böleriz. */
export function satirlar(html) {
  // Sayfada birden fazla tablo olabiliyor (LPG sayfasında id'li tablo boş, veri ikinci tabloda);
  // başlığı fuelPricesHeader olanların en dolusunu al.
  let enIyi = [];
  for (const parca of html.split(/<table[\s>]/).slice(1)) {
    if (!/fuelPricesHeader/.test(parca.slice(0, 3000))) continue;
    const son = parca.indexOf('</table>');
    const tablo = son > 0 ? parca.slice(0, son) : parca.slice(0, 60000);
    const s = tablo
      .split(/<tr[\s>]/)
      .slice(1)
      .filter((tr) => /<td[\s>]/.test(tr))
      .map((tr) => tr.split(/<td[\s>]/).slice(1).map((h) => temiz(h.replace(/^[^>]*>/, (m) => (m.includes('<') ? m : '')))))
      .filter((h) => h.length >= 2 && sayi(h[1]) != null); // başlık satırı (İl | Oto LPG) elenir
    if (s.length > enIyi.length) enIyi = s;
  }
  return enIyi;
}

/** "İstanbul / Anadolu" -> { anahtar: "ISTANBUL", bolge: "Anadolu" } */
function ilAdi(ad) {
  const [il, yaka] = ad.split('/').map((s) => s.trim());
  return { anahtar: sadelestir(il), bolge: /anadolu/i.test(yaka || '') ? 'Anadolu' : /avrupa/i.test(yaka || '') ? 'Avrupa' : null };
}

export function birlestir(benzinHtml, lpgHtml, plaka) {
  const kayit = new Map();
  const al = (ad) => {
    const { anahtar, bolge } = ilAdi(ad);
    const il_id = plaka.get(anahtar);
    if (!il_id) { console.warn(`[${DAGITICI}] il eşleşmedi: ${ad}`); return null; }
    const k = `${il_id}|${bolge ?? ''}`;
    if (!kayit.has(k)) kayit.set(k, { il_id, bolge, benzin: null, motorin: null, lpg: null });
    return kayit.get(k);
  };
  for (const h of satirlar(benzinHtml)) {
    const r = al(h[0]);
    if (r) { r.benzin = sayi(h[1]); r.motorin = sayi(h[2]); }
  }
  for (const h of satirlar(lpgHtml)) {
    const { anahtar, bolge } = ilAdi(h[0]);
    const v = sayi(h[1]);
    if (bolge || plaka.get(anahtar) !== 34) { const r = al(h[0]); if (r) r.lpg = v; continue; }
    // LPG'de İstanbul tek satırsa iki yakaya da yaz
    for (const y of ['Avrupa', 'Anadolu']) { const r = al(`İstanbul / ${y}`); if (r) r.lpg = v; }
  }
  return [...kayit.values()].filter((s) => s.benzin || s.motorin || s.lpg);
}

export async function cek() {
  const plaka = await ilPlakalari();
  const [b, l] = await Promise.all([getirMetin(`${KOK}/benzin-fiyatlari`), getirMetin(`${KOK}/lpg-fiyatlari`)]);
  return { tarih: null, liste: birlestir(b, l, plaka) };
}
