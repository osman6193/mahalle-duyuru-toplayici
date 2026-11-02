// Akaryakıt zam/indirim haber başlıklarını ayrıştırır (saf fonksiyonlar; ağ yok, test edilebilir).
//
// Hedef: "bu gece motorine 1,52 TL zam geliyor" gibi ÖNCEDEN verilen haberler.
// "zam geldi", "kaç TL oldu", "zam var mı?" gibi geçmiş/soru başlıkları elenir; onları pompa fiyatlarından
// kendimiz buluyoruz. Çıkan sonuç yönetim panelinde taslak olur, yönetici onaylamadan bildirim gitmez.

const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];

const kucuk = (s) => String(s || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr').replace(/[’`´]/g, "'");

// Haber zaten olmuş bir şeyi anlatıyor ya da soru soruyor
const GECMIS = /(geldi|yapıldı|yansıdı|zamlandı|ucuzladı|değişti|aştı|devirdi|geçti|aşıldı|belli oldu|sonrası|oldu\b|güncel|son durum|fiyat listesi|fiyatları ne|kaç (tl|lira) oldu|ne kadar oldu)/;
const SORU = /\s(mı|mi|mu|mü)(\s|\?|,|$)|\bvar mı\b/;
// Önceden haber veren ifadeler
const BEKLENTI = /(geliyor|gelecek|gelmesi bekleniyor|bekleniyor|beklenen|kapıda|yolda|yapılacak|yansıyacak|değişiyor|değişecek|artacak|düşecek|ucuzlayacak|zamlanacak|bu gece|gece yarısı|yarından itibaren|yarın)/;
const ZAM = /(zam|artış|pahalan)/;
const INDIRIM = /(indirim|düşüş|ucuzla)/;

const YAKIT_DESENI = /(benzin|motorin|mazot|dizel|lpg|otogaz|akaryakıt)/g;
const yakitKodu = (s) => (s.startsWith('benzin') ? 'benzin' : s === 'lpg' || s === 'otogaz' ? 'lpg' : s === 'akaryakıt' ? 'akaryakit' : 'motorin');

// "1,52 TL", "1.52 lira", "1 lira 52 kuruş", "52 kuruş". Aynı cümlede ardından zam/indirim gelmeli ve
// miktar hal eki almamalı; yoksa "motorin 100 TL'yi aşacak" gibi fiyat eşikleri miktar sanılır.
// "Benzine 4,15 TL, motorine 3,60 TL zam" gibi listelerde ilk miktar da sayılır.
const MIKTAR = /(?:(\d{1,2})(?:[.,](\d{1,2}))?\s*(?:tl|lira)(?:\s*(\d{1,2})\s*kuruş)?|(\d{1,2})\s*kuruş)('?[a-zçğıöşü]*)/g;
const MIKTAR_SONRASI = /^[^.!?:;]{0,45}?(zam|indirim|artış|düşüş)/;

function miktarDegeri(m) {
  if (m[4]) return Number(m[4]) / 100;
  const tam = Number(m[1]);
  if (m[2]) return tam + Number(m[2].padEnd(2, '0')) / 100;
  if (m[3]) return tam + Number(m[3]) / 100;
  return tam;
}

/** TR takvim günü (YYYY-MM-DD) */
export function trGun(t) {
  return new Date(new Date(t).getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}
const gunEkle = (gun, n) => new Date(Date.parse(`${gun}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);

/** Geçerlilik tarihi: başlıkta "5 Kasım" gibi bir tarih varsa o (bugünse "gece" ile ertesi gün), yoksa yayın gününün ertesi */
function etkinTarih(baslik, yayin) {
  const yayinGunu = trGun(yayin);
  const m = baslik.match(new RegExp(`(\\d{1,2})\\s+(${AYLAR.join('|')})`));
  if (m) {
    const ay = AYLAR.indexOf(m[2]) + 1;
    let yil = Number(yayinGunu.slice(0, 4));
    if (ay < Number(yayinGunu.slice(5, 7)) - 6) yil += 1; // Aralık'ta "3 Ocak"
    const gun = `${yil}-${String(ay).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
    if (gun > yayinGunu) return gun;
    // Bugünün tarihi: "bu gece" ise ertesi gün, değilse bugün (zaten geçerli; sunucu eler)
    if (gun === yayinGunu) return /bu gece/.test(baslik) ? gunEkle(gun, 1) : gun;
    // Başlıktaki tarih geçmiş (ör. dünün fiyat listesi): yayın gününe göre karar ver
  }
  // Sabah yayınlanan "gece yarısı zammı" az önce olmuş zamdır
  const saat = new Date(new Date(yayin).getTime() + 3 * 3600_000).getUTCHours();
  if (saat < 12 && /(?<!bu )gece yarısı/.test(baslik)) return yayinGunu;
  // "Yarın gece" → iki gün sonra 00:00; diğerleri (bu gece, yarından itibaren, geliyor) → ertesi gün
  return /yarın gece/.test(baslik) ? gunEkle(yayinGunu, 2) : gunEkle(yayinGunu, 1);
}

/**
 * Bir başlığı ayrıştırır. Dönüş: {yon, etkin, tutarlar} ya da null (alakasız/geçmiş haber).
 * tutarlar: {motorin: 1.52, benzin: null} — null: yakıt geçiyor ama miktar yok.
 */
export function basligiAyristir(hamBaslik, yayin = new Date()) {
  // Google Haberler başlığın sonuna " - Kaynak Adı" ekler
  const baslik = kucuk(hamBaslik).replace(/\s+-\s+[^-]{2,60}$/, '').replace(/\s+/g, ' ').trim();
  if (!/(benzin|motorin|mazot|dizel|lpg|otogaz|akaryakıt)/.test(baslik)) return null;
  if (GECMIS.test(baslik) || SORU.test(baslik) || !BEKLENTI.test(baslik)) return null;
  if (/(tahmin|iddia|öneri|sinyal|olabilir)/.test(baslik)) return null;   // kesin olmayan
  const zam = ZAM.test(baslik), indirim = INDIRIM.test(baslik);
  if (zam === indirim) return null;   // ikisi de var ya da hiçbiri

  // Yakıtlar ve başlıktaki yerleri
  const yakitlar = [...baslik.matchAll(YAKIT_DESENI)].map((m) => ({ kod: yakitKodu(m[1]), yer: m.index }));
  const tutarlar = {};
  for (const y of yakitlar) if (y.kod !== 'akaryakit') tutarlar[y.kod] ??= null;
  if (!Object.keys(tutarlar).length) { tutarlar.benzin = null; tutarlar.motorin = null; }   // "akaryakıta zam"

  // Her miktarı kendinden önceki en yakın yakıta bağla; önünde sadece "akaryakıt" varsa hepsine
  for (const m of baslik.matchAll(MIKTAR)) {
    const ek = m[5].replace("'", '');
    if (ek && !/^l[ıiuü]k$/.test(ek)) continue;   // "100 TL'yi", "lirayı", "TL'den" → eşik/fiyat
    if (!MIKTAR_SONRASI.test(baslik.slice(m.index + m[0].length))) continue;
    const deger = miktarDegeri(m);
    if (!(deger > 0 && deger < 30)) continue;
    const onceki = yakitlar.filter((y) => y.yer < m.index).at(-1);
    const sonraki = yakitlar.find((y) => y.yer > m.index);
    const hedef = onceki && m.index - onceki.yer < 40 ? onceki : sonraki && sonraki.yer - m.index < 30 ? sonraki : onceki;
    if (!hedef || hedef.kod === 'akaryakit') {
      for (const k of Object.keys(tutarlar)) tutarlar[k] ??= deger;
    } else tutarlar[hedef.kod] = deger;
  }
  return { yon: zam ? 'zam' : 'indirim', etkin: etkinTarih(baslik, yayin), tutarlar };
}

/** RSS/Atom metninden haberler: [{baslik, url, ad, zaman}] */
export function rssOgeleri(xml) {
  const coz = (s) => String(s ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/<[^>]+>/g, '').trim();
  const ogeler = [];
  for (const [, ic] of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)) {
    const al = (etiket) => ic.match(new RegExp(`<${etiket}\\b[^>]*>([\\s\\S]*?)</${etiket}>`))?.[1];
    const baslik = coz(al('title'));
    const url = coz(al('link'));
    if (!baslik || !url) continue;
    const kaynak = coz(al('source')) || (baslik.match(/\s-\s([^-]{2,60})$/)?.[1] ?? '');
    const z = Date.parse(coz(al('pubDate')) || '');
    ogeler.push({ baslik, url, ad: kaynak, zaman: Number.isNaN(z) ? null : new Date(z).toISOString() });
  }
  return ogeler;
}
