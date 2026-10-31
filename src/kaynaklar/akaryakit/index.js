// Akaryakıt fiyatları (dağıtıcıların kendi sitelerinden, il bazında): Opet, PO, Shell, Alpet, TP, Lukoil, Aytemiz.
// 2 saatte bir okunur;
// gece yarısı zam/indirim saatlerinde (00:00–01:30) her turda.
import { db, durumYaz, hataMetni } from '../../supabase.js';
import * as opet from './opet.js';
import * as po from './po.js';
import * as shell from './shell.js';
import * as alpet from './alpet.js';
import * as tp from './tp.js';
import * as lukoil from './lukoil.js';
import * as aytemiz from './aytemiz.js';

const KAYNAKLAR = [opet, po, shell, alpet, tp, lukoil, aytemiz];

const trSimdi = () => new Date(Date.now() + 3 * 3600_000);
const bugun = () => trSimdi().toISOString().slice(0, 10);
const zamSaati = () => {
  const s = trSimdi();
  return s.getUTCHours() === 0 || (s.getUTCHours() === 1 && s.getUTCMinutes() <= 30);
};

async function sonBasari(kaynak) {
  const { data } = await db.from('toplayici_durum').select('son_basari').eq('kaynak', kaynak).maybeSingle();
  return data?.son_basari ? new Date(data.son_basari).getTime() : 0;
}

export async function akaryakitCalistir({ zorla = false } = {}) {
  for (const k of KAYNAKLAR) {
    const kaynak = `akaryakit-${k.DAGITICI}`;
    if (!zorla && !zamSaati() && Date.now() - (await sonBasari(kaynak)) < 115 * 60_000) continue;
    try {
      const { tarih, liste } = await k.cek();
      if (liste.length < 40) throw new Error(`az il geldi (${liste.length}); site biçimi değişmiş olabilir`);
      const { data, error } = await db.rpc('akaryakit_kaydet_toplu', {
        p_dagitici: k.DAGITICI,
        p_tarih: tarih ?? bugun(),
        p_liste: liste,
      });
      if (error) throw new Error(error.message);
      console.log(`[${kaynak}] ${data} il`);
      await durumYaz(kaynak, { basarili: true, adet: data });
    } catch (e) {
      console.error(`[${kaynak}] hata:`, e.message);
      await durumYaz(kaynak, { basarili: false, hata: hataMetni(e) });
    }
  }
}
