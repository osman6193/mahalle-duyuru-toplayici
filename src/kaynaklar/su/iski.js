// İSKİ (İstanbul) bölgesel arıza / su kesintileri
// Kaynak: GET https://iskiapi.iski.gov.tr/api/iski/bolgeselAriza/listesi  (sitenin kendi kullandığı JSON uç noktası)
//   Kesinti yokken: {"data":{"description":"Sistemlerimizde ariza ya da kesinti bulunmamaktadır."}}
//   Kesinti varken gelen biçim HENÜZ GÖRÜLMEDİ: ilk dolu cevap kesif_kayitlari'na 'ornek-iski' olarak saklanır,
//   alan adları ona göre kesinleştirilecek. O zamana kadar sık kullanılan alan adları tahmin edilerek okunur.
import { createHash } from 'node:crypto';
import { ornekSakla } from '../kesinti-calistir.js';

export const KAYNAK = 'iski';
const URL = 'https://iskiapi.iski.gov.tr/api/iski/bolgeselAriza/listesi';
const SAYFA = 'https://iski.istanbul/abone-hizmetleri/ariza-kesinti/';

const al = (o, ...adlar) => { for (const a of adlar) if (o?.[a] != null && o[a] !== '') return o[a]; return null; };
function tarih(s) {
  if (!s) return null;
  const tr = String(s).match(/^(\d{2})[./](\d{2})[./](\d{4})\s*(\d{2}):(\d{2})/);
  if (tr) return `${tr[3]}-${tr[2]}-${tr[1]}T${tr[4]}:${tr[5]}:00+03:00`;
  return /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${String(s).slice(0, 19)}+03:00`;
}

// Uç nokta düz istekle 403 veriyor (Strapi yetkisi tarayıcıdaki sayfa oturumuna bağlı).
// Bu yüzden sayfayı gerçek bir tarayıcıda açıp sitenin kendi yaptığı isteğin cevabını okuyoruz.
async function tarayiciylaOku() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ locale: 'tr-TR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
    const page = await context.newPage();
    const cevapBekle = page.waitForResponse((r) => r.url().includes('/bolgeselAriza/listesi'), { timeout: 60000 });
    await page.goto(SAYFA, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const cevap = await cevapBekle;
    if (!cevap.ok()) throw new Error(`HTTP ${cevap.status()} (tarayıcı içinden)`);
    return await cevap.text();
  } finally {
    await browser.close();
  }
}

export async function cek() {
  const metin = await tarayiciylaOku();
  const veri = JSON.parse(metin);
  const liste = Array.isArray(veri?.data) ? veri.data : Array.isArray(veri?.data?.items) ? veri.data.items : Array.isArray(veri) ? veri : null;
  if (!liste) return [];                       // "kesinti bulunmamaktadır"
  await ornekSakla(KAYNAK, URL, metin);

  return liste.map((k) => {
    const ilce = al(k, 'ilce', 'ilceAdi', 'Ilce', 'IlceAdi', 'district');
    const mahStr = al(k, 'mahalleler', 'mahalle', 'Mahalleler', 'Mahalle', 'etkilenenMahalleler');
    const mahalleler = (Array.isArray(mahStr) ? mahStr : String(mahStr || '').split(/[,;]/)).map((s) => String(s).trim()).filter(Boolean);
    const bas = al(k, 'baslangicTarihi', 'kesintiTarihi', 'arizaTarihi', 'BaslangicTarihi', 'baslangic', 'tarih');
    const bit = al(k, 'bitisTarihi', 'tahminiBitisTarihi', 'arizaGiderilmeTarihi', 'BitisTarihi', 'bitis');
    const id = al(k, 'id', 'Id', 'arizaId', 'ArizaId') ?? createHash('sha1').update([ilce, mahalleler.join('|'), bas].join('#')).digest('hex').slice(0, 20);
    return {
      kaynak: KAYNAK, kaynak_id: String(id), il: 'İSTANBUL',
      ilceler: ilce ? [ilce] : [],
      detay: ilce ? [{ ilce, mahalleler: mahalleler.map((ad) => ({ ad })) }] : [],
      baslangic: tarih(bas), bitis: tarih(bit),
      neden: al(k, 'arizaTipi', 'tip', 'neden', 'ArizaTipi'),
      aciklama: al(k, 'aciklama', 'description', 'Aciklama'),
    };
  }).filter((k) => k.ilceler.length && k.baslangic);
}
