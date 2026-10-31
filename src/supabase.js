import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || key === 'buraya_yapistir') {
  console.error('HATA: .env dosyasında SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY dolu olmalı.');
  process.exit(1);
}

export const db = createClient(url, key, { auth: { persistSession: false } });

/** Kaynağın son çalışma durumunu yaz (izleme için). */
export async function durumYaz(kaynak, { basarili, adet = null, hata = null }) {
  const simdi = new Date().toISOString();
  const kayit = { kaynak, son_calisma: simdi, son_adet: adet, son_hata: hata ? String(hata).slice(0, 500) : null };
  if (basarili) kayit.son_basari = simdi;
  const { error } = await db.from('toplayici_durum').upsert(kayit);
  if (error) console.error(`[durum] ${kaynak}:`, error.message);
}

/** "fetch failed" yerine asıl sebebi de yaz (örn. CERT_HAS_EXPIRED, ENOTFOUND) */
export function hataMetni(e) {
  const neden = e?.cause ? ` (${e.cause.code || ''} ${e.cause.message || ''})`.replace(/\s+\)/, ')') : '';
  return `${e?.message || e}${neden}`;
}

