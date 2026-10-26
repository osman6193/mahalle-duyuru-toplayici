// SEDAŞ (Sakarya, Kocaeli, Bolu, Düzce) planlı kesintiler
// Kaynak: GET https://www.sedas.com/Home/MapDataJson/
//   cevap: {Success, Data:[{ZPKNO, ZIL, ZILCE, ZMAHALLE, ZCSBM, ZPLANTAR:"2026-10-26", ZBASSAAT:"09:00", ZBITSAAT:"17:00", ZKOORDINAT}]}
//   - Her satır bir kesintinin BİR mahallesi; ZPKNO + tarih + saatler aynı olanlar tek kesinti
//   - SADECE O GÜNÜN kesintileri gelir (site ileri tarihleri yalnızca mahalle mahalle sorgulatıyor)
//   - ZIL bazen il değil bölge müdürlüğü ("ERENLER", "GÖLCÜK"); il, ilçeden bulunur (il_adaylari)
//   - Bazı mahalleler komşu ilçeye yazılmış ("Derince/Cuma" aslında Körfez) -> Supabase ilde tekil eşleşmeyle düzeltir

export const KAYNAK = 'sedas';
const URL = 'https://www.sedas.com/Home/MapDataJson/';
const ILLER = ['SAKARYA', 'KOCAELİ', 'BOLU', 'DÜZCE'];
const GURULTU = /^(KÖYÜN KENDİSİ|N KENDISI|MÜCAVİR)$/i;

function zaman(tarih, saat) {
  if (!tarih || !/^\d{1,2}:\d{2}$/.test(saat || '')) return null;
  return `${tarih}T${saat.padStart(5, '0')}:00+03:00`;
}

export async function cek() {
  const yanit = await fetch(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', Referer: 'https://www.sedas.com/' },
    signal: AbortSignal.timeout(30000),
  });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  const veri = await yanit.json();
  if (!veri.Success || !Array.isArray(veri.Data)) throw new Error('beklenmeyen format');

  // Satırları kesintilere grupla
  const gruplar = new Map();
  for (const s of veri.Data) {
    const anahtar = [s.ZPKNO, s.ZPLANTAR, s.ZBASSAAT, s.ZBITSAAT].join('#');
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, { satirlar: [], s });
    gruplar.get(anahtar).satirlar.push(s);
  }

  const sonuc = [];
  for (const [anahtar, { satirlar, s }] of gruplar) {
    // İlçe -> mahalleler
    const ilceMap = new Map();
    for (const r of satirlar) {
      const ilce = (r.ZILCE || '').trim();
      if (!ilce) continue;
      if (!ilceMap.has(ilce)) ilceMap.set(ilce, new Set());
      const mah = (r.ZMAHALLE || '').trim();
      if (mah && !GURULTU.test(mah)) ilceMap.get(ilce).add(mah);
    }
    const ilGecerli = ILLER.includes((s.ZIL || '').trim().toLocaleUpperCase('tr'));
    let bitis = zaman(s.ZPLANTAR, s.ZBITSAAT);
    const baslangic = zaman(s.ZPLANTAR, s.ZBASSAAT);
    if (baslangic && bitis && bitis <= baslangic) bitis = new Date(new Date(bitis).getTime() + 86400000).toISOString(); // gece yarısını aşan

    sonuc.push({
      kaynak: KAYNAK,
      kaynak_id: anahtar.replace(/[:\s]/g, ''),
      il: ilGecerli ? s.ZIL.trim() : s.ZIL,
      il_adaylari: ILLER,
      ilceler: [...ilceMap.keys()],
      detay: [...ilceMap].map(([ilce, m]) => ({ ilce, mahalleler: [...m].map((ad) => ({ ad })) })),
      baslangic,
      bitis,
      neden: 'Planlı bakım/çalışma',
    });
  }
  return sonuc;
}
