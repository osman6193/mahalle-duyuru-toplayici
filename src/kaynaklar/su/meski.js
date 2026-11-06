// MESKİ (Mersin) su kesintileri — Yonca altyapısı (bkz. yonca.js)
import { yoncaCek } from './yonca.js';

export const KAYNAK = 'meski';
export const cek = () => yoncaCek('meski.gov.tr', KAYNAK, 'MERSİN');
