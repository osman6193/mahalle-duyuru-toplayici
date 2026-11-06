// SASKİ (Samsun) su kesintileri — https://www.saski.gov.tr/sukesintileri (ortak tablo altyapısı, bkz. tablo.js)
import { tabloCek } from './tablo.js';

export const KAYNAK = 'saski';
export const cek = () => tabloCek('https://www.saski.gov.tr/sukesintileri', KAYNAK, 'SAMSUN');
