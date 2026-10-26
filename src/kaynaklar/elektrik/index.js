// Elektrik kesinti kaynaklarını çalıştırır ve Supabase'e yazar.
// Yeni şirket eklemek için: ./<kod>.js dosyası (KAYNAK + cek()) yaz, aşağıdaki listeye ekle.
import { db, durumYaz } from '../../supabase.js';
import * as bedas from './bedas.js';
import * as akdeniz from './akdeniz.js';

const KAYNAKLAR = [bedas, akdeniz];

async function kaynagiCalistir(k) {
  const ad = `elektrik-${k.KAYNAK}`;
  try {
    const kesintiler = await k.cek();
    const sayac = {};
    for (const kesinti of kesintiler) {
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

export async function elektrikCalistir() {
  for (const k of KAYNAKLAR) await kaynagiCalistir(k);
}
