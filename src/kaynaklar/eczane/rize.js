// Rize Eczacı Odası — https://www.rizeeczaciodasi.org.tr/nobetci-eczane
//   <li> <div><h3>AD</h3><span>İLÇE</span></div><address>ADRES</address>
//        <p>Nöbet: 6 Kasım 18:00 – 7 Kasım 08:00</p> <a href="tel:…">…</a> <a href="…destination=ENLEM,BOYLAM">
import { getir } from './epano.js';

export const KAYNAK = 'eczane-rize';
export const IL_ID = 53;
const URL = 'https://www.rizeeczaciodasi.org.tr/nobetci-eczane';

const metne = (h) =>
  h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const basHarf = (s) =>
  s.toLocaleLowerCase('tr').replace(/(^|[\s\-(/.])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase('tr'));

const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];

// "6 Kasım 18:00" -> ISO (yıl: bugünün yılı; Aralık→Ocak geçişinde bir sonraki yıl)
function tarih(gun, ay, saat) {
  const a = AYLAR.indexOf(ay.toLocaleLowerCase('tr'));
  if (a < 0) return null;
  const simdi = new Date(Date.now() + 3 * 3600_000);
  let yil = simdi.getUTCFullYear();
  if (a === 0 && simdi.getUTCMonth() === 11) yil++;
  if (a === 11 && simdi.getUTCMonth() === 0) yil--;
  return new Date(`${yil}-${String(a + 1).padStart(2, '0')}-${gun.padStart(2, '0')}T${saat}:00+03:00`).toISOString();
}

export function coz(html) {
  const sonuc = [];
  for (const li of html.split(/<li[\s>]/i).slice(1)) {
    const ad = li.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    if (!ad || !/tel:|destination=/.test(li)) continue;
    const ilce = li.match(/<\/h3>\s*<span[^>]*>([^<]+)<\/span>/i)?.[1]?.trim();
    const adres = li.match(/<address[^>]*>([\s\S]*?)<\/address>/i);
    const tel = li.match(/href=["']tel:([^"']+)["']/i)?.[1] ?? null;
    const konum = li.match(/destination=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    const nobet = metne(li).match(/N[öo]bet:\s*(\d{1,2})\s+(\p{L}+)\s+(\d{2}:\d{2})\s*[–-]\s*(\d{1,2})\s+(\p{L}+)\s+(\d{2}:\d{2})/u);
    sonuc.push({
      ad: metne(ad[1]),
      ilce: ilce ? basHarf(ilce) : null,
      adres: adres ? metne(adres[1]) || null : null,
      telefon: tel,
      enlem: konum ? Number(konum[1]) : null,
      boylam: konum ? Number(konum[2]) : null,
      baslangic: nobet ? tarih(nobet[1], nobet[2], nobet[3]) : null,
      bitis: nobet ? tarih(nobet[4], nobet[5], nobet[6]) : null,
    });
  }
  return sonuc;
}

export const cek = async () => coz(await getir(URL));
