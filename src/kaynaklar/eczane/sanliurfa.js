// Şanlıurfa Eczacı Odası — sitenin kendi kullandığı açık nöbet servisi (birodam altyapısı):
//   GET https://portal.sanliurfaeo.birodam.org.tr/auth-server/api/duty-rosters/list-grouped?dutyDateFrom=YYYY-MM-DD&dutyDateTo=YYYY-MM-DD
//   -> { content: [ { dutyDate: "2026-11-06T08:30:00", regionName, dutyList: [ { eczane: { name, phone, location, district, latitude, longitude } } ] } ] }
// Nöbet 24 saattir: dutyDate başlangıç, +24 saat bitiş.
export const KAYNAK = 'eczane-sanliurfa';
export const IL_ID = 63;
const API = 'https://portal.sanliurfaeo.birodam.org.tr/auth-server/api/duty-rosters/list-grouped';

const basHarf = (s) =>
  s.toLocaleLowerCase('tr').replace(/(^|[\s\-(/.])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase('tr'));

// Sabah 08:30'dan önce dünkü nöbet sürüyor
function nobetGunu() {
  const s = new Date(Date.now() + 3 * 3600_000);
  if (s.getUTCHours() * 60 + s.getUTCMinutes() < 8 * 60 + 30) s.setUTCDate(s.getUTCDate() - 1);
  return s.toISOString().slice(0, 10);
}

export function coz(veri) {
  const gruplar = Array.isArray(veri) ? veri : Array.isArray(veri?.content) ? veri.content : [];
  const sonuc = [];
  for (const g of gruplar) {
    const bas = g.dutyDate ? new Date(`${g.dutyDate.slice(0, 19)}+03:00`) : null;
    for (const n of g.dutyList ?? []) {
      const e = n?.eczane;
      if (!e?.name) continue;
      const ilce = (e.district || g.regionName || '').trim();
      const bolge = (g.regionName || '').trim();
      const enlem = Number(e.latitude);
      const boylam = Number(e.longitude);
      sonuc.push({
        ad: e.name.trim(),
        ilce: ilce ? basHarf(ilce) : null,
        not: bolge && bolge.toLocaleUpperCase('tr') !== ilce.toLocaleUpperCase('tr') ? basHarf(bolge) : null,
        adres: e.location?.trim() || null,
        telefon: e.phone?.trim() || null,
        enlem: enlem > 35 && enlem < 43 ? enlem : null,
        boylam: boylam > 25 && boylam < 45 ? boylam : null,
        baslangic: bas ? bas.toISOString() : null,
        bitis: bas ? new Date(bas.getTime() + 24 * 3600_000).toISOString() : null,
      });
    }
  }
  return sonuc;
}

export async function cek() {
  const gun = nobetGunu();
  const yanit = await fetch(`${API}?dutyDateFrom=${gun}&dutyDateTo=${gun}&page=0&size=200`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36', Accept: 'application/json' },
    signal: AbortSignal.timeout(45000),
  });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return coz(await yanit.json());
}
