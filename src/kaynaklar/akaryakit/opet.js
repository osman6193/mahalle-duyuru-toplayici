// Opet — il merkezi pompa fiyatları (sitenin kendi kullandığı JSON uç noktası).
// GET https://api.opet.com.tr/api/fuelprices/allprices → [{provinceCode, provinceName, districtName:"MERKEZ", prices:[{productShortName, amount}]}]
// GET https://api.opet.com.tr/api/fuelprices/lastupdate → {"lastUpdateDate":"27.10.2026"}
// provinceCode = plaka = iller.id (İstanbul Avrupa yakası 934). Opet istasyonlarında LPG fiyatı listelenmez.
import { getirJson } from './ortak.js';

export const DAGITICI = 'opet';

export function coz(liste, sonGuncelleme) {
  const tarih = (sonGuncelleme?.lastUpdateDate ?? '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
  const fiyat = (p, kisa) => p.prices?.find((x) => x.productShortName === kisa)?.amount ?? null;
  return {
    tarih: tarih ? `${tarih[3]}-${tarih[2]}-${tarih[1]}` : null,
    liste: (liste ?? []).map((p) => ({
      // İstanbul iki satır: 34 = Anadolu yakası, 934 = Avrupa yakası
      il_id: Number(p.provinceCode) === 934 ? 34 : Number(p.provinceCode),
      bolge:
        Number(p.provinceCode) === 934 ? 'Avrupa' : Number(p.provinceCode) === 34 ? 'Anadolu' : null,
      benzin: fiyat(p, 'KURS'),
      motorin: fiyat(p, 'MT_ECO') ?? fiyat(p, 'MT_ULT'),
      lpg: null,
    })),
  };
}

export async function cek() {
  const [liste, son] = await Promise.all([
    getirJson('https://api.opet.com.tr/api/fuelprices/allprices'),
    getirJson('https://api.opet.com.tr/api/fuelprices/lastupdate').catch(() => null),
  ]);
  return coz(liste, son);
}
