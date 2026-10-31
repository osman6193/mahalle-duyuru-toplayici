// Ankara Eczacı Odası — nöbetçi eczaneler (tüm ilçeler).
// Sayfa listeyi JS ile şuradan alır: GET https://www.aeo.org.tr/getPharmacies/YYYY-MM-DD
//   → {"status":"success","html":"..."}  html içinde:
//   <p class="alert-nobet">31.10.2026 saat 09:30'a kadar 30.10.2026 tarihli nöbet listesi geçerlidir.</p>
//   <div class="inline-box" data-name="..." data-district="Çankaya"> <h4>AD ECZANESİ</h4>
//     <p>ADRES <br>TARİF <span>TELEFON</span></p> ... maps/search/?api=1&query=ENLEM,BOYLAM ... tel:...
// Ankara'da nöbet 24 saattir: bitişten 24 saat öncesi başlangıç.
import { getir } from './epano.js';

export const KAYNAK = 'eczane-ankara';
export const IL_ID = 6;

const metne = (h) =>
  h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

// Oda Kırıkkale'yi de kapsar; bu ilçeler Kırıkkale iline (71) yazılır
const KIRIKKALE = new Set(['Kırıkkale', 'Bahşılı', 'Balışeyh', 'Çelebi', 'Delice', 'Karakeçili', 'Keskin', 'Sulakyurt', 'Yahşihan']);
const ILCE_ADI = { Kazan: 'Kahramankazan', 'Kırıkkale': 'Merkez' };

const bugun = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

export function coz(html) {
  const uyari = html.match(/(\d{2})\.(\d{2})\.(\d{4}) saat (\d{2}):(\d{2})/);
  let baslangic = null;
  let bitis = null;
  if (uyari) {
    const [, g, a, y, s, d] = uyari;
    const b = new Date(`${y}-${a}-${g}T${s}:${d}:00+03:00`);
    bitis = b.toISOString();
    baslangic = new Date(b.getTime() - 24 * 3600_000).toISOString();
  }
  const sonuc = [];
  for (const blok of html.split(/<div class="inline-box"/i).slice(1)) {
    const ad = blok.match(/<h4>([\s\S]*?)<\/h4>/i);
    if (!ad) continue;
    const ilce = blok.match(/data-district="([^"]*)"/i);
    const p = blok.match(/<p>([\s\S]*?)<\/p>/i);
    const tel = blok.match(/<span>([^<]*)<\/span>/i) ?? blok.match(/href="tel:([^"]+)"/i);
    let adres = null;
    let not = null;
    if (p) {
      const [ust, alt = ''] = p[1].replace(/<span>[\s\S]*?<\/span>/i, '').split(/<br\s*\/?>/i);
      adres = metne(ust) || null;
      not = metne(alt) || null;
    }
    const konum = blok.match(/query=(-?[\d.]+),(-?[\d.]+)/);
    let ilceAdi = ilce ? metne(ilce[1]) : '';
    if (/belirlenmemi/i.test(ilceAdi)) ilceAdi = '';
    sonuc.push({
      ad: metne(ad[1]),
      il_id: KIRIKKALE.has(ilceAdi) ? 71 : IL_ID,
      ilce: ILCE_ADI[ilceAdi] ?? (ilceAdi || null),
      adres,
      not,
      telefon: tel ? metne(tel[1]) || null : null,
      enlem: konum ? Number(konum[1]) : null,
      boylam: konum ? Number(konum[2]) : null,
      baslangic,
      bitis,
    });
  }
  return sonuc;
}

export async function cek() {
  const govde = await getir(`https://www.aeo.org.tr/getPharmacies/${bugun()}`);
  let veri;
  try {
    veri = JSON.parse(govde);
  } catch {
    throw new Error('JSON gelmedi (Cloudflare engeli olabilir)');
  }
  if (veri.status !== 'success' || typeof veri.html !== 'string') throw new Error(`yanıt: ${veri.status}`);
  return coz(veri.html);
}
