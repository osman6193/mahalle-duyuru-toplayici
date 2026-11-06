// Giresun Eczacı Odası — sitenin kendi kullandığı açık servis:
//   GET https://www.giresuneczaciodasi.org.tr/api/pharmacies
//   -> [{ name, address, phone, district, is_duty, duty_status, date: "06.11.2026", lat, lng }, …]  (birkaç günün listesi birlikte gelir)
// Yalnızca bugünün nöbet tarihindeki kayıtlar alınır.
export const KAYNAK = 'eczane-giresun';
export const IL_ID = 28;
const API = 'https://www.giresuneczaciodasi.org.tr/api/pharmacies';

const basHarf = (s) =>
  s.toLocaleLowerCase('tr').replace(/(^|[\s\-(/.])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase('tr'));

// Sabah 08:30'dan önce dünkü nöbet sürüyor; "GG.AA.YYYY"
function nobetGunu() {
  const s = new Date(Date.now() + 3 * 3600_000);
  if (s.getUTCHours() * 60 + s.getUTCMinutes() < 8 * 60 + 30) s.setUTCDate(s.getUTCDate() - 1);
  const [y, a, g] = s.toISOString().slice(0, 10).split('-');
  return `${g}.${a}.${y}`;
}

export function coz(liste, gun = nobetGunu()) {
  const sonuc = [];
  const gorulen = new Set();
  for (const e of Array.isArray(liste) ? liste : []) {
    if (!e?.name || e.is_duty === false || String(e.date ?? '').trim() !== gun) continue;
    const anahtar = `${e.name}|${e.phone}`;
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    const enlem = Number(e.lat);
    const boylam = Number(e.lng);
    const ilce = String(e.district ?? '').trim();
    const durum = String(e.duty_status ?? '').trim();
    sonuc.push({
      ad: e.name.trim(),
      ilce: ilce ? basHarf(ilce) : null,
      not: durum && !/^24 saat/i.test(durum) ? durum : null,
      adres: e.address?.trim() || null,
      telefon: e.phone?.trim() || null,
      enlem: enlem > 35 && enlem < 43 ? enlem : null,
      boylam: boylam > 25 && boylam < 45 ? boylam : null,
      baslangic: null,
      bitis: null,
    });
  }
  return sonuc;
}

export async function cek() {
  const yanit = await fetch(API, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36', Accept: 'application/json' },
    signal: AbortSignal.timeout(45000),
  });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return coz(await yanit.json());
}
