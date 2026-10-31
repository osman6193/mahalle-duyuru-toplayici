const BASLIK = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
  'Accept-Language': 'tr-TR,tr;q=0.9',
};

async function getir(url, kabul) {
  const yanit = await fetch(url, { headers: { ...BASLIK, Accept: kabul }, signal: AbortSignal.timeout(45000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status} ${url}`);
  return yanit;
}
export const getirMetin = async (url) => (await getir(url, 'text/html,*/*')).text();
export const getirJson = async (url) => (await getir(url, 'application/json, text/plain, */*')).json();

// ===== İl bazında özet için ortak yardımcılar =====
/** Türkçe karakterleri sadeleştirip büyük harfe çevirir: "Ağrı" -> "AGRI" */
export const sadelestir = (s) =>
  String(s || '')
    .replace(/i̇/g, 'i')
    .toLocaleUpperCase('tr')
    .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ç/g, 'C').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** İstanbul Anadolu yakası ilçeleri (sadeleştirilmiş) */
export const ANADOLU = new Set([
  'ADALAR', 'ATASEHIR', 'BEYKOZ', 'CEKMEKOY', 'KADIKOY', 'KARTAL', 'MALTEPE',
  'PENDIK', 'SANCAKTEPE', 'SULTANBEYLI', 'SILE', 'TUZLA', 'UMRANIYE', 'USKUDAR',
]);

/** En sık görülen değer (eşitlikte küçük olan); turistik ilçelerdeki farklı fiyat il fiyatını bozmasın */
export function enYaygin(degerler) {
  const sayac = new Map();
  for (const d of degerler) if (d != null) sayac.set(d, (sayac.get(d) || 0) + 1);
  let iyi = null, adet = 0;
  for (const [d, n] of sayac) if (n > adet || (n === adet && d < iyi)) { iyi = d; adet = n; }
  return iyi;
}

/** "97,90 TL/LT" -> 97.9 ; "-" -> null */
export function sayi(s) {
  const m = String(s ?? '').replace(/\s/g, '').match(/(\d{1,4})[.,](\d{1,3})/);
  if (!m) return null;
  const v = Number(`${m[1]}.${m[2]}`);
  return v > 5 && v < 1000 ? v : null;
}

/** İlçe satırlarından il kaydı/kayıtları: İstanbul'da yakaya göre ikiye ayırır */
export function ilKayitlari(il_id, satirlar) {
  const ozet = (s) => ({
    benzin: enYaygin(s.map((x) => x.benzin)),
    motorin: enYaygin(s.map((x) => x.motorin)),
    lpg: enYaygin(s.map((x) => x.lpg)),
  });
  if (il_id !== 34) return [{ il_id, bolge: null, ...ozet(satirlar) }];
  const anadolu = satirlar.filter((s) => ANADOLU.has(sadelestir(s.ilce)));
  const avrupa = satirlar.filter((s) => !ANADOLU.has(sadelestir(s.ilce)));
  return [
    ...(avrupa.length ? [{ il_id, bolge: 'Avrupa', ...ozet(avrupa) }] : []),
    ...(anadolu.length ? [{ il_id, bolge: 'Anadolu', ...ozet(anadolu) }] : []),
  ];
}

/** Supabase'deki iller tablosundan sadeleştirilmiş ad -> plaka */
let ilOnbellek = null;
export async function ilPlakalari() {
  if (ilOnbellek) return ilOnbellek;
  const { db } = await import('../../supabase.js');
  const { data, error } = await db.from('iller').select('id, ad');
  if (error) throw new Error(error.message);
  ilOnbellek = new Map(data.map((i) => [sadelestir(i.ad), i.id]));
  ilOnbellek.set('AFYON', ilOnbellek.get('AFYONKARAHISAR'));
  ilOnbellek.set('ICEL', ilOnbellek.get('MERSIN'));
  ilOnbellek.set('K MARAS', ilOnbellek.get('KAHRAMANMARAS'));
  ilOnbellek.set('MARAS', ilOnbellek.get('KAHRAMANMARAS'));
  ilOnbellek.set('URFA', ilOnbellek.get('SANLIURFA'));
  return ilOnbellek;
}

export const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
