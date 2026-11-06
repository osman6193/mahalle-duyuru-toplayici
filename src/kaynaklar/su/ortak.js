// Su kesinti okuyucularının ortak yardımcıları.
import { createHash } from 'node:crypto';

/** HTML'i düz metne çevirir (sayısal ve adlı varlıklar dahil: &#x130; -> İ) */
export function metne(h) {
  return String(h ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kararlı kesinti kimliği (aynı kesinti her okumada aynı kimliği alır) */
export const kimlik = (...parcalar) => createHash('sha1').update(parcalar.join('#')).digest('hex').slice(0, 20);

const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
const iki = (n) => String(n).padStart(2, '0');
const trSimdi = () => new Date(Date.now() + 3 * 3600_000);

/** "06 Kasım 11:00" (yılsız) -> ISO; yıl, bugüne en yakın olacak şekilde seçilir (Aralık/Ocak geçişi) */
export function ayliTarih(metin) {
  const m = String(metin).match(/(\d{1,2})\s+(\p{L}+)\s+(?:(\d{4})\s+)?(\d{1,2})[:.](\d{2})/u);
  if (!m) return null;
  const ay = AYLAR.indexOf(m[2].toLocaleLowerCase('tr'));
  if (ay < 0) return null;
  let yil = m[3] ? Number(m[3]) : trSimdi().getUTCFullYear();
  if (!m[3]) {
    const buAy = trSimdi().getUTCMonth();
    if (ay - buAy > 6) yil--;
    else if (buAy - ay > 6) yil++;
  }
  return `${yil}-${iki(ay + 1)}-${iki(m[1])}T${iki(m[4])}:${m[5]}:00+03:00`;
}

/** "06.11.2026 10:50" ya da "2026-11-06 10:30:00.0" -> ISO */
export function sayisalTarih(metin) {
  const s = String(metin ?? '');
  let m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})\s+(\d{1,2})[:.](\d{2})/);
  if (m) return `${m[3]}-${iki(m[2])}-${iki(m[1])}T${iki(m[4])}:${m[5]}:00+03:00`;
  m = s.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+03:00`;
  return null;
}

/** "6 Saat", "1,5 saat", "30 Dakika" -> bitiş = başlangıç + süre */
export function sureEkle(baslangic, sure) {
  if (!baslangic) return null;
  const m = String(sure ?? '').match(/(\d+(?:[.,]\d+)?)\s*(saat|dakika|dk|gün)/i);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  const dk = /saat/i.test(m[2]) ? n * 60 : /gün/i.test(m[2]) ? n * 1440 : n;
  return new Date(new Date(baslangic).getTime() + dk * 60_000).toISOString();
}

/** "ÇİFTLİKÖNÜ MAH." / "YENİKÖY Mah." -> "ÇİFTLİKÖNÜ" */
export const mahalleAdi = (s) => metne(s).replace(/\s+(MAHALLES[İI]|Mahallesi|MAH\.?|Mah\.?)\s*$/i, '').trim();

/** [{ilce, mahalle}] -> detay: [{ilce, mahalleler:[{ad}]}] (ilçeye göre gruplu, tekrarsız) */
export function detayKur(ciftler) {
  const m = new Map();
  for (const { ilce, mahalle } of ciftler) {
    if (!ilce) continue;
    if (!m.has(ilce)) m.set(ilce, new Set());
    if (mahalle) m.get(ilce).add(mahalle);
  }
  return [...m].map(([ilce, s]) => ({ ilce, mahalleler: [...s].map((ad) => ({ ad })) }));
}
