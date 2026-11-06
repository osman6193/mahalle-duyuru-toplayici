// GASKİ (Gaziantep) su kesintileri — https://www.gaski.gov.tr/api/kesinti_list.php (ana sayfadaki pencerenin içeriği, HTML parça)
//   <div class="single-address-booking-wrapper"> <div class="name"><p>Anlık Su Kesintisi</p></div>
//     <div class="address">AÇIKLAMA</div> <b>Kesinti Başlangıç Tarihi:</b> 06/11/2026 11:35
//     <b>Kesinti Bitiş Tarihi:</b> Belirtilmedi … <div class="category">BÜYÜKKARAKUYU MAH. (YAVUZELİ)</div>
import { getir } from '../../getir.js';
import { BASLIKLAR, metne, kimlik, sayisalTarih, mahalleAdi, detayKur } from './ortak.js';

export const KAYNAK = 'gaski';
const URL = 'https://www.gaski.gov.tr/api/kesinti_list.php';

export function coz(html) {
  const sonuc = [];
  for (const kart of html.split(/class=["']single-address-booking-wrapper["']/i).slice(1)) {
    const baslik = metne(kart.match(/class=["']name["'][\s\S]*?<p>([\s\S]*?)<\/p>/i)?.[1] ?? '');
    const aciklama = metne(kart.match(/class=["']address["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '');
    const bas = metne(kart.match(/Kesinti Ba(?:ş|s)lang[ıi](?:ç|c) Tarihi:\s*<\/b>([\s\S]*?)<\/div>/i)?.[1] ?? '');
    const bit = metne(kart.match(/Kesinti Biti(?:ş|s) Tarihi:\s*<\/b>([\s\S]*?)<\/div>/i)?.[1] ?? '');
    const ciftler = [...kart.matchAll(/class=["']category["'][^>]*>([\s\S]*?)<\/div>/gi)].map((m) => {
      const t = metne(m[1]); // "BÜYÜKKARAKUYU MAH. (YAVUZELİ)"
      const ilce = t.match(/\(([^)]+)\)\s*$/)?.[1]?.trim() ?? null;
      return { ilce, mahalle: mahalleAdi(t.replace(/\([^)]*\)\s*$/, '')) };
    });
    const detay = detayKur(ciftler);
    if (!detay.length) continue;
    const baslangic = sayisalTarih(bas);
    sonuc.push({
      kaynak: KAYNAK,
      kaynak_id: kimlik(detay.map((d) => `${d.ilce}:${d.mahalleler.map((x) => x.ad).sort().join('|')}`).join(';'), baslangic),
      il: 'GAZİANTEP',
      ilceler: detay.map((d) => d.ilce),
      detay,
      baslangic,
      bitis: sayisalTarih(bit),
      neden: baslik || null,
      aciklama: aciklama.slice(0, 500) || null,
    });
  }
  return sonuc;
}

export async function cek() {
  const yanit = await getir(URL, { headers: BASLIKLAR, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return coz(await yanit.text());
}
