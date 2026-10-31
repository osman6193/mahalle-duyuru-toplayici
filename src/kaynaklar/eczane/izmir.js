// İzmir Eczacı Odası — bugünün nöbetçi eczaneleri (tüm il tek sayfada, nöbet saati yazmıyor)
// Kaynak: https://www.izmireczaciodasi.org.tr/nobetci-eczaneler  — ortak "epano" altyapısı
// Başlıkta ilçe yerine nöbet BÖLGESİ yazıyor ("BORNOVA 2", "ŞİRİNYER", "ÜÇYOL"). Bilinen semtler
// aşağıda ilçeye çevrilir; sondaki numara/ek sunucuda atılır; yine de bulunamazsa koordinata en yakın
// ilçe merkezi seçilir. Semt adı eczanenin altında not olarak görünür.
import { coz as epano, getir } from './epano.js';

export const KAYNAK = 'eczane-izmir';
export const IL_ID = 35;
const URL = 'https://www.izmireczaciodasi.org.tr/nobetci-eczaneler';

const SEMT_ILCE = {
  'ALSANCAK': 'Konak', 'ALSANCAK-BASMANE': 'Konak', 'BASMANE': 'Konak', 'MİTHATPAŞA': 'Konak', 'ÜÇYOL': 'Konak',
  'EŞREFPAŞA': 'Konak', 'YENİŞEHİR': 'Konak', 'GÜZELYALI': 'Konak',
  'HATAY': 'Karabağlar', 'BOZYAKA': 'Karabağlar', 'BASIN SİTESİ': 'Karabağlar',
  'ŞİRİNYER': 'Buca', 'ÇAMDİBİ': 'Bornova', 'AYRANCILAR': 'Torbalı',
  'ÇANDARLI': 'Dikili', 'ESKİ FOÇA': 'Foça', 'YENİ FOÇA': 'Foça', 'ÜRKMEZ': 'Seferihisar',
};

export function coz(html) {
  return epano(html).map((e) => {
    const bolge = e.ilce.trim();
    const ilce = SEMT_ILCE[bolge.toLocaleUpperCase('tr')];
    const ad = bolge.replace(/[\s-]*\d+$/, '').trim();
    const semtNotu = ilce || ad.toLocaleUpperCase('tr') !== bolge.toLocaleUpperCase('tr') ? bolge : null;
    return { ...e, ilce: ilce ?? bolge, not: [semtNotu && !/\d$/.test(bolge) ? semtNotu : null, e.not].filter(Boolean).join(' - ') || null };
  });
}
export const cek = async () => coz(await getir(URL));
