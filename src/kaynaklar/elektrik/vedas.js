// VEDAŞ — Vangölü EDAŞ (Van, Bitlis, Muş, Hakkari) planlı kesintiler
// Kaynak: POST https://www.vedas.com.tr/ajax/  gövde: method=oi&action=pk_filter&data[date]=YYYY-MM-DD&data[il]=<kod>&data[blg]=-1
//   cevap: {error:false, data:[{baslangic:"26-10-2026 09:00:00", bitis, kesintiAdi, il:"BİTLİS", bolge:"BİTLİS MERKEZ",
//          aciklama:"Bitlis İli Merkez İlçesi Kavakdibi Köyü, Yuvacık Köyü ...", tip:"PLANLI KESİNTİ", mahalle:"YOLALAN"}]}
//   - Gün ve il bazında sorgulanır: bugün + 6 gün x 4 il
//   - Sunucudan düz fetch "fetch failed" veriyor (TLS); bu yüzden sitenin kendi sayfası tarayıcıda açılıp
//     istekler sayfanın içinden (aynı köken) yapılır.
//   - Her satır bir mahalle/köy; aynı kesinti (ad + bölge + saatler) gruplanır. Kimlik bunlardan üretilir.
import { createHash } from 'node:crypto';

export const KAYNAK = 'vedas';
const SAYFA = 'https://www.vedas.com.tr/';
const ILLER = { 65: 'VAN', 13: 'BİTLİS', 49: 'MUŞ', 30: 'HAKKARİ' };
const GUN = 7;

const zaman = (s) => {
  const m = String(s || '').match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00+03:00` : null;
};
const ust = (s) => String(s || '').toLocaleUpperCase('tr').trim();

/** "BİTLİS MERKEZ" -> "MERKEZ", "ADİLCEVAZ" -> "ADİLCEVAZ" */
export function ilceAdi(bolge, il) {
  const b = ust(bolge);
  if (b === `${il} MERKEZ` || b === il) return 'MERKEZ';
  return b.replace(new RegExp(`^${il}\\s+`), '');
}

/** Açıklamadaki "X Köyü" / "X Mahallesi" adları */
export function yerler(aciklama) {
  return [...String(aciklama || '').matchAll(/([A-ZÇĞİÖŞÜ][^\s,.;()]+(?:\s+[A-ZÇĞİÖŞÜ][^\s,.;()]+)?)\s+(?:Köyü|KÖYÜ|Mahallesi|MAHALLESİ|Mah\.)/g)]
    .map((m) => m[1].replace(/^(İli|İlçesi|Merkez|Bağlı|Ve)\s+/i, '').trim())
    .filter((s) => !/^(İli|İlçesi|Merkez|Merkeze|Bölgeye)$/i.test(s));
}

function tarihler() {
  const g = [];
  for (let i = 0; i < GUN; i++) {
    g.push(new Date(Date.now() + 3 * 3600000 + i * 86400000).toISOString().slice(0, 10));   // İstanbul günü
  }
  return g;
}

async function hamSatirlar() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ locale: 'tr-TR', ignoreHTTPSErrors: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
    const page = await context.newPage();
    await page.goto(SAYFA, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const istekler = [];
    for (const tarih of tarihler()) for (const il of Object.keys(ILLER)) istekler.push({ tarih, il });
    return await page.evaluate(async (istekler) => {
      const sonuc = [];
      for (const { tarih, il } of istekler) {
        const govde = new URLSearchParams({ method: 'oi', action: 'pk_filter', 'data[date]': tarih, 'data[il]': il, 'data[blg]': '-1' });
        const r = await fetch('/ajax/', { method: 'POST', body: govde,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' } });
        if (!r.ok) throw new Error(`HTTP ${r.status} (${tarih}/${il})`);
        const j = await r.json();
        if (j.error) throw new Error(`site hatası: ${j.message || ''} (${tarih}/${il})`);
        for (const s of Array.isArray(j.data) ? j.data : []) sonuc.push({ ...s, _il: il });
      }
      return sonuc;
    }, istekler);
  } finally {
    await browser.close();
  }
}

export function grupla(satirlar) {
  const gruplar = new Map();
  for (const s of satirlar) {
    const il = ILLER[s._il] || ust(s.il);
    const ilce = ilceAdi(s.bolge, il);
    const anahtar = [il, ilce, s.kesintiAdi, s.baslangic, s.bitis].join('#');
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, { il, ilce, s, mahalleler: new Set() });
    const g = gruplar.get(anahtar);
    if (s.mahalle) g.mahalleler.add(ust(s.mahalle));
    for (const y of yerler(s.aciklama)) g.mahalleler.add(ust(y));
  }
  return [...gruplar].map(([anahtar, { il, ilce, s, mahalleler }]) => ({
    kaynak: KAYNAK,
    kaynak_id: createHash('sha1').update(anahtar).digest('hex').slice(0, 20),
    il, ilceler: [ilce],
    detay: [{ ilce, mahalleler: [...mahalleler].map((ad) => ({ ad })) }],
    baslangic: zaman(s.baslangic), bitis: zaman(s.bitis),
    neden: s.tip || 'Planlı kesinti',
    aciklama: String(s.aciklama || '').slice(0, 500),
  })).filter((k) => k.baslangic);
}

export async function cek() {
  return grupla(await hamSatirlar());
}
