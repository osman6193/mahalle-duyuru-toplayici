// Kayseri ve Civarı Elektrik T.A.Ş. (KCETAŞ) planlı kesintiler ve bakımlar
// Kaynak: https://www.kcetas.com.tr/tr/planli-kesintiler-bakimlar  (sunucu tarafında çizilen tablo, gün gün)
//   <tr data-pk-satir data-ilce="KOCASİNAN"> <td ilce> <td adres><button data-pk-tam="… MAH. … SOK. … / …">
//   <td tarih> 31.10.2026 <td saat_araligi> 08:45 - 17:00 <td sure> <td durum>
//   İptal edilenlerin adresi "(İPTAL EDİLDİ)" ile başlar; bunlar listeye alınmaz (senkron iptal eder).
//   Mahalleler " / " ile ayrılan parçaların "X MAH." kısmından çıkar.
import { createHash } from 'node:crypto';

export const KAYNAK = 'kcetas';
const URL = 'https://www.kcetas.com.tr/tr/planli-kesintiler-bakimlar';
const GUN = 7;   // bugün + 6 gün

const metne = (s) =>
  String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ').trim();

export function mahalleleri(adres) {
  const set = new Set();
  for (const parca of adres.split(/\s+\/\s*/)) {
    const m = parca.match(/^(.+?)\s+(?:MAH\.?|MAHALLESİ|KÖYÜ|KÖY)(?:\s|$)/i);
    if (m) set.add(m[1].replace(/^\(.*?\)\s*/, '').trim());
  }
  return [...set].filter((x) => x.length >= 2);
}

export function coz(html) {
  const sonuc = [];
  for (const blok of html.split(/<tr\b[^>]*data-pk-satir/).slice(1)) {
    const satir = blok.split('</tr>')[0];
    const ilce = metne(satir.match(/data-ilce="([^"]+)"/)?.[1]);
    // Uzun adres: düğmedeki data-pk-tam; kısa adres: hücrenin kendi metni
    const tam =
      satir.match(/data-pk-tam="([^"]*)"/)?.[1] ??
      satir.match(/ic-pk__td--adres"[^>]*>([\s\S]*?)<\/td>/)?.[1];
    const adres = metne(tam);
    const tarih = satir.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    const saat = satir.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
    if (!ilce || !tarih || !saat || /İPTAL EDİLDİ/i.test(adres)) continue;
    const gun = `${tarih[3]}-${tarih[2]}-${tarih[1]}`;
    const kimlik = createHash('sha1').update(`${ilce}|${gun}|${saat[0]}|${adres.slice(0, 120)}`).digest('hex').slice(0, 16);
    sonuc.push({
      kaynak: KAYNAK,
      kaynak_id: kimlik,
      il: 'KAYSERİ',
      ilceler: [ilce],
      detay: [{ ilce, mahalleler: mahalleleri(adres).map((ad) => ({ ad })) }],
      baslangic: `${gun}T${saat[1]}:${saat[2]}:00+03:00`,
      bitis: `${gun}T${saat[3]}:${saat[4]}:00+03:00`,
      neden: 'Planlı bakım',
      aciklama: adres,
    });
  }
  return sonuc;
}

async function sayfa(tarih) {
  const yanit = await fetch(`${URL}?tarih=${tarih}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36' },
    signal: AbortSignal.timeout(45000),
  });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return yanit.text();
}

export async function cek() {
  const tum = new Map();
  for (let i = 0; i < GUN; i++) {
    const t = new Date(Date.now() + 3 * 3600_000 + i * 86400_000).toISOString().slice(0, 10);
    const html = await sayfa(t);
    // Site tarih parametresini tanımazsa hep bugünü döndürür; aynı kayıtlar tekrar eklenmez
    for (const k of coz(html)) tum.set(k.kaynak_id, k);
  }
  return [...tum.values()];
}
