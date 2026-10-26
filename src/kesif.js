// KEŞİF ARACI
// Elektrik dağıtım şirketlerinin kesinti sayfalarını gerçek bir tarayıcıyla açar,
// arka planda çağrılan veri adreslerini (XHR/fetch) ve sayfa HTML'ini Supabase'e yazar.
// Amaç: her sitenin verisinin nereden ve hangi formatta geldiğini öğrenmek.
//
// Kullanım:
//   npm run kesif               -> tüm şirketler
//   npm run kesif -- bedas gediz -> sadece seçilenler

import { chromium } from 'playwright';
import { db } from './supabase.js';
import { EDAS } from './edas-listesi.js';

const MAKS_ICERIK = 150_000;   // kayıt başına en fazla karakter
const MAKS_SAYFA = 4;          // şirket başına gezilecek kesinti sayfası
const BEKLE = (ms) => new Promise((r) => setTimeout(r, ms));
const KESINTI = /kesinti|kesintiler|planl[ıi]/i;

async function kaydet(satirlar) {
  if (!satirlar.length) return;
  for (let i = 0; i < satirlar.length; i += 20) {
    const { error } = await db.from('kesif_kayitlari').insert(satirlar.slice(i, i + 20));
    if (error) console.error('  [kayıt hatası]', error.message);
  }
}

/** Sayfadaki seçim kutularını sırayla doldurup "Sorgula" benzeri butona basmayı dener. */
async function formuDene(page) {
  try {
    const secimler = await page.$$('select');
    for (const s of secimler.slice(0, 4)) {
      const secenekler = await s.$$eval('option', (o) => o.map((x) => x.value).filter((v) => v && v !== '0' && v !== '-1'));
      if (secenekler.length) {
        await s.selectOption(secenekler[0]).catch(() => {});
        await BEKLE(2500);
      }
    }
    const buton = page.getByRole('button', { name: /sorgula|ara|listele|göster|getir/i }).first();
    if (await buton.count()) {
      await buton.click({ timeout: 5000 }).catch(() => {});
      await BEKLE(4000);
    }
  } catch { /* form yoksa sorun değil */ }
}

async function sirketiKesfet(browser, sirket) {
  console.log(`\n=== ${sirket.ad} (${sirket.kod}) ===`);
  const satirlar = [];
  const context = await browser.newContext({
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  // Arka plan veri isteklerini yakala
  page.on('response', async (res) => {
    try {
      const req = res.request();
      const tip = req.resourceType();
      const ct = res.headers()['content-type'] || '';
      if (!(tip === 'xhr' || tip === 'fetch' || ct.includes('json'))) return;
      let govde = '';
      try { govde = (await res.text()).slice(0, MAKS_ICERIK); } catch {}
      satirlar.push({
        kaynak: sirket.kod, tur: 'xhr', url: res.url().slice(0, 2000), method: req.method(),
        istek_govdesi: (req.postData() || '').slice(0, 5000), durum: res.status(), icerik_tipi: ct.slice(0, 200), icerik: govde,
      });
    } catch {}
  });

  const ziyaretEt = async (url) => {
    try {
      const yanit = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await BEKLE(2000);
      await formuDene(page);
      const html = await page.content();
      satirlar.push({
        kaynak: sirket.kod, tur: 'sayfa', url: page.url().slice(0, 2000), method: 'GET',
        durum: yanit?.status() ?? null, icerik_tipi: 'text/html', icerik: html.slice(0, MAKS_ICERIK),
      });
      console.log(`  ✓ ${page.url()} (${yanit?.status()})`);
      return true;
    } catch (e) {
      satirlar.push({ kaynak: sirket.kod, tur: 'hata', url, icerik: e.message.slice(0, 2000) });
      console.log(`  ✗ ${url}: ${e.message.split('\n')[0]}`);
      return false;
    }
  };

  // 1) Ana sayfa ve oradaki "kesinti" linkleri
  const adaylar = new Set(sirket.kesintiSayfalari);
  if (await ziyaretEt(sirket.site)) {
    const linkler = await page.$$eval('a[href]', (as) => as.map((a) => ({ href: a.href, yazi: (a.textContent || '').trim() })));
    for (const l of linkler) {
      if ((KESINTI.test(l.yazi) || KESINTI.test(l.href)) && l.href.startsWith('http')) adaylar.add(l.href.split('#')[0]);
    }
  }

  // 2) Kesinti sayfaları
  const liste = [...adaylar].slice(0, MAKS_SAYFA);
  console.log(`  kesinti sayfası adayı: ${adaylar.size}, gezilecek: ${liste.length}`);
  for (const url of liste) await ziyaretEt(url);

  await context.close();
  await kaydet(satirlar);
  console.log(`  → ${satirlar.length} kayıt Supabase'e yazıldı`);
}

const secilen = process.argv.slice(2);
const sirketler = secilen.length ? EDAS.filter((s) => secilen.includes(s.kod)) : EDAS;

const browser = await chromium.launch({ headless: true });
for (const s of sirketler) {
  try { await sirketiKesfet(browser, s); }
  catch (e) { console.error(`[${s.kod}] beklenmeyen hata:`, e.message); }
}
await browser.close();
console.log('\nKeşif bitti. Claude artık sonuçları Supabase üzerinden okuyabilir.');
