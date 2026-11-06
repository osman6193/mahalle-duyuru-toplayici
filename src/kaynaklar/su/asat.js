// ASAT (Antalya) planlı su kesintileri — https://kesinti.asat.gov.tr/dbo_kesintiListe/list (PHPRunner tablosu)
//   Boşken: "Planlı Bir Kesinti bulunmamaktadır". Doluyken her satırda data-field="…" hücreleri:
//   IlceId, MahalleId, Sokak, EtkilenenMahalleler, KesintiNedeniId, BaslangicTarihSaat, BitisTarihiSaat,
//   TahminiBitisTarihSaat, Aciklama
// Dolu biçim HENÜZ GÖRÜLMEDİ: ilk dolu sayfa 'ornek-asat' olarak saklanır; çözücü alan adlarına göre okur.
import { getir } from '../../getir.js';
import { ornekSakla } from '../kesinti-calistir.js';
import { BASLIKLAR, metne, kimlik, sayisalTarih, mahalleAdi, detayKur } from './ortak.js';

export const KAYNAK = 'asat';
const URL = 'https://kesinti.asat.gov.tr/dbo_kesintiListe/list';

/** Satırdaki data-field="ALAN" hücresinin metni */
function hucre(tr, alan) {
  const m = tr.match(new RegExp(`<td[^>]*data-field=["']${alan}["'][^>]*>([\\s\\S]*?)<\\/td>`, 'i'));
  return m ? metne(m[1]) || null : null;
}

export function coz(html) {
  const sonuc = [];
  for (const m of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const tr = m[1];
    if (!/data-field=["']IlceId["']/i.test(tr)) continue;
    const ilce = hucre(tr, 'IlceId');
    if (!ilce) continue;
    const mahalleler = [hucre(tr, 'MahalleId'), ...(hucre(tr, 'EtkilenenMahalleler') ?? '').split(/[,;]/)]
      .map((x) => (x ? mahalleAdi(x) : null)).filter(Boolean);
    const detay = detayKur(mahalleler.length ? mahalleler.map((mahalle) => ({ ilce, mahalle })) : [{ ilce, mahalle: null }]);
    const baslangic = sayisalTarih(hucre(tr, 'BaslangicTarihSaat'));
    const sokak = hucre(tr, 'Sokak');
    const neden = hucre(tr, 'KesintiNedeniId');
    const id = hucre(tr, 'ID');
    sonuc.push({
      kaynak: KAYNAK,
      kaynak_id: id ? `asat-${id}` : kimlik(ilce, mahalleler.slice().sort().join('|'), baslangic),
      il: 'ANTALYA',
      ilceler: [ilce],
      detay,
      baslangic,
      bitis: sayisalTarih(hucre(tr, 'BitisTarihiSaat')) ?? sayisalTarih(hucre(tr, 'TahminiBitisTarihSaat')),
      neden: neden || 'Planlı su kesintisi',
      aciklama: [hucre(tr, 'Aciklama'), sokak ? `Sokak: ${sokak}` : null].filter(Boolean).join(' · ').slice(0, 500) || null,
    });
  }
  return sonuc;
}

export async function cek() {
  const yanit = await getir(URL, { headers: BASLIKLAR, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  const html = await yanit.text();
  if (/Planl[ıi] Bir Kesinti bulunmamaktad[ıi]r/i.test(html)) return [];
  await ornekSakla(KAYNAK, URL, html);
  return coz(html);
}
