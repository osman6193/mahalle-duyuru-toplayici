// MUSKİ (Muğla) su kesintileri — https://www.muski.gov.tr/su-kesintileri (sunucuda üretilen kartlar)
//   <div data-status="devam" data-region="MENTEŞE" data-type="plansiz"> … Kesinti Tarihi 06.11.2026 10:50
//     … Tahmini Süre 6 Saat … Etkilenen Mahalleler YENİKÖY Mah., … … Kesinti Türü Arıza / Plansız
import { getir } from '../../getir.js';
import { BASLIKLAR, metne, kimlik, sayisalTarih, sureEkle, mahalleAdi, detayKur } from './ortak.js';

export const KAYNAK = 'muski';
const URL = 'https://www.muski.gov.tr/su-kesintileri';

/** Kartın içinde "Etiket" yazısından sonraki ilk değer kutusu */
function alan(kart, etiket) {
  const i = kart.search(new RegExp(etiket, 'i'));
  if (i < 0) return null;
  const sonra = kart.slice(i).replace(new RegExp(`^[\\s\\S]*?${etiket}\\s*<\\/div>`, 'i'), '');
  const m = sonra.match(/<div[^>]*>([\s\S]*?)<\/div>/i);
  return m ? metne(m[1]) || null : null;
}

export function coz(html) {
  const kartlar = html.split(/<div[^>]+data-status=/i).slice(1);
  const sonuc = [];
  for (const k of kartlar) {
    const kart = k.slice(0, 6000);
    const ilce = metne(kart.match(/data-region=["']([^"']+)["']/i)?.[1] ?? '');
    if (!ilce) continue;
    const durum = kart.match(/^["']([^"']+)["']/)?.[1] ?? '';
    const tur = alan(kart, 'Kesinti T(ü|&#xFC;)r(ü|&#xFC;)');
    const baslangic = sayisalTarih(alan(kart, 'Kesinti Tarihi'));
    const sure = alan(kart, 'Tahmini S(ü|&#xFC;)re');
    const mahalleMetni = alan(kart, 'Etkilenen Mahalleler') ?? '';
    const mahalleler = mahalleMetni.split(/,|;/).map(mahalleAdi).filter(Boolean);
    const detay = detayKur(mahalleler.length ? mahalleler.map((mahalle) => ({ ilce, mahalle })) : [{ ilce, mahalle: null }]);
    sonuc.push({
      kaynak: KAYNAK,
      kaynak_id: kimlik(ilce, mahalleler.slice().sort().join('|'), baslangic),
      il: 'MUĞLA',
      ilceler: [ilce],
      detay,
      baslangic,
      bitis: sureEkle(baslangic, sure),
      neden: tur || null,
      aciklama: [durum === 'devam' ? 'Devam ediyor' : null, sure ? `Tahmini süre: ${sure}` : null].filter(Boolean).join(' · ') || null,
    });
  }
  return sonuc;
}

export async function cek() {
  const yanit = await getir(URL, { headers: BASLIKLAR, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  const html = await yanit.text();
  if (!/id=["']outagesGrid["']/.test(html)) throw new Error('outagesGrid bulunamadı (site yapısı değişmiş olabilir)');
  return coz(html);
}
