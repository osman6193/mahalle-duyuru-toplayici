// Elektrik kesinti kaynakları.
// Yeni şirket eklemek için: ./<kod>.js dosyası (KAYNAK + cek()) yaz, aşağıdaki listeye ekle.
import { kesintileriCalistir } from '../kesinti-calistir.js';
import * as bedas from './bedas.js';
import * as akdeniz from './akdeniz.js';
import * as uludag from './uludag.js';
import * as sedas from './sedas.js';
import * as yesilirmak from './yesilirmak.js';
import * as aras from './aras.js';
import * as vedas from './vedas.js';
import * as kcetas from './kcetas.js';
import * as coruh from './coruh.js';
import * as firat from './firat.js';
import * as meram from './meram.js';

const KAYNAKLAR = [bedas, akdeniz, uludag, sedas, yesilirmak, aras, vedas, kcetas, coruh, firat, meram];

export const elektrikCalistir = () => kesintileriCalistir('elektrik', KAYNAKLAR);
