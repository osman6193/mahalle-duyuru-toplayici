// Kurulum sonrası hızlı kontrol: Supabase bağlantısı, Türkiye IP'si ve sitelere erişim.
import { db, durumYaz } from './supabase.js';

const kontrol = async (ad, fn) => {
  try { console.log(`✓ ${ad}: ${await fn()}`); }
  catch (e) { console.log(`✗ ${ad}: ${e.message}`); }
};

await kontrol('Supabase bağlantısı', async () => {
  const { count, error } = await db.from('iller').select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return `${count} il okundu`;
});

await kontrol('Sunucu IP konumu', async () => {
  const r = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(10000) });
  const j = await r.json();
  if (j.country !== 'TR') throw new Error(`Ülke ${j.country} — Türkiye değil! Siteler engelleyebilir.`);
  return `${j.city}, ${j.country} (${j.org || ''})`;
});

for (const [ad, url] of [
  ['AFAD', 'https://deprem.afad.gov.tr/'],
  ['BEDAŞ', 'https://www.bedas.com.tr/'],
  ['Başkent EDAŞ', 'https://www.baskentedas.com.tr/'],
  ['Uludağ EDAŞ', 'https://www.uedas.com.tr/'],
]) {
  await kontrol(ad, async () => {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) });
    return `HTTP ${r.status}`;
  });
}

await durumYaz('test-baglanti', { basarili: true });
console.log('\nBitti. ✗ olan satır varsa ekran görüntüsünü Claude\'a gönder.');
