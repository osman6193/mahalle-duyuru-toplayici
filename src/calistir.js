// Zamanlanmış çalıştırıcı: cron her 10 dakikada bir bunu çağırır.
// Yeni kaynaklar (elektrik şirketleri) keşiften sonra buraya eklenecek.
import { afadCalistir } from './kaynaklar/afad.js';

const baslangic = Date.now();
console.log(`--- ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} ---`);

await afadCalistir();
// await elektrikCalistir();   // keşiften sonra

console.log(`bitti (${((Date.now() - baslangic) / 1000).toFixed(1)} sn)`);
