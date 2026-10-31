// Fırat EDAŞ: Bingöl (12), Elazığ (23), Malatya (44), Tunceli (62) — Çoruh ile aynı site altyapısı
import { bilgiDanismaKaynagi } from './bilgidanisma-platform.js';
export const { KAYNAK, cek } = bilgiDanismaKaynagi({ kaynak: 'firat', alan: 'www.firatedas.com.tr', iller: [12, 23, 44, 62] });
