// GÖREV KUYRUĞU
// Claude, Supabase'deki `kesif_gorevleri` tablosuna görev yazar; sunucu her turda
// birkaç tanesini alıp çalıştırır ve sonuçları `kesif_kayitlari` tablosuna
// (kaynak = 'gorev-<id>') yazar. Sunucuya bağlanmadan site incelemeyi sağlar.
//
// Görev tipleri:
//  istek    : {url, method?, headers?, govde?}                     -> düz HTTP isteği
//  tarayici : {url, adimlar?:[...], scriptleriKaydet?, anahtar?, bekle?}
//     adim örnekleri: {secim:"#IlKodu", index:1} | {secim:"#IlKodu", deger:"01"}
//                     {tikla:"#btnSorgula"} | {tiklaYazi:"Sorgula"} | {yaz:"#ara", deger:"x"} | {bekle:3000}
import { db, hataMetni } from './supabase.js';
import { getir } from './getir.js';

const MAKS = 300_000;
const BEKLE = (ms) => new Promise((r) => setTimeout(r, ms));

async function kaydet(gorevId, satirlar) {
  const kaynak = `gorev-${gorevId}`;
  for (let i = 0; i < satirlar.length; i += 10) {
    const { error } = await db.from('kesif_kayitlari').insert(satirlar.slice(i, i + 10).map((s) => ({ kaynak, ...s })));
    if (error) console.error(`  [görev ${gorevId}] kayıt hatası:`, error.message);
  }
}

async function istekGorevi(g) {
  const p = g.parametreler;
  const yanit = await getir(p.url, {
    method: p.method || 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36', ...(p.headers || {}) },
    body: p.govde ? (typeof p.govde === 'string' ? p.govde : JSON.stringify(p.govde)) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  const icerik = (await yanit.text()).slice(0, MAKS);
  await kaydet(g.id, [{
    tur: 'istek', url: p.url, method: p.method || 'GET', durum: yanit.status,
    istek_govdesi: p.govde ? String(typeof p.govde === 'string' ? p.govde : JSON.stringify(p.govde)).slice(0, 5000) : null,
    icerik_tipi: (yanit.headers.get('content-type') || '').slice(0, 200), icerik,
  }]);
  return `HTTP ${yanit.status}, ${icerik.length} karakter`;
}

/** TLS teşhisi: sertifika neden reddediliyor? (süresi dolmuş, ara sertifika eksik, isim uyuşmuyor...) */
async function tlsGorevi(g) {
  const tls = await import('node:tls');
  const { host, port = 443 } = g.parametreler;
  const sonuc = await new Promise((coz, red) => {
    const s = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: 20000 }, () => {
      const zincir = [];
      let c = s.getPeerCertificate(true);
      const goruldu = new Set();
      while (c && c.fingerprint256 && !goruldu.has(c.fingerprint256)) {
        goruldu.add(c.fingerprint256);
        zincir.push({ konu: c.subject?.CN, veren: c.issuer?.CN, bas: c.valid_from, bit: c.valid_to, san: c.subjectaltname?.slice(0, 300) });
        c = c.issuerCertificate;
      }
      coz({ yetkili: s.authorized, hata: s.authorizationError ? String(s.authorizationError) : null, protokol: s.getProtocol(), zincir });
      s.end();
    });
    s.on('error', red);
    s.on('timeout', () => { s.destroy(); red(new Error('zaman aşımı')); });
  });
  await kaydet(g.id, [{ tur: 'istek', url: `tls://${host}:${port}`, method: 'TLS', durum: sonuc.yetkili ? 200 : 495, icerik_tipi: 'application/json', icerik: JSON.stringify(sonuc, null, 1) }]);
  return `${sonuc.yetkili ? 'geçerli' : `GEÇERSİZ: ${sonuc.hata}`} · ${sonuc.zincir.map((z) => `${z.konu} (${z.bit})`).join(' ← ')}`;
}

async function tarayiciGorevi(g, browser) {
  const p = g.parametreler;
  const satirlar = [];
  const context = await browser.newContext({
    locale: 'tr-TR', timezoneId: 'Europe/Istanbul', ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  page.on('response', async (res) => {
    try {
      const req = res.request();
      const tip = req.resourceType();
      const ct = res.headers()['content-type'] || '';
      if (!(tip === 'xhr' || tip === 'fetch' || ct.includes('json'))) return;
      if (/google|analytics|facebook|doubleclick|clarity|hotjar|yandex/.test(res.url())) return;
      let govde = ''; try { govde = (await res.text()).slice(0, MAKS); } catch {}
      satirlar.push({ tur: 'xhr', url: res.url().slice(0, 2000), method: req.method(), istek_govdesi: (req.postData() || '').slice(0, 5000), durum: res.status(), icerik_tipi: ct.slice(0, 200), icerik: govde });
    } catch {}
  });

  const yanit = await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await BEKLE(p.bekle ?? 2000);

  const notlar = [];
  for (const a of p.adimlar || []) {
    try {
      if (a.bekle) await BEKLE(a.bekle);
      else if (a.secim) {
        if (a.deger !== undefined) await page.selectOption(a.secim, String(a.deger), { timeout: 15000 });
        else {
          await page.waitForFunction((s) => document.querySelector(s)?.options?.length > 1, a.secim, { timeout: 15000 }).catch(() => {});
          const degerler = await page.$$eval(`${a.secim} option`, (o) => o.map((x) => x.value).filter((v) => v && v !== '0' && v !== '-1'));
          await page.selectOption(a.secim, degerler[a.index ?? 0], { timeout: 15000 });
        }
        await BEKLE(a.sonra ?? 2500);
      } else if (a.tikla) { await page.click(a.tikla, { timeout: 15000 }); await BEKLE(a.sonra ?? 4000); }
      else if (a.tiklaYazi) { await page.getByText(a.tiklaYazi, { exact: false }).first().click({ timeout: 15000 }); await BEKLE(a.sonra ?? 4000); }
      else if (a.yaz) { await page.fill(a.yaz, String(a.deger)); await BEKLE(a.sonra ?? 500); }
      notlar.push(`✓ ${JSON.stringify(a)}`);
    } catch (e) { notlar.push(`✗ ${JSON.stringify(a)}: ${e.message.split('\n')[0]}`); }
  }

  satirlar.push({ tur: 'sayfa', url: page.url(), method: 'GET', durum: yanit?.status() ?? null, icerik_tipi: 'text/html', icerik: (await page.content()).slice(0, MAKS) });

  // Sayfanın script dosyalarından anahtar kelime geçenleri kaydet
  if (p.scriptleriKaydet) {
    const anahtar = new RegExp(p.anahtar || 'kesinti', 'i');
    const srcler = await page.$$eval('script[src]', (s) => s.map((x) => x.src));
    for (const src of srcler) {
      try {
        const r = await context.request.get(src, { timeout: 30000 });
        const metin = await r.text();
        if (anahtar.test(metin)) satirlar.push({ tur: 'js', url: src.slice(0, 2000), method: 'GET', durum: r.status(), icerik_tipi: 'text/javascript', icerik: metin.slice(0, MAKS) });
      } catch {}
    }
    const satirIci = await page.$$eval('script:not([src])', (s) => s.map((x) => x.textContent || ''));
    const eslesen = satirIci.filter((t) => anahtar.test(t)).join('\n/* ---- */\n');
    if (eslesen) satirlar.push({ tur: 'js', url: `${page.url()}#inline`, method: 'GET', icerik_tipi: 'text/javascript', icerik: eslesen.slice(0, MAKS) });
  }

  await context.close();
  await kaydet(g.id, satirlar);
  return `${satirlar.length} kayıt. ${notlar.join(' | ')}`.slice(0, 2000);
}

export async function gorevleriCalistir(adet = 3) {
  const { data: gorevler, error } = await db.rpc('kesif_gorev_al', { p_adet: adet });
  if (error) { console.error('[görev] alınamadı:', error.message); return; }
  if (!gorevler?.length) return;

  let browser = null;
  for (const g of gorevler) {
    let durum = 'bitti', ozet;
    try {
      if (g.tip === 'istek') ozet = await istekGorevi(g);
      else if (g.tip === 'tls') ozet = await tlsGorevi(g);
      else {
        if (!browser) { const { chromium } = await import('playwright'); browser = await chromium.launch({ headless: true }); }
        ozet = await tarayiciGorevi(g, browser);
      }
    } catch (e) { durum = 'hata'; ozet = hataMetni(e).slice(0, 2000); }
    await db.from('kesif_gorevleri').update({ durum, sonuc_ozet: ozet, bitis: new Date().toISOString() }).eq('id', g.id);
    console.log(`[görev ${g.id}] ${durum}: ${ozet.slice(0, 150)}`);
  }
  if (browser) await browser.close();
}
