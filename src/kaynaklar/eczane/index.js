// Nöbetçi eczane kaynakları (il eczacı odaları). Saatte bir çalışır.
// Yeni il eklemek için: ./<il>.js dosyası (KAYNAK, IL_ID, cek()) yaz, aşağıdaki listeye ekle.
import { db, durumYaz } from '../../supabase.js';
import * as bursa from './bursa.js';
import * as izmir from './izmir.js';

const KAYNAKLAR = [bursa, izmir];

// Saat yazmayan sitelerde: sabah 08:30'dan önce görünen liste dünkü nöbettir
function nobetGunu() {
  const s = new Date(Date.now() + 3 * 3600_000); // Türkiye saati (UTC+3)
  if (s.getUTCHours() * 60 + s.getUTCMinutes() < 8 * 60 + 30) s.setUTCDate(s.getUTCDate() - 1);
  return s.toISOString().slice(0, 10);
}

async function sonBasari(kaynak) {
  const { data } = await db.from('toplayici_durum').select('son_basari').eq('kaynak', kaynak).maybeSingle();
  return data?.son_basari ? new Date(data.son_basari).getTime() : 0;
}

export async function eczaneCalistir({ zorla = false } = {}) {
  for (const k of KAYNAKLAR) {
    // 10 dakikalık cron'da her kaynağı saatte bir oku
    if (!zorla && Date.now() - (await sonBasari(k.KAYNAK)) < 55 * 60_000) continue;
    try {
      const liste = await k.cek();
      if (!liste.length) throw new Error('liste boş geldi (site biçimi değişmiş olabilir)');
      // Nöbet başlangıç gününe göre grupla (genelde tek gün)
      const gunler = new Map();
      for (const e of liste) {
        const gun = e.baslangic ? e.baslangic.slice(0, 10) : nobetGunu();
        if (!gunler.has(gun)) gunler.set(gun, []);
        gunler.get(gun).push(e);
      }
      let toplam = 0;
      for (const [gun, grup] of gunler) {
        const { data, error } = await db.rpc('nobet_kaydet', { p_kaynak: k.KAYNAK, p_gun: gun, p_il_id: k.IL_ID, p_liste: grup });
        if (error) throw new Error(error.message);
        toplam += data ?? 0;
      }
      console.log(`[${k.KAYNAK}] ${toplam} nöbetçi eczane`);
      await durumYaz(k.KAYNAK, { basarili: true, adet: toplam });
    } catch (e) {
      console.error(`[${k.KAYNAK}] hata:`, e.message);
      await durumYaz(k.KAYNAK, { basarili: false, hata: e.message });
    }
  }
}
