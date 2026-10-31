// Çoruh EDAŞ: Artvin (8), Giresun (28), Gümüşhane (29), Rize (53), Trabzon (61)
import { bilgiDanismaKaynagi } from './bilgidanisma-platform.js';
export const { KAYNAK, cek } = bilgiDanismaKaynagi({ kaynak: 'coruh', alan: 'www.coruhedas.com.tr', iller: [8, 28, 29, 53, 61] });
