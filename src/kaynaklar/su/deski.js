// DESKİ (Denizli) su kesintileri — https://sukesinti.deski.gov.tr/kesintiler.json (sitenin kendi kullandığı JSON)
//   [{ KESINTI_ID, ILCE_ADI:"Bozkurt", MAHALLE_ADI:"İNCELER MAH.", KESINTI_TURU, BASLANGIC_TARIHI:"2026-11-06T12:00:00",
//      BITIS_TARIHI, NEDENI:"ANA ŞEBEKE ARIZASI", KESINTI_ACIKLAMASI, KESINTI_MESAJI }]
import { getir } from '../../getir.js';
import { BASLIKLAR, sayisalTarih, mahalleAdi, detayKur } from './ortak.js';

export const KAYNAK = 'deski';
const URL = 'https://sukesinti.deski.gov.tr/kesintiler.json';

export function coz(liste) {
  if (!Array.isArray(liste)) throw new Error('kesintiler.json dizi değil (site yapısı değişmiş olabilir)');
  return liste
    .filter((k) => k?.ILCE_ADI)
    .map((k) => {
      const ilce = String(k.ILCE_ADI).trim();
      const mahalleler = String(k.MAHALLE_ADI ?? '').split(/[,;]/).map(mahalleAdi).filter(Boolean);
      return {
        kaynak: KAYNAK,
        kaynak_id: `deski-${k.KESINTI_ID}`,
        il: 'DENİZLİ',
        ilceler: [ilce],
        detay: detayKur(mahalleler.length ? mahalleler.map((mahalle) => ({ ilce, mahalle })) : [{ ilce, mahalle: null }]),
        baslangic: sayisalTarih(k.BASLANGIC_TARIHI),
        bitis: sayisalTarih(k.BITIS_TARIHI),
        neden: k.NEDENI?.trim() || null,
        aciklama: String(k.KESINTI_MESAJI ?? k.KESINTI_ACIKLAMASI ?? '').replace(/\s*T\.C\.? DESK[İI] GENEL M[ÜU]D[ÜU]RL[ÜU][ĞG][ÜU]\s*$/i, '').trim().slice(0, 500) || null,
      };
    });
}

export async function cek() {
  const yanit = await getir(`${URL}?t=${Date.now()}`, { headers: { ...BASLIKLAR, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return coz(await yanit.json());
}
