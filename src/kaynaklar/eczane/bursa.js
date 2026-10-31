// Bursa Eczacı Odası — bugünün nöbetçi eczaneleri (tüm ilçeler tek sayfada, nöbet saatleriyle)
// Kaynak: https://www.beo.org.tr/nobetci-eczaneler  — ortak "epano" altyapısı (bkz. epano.js)
import { coz, getir } from './epano.js';

export const KAYNAK = 'eczane-bursa';
export const IL_ID = 16;
const URL = 'https://www.beo.org.tr/nobetci-eczaneler';

export { coz };
export const cek = async () => coz(await getir(URL));
