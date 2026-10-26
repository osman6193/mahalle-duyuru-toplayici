// Uludağ EDAŞ (Bursa, Balıkesir, Çanakkale, Yalova) planlı kesintiler
// Kaynak: POST https://edrimsapi.uedas.com.tr/api/DoimGeneral/KesintiGetirByKesintiTur
//   gövde: {"ilKodu":-1,...,"kesintiTur":1}  -> -1 = tümü, kesintiTur 1 = planlı
//   cevap: {SonucDurum:1, SonucIcerik:[{il, ilce, etkilenenMahaller:"A,B,C", olusmaZamani, tahminiGiderilmeZamani,
//          kesintiNedeni, kesintiTipi, enlem, boylam}]}
// Keşifte 191 kesinti / 389 mahallenin tamamı eşleşti.
// NOT: Kesinti numarası yok; il+ilçe+mahalleler+saatlerden kararlı bir kimlik üretiliyor.
import { createHash } from 'node:crypto';

export const KAYNAK = 'uludag';
const URL = 'https://edrimsapi.uedas.com.tr/api/DoimGeneral/KesintiGetirByKesintiTur';
const GOVDE = { ilKodu: -1, ilceKodu: -1, mahalleKodu: -1, csbmKodu: -1, aboneno: '', haritadanMi: 0, aboneun: -1, abonesahisun: -1, kesintiTur: 1 };

const tarih = (s) => (s ? `${s.slice(0, 19)}+03:00` : null); // "2026-10-27T09:30:00" -> İstanbul saati

export async function cek() {
  const yanit = await fetch(URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json', Accept: 'application/json',
      Origin: 'https://www.uedas.com.tr', Referer: 'https://www.uedas.com.tr/',
    },
    body: JSON.stringify(GOVDE),
    signal: AbortSignal.timeout(30000),
  });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  const veri = await yanit.json();
  if (veri.SonucDurum !== 1 || !Array.isArray(veri.SonucIcerik)) throw new Error(`beklenmeyen cevap: ${veri.SonucMesaj || 'format'}`);

  return veri.SonucIcerik.map((k) => {
    const mahalleler = String(k.etkilenenMahaller || '').split(',').map((s) => s.trim()).filter(Boolean);
    const anahtar = [k.il, k.ilce, mahalleler.slice().sort().join('|'), k.olusmaZamani, k.tahminiGiderilmeZamani].join('#');
    return {
      kaynak: KAYNAK,
      kaynak_id: createHash('sha1').update(anahtar).digest('hex').slice(0, 20),
      il: k.il,
      ilceler: [k.ilce],
      detay: [{ ilce: k.ilce, mahalleler: mahalleler.map((ad) => ({ ad })) }],
      baslangic: tarih(k.olusmaZamani),
      bitis: tarih(k.tahminiGiderilmeZamani),
      neden: k.kesintiNedeni || k.kesintiTipi || null,
      konum: k.enlem && k.boylam ? { enlem: k.enlem, boylam: k.boylam } : null,
    };
  });
}
