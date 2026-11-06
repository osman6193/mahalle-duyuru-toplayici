// KASKİ (Kayseri) su kesintileri — https://www.kaski.gov.tr/su-kesintileri (sunucuda üretilen tablo)
//   <thead> | Tarih | İlçe | Mahalle | Kesinti Tipi | Başlama Saati | Bitiş Saati | Açıklama </thead>
// Dolu tablo HENÜZ GÖRÜLMEDİ: ilk dolu sayfa 'ornek-kaski' olarak saklanır; sütunlar başlıklara göre okunur.
import { getir } from '../../getir.js';
import { ornekSakla } from '../kesinti-calistir.js';
import { BASLIKLAR, metne, kimlik, sayisalTarih, mahalleAdi, detayKur } from './ortak.js';

export const KAYNAK = 'kaski';
const URL = 'https://www.kaski.gov.tr/su-kesintileri';

const sade = (s) => s.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü]/g, '');

export function coz(html) {
  const tablo = html.match(/<table[^>]*>([\s\S]*?Mahalle[\s\S]*?)<\/table>/i);
  if (!tablo) throw new Error('kesinti tablosu bulunamadı (site yapısı değişmiş olabilir)');
  const basliklar = [...(tablo[1].match(/<thead>([\s\S]*?)<\/thead>/i)?.[1] ?? '').matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => sade(metne(m[1])));
  const sutun = (ad) => basliklar.findIndex((b) => b.startsWith(ad));
  const [iT, iIlce, iMah, iTip, iBas, iBit, iAc] = ['tarih', 'ilçe', 'mahalle', 'kesinti', 'başlama', 'bitiş', 'açıklama'].map(sutun);
  const govde = tablo[1].match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? '';
  const sonuc = [];
  for (const tr of govde.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const td = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => metne(m[1]));
    const al = (i) => (i >= 0 ? td[i] || null : null);
    const ilce = al(iIlce);
    if (!ilce) continue;
    const mahalleler = (al(iMah) ?? '').split(/[,;]/).map(mahalleAdi).filter(Boolean);
    const gun = al(iT) ?? '';
    const saat = (s) => (s && /\d{1,2}[:.]\d{2}/.test(s) ? (/\d{4}/.test(s) ? s : `${gun} ${s}`) : null);
    const baslangic = sayisalTarih(saat(al(iBas)) ?? gun);
    const neden = al(iTip);
    sonuc.push({
      kaynak: KAYNAK,
      kaynak_id: kimlik(ilce, mahalleler.slice().sort().join('|'), baslangic, neden),
      il: 'KAYSERİ',
      ilceler: [ilce],
      detay: detayKur(mahalleler.length ? mahalleler.map((mahalle) => ({ ilce, mahalle })) : [{ ilce, mahalle: null }]),
      baslangic,
      bitis: sayisalTarih(saat(al(iBit))),
      neden,
      aciklama: al(iAc)?.slice(0, 500) ?? null,
    });
  }
  return sonuc;
}

export async function cek() {
  const yanit = await getir(URL, { headers: BASLIKLAR, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  const html = await yanit.text();
  const liste = coz(html);
  if (liste.length) await ornekSakla(KAYNAK, URL, html);
  return liste;
}
