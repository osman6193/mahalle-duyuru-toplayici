// Elektrik kesinti kaynakları.
// Yeni şirket eklemek için: ./<kod>.js dosyası (KAYNAK + cek()) yaz, aşağıdaki listeye ekle.
import { kesintileriCalistir } from '../kesinti-calistir.js';
import * as bedas from './bedas.js';
import * as akdeniz from './akdeniz.js';
import * as uludag from './uludag.js';
import * as sedas from './sedas.js';

const KAYNAKLAR = [bedas, akdeniz, uludag, sedas];

export const elektrikCalistir = () => kesintileriCalistir('elektrik', KAYNAKLAR);
