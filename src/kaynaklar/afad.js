// AFAD son depremler. Türkiye IP'sinden çağrıldığında güvenilir çalışır.
// DİKKAT: AFAD tarihleri UTC verir; 'format' parametresi en sonda olmalı.
import { db, durumYaz } from '../supabase.js';

const tarih = (d) => d.toISOString().slice(0, 19); // 2026-10-26T06:00:00 (UTC)

export async function afadCalistir() {
  const simdi = new Date();
  const bas = new Date(simdi.getTime() - 6 * 3600 * 1000);
  const bit = new Date(simdi.getTime() + 5 * 60 * 1000);
  const url = `https://deprem.afad.gov.tr/apiv2/event/filter?start=${tarih(bas)}&end=${tarih(bit)}&format=json`;

  try {
    const yanit = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
    const olaylar = await yanit.json();

    const { data, error } = await db.rpc('afad_ham_isle', { p: olaylar });
    if (error) throw new Error(error.message);

    console.log(`[afad] ${olaylar.length} olay okundu, ${data} yeni deprem duyurusu`);
    await durumYaz('afad', { basarili: true, adet: data });
  } catch (e) {
    console.error('[afad] hata:', e.message);
    await durumYaz('afad', { basarili: false, hata: e.message });
  }
}
