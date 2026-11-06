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
// Bu yüzden sayfayı gerçek bir tarayıcıda açıp sitenin kendi istemcisiyle ($nuxt.$axios) soruyoruz.
//
// Akış (sitenin kendisi gibi):
//   1) bolgeselAriza/listesi            -> [{ ilceAdi:"Kağıthane", ilceKodu:"BE", arizaAdedi:3, etkilenenMahalleAdedi:"11" }]  (sadece özet)
//   2) bolgeselAriza/arizaDetayiFiltreli?ilceKodu=BE&mahalleKodu=   -> ilçenin tüm arızaları (deneniyor)
//   3) olmazsa: abonelikHizmetleri/mahalleler?ilceKodu=BE -> mahalleler; her mahalle için arizaDetayiFiltreli
// Detay cevabının alan adları HENÜZ GÖRÜLMEDİ: ilk dolu cevaplar 'ornek-iski-detay' olarak saklanır.
const MAKS_MAHALLE = 60;

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
    const ozet = JSON.parse(await cevap.text());
    const ilceler = Array.isArray(ozet?.data) ? ozet.data.filter((x) => x?.ilceKodu) : [];
    const detaylar = [];
    if (ilceler.length) {
      await page.waitForFunction(() => !!window.$nuxt?.$axios, null, { timeout: 30000 });
      for (const ilce of ilceler) {
        const sonuc = await page.evaluate(async ({ kod, maks }) => {
          const ax = window.$nuxt.$axios;
          const dizi = (r) => (Array.isArray(r?.data?.data) ? r.data.data : Array.isArray(r?.data) ? r.data : []);
          const cikti = { tum: null, mahalleler: [], hatalar: [] };
          try {
            cikti.tum = dizi(await ax.post(`iski/bolgeselAriza/arizaDetayiFiltreli?ilceKodu=${kod}&mahalleKodu=`));
          } catch (e) { cikti.hatalar.push(`tum: ${e?.response?.status ?? e}`); }
          if (cikti.tum?.length) return cikti;
          try {
            const mahalleler = dizi(await ax.post(`iski/abonelikHizmetleri/mahalleler?ilceKodu=${kod}`)).slice(0, maks);
            for (const m of mahalleler) {
              const mkod = m.mahalleKodu ?? m.kod ?? m.id;
              if (mkod == null) continue;
              try {
                const d = dizi(await ax.post(`iski/bolgeselAriza/arizaDetayiFiltreli?ilceKodu=${kod}&mahalleKodu=${mkod}`));
                if (d.length) cikti.mahalleler.push({ mahalle: m, detay: d });
              } catch (e) { cikti.hatalar.push(`${mkod}: ${e?.response?.status ?? e}`); }
            }
          } catch (e) { cikti.hatalar.push(`mahalleler: ${e?.response?.status ?? e}`); }
          return cikti;
        }, { kod: ilce.ilceKodu, maks: MAKS_MAHALLE });
        detaylar.push({ ilce, ...sonuc });
      }
    }
    return { ilceler, detaylar };
  } finally {
    await browser.close();
  }
}

// İSKİ'nin kısaltmaları -> bizim ilçe adları
const ILCE_ADI = { 'G.O.PAŞA': 'GAZİOSMANPAŞA', 'B.ÇEKMECE': 'BÜYÜKÇEKMECE', 'K.ÇEKMECE': 'KÜÇÜKÇEKMECE' };
const ilceAdi = (s) => { const u = String(s ?? '').trim().toLocaleUpperCase('tr'); return ILCE_ADI[u] ?? u; };
const mahAdi = (s) => String(s ?? '').replace(/\s+(MAHALLES[İI]|MAH\.?)\s*$/i, '').trim();

/** Bir detay kaydını kesintiye çevirir (alan adları tahmini; örnek görülünce kesinleşecek) */
function kesintiKur(ilce, mahalleler, k) {
  const bas = al(k, 'arizaTarihi', 'baslangicTarihi', 'kesintiTarihi', 'arizaBaslangicTarihi', 'BaslangicTarihi', 'baslangic', 'tarih');
  const bit = al(k, 'tahminiBitisTarihi', 'arizaGiderilmeTarihi', 'bitisTarihi', 'tahminiGiderilmeTarihi', 'BitisTarihi', 'bitis');
  const detayMah = al(k, 'mahalleAdi', 'mahalle', 'etkilenenMahalleler', 'mahalleler');
  const mah = [...new Set([...mahalleler, ...(Array.isArray(detayMah) ? detayMah : String(detayMah || '').split(/[,;]/)).map(mahAdi)].filter(Boolean))];
  const bugun = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
  const baslangic = tarih(bas) ?? `${bugun}T00:00:00+03:00`;
  const id = al(k, 'arizaNo', 'arizaId', 'id', 'Id', 'ArizaId') ?? createHash('sha1').update([ilce, mah.slice().sort().join('|'), bas ?? bugun].join('#')).digest('hex').slice(0, 20);
  return {
    kaynak: KAYNAK, kaynak_id: String(id), il: 'İSTANBUL',
    ilceler: [ilce],
    detay: [{ ilce, mahalleler: mah.map((ad) => ({ ad })) }],
    baslangic, bitis: tarih(bit),
    neden: al(k, 'arizaTipi', 'arizaTuru', 'tip', 'neden', 'ArizaTipi') ?? 'Su arızası',
    aciklama: al(k, 'aciklama', 'arizaAciklamasi', 'description', 'Aciklama'),
  };
}

export async function cek() {
  const { ilceler, detaylar } = await tarayiciylaOku();
  if (!ilceler.length) return [];                       // "kesinti bulunmamaktadır"
  if (detaylar.some((d) => d.tum?.length || d.mahalleler.length)) await ornekSakla(`${KAYNAK}-detay`, URL, JSON.stringify(detaylar));

  const sonuc = [];
  for (const d of detaylar) {
    const ilce = ilceAdi(d.ilce.ilceAdi);
    if (d.tum?.length) for (const k of d.tum) sonuc.push(kesintiKur(ilce, [], k));
    for (const m of d.mahalleler) {
      const ad = mahAdi(m.mahalle.mahalleAdi ?? m.mahalle.ad ?? m.mahalle.adi);
      for (const k of m.detay) sonuc.push(kesintiKur(ilce, ad ? [ad] : [], k));
    }
    // Detay hiç alınamadıysa en azından ilçe düzeyinde bir kesinti yaz (özet bilgisiyle)
    if (!d.tum?.length && !d.mahalleler.length) {
      const bugun = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
      sonuc.push({
        kaynak: KAYNAK, kaynak_id: `ozet-${d.ilce.ilceKodu}-${bugun}`, il: 'İSTANBUL', ilceler: [ilce],
        detay: [{ ilce, mahalleler: [] }], baslangic: `${bugun}T00:00:00+03:00`, bitis: null, neden: 'Su arızası',
        aciklama: `${d.ilce.arizaAdedi ?? ''} arıza, ${d.ilce.etkilenenMahalleAdedi ?? '?'} mahalle etkileniyor (İSKİ).`.trim(),
      });
    }
  }
  // Aynı kimlik birden çok mahalle sorgusunda dönebilir: birleştir
  const birlesik = new Map();
  for (const k of sonuc) {
    const v = birlesik.get(k.kaynak_id);
    if (!v) { birlesik.set(k.kaynak_id, k); continue; }
    const adlar = new Set([...v.detay[0].mahalleler, ...k.detay[0].mahalleler].map((x) => x.ad));
    v.detay[0].mahalleler = [...adlar].map((ad) => ({ ad }));
  }
  return [...birlesik.values()];
}
