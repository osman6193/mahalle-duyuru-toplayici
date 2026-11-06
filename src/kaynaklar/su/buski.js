// BUSKİ (Bursa) günlük su kesintileri — https://www.buski.gov.tr/gunluk-su-kesintileri
//   Sayfadaki betikte GeoJSON: const mainData = {"type":"FeatureCollection","features":[{ "properties": {
//     SU_KESINTI_NO, ILCE_ADI, MAHALLE_ADI, WEB_ACIKLAMA, PLANLANAN_BASLANGIC_TARIHI:"06/11/2026 11:15",
//     PLANLANAN_BITIS_TARIHI, KESIM_TARIHI, DURUM:"Kesildi" } }]}
import { getir } from '../../getir.js';
import { BASLIKLAR, kimlik, sayisalTarih, mahalleAdi, detayKur } from './ortak.js';

export const KAYNAK = 'buski';
const URL = 'https://www.buski.gov.tr/gunluk-su-kesintileri';

/** metin içinde `const ad = {…}` nesnesini (tırnak kaçışlarına dikkat ederek) ayıklar */
function nesneAyikla(metin, ad) {
  const bas = metin.search(new RegExp(`(?:const|let|var)\\s+${ad}\\s*=\\s*\\{`));
  if (bas < 0) return null;
  let i = metin.indexOf('{', bas);
  const ilk = i;
  let derinlik = 0;
  let tirnak = false;
  for (; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '\\') i++;
      else if (c === '"') tirnak = false;
      continue;
    }
    if (c === '"') tirnak = true;
    else if (c === '{' || c === '[') derinlik++;
    else if ((c === '}' || c === ']') && --derinlik === 0) return JSON.parse(metin.slice(ilk, i + 1));
  }
  return null;
}

export function coz(html) {
  const veri = nesneAyikla(html, 'mainData');
  if (!veri) {
    if (/G[üu]nl[üu]k Su Kesintileri/i.test(html)) return []; // kesinti yokken nesne olmayabilir
    throw new Error('mainData bulunamadı (site yapısı değişmiş olabilir)');
  }
  // Aynı kesinti numarası birden çok mahalleyi kapsayabilir: numaraya göre birleştir
  const gruplar = new Map();
  for (const f of veri.features ?? []) {
    const p = f?.properties ?? {};
    if (!p.ILCE_ADI) continue;
    const no = p.SU_KESINTI_NO ?? kimlik(p.ILCE_ADI, p.MAHALLE_ADI, p.PLANLANAN_BASLANGIC_TARIHI);
    if (!gruplar.has(no)) gruplar.set(no, { p, ciftler: [] });
    gruplar.get(no).ciftler.push({ ilce: p.ILCE_ADI.trim(), mahalle: p.MAHALLE_ADI ? mahalleAdi(p.MAHALLE_ADI) : null });
  }
  return [...gruplar].map(([no, { p, ciftler }]) => {
    const detay = detayKur(ciftler);
    const aciklama = String(p.WEB_ACIKLAMA ?? '').replace(/\s+/g, ' ').trim();
    return {
      kaynak: KAYNAK,
      kaynak_id: `buski-${no}`,
      il: 'BURSA',
      ilceler: detay.map((d) => d.ilce),
      detay,
      baslangic: sayisalTarih(p.KESIM_TARIHI) ?? sayisalTarih(p.PLANLANAN_BASLANGIC_TARIHI),
      bitis: sayisalTarih(p.PLANLANAN_BITIS_TARIHI),
      neden: /ar[ıi]za/i.test(aciklama) ? 'Arıza' : 'Planlı çalışma',
      aciklama: aciklama.slice(0, 500) || null,
    };
  });
}

export async function cek() {
  const yanit = await getir(URL, { headers: BASLIKLAR, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return coz(await yanit.text());
}
