// Su kesinti kaynakları (büyükşehir su idareleri).
// Yeni idare eklemek için: ./<kod>.js dosyası (KAYNAK + cek()) yaz, aşağıdaki listeye ekle.
// Ortak tablo altyapısını (/sukesintileri) kullanan idareler için tablo.js yeterli (bkz. saski.js).
import { kesintileriCalistir } from '../kesinti-calistir.js';
import * as izsu from './izsu.js';
import * as iski from './iski.js';
import * as aski from './aski.js';
import * as saski from './saski.js';
import * as teski from './teski.js';
import * as muski from './muski.js';
import * as tiski from './tiski.js';
import * as asat from './asat.js';

const KAYNAKLAR = [izsu, iski, aski, saski, teski, muski, tiski, asat];

export const suCalistir = () => kesintileriCalistir('su', KAYNAKLAR);
