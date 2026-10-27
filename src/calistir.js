// Zamanlanmış çalıştırıcı: cron her 10 dakikada bir bunu çağırır.
import { afadCalistir } from './kaynaklar/afad.js';
import { elektrikCalistir } from './kaynaklar/elektrik/index.js';
import { suCalistir } from './kaynaklar/su/index.js';
import { gorevleriCalistir } from './gorevler.js';

const baslangic = Date.now();
console.log(`--- ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} ---`);

await afadCalistir();
await elektrikCalistir();
await suCalistir();
await gorevleriCalistir(3);   // Claude'un keşif görevleri (yoksa hiçbir şey yapmaz)

console.log(`bitti (${((Date.now() - baslangic) / 1000).toFixed(1)} sn)`);
