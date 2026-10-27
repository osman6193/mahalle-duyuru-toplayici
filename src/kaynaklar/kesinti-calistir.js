// Kesinti kaynaklarını (elektrik, su, doğalgaz) çalıştırıp Supabase'e yazan ortak döngü.
// Her kaynak modülü: export const KAYNAK = '<kod>'; export async function cek() -> [kesinti]
// kesinti: { kaynak, kaynak_id, il, ilceler, detay:[{ilce, mahalleler:[{ad}]}], baslangic, bitis, neden, aciklama? }
// Kategori ('elektrik' | 'su' | 'dogalgaz') her kesintiye eklenir; Supabase başlığı ve bildirimi buna göre kurar.
import { db, durumYaz } from '../supabase.js';

async function kaynagiCalistir(kategori, k) {
  const ad = `${kategori}-${k.KAYNAK}`;
  try {
    const kesintiler = (await k.cek()).map((x) => ({ kategori, ...x }));
    const sayac = {};
    for (const kesinti of kesintiler) {
      // Fonksiyon adı tarihsel; kategori parametresiyle su/doğalgazı da kaydeder
      const { data, error } = await db.rpc('elektrik_kesinti_kaydet', { p: kesinti });
      const sonuc = error ? 'hata' : data;
      sayac[sonuc] = (sayac[sonuc] || 0) + 1;
      if (error) console.error(`  [${ad}] ${kesinti.kaynak_id}:`, error.message);
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
    await durumYaz(ad, { basarili: false, hata: e.message });
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
