// Gaziantep Eczacı Odası — https://www.gaziantepeo.org.tr/nobetci-eczaneler (tablo)
//   <td colspan="12">ŞAHİNBEY NÖBETÇİ ECZANELER …</td>
//   <tr><td> AD ECZANESİ </td><td>ADRES / <b>İLÇE</b><br />Telefon : 0 342 …</td></tr>
// Konum yok: ilçe adı sunucuda eşleşir.
import { getir } from './epano.js';

export const KAYNAK = 'eczane-gaziantep';
export const IL_ID = 27;
const URL = 'https://www.gaziantepeo.org.tr/nobetci-eczaneler';

const metne = (h) =>
  h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const basHarf = (s) =>
  s.toLocaleLowerCase('tr').replace(/(^|[\s\-(/.])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase('tr'));

export function coz(html) {
  const sonuc = [];
  let bolum = null;
  for (const tr of html.split(/<tr[\s>]/i).slice(1)) {
    const baslik = tr.match(/colspan=["']?\d+["']?[^>]*>([\s\S]*?)N[ÖO]BET[ÇC][İI]\s+ECZANE/i);
    if (baslik) {
      bolum = metne(baslik[1]) || null;
      continue;
    }
    const td = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (td.length < 2) continue;
    const ad = metne(td[0]);
    if (!/eczane/i.test(ad)) continue;
    const [adresKismi, telKismi = ''] = td[1].split(/<br\s*\/?>/i);
    const ilce = adresKismi.match(/<b>([^<]+)<\/b>/i)?.[1]?.trim() ?? bolum;
    const adres = metne(adresKismi.replace(/\/\s*<b>[^<]*<\/b>\s*$/i, ''));
    const telefon = metne(telKismi).replace(/^Telefon\s*:\s*/i, '') || null;
    sonuc.push({
      ad,
      ilce: ilce ? basHarf(ilce) : null,
      adres: adres || null,
      telefon,
      enlem: null,
      boylam: null,
      baslangic: null,
      bitis: null,
    });
  }
  return sonuc;
}

export const cek = async () => coz(await getir(URL));
