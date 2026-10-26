// Zamanlanmış çalıştırıcı: cron her 10 dakikada bir bunu çağırır.
import { afadCalistir } from './kaynaklar/afad.js';
import { elektrikCalistir } from './kaynaklar/elektrik/index.js';

const baslangic = Date.now();
console.log(`--- ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} ---`);

await afadCalistir();
await elektrikCalistir();

console.log(`bitti (${((Date.now() - baslangic) / 1000).toFixed(1)} sn)`);
