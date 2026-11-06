// TİSKİ (Trabzon) su kesintileri — https://www.tiski.gov.tr/Tiski/SuKesintileri (sunucuda üretilen kartlar)
//   <span>SU KESİNTİSİ</span> … <h3>TRABZON / VAKFIKEBİR / DÜZLÜK MAH. / TRABZON / VAKFIKEBİR / SOĞUKSU MAH.</h3>
//   <small>Kesinti Sebebi</small><span>…</span> <small>Kesinti Başlangıç</small><span>2026-11-06 10:30:00.0</span>
//   <small>Tahmini Bitiş</small><span>…</span> <div>AÇIKLAMA</div>
import { getir } from '../../getir.js';
import { BASLIKLAR, metne, kimlik, sayisalTarih, mahalleAdi, detayKur } from './ortak.js';

export const KAYNAK = 'tiski';
const URL = 'https://www.tiski.gov.tr/Tiski/SuKesintileri';

const etiketli = (kart, etiket) =>
  metne(kart.match(new RegExp(`<small>\\s*${etiket}\\s*<\\/small>\\s*<span>([\\s\\S]*?)<\\/span>`, 'i'))?.[1] ?? '') || null;

export function coz(html) {
  const sonuc = [];
  // Her kart "Kesinti Sebebi"nden önceki <h3> ile başlar
  const parcalar = html.split(/<h3[^>]*>/i).slice(1);
  for (const p of parcalar) {
    const [baslik, ...geri] = p.split(/<\/h3>/i);
    const kart = geri.join('</h3>').split(/<h3[^>]*>/i)[0].slice(0, 5000);
    if (!/Kesinti Ba(ş|s)lang/i.test(kart)) continue;
    // "TRABZON / İLÇE / MAH. / TRABZON / İLÇE / MAH." -> üçlüler
    const s = metne(baslik).split('/').map((x) => x.trim()).filter(Boolean);
    const ciftler = [];
    for (let i = 0; i + 2 < s.length + 1; i += 3) {
      const [il, ilce, mahalle] = s.slice(i, i + 3);
      if (!ilce || !/TRABZON/i.test(il ?? '')) continue;
      ciftler.push({ ilce, mahalle: mahalle ? mahalleAdi(mahalle) : null });
    }
    const detay = detayKur(ciftler);
    if (!detay.length) continue;
    const baslangic = sayisalTarih(etiketli(kart, 'Kesinti Ba(?:ş|s)lang(?:ı|i)(?:ç|c)'));
    const neden = etiketli(kart, 'Kesinti Sebebi');
    const aciklama = metne(kart.match(/<\/div>\s*<\/div>\s*<\/div>\s*<div[^>]*>([^<]{5,500})<\/div>/i)?.[1] ?? '') || null;
    sonuc.push({
      kaynak: KAYNAK,
      kaynak_id: kimlik(detay.map((d) => `${d.ilce}:${d.mahalleler.map((x) => x.ad).sort().join('|')}`).join(';'), baslangic, neden),
      il: 'TRABZON',
      ilceler: detay.map((d) => d.ilce),
      detay,
      baslangic,
      bitis: sayisalTarih(etiketli(kart, 'Tahmini Biti(?:ş|s)')),
      neden,
      aciklama,
    });
  }
  return sonuc;
}

export async function cek() {
  const yanit = await getir(URL, { headers: BASLIKLAR, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return coz(await yanit.text());
}
