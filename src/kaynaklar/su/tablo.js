// Aynı yazılım altyapısını kullanan su idareleri (SASKİ Samsun, TESKİ Tekirdağ …): /sukesintileri
//   <table><thead> Başlangıç | Bitiş | Nedeni | Etkilenen Yerler </thead>
//   <tr><td>06 Kasım 11:00</td><td>06 Kasım 17:00</td><td>ANA ŞEBEKE ARIZASI</td>
//       <td>BAFRA / ALTINAY MAH. / ,BAFRA / ŞİRİNKÖY MAH. / KÖSEİLYAS CAD.</td></tr>
// Etkilenen yerler: virgülle ayrılmış "İLÇE / MAHALLE / (sokak)" üçlüleri.
import { getir } from '../../getir.js';
import { BASLIKLAR, metne, kimlik, ayliTarih, mahalleAdi, detayKur } from './ortak.js';

export function tabloCoz(html, kaynak, il) {
  const govde = html.match(/<th>\s*Etkilenen Yerler\s*<\/th>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
  if (!govde) throw new Error('kesinti tablosu bulunamadı (site yapısı değişmiş olabilir)');
  const sonuc = [];
  for (const tr of govde[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const td = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => metne(m[1]));
    if (td.length < 4) continue;
    const [bas, bit, neden, yerler] = td;
    const ciftler = [];
    const sokaklar = [];
    for (const parca of yerler.split(',')) {
      const [ilce, mahalle, sokak] = parca.split('/').map((s) => s.trim());
      if (!ilce) continue;
      ciftler.push({ ilce, mahalle: mahalle ? mahalleAdi(mahalle) : null });
      if (sokak) sokaklar.push(sokak);
    }
    const detay = detayKur(ciftler);
    if (!detay.length) continue;
    const baslangic = ayliTarih(bas);
    sonuc.push({
      kaynak,
      kaynak_id: kimlik(detay.map((d) => `${d.ilce}:${d.mahalleler.map((x) => x.ad).sort().join('|')}`).join(';'), baslangic, neden),
      il,
      ilceler: detay.map((d) => d.ilce),
      detay,
      baslangic,
      bitis: ayliTarih(bit),
      neden: neden || null,
      aciklama: sokaklar.length ? `Etkilenen sokaklar: ${[...new Set(sokaklar)].join(', ')}`.slice(0, 500) : null,
    });
  }
  return sonuc;
}

export async function tabloCek(url, kaynak, il) {
  const yanit = await getir(url, { headers: BASLIKLAR, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return tabloCoz(await yanit.text(), kaynak, il);
}
