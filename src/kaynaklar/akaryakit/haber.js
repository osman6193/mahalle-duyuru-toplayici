// Akaryakıt zam/indirim haberleri: Google Haberler RSS'inden "zam geliyor" başlıklarını toplar,
// Supabase'e taslak olarak yazar (akaryakit_haber_kaydet). Yönetici onaylayınca bildirim gider.
// 20 dakikada bir çalışır; aynı haber sunucuda bir kez sayılır.
import { db, durumYaz, hataMetni } from '../../supabase.js';
import { basligiAyristir, rssOgeleri } from './haber-ayristir.js';

const KAYNAK = 'akaryakit-haber';
const ARAMALAR = [
  'motorine zam',
  'benzine zam',
  'akaryakıta zam',
  'motorine indirim',
  'benzine indirim',
  'LPG zam',
];
const rssAdresi = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:2d`)}&hl=tr&gl=TR&ceid=TR:tr`;

async function sonBasari() {
  const { data } = await db.from('toplayici_durum').select('son_basari').eq('kaynak', KAYNAK).maybeSingle();
  return data?.son_basari ? new Date(data.son_basari).getTime() : 0;
}

export async function akaryakitHaberCalistir({ zorla = false } = {}) {
  if (!zorla && Date.now() - (await sonBasari()) < 19 * 60_000) return;
  try {
    const ogeler = new Map();   // url -> öğe (aramalar aynı haberi tekrar getirir)
    let basarili = 0;
    for (const q of ARAMALAR) {
      try {
        const r = await fetch(rssAdresi(q), {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' },
          signal: AbortSignal.timeout(30000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        for (const o of rssOgeleri(await r.text())) ogeler.set(o.url, o);
        basarili++;
      } catch (e) {
        console.error(`[${KAYNAK}] "${q}":`, hataMetni(e));
      }
    }
    if (!basarili) throw new Error('hiçbir arama sonuç vermedi');

    const simdi = Date.now();
    const adaylar = [];
    for (const o of ogeler.values()) {
      const zaman = o.zaman ? Date.parse(o.zaman) : simdi;
      if (simdi - zaman > 36 * 3600_000) continue;   // eski haber
      const s = basligiAyristir(o.baslik, zaman);
      if (s) adaylar.push({ ...s, baslik: o.baslik, url: o.url, ad: o.ad, zaman: o.zaman });
    }

    let ozet = { yeni: 0, kaynak: 0, otomatik: 0 };
    if (adaylar.length) {
      const { data, error } = await db.rpc('akaryakit_haber_kaydet', { p: adaylar });
      if (error) throw new Error(error.message);
      ozet = data;
    }
    console.log(`[${KAYNAK}] ${ogeler.size} haber, ${adaylar.length} aday, ${ozet.kaynak} yeni kaynak, ${ozet.yeni} yeni taslak, ${ozet.otomatik} otomatik onay`);
    await durumYaz(KAYNAK, { basarili: true, adet: adaylar.length });
  } catch (e) {
    console.error(`[${KAYNAK}] hata:`, e.message);
    await durumYaz(KAYNAK, { basarili: false, hata: hataMetni(e) });
  }
}
