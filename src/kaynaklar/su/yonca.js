// "Yonca Bilişim" online işlemler altyapısını kullanan su idareleri (MESKİ Mersin, MASKİ Malatya …):
//   https://online.<idare>.gov.tr/meta/subscription/interruptions
//   Sayfada <div id="divAllInterruptions">[ {…}, … ]</div> içinde HTML kaçışlı JSON:
//   { id, value:"SU KESİNTİSİ", cause, webSiteDescription, startDate:"2026-11-06T09:07:00.000", finishDate,
//     isActive, districtList:[{ district:"SİLİFKE", quarterList:[{ quarter:"TAŞUCU" }] }], organization }
import { getir } from '../../getir.js';
import { BASLIKLAR, metne, sayisalTarih, mahalleAdi, detayKur } from './ortak.js';

const coz1 = (s) => s.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function yoncaCoz(html, kaynak, il) {
  const m = html.match(/id=["']divAllInterruptions["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!m) throw new Error('divAllInterruptions bulunamadı (site yapısı değişmiş olabilir)');
  const ham = coz1(m[1]).trim();
  if (!ham) return [];
  const liste = JSON.parse(ham);
  return liste
    .filter((k) => k && k.isActive !== 0 && Array.isArray(k.districtList))
    .map((k) => {
      const ciftler = k.districtList.flatMap((d) =>
        (d.quarterList?.length ? d.quarterList : [{ quarter: null }]).map((q) => ({
          ilce: String(d.district ?? '').trim(),
          mahalle: q.quarter ? mahalleAdi(q.quarter) : null,
        })),
      );
      const detay = detayKur(ciftler);
      const aciklama = metne(k.webSiteDescription || k.description || k.cause || '');
      return {
        kaynak,
        kaynak_id: `${kaynak}-${k.id}`,
        il,
        ilceler: detay.map((d) => d.ilce),
        detay,
        baslangic: sayisalTarih(k.startDate ?? k.planningStartDate),
        bitis: sayisalTarih(k.finishDate ?? k.planningFinishDate),
        neden: /ar[ıi]za/i.test(aciklama) ? 'Arıza' : k.value ? metne(k.value) : null,
        aciklama: aciklama.slice(0, 500) || null,
      };
    })
    .filter((k) => k.detay.length);
}

export async function yoncaCek(alan, kaynak, il) {
  const url = `https://online.${alan}/meta/subscription/interruptions`;
  const yanit = await getir(url, { headers: BASLIKLAR, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return yoncaCoz(await yanit.text(), kaynak, il);
}
