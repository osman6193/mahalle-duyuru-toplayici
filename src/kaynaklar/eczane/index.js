// Nöbetçi eczane kaynakları (il eczacı odaları). Saatte bir çalışır.
// Ortak "epano" altyapılı odalar ./odalar.js listesinde (tek satır = bir il).
// Farklı siteler için: ./<il>.js dosyası (KAYNAK, IL_ID, cek()) yaz, aşağıdaki listeye ekle.
import { db, durumYaz } from '../../supabase.js';
import * as izmir from './izmir.js';
import * as ankara from './ankara.js';
import * as antalya from './antalya.js';
import * as sanliurfa from './sanliurfa.js';
import * as gaziantep from './gaziantep.js';
import * as rize from './rize.js';
import { ODALAR, odaCek } from './odalar.js';

const KAYNAKLAR = [
  izmir,
  ankara,
  antalya,
  sanliurfa,
  gaziantep,
  rize,
  ...ODALAR.map((o) => ({ KAYNAK: o.kaynak, IL_ID: o.il, cek: () => odaCek(o) })),
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

async function sonBasari(kaynak) {
  const { data } = await db.from('toplayici_durum').select('son_basari').eq('kaynak', kaynak).maybeSingle();
  return data?.son_basari ? new Date(data.son_basari).getTime() : 0;
}

export async function eczaneCalistir({ zorla = false } = {}) {
  // ~60 site: aynı anda 6 tanesi okunur (turun 9 dakikalık sınırına sığsın)
  const sira = [...KAYNAKLAR];
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let k = sira.shift(); k; k = sira.shift()) await kaynakCalistir(k, zorla);
  }));
}

async function kaynakCalistir(k, zorla) {
  {
    // 10 dakikalık cron'da her kaynağı saatte bir oku
    // Sabah nöbet devrinde (08:20–10:30) her turda oku ki yeni liste gecikmesin
    if (!zorla && !devirSaati() && Date.now() - (await sonBasari(k.KAYNAK)) < 55 * 60_000) return;
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
  }
}
