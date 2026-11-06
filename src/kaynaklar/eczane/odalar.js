// Ortak "epano" altyapısını kullanan eczacı odaları — tek çözücüyle (epano.js) okunur.
// Her satır bir sayfa: { kaynak, il (plaka), url, iller? }
//   iller: sayfada başka illerin eczaneleri de varsa (bölüm başlığı ya da ilçe adı il adıysa o ile yazılır)
// Yeni oda eklemek: sayfası epano ise buraya bir satır yeter.
import { coz, getir } from './epano.js';

const w = (alan, yol = 'nobetci-eczaneler') => `https://www.${alan}/${yol}`;

export const ODALAR = [
  { kaynak: 'eczane-adana', il: 1, url: w('adanaeo.org.tr') },
  { kaynak: 'eczane-adiyaman', il: 2, url: w('adiyamaneo.org.tr') },
  { kaynak: 'eczane-afyon', il: 3, url: w('afyoneczaciodasi.org.tr') },
  { kaynak: 'eczane-agri', il: 4, url: w('agrieo.org.tr') },
  { kaynak: 'eczane-aksaray', il: 68, url: w('aksarayeo.org.tr'), iller: [68, 40] },
  { kaynak: 'eczane-aydin', il: 9, url: w('aydineczaciodasi.org.tr') },
  { kaynak: 'eczane-balikesir', il: 10, url: w('balikesireczaciodasi.org.tr') },
  { kaynak: 'eczane-batman', il: 72, url: w('batmaneczaciodasi.org.tr', 'nobetci-eczaneler/72') },
  { kaynak: 'eczane-mus', il: 49, url: w('batmaneczaciodasi.org.tr', 'nobetci-eczaneler/49') },
  { kaynak: 'eczane-bursa', il: 16, url: w('beo.org.tr') },
  { kaynak: 'eczane-burdur', il: 15, url: w('burdureo.org.tr') },
  { kaynak: 'eczane-canakkale', il: 17, url: w('canakkaleeo.org.tr') },
  { kaynak: 'eczane-corum', il: 19, url: w('corumeo.org.tr') },
  { kaynak: 'eczane-denizli', il: 20, url: w('denizlieczaciodasi.org.tr') },
  { kaynak: 'eczane-diyarbakir', il: 21, url: w('diyarbakireo.org.tr') },
  { kaynak: 'eczane-edirne', il: 22, url: w('edirneeo.org.tr') },
  { kaynak: 'eczane-elazig', il: 23, url: w('elazigeczaciodasi.org.tr', 'nobetci-eczaneler/elazig') },
  { kaynak: 'eczane-bingol', il: 12, url: w('elazigeczaciodasi.org.tr', 'nobetci-eczaneler/bingol') },
  { kaynak: 'eczane-tunceli', il: 62, url: w('elazigeczaciodasi.org.tr', 'nobetci-eczaneler/tunceli') },
  { kaynak: 'eczane-erzincan', il: 24, url: w('erzincaneo.org.tr') },
  { kaynak: 'eczane-erzurum', il: 25, url: w('erzurumeo.org.tr', 'nobetci-eczaneler/25') },
  { kaynak: 'eczane-kars', il: 36, url: w('erzurumeo.org.tr', 'nobetci-eczaneler/36') },
  { kaynak: 'eczane-bayburt', il: 69, url: w('erzurumeo.org.tr', 'nobetci-eczaneler/69') },
  { kaynak: 'eczane-ardahan', il: 75, url: w('erzurumeo.org.tr', 'nobetci-eczaneler/75') },
  { kaynak: 'eczane-igdir', il: 76, url: w('erzurumeo.org.tr', 'nobetci-eczaneler/76') },
  { kaynak: 'eczane-eskisehir', il: 26, url: w('eskisehireo.org.tr', 'eskisehir-nobetci-eczaneler') },
  { kaynak: 'eczane-bilecik', il: 11, url: w('eskisehireo.org.tr', 'bilecik-nobetci-eczaneler') },
  { kaynak: 'eczane-hatay', il: 31, url: w('hatayeo.org.tr') },
  { kaynak: 'eczane-isparta', il: 32, url: w('ispartaeo.org.tr') },
  { kaynak: 'eczane-kahramanmaras', il: 46, url: w('kahramanmaraseo.org.tr') },
  { kaynak: 'eczane-kastamonu', il: 37, url: w('kastamonueo.org.tr', 'nobetci-eczaneler/37') },
  { kaynak: 'eczane-cankiri', il: 18, url: w('kastamonueo.org.tr', 'nobetci-eczaneler/18') },
  { kaynak: 'eczane-karabuk', il: 78, url: w('kastamonueo.org.tr', 'nobetci-eczaneler/78') },
  { kaynak: 'eczane-kayseri', il: 38, url: w('kayserieo.org.tr') },
  { kaynak: 'eczane-kirklareli', il: 39, url: w('kirklarelieo.org.tr') },
  { kaynak: 'eczane-kocaeli', il: 41, url: w('kocaelieo.org.tr') },
  { kaynak: 'eczane-kutahya', il: 43, url: w('kutahyaeo.org.tr') },
  { kaynak: 'eczane-manisa', il: 45, url: w('manisaeczaciodasi.org.tr') },
  { kaynak: 'eczane-mardin', il: 47, url: w('mardineczaciodasi.org.tr') },
  { kaynak: 'eczane-mersin', il: 33, url: w('mersineczaciodasi.org.tr') },
  { kaynak: 'eczane-mugla', il: 48, url: w('muglaeczaciodasi.org.tr') },
  { kaynak: 'eczane-nigde', il: 51, url: w('neo.org.tr') },
  { kaynak: 'eczane-nevsehir', il: 50, url: w('nevsehireo.org.tr') },
  { kaynak: 'eczane-osmaniye', il: 80, url: w('osmaniyeeczaciodasi.org.tr') },
  { kaynak: 'eczane-samsun', il: 55, url: w('samsuneczaciodasi.org.tr') },
  { kaynak: 'eczane-sakarya', il: 54, url: w('seo.org.tr') },
  { kaynak: 'eczane-bolu', il: 14, url: w('seo.org.tr', 'nobetci-eczaneler/14') },
  { kaynak: 'eczane-siirt', il: 56, url: w('siirteo.org.tr') },
  { kaynak: 'eczane-sirnak', il: 73, url: w('sirnakeo.org.tr') },
  { kaynak: 'eczane-sivas', il: 58, url: w('sivaseo.org.tr') },
  { kaynak: 'eczane-tekirdag', il: 59, url: w('teo.org.tr') },
  { kaynak: 'eczane-trabzon', il: 61, url: w('trabzoneczaciodasi.org.tr', 'nobetci-eczaneler/61') },
  { kaynak: 'eczane-gumushane', il: 29, url: w('trabzoneczaciodasi.org.tr', 'nobetci-eczaneler/29') },
  { kaynak: 'eczane-artvin', il: 8, url: w('trabzoneczaciodasi.org.tr', 'nobetci-eczaneler/8') },
  { kaynak: 'eczane-van', il: 65, url: w('vaneczaciodasi.org.tr'), iller: [65, 13, 30] },
  { kaynak: 'eczane-yozgat', il: 66, url: w('yozgateo.org.tr') },
  { kaynak: 'eczane-zonguldak', il: 67, url: w('zeo.org.tr'), iller: [67, 74] },
];

// Plaka -> il adı (bölüm başlığındaki il adını tanımak için)
const IL_ADI = {
  1: 'Adana', 2: 'Adıyaman', 3: 'Afyonkarahisar', 4: 'Ağrı', 5: 'Amasya', 6: 'Ankara', 7: 'Antalya', 8: 'Artvin',
  9: 'Aydın', 10: 'Balıkesir', 11: 'Bilecik', 12: 'Bingöl', 13: 'Bitlis', 14: 'Bolu', 15: 'Burdur', 16: 'Bursa',
  17: 'Çanakkale', 18: 'Çankırı', 19: 'Çorum', 20: 'Denizli', 21: 'Diyarbakır', 22: 'Edirne', 23: 'Elazığ',
  24: 'Erzincan', 25: 'Erzurum', 26: 'Eskişehir', 27: 'Gaziantep', 28: 'Giresun', 29: 'Gümüşhane', 30: 'Hakkari',
  31: 'Hatay', 32: 'Isparta', 33: 'Mersin', 34: 'İstanbul', 35: 'İzmir', 36: 'Kars', 37: 'Kastamonu', 38: 'Kayseri',
  39: 'Kırklareli', 40: 'Kırşehir', 41: 'Kocaeli', 42: 'Konya', 43: 'Kütahya', 44: 'Malatya', 45: 'Manisa',
  46: 'Kahramanmaraş', 47: 'Mardin', 48: 'Muğla', 49: 'Muş', 50: 'Nevşehir', 51: 'Niğde', 52: 'Ordu', 53: 'Rize',
  54: 'Sakarya', 55: 'Samsun', 56: 'Siirt', 57: 'Sinop', 58: 'Sivas', 59: 'Tekirdağ', 60: 'Tokat', 61: 'Trabzon',
  62: 'Tunceli', 63: 'Şanlıurfa', 64: 'Uşak', 65: 'Van', 66: 'Yozgat', 67: 'Zonguldak', 68: 'Aksaray', 69: 'Bayburt',
  70: 'Karaman', 71: 'Kırıkkale', 72: 'Batman', 73: 'Şırnak', 74: 'Bartın', 75: 'Ardahan', 76: 'Iğdır', 77: 'Yalova',
  78: 'Karabük', 79: 'Kilis', 80: 'Osmaniye', 81: 'Düzce',
};
const sade = (s) => (s ?? '').toLocaleUpperCase('tr').replace(/[ÇĞİIÖŞÜ]/g, (h) => ({ Ç: 'C', Ğ: 'G', İ: 'I', I: 'I', Ö: 'O', Ş: 'S', Ü: 'U' })[h]).trim();

/** Bir odanın sayfasını okur; her eczaneye il_id koyar (çok illi odalarda başlıktaki il adına göre) */
export async function odaCek(oda) {
  const liste = coz(await getir(oda.url));
  if (!oda.iller) return liste;
  const adlar = new Map(oda.iller.map((p) => [sade(IL_ADI[p]), p]));
  return liste.map((e) => {
    const p = adlar.get(sade(e.bolum_il)) ?? adlar.get(sade(e.ilce));
    // İlçe yerine il adı yazıyorsa (ör. "BARTIN") ilçeyi konumdan bulmaya bırak
    const ilceIlAdi = adlar.has(sade(e.ilce));
    return { ...e, il_id: p ?? oda.il, ilce: ilceIlAdi ? null : e.ilce };
  });
}
