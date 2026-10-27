// Su kesinti kaynakları (büyükşehir su idareleri).
// Yeni idare eklemek için: ./<kod>.js dosyası (KAYNAK + cek()) yaz, aşağıdaki listeye ekle.
import { kesintileriCalistir } from '../kesinti-calistir.js';
import * as izsu from './izsu.js';
import * as iski from './iski.js';
import * as aski from './aski.js';

const KAYNAKLAR = [izsu, iski, aski];

export const suCalistir = () => kesintileriCalistir('su', KAYNAKLAR);
