// Antalya Eczacı Odası — https://www.antalyaeo.org.tr/tr/nobetci-eczaneler (tüm ilçeler tek sayfada)
//   <div class="ilce"><div class="ilcebas">… <span> Muratpaşa</span></div>
//     <div class="nesne row nobetciDiv"> <a href="tel:0242 …">AD ECZANESİ</a> … <a href="https://maps.google.com/maps?q=ENLEM,BOYLAM" class="nadres">… ADRES</a>
import { getir } from './epano.js';

export const KAYNAK = 'eczane-antalya';
export const IL_ID = 7;
const URL = 'https://www.antalyaeo.org.tr/tr/nobetci-eczaneler';

const metne = (h) =>
  h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

export function coz(html) {
  const sonuc = [];
  for (const ilceBlok of html.split(/<div class=["']ilce["']>/i).slice(1)) {
    const ilce = metne(ilceBlok.match(/class=["']ilcebas["'][\s\S]*?<span>([^<]+)<\/span>/i)?.[1] ?? '') || null;
    for (const e of ilceBlok.split(/class=["'][^"']*\bnobetciDiv\b/i).slice(1)) {
      const ad = e.match(/href=["']tel:[^"']*["'][^>]*>([^<]+)<\/a>/i);
      if (!ad) continue;
      const tel = e.match(/href=["']tel:([^"']+)["']/i)?.[1]?.trim() ?? null;
      const konum = e.match(/maps\?q=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
      const adres = e.match(/class=["']nadres["'][^>]*>([\s\S]*?)<\/a>/i);
      sonuc.push({
        ad: metne(ad[1]),
        ilce,
        adres: adres ? metne(adres[1]) || null : null,
        telefon: tel,
        enlem: konum ? Number(konum[1]) : null,
        boylam: konum ? Number(konum[2]) : null,
        baslangic: null,
        bitis: null,
      });
    }
  }
  return sonuc;
}

export const cek = async () => coz(await getir(URL));
