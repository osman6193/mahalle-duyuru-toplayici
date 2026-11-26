// Nöbetçi eczane kaynakları (il eczacı odaları). Saatte bir çalışır.
// Diğer iller NosyAPI'den gelir (Supabase "eczane-nosy" fonksiyonu); kendi kaynağı olan ilde NosyAPI atlanır.
// Eski epano odaları (Oben Teknoloji, 9 Kasım 2026'dan beri IP engeli) 27 Kasım 2026'da kaldırıldı.
// Yeni site için: ./<il>.js dosyası (KAYNAK, IL_ID, cek()) yaz, aşağıdaki listeye ekle.
import { db, durumYaz } from '../../supabase.js';
import * as ankara from './ankara.js';
import * as antalya from './antalya.js';
import * as sanliurfa from './sanliurfa.js';
import * as gaziantep from './gaziantep.js';
import * as rize from './rize.js';
import * as usak from './usak.js';
import * as giresun from './giresun.js';

const KAYNAKLAR = [
  ankara,
  antalya,
  sanliurfa,
  gaziantep,
  rize,
  usak,
  giresun,
];

// Saat yazmayan sitelerde: sabah 08:30'dan önce görünen liste dünkü nöbettir
function nobetGunu() {
  const s = new Date(Date.now() + 3 * 3600_000); // Türkiye saati (UTC+3)
  if (s.getUTCHours() * 60 + s.getUTCMinutes() < 8 * 60 + 30) s.setUTCDate(s.getUTCDate() - 1);
  return s.toISOString().slice(0, 10);
}

// ISO zamanın Türkiye saatine göre günü (06:30Z → aynı gün; 22:00Z → ertesi gün)
const trGunu = (iso) => new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(0, 10);

function devirSaati() {
  const s = new Date(Date.now() + 3 * 3600_000);
  const dk = s.getUTCHours() * 60 + s.getUTCMinutes();
  return dk >= 8 * 60 + 20 && dk <= 10 * 60 + 30;
}

async function durum(kaynak) {
  const { data } = await db.from('toplayici_durum').select('son_basari, son_calisma').eq('kaynak', kaynak).maybeSingle();
  const t = (x) => (x ? new Date(x).getTime() : 0);
  return { basari: t(data?.son_basari), calisma: t(data?.son_calisma) };
}


export async function eczaneCalistir({ zorla = false } = {}) {
  // Siteler aynı anda 3'er
  const sira = [...KAYNAKLAR];
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      for (let k = sira.shift(); k; k = sira.shift()) await kaynakCalistir(k, zorla);
    }),
  );
}

/** Kaynağı okur; istek attıysa true döner */
async function kaynakCalistir(k, zorla) {
  {
    const d = await durum(k.KAYNAK);
    if (!zorla) {
      // Saatte bir; sabah nöbet devrinde (08:20–10:30) 20 dakikada bir
      const aralik = devirSaati() ? 20 * 60_000 : 55 * 60_000;
      if (Date.now() - Math.max(d.basari, d.calisma) < aralik) return false;
    }
    try {
      const liste = await k.cek();
      if (!liste.length) throw new Error('liste boş geldi (site biçimi değişmiş olabilir)');
      // Nöbet başlangıç gününe ve ile göre grupla (genelde tek gün, tek il; Ankara odası Kırıkkale'yi de kapsar)
      const gruplar = new Map();
      for (const e of liste) {
        const gun = e.baslangic ? trGunu(e.baslangic) : nobetGunu();
        const il = e.il_id ?? k.IL_ID;
        const anahtar = `${il}|${gun}`;
        if (!gruplar.has(anahtar)) gruplar.set(anahtar, { il, gun, grup: [] });
        gruplar.get(anahtar).grup.push(e);
      }
      let toplam = 0;
      for (const { il, gun, grup } of gruplar.values()) {
        const kaynak = il === k.IL_ID ? k.KAYNAK : `${k.KAYNAK}-${il}`;
        const { data, error } = await db.rpc('nobet_kaydet', { p_kaynak: kaynak, p_gun: gun, p_il_id: il, p_liste: grup });
        if (error) throw new Error(error.message);
        toplam += data ?? 0;
      }
      console.log(`[${k.KAYNAK}] ${toplam} nöbetçi eczane`);
      await durumYaz(k.KAYNAK, { basarili: true, adet: toplam });
    } catch (e) {
      console.error(`[${k.KAYNAK}] hata:`, e.message);
      await durumYaz(k.KAYNAK, { basarili: false, hata: e.message });
    }
    return true;
  }
}
