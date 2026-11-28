// Kesinti kaynaklarını (elektrik, su, doğalgaz) çalıştırıp Supabase'e yazan ortak döngü.
// Her kaynak modülü: export const KAYNAK = '<kod>'; export async function cek() -> [kesinti]
// kesinti: { kaynak, kaynak_id, il, ilceler, detay:[{ilce, mahalleler:[{ad}]}], baslangic, bitis, neden, aciklama? }
// Kategori ('elektrik' | 'su' | 'dogalgaz') her kesintiye eklenir; Supabase başlığı ve bildirimi buna göre kurar.
import { db, durumYaz, hataMetni } from '../supabase.js';

// Tek istekte gönderilecek en fazla kesinti sayısı
const PARCA = 300;

async function kaynagiCalistir(kategori, k) {
  const ad = `${kategori}-${k.KAYNAK}`;
  try {
    const kesintiler = (await k.cek()).map((x) => ({ kategori, ...x }));
    const sayac = {};
    // Kesintiler parça parça TEK istekte gönderilir. Eskiden her kesinti ayrı istekti
    // (günde ~225 bin istek → Supabase ücretsiz kota aşımı). Fonksiyon adı tarihsel;
    // kategori alanıyla su/doğalgazı da kaydeder.
    for (let i = 0; i < kesintiler.length; i += PARCA) {
      const parca = kesintiler.slice(i, i + PARCA);
      const { data, error } = await db.rpc('elektrik_kesinti_kaydet_toplu', { p_liste: parca });
      if (error) {
        sayac.hata = (sayac.hata || 0) + parca.length;
        console.error(`  [${ad}] toplu kayıt (${parca.length}):`, error.message);
        continue;
      }
      for (const [sonuc, adet] of Object.entries(data?.sayac ?? {})) sayac[sonuc] = (sayac[sonuc] || 0) + adet;
      for (const h of data?.hatalar ?? []) console.error(`  [${ad}] ${h.kaynak_id}:`, h.hata);
    }

    // Listeden kalkan (iptal edilen) gelecek kesintileri pasife al.
    // Güvenlik: boş liste gelirse (site arızası olabilir) hiçbir şeyi iptal etme.
    let iptal = 0;
    if (kesintiler.length > 0) {
      const { data, error } = await db.rpc('elektrik_kaynak_senkron', {
        p_kaynak: k.KAYNAK, p_idler: kesintiler.map((x) => x.kaynak_id),
      });
      if (error) console.error(`  [${ad}] senkron:`, error.message);
      else iptal = data;
    }

    console.log(`[${ad}] ${kesintiler.length} kesinti okundu ${JSON.stringify(sayac)}, iptal: ${iptal}`);
    await durumYaz(ad, { basarili: !sayac.hata, adet: kesintiler.length, hata: sayac.hata ? `${sayac.hata} kayıt hatası` : null });
  } catch (e) {
    console.error(`[${ad}] hata:`, e.message);
    await durumYaz(ad, { basarili: false, hata: hataMetni(e) });
  }
}

export async function kesintileriCalistir(kategori, kaynaklar) {
  for (const k of kaynaklar) await kaynagiCalistir(kategori, k);
}

// Biçimi henüz görülmemiş bir kaynağın ilk dolu cevabını Claude'un incelemesi için saklar (günde en fazla 1 kez).
export async function ornekSakla(kaynak, url, icerik) {
  const etiket = `ornek-${kaynak}`;
  const { count } = await db.from('kesif_kayitlari').select('id', { count: 'exact', head: true })
    .eq('kaynak', etiket).gt('olusturma', new Date(Date.now() - 86400000).toISOString());
  if (count) return;
  await db.from('kesif_kayitlari').insert({ kaynak: etiket, tur: 'ornek', url, icerik: String(icerik).slice(0, 300000) });
  console.log(`  [${kaynak}] yeni biçim örneği kaydedildi (${etiket})`);
}
