// Akdeniz EDAŞ (Antalya, Isparta, Burdur) planlı kesintiler — CK Enerji altyapısı
// Kaynak: https://www.akdenizedas.com.tr/GetItemsData
//
// Mesaj kalıbı (keşifle görüldü):
//   "ANTALYA,KUMLUCA,MERKEZ ADRASAN,MERKEZ ADRASAN Mah.,MERKEZ BEYKONAK Mah. KODAL Sk.;BURDUR,ÇELTİKÇİ,GÜVENLİ KÖYÜ AŞAĞI Mah. bölgelerinde ..."
//   - ";" il/ilçe gruplarını ayırır; grup = "İL,İLÇE,yer1,yer2,..."
//   - Mahalle adı "Mah." kelimesinden önce gelir; başındaki "MERKEZ " belde/semt önekidir
//   - Köylerde: "SULUDERE KÖYÜ YENİ SULUDERE Mah." -> köy SULUDERE, mahalle YENİ SULUDERE
//   - "Mah." içermeyen yerler (sokak/mevki) aynı mahallenin "Mah."lı tekrarıyla birlikte gelir, atlanır
import { ckKaynagi } from './ck-platform.js';

export function mesajiCoz(mesaj) {
  const govde = (mesaj || '').split(/\s+bölgelerinde\s+/)[0];
  const sonuc = [];
  for (const grup of govde.split(';')) {
    const parcalar = grup.split(',').map((s) => s.trim()).filter(Boolean);
    if (parcalar.length < 2) continue;
    const [il, ilce, ...yerler] = parcalar;
    const adlar = new Set();
    for (const yer of yerler) {
      // "Mah."lı yer: mahalle adı ondan önce. "Mah." yoksa (örn. "MERKEZ KAPAKLI" ya da
      // "MERKEZ MAHMUTLAR KILINÇ ARSLAN") tamamı aday olur; Supabase kelime kelime kısaltarak eşleştirir.
      const m = yer.match(/^(.*?)\s+Mah\.?(?:\s|$)/);
      let on = (m ? m[1] : yer).trim();
      if (!m && !/^MERKEZ\s|(?:KÖYÜ|Köyü)\s/.test(on)) continue;   // önek yoksa sokak/mevki olabilir, atla
      const koy = on.match(/^(.+?)\s+(?:KÖYÜ|Köyü)\s+(.+)$/);
      if (koy) {
        adlar.add(koy[1].trim());                                // köyün kendisi
        on = koy[2].trim();
      } else {
        on = on.replace(/^MERKEZ\s+/, '');
      }
      on = on.replace(/\s+MAHALLESİ$/, '').trim();
      if (on && on !== 'KÖYÜN KENDİSİ') adlar.add(on);
    }
    sonuc.push({ il, ilce, mahalleler: [...adlar].map((ad) => ({ ad })) });
  }
  return sonuc;
}

export const { KAYNAK, cek } = ckKaynagi({ kaynak: 'akdeniz', url: 'https://www.akdenizedas.com.tr/GetItemsData', cozucu: mesajiCoz });
