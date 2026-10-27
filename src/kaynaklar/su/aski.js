// ASKİ (Ankara) su arızaları / kesintileri
// Kaynak: https://www.aski.gov.tr/tr/Kesinti.aspx  (ASP.NET, sunucuda üretilen HTML)
//   Kesinti yokken: <div id="PnlArizaYok"> ... "Kesinti Bulunamadı"
//   Kesinti varken: <ul class="history"> içinde <li> öğeleri. İç biçim HENÜZ GÖRÜLMEDİ:
//   ilk dolu sayfa kesif_kayitlari'na 'ornek-aski' olarak saklanır; çözücü ona göre kesinleştirilecek.
//   O zamana kadar her <li> metninden ilçe / mahalle / tarih tahmin edilir; çıkarılamayan öğe atlanır.
import { createHash } from 'node:crypto';
import { ornekSakla } from '../kesinti-calistir.js';

export const KAYNAK = 'aski';
const URL = 'https://www.aski.gov.tr/tr/Kesinti.aspx';

const ILCELER = ['AKYURT', 'ALTINDAĞ', 'AYAŞ', 'BALA', 'BEYPAZARI', 'ÇAMLIDERE', 'ÇANKAYA', 'ÇUBUK', 'ELMADAĞ', 'ETİMESGUT',
  'EVREN', 'GÖLBAŞI', 'GÜDÜL', 'HAYMANA', 'KAHRAMANKAZAN', 'KALECİK', 'KEÇİÖREN', 'KIZILCAHAMAM', 'MAMAK', 'NALLIHAN',
  'POLATLI', 'PURSAKLAR', 'SİNCAN', 'ŞEREFLİKOÇHİSAR', 'YENİMAHALLE'];

const metne = (h) => h.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').trim();
function tarihler(m) {
  return [...m.matchAll(/(\d{2})[./](\d{2})[./](\d{4})\s*(?:saat\s*)?(\d{1,2})[:.](\d{2})/gi)]
    .map((x) => `${x[3]}-${x[2]}-${x[1]}T${x[4].padStart(2, '0')}:${x[5]}:00+03:00`);
}

export function coz(html) {
  const ul = html.match(/<ul class="history">([\s\S]*?)<\/ul>/i);
  if (!ul) return [];
  const sonuc = [];
  for (const li of ul[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const m = metne(li[1]);
    const ust = m.toLocaleUpperCase('tr');
    // Tam kelime olarak geçen ilk ilçe ("KAYAŞ" içindeki "AYAŞ" sayılmaz)
    const ilce = ILCELER.map((i) => [i, ust.search(new RegExp(`(^|[^A-ZÇĞİÖŞÜ])${i}(?![A-ZÇĞİÖŞÜ])`))])
      .filter(([, p]) => p >= 0).sort((x, y) => x[1] - y[1])[0]?.[0];
    const t = tarihler(m);
    if (!ilce || !t.length) continue;
    const mahalleler = [...m.matchAll(/([A-Za-zÇĞİÖŞÜçğıöşü0-9.\- ]{2,40}?)\s+(?:MAHALLES[İI]|Mahallesi|MAH\.?|Mah\.?)(?=[\s,;]|$)/g)]
      .map((x) => x[1].trim().split(/[,;]\s*/).pop()
        .split(/\s+/).filter((w) => w.toLocaleUpperCase('tr') !== ilce).join(' '))   // "Mamak Kayaş" -> "Kayaş"
      .filter(Boolean);
    sonuc.push({
      kaynak: KAYNAK,
      kaynak_id: createHash('sha1').update([ilce, mahalleler.join('|'), t[0]].join('#')).digest('hex').slice(0, 20),
      il: 'ANKARA', ilceler: [ilce],
      detay: [{ ilce, mahalleler: mahalleler.map((ad) => ({ ad })) }],
      baslangic: t[0], bitis: t[1] || null,
      neden: 'Su arızası / çalışma', aciklama: m.slice(0, 500),
    });
  }
  return sonuc;
}

export async function cek() {
  const yanit = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' }, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  const html = await yanit.text();
  // "Kesinti Bulunamadı" paneli varsa liste boştur (panelin içinde de bir ul.history/li var, ona aldanma)
  if (/id="PnlArizaYok"/.test(html)) return [];
  await ornekSakla(KAYNAK, URL, html);
  return coz(html);
}
