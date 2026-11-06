// ASKİ (Ankara) su arızaları / kesintileri
// Kaynak: https://www.aski.gov.tr/tr/Kesinti.aspx  (ASP.NET, sunucuda üretilen HTML)
//   Kesinti yokken: <div id="PnlArizaYok"> ... "Kesinti Bulunamadı"
//   Kesinti varken <ul class="history"> içinde her <li>:
//     <h4><strong>ALTINDAĞ</strong></h4> <h4><strong> Arıza Kaynaklı </strong></h4>
//     <p><b>Arıza Tarihi: </b>6.11.2026 09:20:00<br /><b>Tamir Tarihi: </b>6.11.2026 14:00:00<br />
//        <b>Detay: </b>… Battalgazi mahallesi 1232.sokak …<br /><b>Etkilenen Yerler:</b> Battalgazi mahallesinin bir kısmı …</p>
//   Dikkat: gün/ay tek haneli gelebiliyor ("6.11.2026").
import { createHash } from 'node:crypto';
import { ornekSakla } from '../kesinti-calistir.js';
import { metne } from './ortak.js';

export const KAYNAK = 'aski';
const URL = 'https://www.aski.gov.tr/tr/Kesinti.aspx';

const iki = (n) => String(n).padStart(2, '0');
function tarih(m) {
  const x = String(m ?? '').match(/(\d{1,2})[./](\d{1,2})[./](\d{4})\s*(?:saat\s*)?(\d{1,2})[:.](\d{2})/i);
  return x ? `${x[3]}-${iki(x[2])}-${iki(x[1])}T${iki(x[4])}:${x[5]}:00+03:00` : null;
}

/** <b>Etiket:</b> değer <br> */
const alan = (p, etiket) => metne(p.match(new RegExp(`<b>\\s*${etiket}\\s*:?\\s*<\\/b>([\\s\\S]*?)(?:<br\\s*\\/?>|<\\/p>|$)`, 'i'))?.[1] ?? '') || null;

/** "Battalgazi mahallesinin bir kısmı", "Kayaş ve Ege mahalleleri" -> ["Battalgazi", …] */
function mahalleler(metin, ilce) {
  const sonuc = new Set();
  // Büyük harfle başlayan 1-3 kelimelik adlar (", " / " ve " ile birden çok), ardından "mahalle…" / "mah."
  const AD = "[A-ZÇĞİÖŞÜ][A-Za-zçğıöşüÇĞİÖŞÜ0-9.'-]*(?:\\s+[A-ZÇĞİÖŞÜ0-9][A-Za-zçğıöşüÇĞİÖŞÜ0-9.'-]*){0,2}";
  const desen = new RegExp(`(${AD}(?:\\s*(?:,|\\s+ve\\s+)\\s*${AD})*)\\s+(?:[Mm]ahalle(?:si|sinin|leri|lerinin|lerinde|sinde)?|MAHALLES[İI]|MAHALLELER[İI]|[Mm]ah\\.?|MAH\\.?)(?=[\\s,.;)]|$)`, 'g');
  for (const m of String(metin ?? '').matchAll(desen)) {
    for (const ad of m[1].split(/,|\s+ve\s+/i)) {
      const t = ad.trim().split(/\s+/).filter((w) => w.toLocaleUpperCase('tr') !== ilce).join(' ');
      if (t && t.length >= 2 && !/^(bir|ve|ile|ilgili)$/i.test(t)) sonuc.add(t);
    }
  }
  return [...sonuc];
}

export function coz(html) {
  const ul = html.match(/<ul class="history">([\s\S]*?)<\/ul>/i);
  if (!ul) return [];
  const sonuc = [];
  for (const li of ul[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const h4 = [...li[1].matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>/gi)].map((m) => metne(m[1]));
    const ilce = (h4[0] ?? '').toLocaleUpperCase('tr');
    const p = li[1].match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? '';
    const baslangic = tarih(alan(p, 'Ar[ıi]za Tarihi'));
    if (!ilce || !baslangic) continue;
    const detayMetni = alan(p, 'Detay') ?? '';
    const yerler = alan(p, 'Etkilenen Yerler') ?? '';
    const mah = mahalleler(`${yerler}. ${detayMetni}`, ilce);
    sonuc.push({
      kaynak: KAYNAK,
      kaynak_id: createHash('sha1').update([ilce, mah.slice().sort().join('|'), baslangic].join('#')).digest('hex').slice(0, 20),
      il: 'ANKARA', ilceler: [ilce],
      detay: [{ ilce, mahalleler: mah.map((ad) => ({ ad })) }],
      baslangic, bitis: tarih(alan(p, 'Tamir Tarihi')),
      neden: h4[1] || 'Su arızası',
      aciklama: [yerler ? `Etkilenen yerler: ${yerler}` : null, detayMetni].filter(Boolean).join(' · ').slice(0, 500) || null,
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
