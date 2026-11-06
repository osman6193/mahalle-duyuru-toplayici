// MASKİ (Malatya) su kesintileri — Yonca altyapısı (bkz. yonca.js)
import { yoncaCek } from './yonca.js';

export const KAYNAK = 'maski';
export const cek = () => yoncaCek('maski.gov.tr', KAYNAK, 'MALATYA');
