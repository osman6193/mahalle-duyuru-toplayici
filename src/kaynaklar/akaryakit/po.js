// Petrol Ofisi — il bazında pompa fiyatları (benzin, motorin, LPG). Tek sayfa, tablo:
// <tr class="price-row district-03500" data-disctrict-id="03500" data-disctrict-name="IZMIR">
//   <td>IZMIR</td> <td><span class="with-tax">77.60</span>…</td> ×6
// Sütunlar: V/Max Kurşunsuz 95, V/Max Diesel, Gazyağı, Kalorifer Yakıtı, Fuel Oil, PO/gaz Otogaz
// Kimliğin ilk 3 hanesi plaka; İstanbul Avrupa ve Anadolu için iki ayrı satır verir.
import { getirMetin } from './ortak.js';

export const DAGITICI = 'po';

export function coz(html) {
  const sonuc = [];
  for (const blok of html.split(/<tr class="price-row/).slice(1)) {
    const kimlik = blok.match(/data-disctrict-id="(\d+)"/)?.[1];
    const ad = blok.match(/data-disctrict-name="([^"]+)"/)?.[1] ?? '';
    if (!kimlik) continue;
    const vergili = [...blok.split('</tr>')[0].matchAll(/class="with-tax">\s*([\d.,]+)\s*</g)].map((m) =>
      Number(m[1].replace(',', '.')),
    );
    if (vergili.length < 6) continue;
    sonuc.push({
      il_id: Number(kimlik.slice(0, 3)),
      bolge: /AVRUPA/i.test(ad) ? 'Avrupa' : /ANADOLU/i.test(ad) ? 'Anadolu' : null,
      benzin: vergili[0] || null,
      motorin: vergili[1] || null,
      lpg: vergili[5] || null,
    });
  }
  return { tarih: null, liste: sonuc };
}

export const cek = async () => coz(await getirMetin('https://www.petrolofisi.com.tr/akaryakit-fiyatlari'));
