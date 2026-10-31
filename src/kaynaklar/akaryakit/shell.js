// Shell — ilçe bazında pompa fiyatları (JSON servis, shell.com.tr sayfasının kullandığı)
//   GET https://pompafiyat.turkiyeshell.com/api/Public/prices
//   { products:[{fepProductCode:"37  ", genProductName:"V-Power"}...],
//     groups:[{cityCode:"001", cityName:"ADANA", counties:[{countyCode, countyName, prices:{"37  ":78.2, ...}}]}] }
// Ürün kodları: 37 = K.Benzin 95 (V-Power), 34 = V-Power Diesel, 5 = Otogaz LPG.
// İl fiyatı = ilçelerdeki en yaygın fiyat (bazı illerde turistik ilçeler farklı);
// İstanbul Avrupa ve Anadolu yakası ayrı hesaplanır.
import { getirJson, ilKayitlari } from './ortak.js';

export const DAGITICI = 'shell';

const KOD = { benzin: '37', motorin: '34', lpg: '5' };

/** Fiyat sözlüğünde kodu (boşluklu anahtarlarla) bulur */
const fiyat = (p, kod) => {
  const anahtar = Object.keys(p || {}).find((k) => k.trim() === kod);
  const v = anahtar ? Number(p[anahtar]) : NaN;
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
};

export function coz(json) {
  const sonuc = [];
  for (const g of json?.groups ?? []) {
    const il_id = Number(g.cityCode);
    const satirlar = (g.counties ?? []).map((c) => ({
      ilce: c.countyName,
      benzin: fiyat(c.prices, KOD.benzin),
      motorin: fiyat(c.prices, KOD.motorin),
      lpg: fiyat(c.prices, KOD.lpg),
    }));
    if (il_id && satirlar.length) sonuc.push(...ilKayitlari(il_id, satirlar));
  }
  return { tarih: null, liste: sonuc.filter((s) => s.benzin || s.motorin || s.lpg) };
}

export const cek = async () => coz(await getirJson('https://pompafiyat.turkiyeshell.com/api/Public/prices'));
