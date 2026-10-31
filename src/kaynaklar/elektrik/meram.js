// Meram EDAŞ (Konya, Karaman, Aksaray, Niğde, Nevşehir, Kırşehir) — o anki planlı kesintiler VE arızalar
// Kaynak: GET https://www.meramedas.com.tr/kesintiler/ajax  → JSON dizi (sitenin "Planlı Kesintiler" sayfası kullanır)
//   {OUTAGE_NO, IS_TIPI:"PLANLI"|"PLANSIZ", KESINTI_BASLAMA_TARIHI:"2026-10-31T13:00:00", TAHMINI_COZUM_TARIHI (arızada 0001-01-01),
//    IL_ADI, ILCE_ADI, KOY_ADI:"ÇATALSU, MERKEZ", MAHALLE_ADI:"FATİH Mah., KÖYÜN KENDİSİ Mah.", CSBM_ADI:"… Sok./Cad., …"}
//   Liste sadece o günün süren/başlayacak kesintilerini içerir; 10 dakikada bir okunur, arızalar da anında düşer.

export const KAYNAK = 'meram';
const URL = 'https://www.meramedas.com.tr/kesintiler/ajax';

const parcala = (s) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const saat = (s) => (s && !s.startsWith('0001') ? `${s.slice(0, 19)}+03:00` : null);

export function yerler(k) {
  const set = new Set();
  for (const m of parcala(k.MAHALLE_ADI)) {
    const ad = m.replace(/\s+Mah\.?$/i, '').trim();
    if (ad && !/KÖYÜN KENDİSİ/i.test(ad)) set.add(ad);
  }
  // Köy kesintilerinde mahalle "KÖYÜN KENDİSİ"dir; köy adı kullanılır
  if (/KÖYÜN KENDİSİ/i.test(k.MAHALLE_ADI ?? '') || !set.size)
    for (const koy of parcala(k.KOY_ADI)) if (!/^MERKEZ$/i.test(koy)) set.add(koy);
  return [...set];
}

export function coz(liste) {
  return (liste ?? [])
    .filter((k) => k.OUTAGE_NO && k.IL_ADI && k.KESINTI_BASLAMA_TARIHI)
    .map((k) => {
      const ariza = k.IS_TIPI === 'PLANSIZ';
      // Birden çok ilçe gelebilir ("ALTINEKİN, SELÇUKLU"); mahalle listesi her ilçeye verilir, veritabanı
      // sadece o ilçede gerçekten bulunanları eşler
      const ilceler = parcala(k.ILCE_ADI);
      const mahalleler = yerler(k).map((ad) => ({ ad }));
      return {
        kaynak: KAYNAK,
        kaynak_id: String(k.OUTAGE_NO),
        il: k.IL_ADI,
        ilceler,
        detay: ilceler.map((ilce) => ({ ilce, mahalleler })),
        baslangic: saat(k.KESINTI_BASLAMA_TARIHI),
        bitis: saat(k.TAHMINI_COZUM_TARIHI),
        neden: ariza ? 'Arıza' : 'Planlı bakım',
        baslik_on: ariza ? 'Elektrik arızası' : 'Planlı elektrik kesintisi',
        aciklama: String(k.CSBM_ADI ?? '').replace(/\s*Sok\.\/Cad\./g, '').slice(0, 800) || null,
      };
    });
}

export async function cek() {
  const yanit = await fetch(URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: 'https://www.meramedas.com.tr/tr/planli-kesintiler.html',
    },
    signal: AbortSignal.timeout(60000),
  });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return coz(await yanit.json());
}
