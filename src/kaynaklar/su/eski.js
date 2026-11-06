// ESKİ (Eskişehir) su kesintileri — https://www.eskisehir-eski.gov.tr/basin/su-kesintileri (duyuru listesi)
//   <h2>Mahmudiye İlçesi Türkmenmecidiye Mahallesi</h2>
//   <p>… 06.11.2026 tarihinde saat 11:55 itibariyle … su kesintisi yaşanabilecektir.</p>
// Liste eski duyuruları da içerir: yalnızca son 2 gündeki (ya da ileri tarihli) duyurular alınır.
import { getir } from '../../getir.js';
import { BASLIKLAR, metne, kimlik, mahalleAdi, detayKur } from './ortak.js';

export const KAYNAK = 'eski';
const URL = 'https://www.eskisehir-eski.gov.tr/basin/su-kesintileri';

const iki = (n) => String(n).padStart(2, '0');

/** Metindeki tarih(ler): "06.11.2026 tarihinde saat 11:55" / "06.11.2026 … 09:00-17:00" */
function tarihler(m) {
  const t = m.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (!t) return [null, null];
  const gun = `${t[3]}-${iki(t[2])}-${iki(t[1])}`;
  const saatler = [...m.slice(t.index + t[0].length).matchAll(/(\d{1,2})[:.](\d{2})(?!\d)/g)].map((x) => `${iki(x[1])}:${x[2]}`);
  const s = (h) => (h ? `${gun}T${h}:00+03:00` : null);
  return [s(saatler[0] ?? '00:00'), s(saatler[1])];
}

export function coz(html, simdi = Date.now()) {
  const sonuc = [];
  for (const b of html.split(/<h2[^>]*>/i).slice(1)) {
    const baslik = metne(b.split(/<\/h2>/i)[0]);
    const ilce = baslik.match(/^(.+?)\s+[İI]l[çc]esi\b/i)?.[1]?.trim();
    if (!ilce) continue;
    const metin = metne(b.split(/<\/h2>/i)[1]?.match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? '');
    const [baslangic, bitis] = tarihler(metin);
    if (!baslangic || new Date(baslangic).getTime() < simdi - 2 * 86400_000) continue;
    // "… İlçesi Çalkara Mahallesi" / "… İlçesi A ve B Mahalleleri"
    const mahKismi = baslik.replace(/^.+?[İI]l[çc]esi\s*/i, '').replace(/\s+Mahalle(si|leri)\s*$/i, '');
    const mahalleler = mahKismi.split(/,|\s+ve\s+/i).map(mahalleAdi).filter(Boolean);
    sonuc.push({
      kaynak: KAYNAK,
      kaynak_id: kimlik(ilce, mahalleler.slice().sort().join('|'), baslangic),
      il: 'ESKİŞEHİR',
      ilceler: [ilce],
      detay: detayKur(mahalleler.length ? mahalleler.map((mahalle) => ({ ilce, mahalle })) : [{ ilce, mahalle: null }]),
      baslangic,
      bitis,
      neden: /ar[ıi]za/i.test(metin) ? 'Arıza' : 'Su kesintisi',
      aciklama: metin.slice(0, 500) || null,
    });
  }
  return sonuc;
}

export async function cek() {
  const yanit = await getir(URL, { headers: BASLIKLAR, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return coz(await yanit.text());
}
