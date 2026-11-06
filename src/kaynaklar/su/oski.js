// OSKİ (Ordu) su kesintileri — https://www.oski.gov.tr/sukesintileri (ortak tablo altyapısı, bkz. tablo.js)
import { tabloCek } from './tablo.js';

export const KAYNAK = 'oski';
export const cek = () => tabloCek('https://www.oski.gov.tr/sukesintileri', KAYNAK, 'ORDU');
