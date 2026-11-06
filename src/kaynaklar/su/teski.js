// TESKİ (Tekirdağ) su kesintileri — https://www.teski.gov.tr/sukesintileri (ortak tablo altyapısı, bkz. tablo.js)
import { tabloCek } from './tablo.js';

export const KAYNAK = 'teski';
export const cek = () => tabloCek('https://www.teski.gov.tr/sukesintileri', KAYNAK, 'TEKİRDAĞ');
