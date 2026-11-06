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
import * as kaski from './kaski.js';
import * as buski from './buski.js';
import * as gaski from './gaski.js';
import * as oski from './oski.js';

const KAYNAKLAR = [izsu, iski, aski, saski, teski, muski, tiski, asat, kaski, buski, gaski, oski];

export const suCalistir = () => kesintileriCalistir('su', KAYNAKLAR);
