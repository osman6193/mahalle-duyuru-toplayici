// Yeşilırmak EDAŞ (Samsun, Ordu, Çorum, Amasya, Sinop) planlı kesintiler
// Kaynak: GET https://www.yesilirmakedas.com/api/planli-kesinti-harita
//   cevap: {code:0, result:{data:[{ id, title:"Aydınlatma Çalışmaları",
//            details:"Başlangıç Zamanı\n09.11.2026 09:00:00\nBitiş Zamanı\n09.11.2026 10:30:00",
//            address:[{city_name:"SAMSUN", district_name:"CANİK", mah_name:"DÜVECİK MH.", street:"DERELER"}, ...],
//            geoJson, coords }]}}
//   Adresler yapılandırılmış (il/ilçe/mahalle ayrı alan) -> metin ayrıştırma gerekmez.
//   Bir kesinti birden fazla ili kapsarsa il başına ayrı kayıt: kaynak_id = `${id}-${il}`.

export const KAYNAK = 'yesilirmak';
const URL = 'https://www.yesilirmakedas.com/api/planli-kesinti-harita';

function zaman(details, etiket) {
  const m = String(details || '').match(new RegExp(`${etiket}[^\\d]*(\\d{2})\\.(\\d{2})\\.(\\d{4})\\s+(\\d{2}):(\\d{2})`));
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00+03:00` : null;
}
const mahAdi = (s) => String(s || '').replace(/\s+(MH|MAH|MAHALLESİ)\.?$/i, '').trim();

export async function cek() {
  const yanit = await fetch(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'https://www.yesilirmakedas.com/' },
    signal: AbortSignal.timeout(60000),
  });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  const veri = await yanit.json();
  const liste = veri?.result?.data;
  if (!Array.isArray(liste)) throw new Error(`beklenmeyen cevap: ${veri?.message || 'format'}`);

  const sonuc = [];
  for (const k of liste) {
    const baslangic = zaman(k.details, 'Başlangıç'), bitis = zaman(k.details, 'Bitiş');
    if (!baslangic) continue;
    // il -> ilçe -> mahalleler
    const iller = new Map();
    for (const a of k.address || []) {
      const il = (a.city_name || '').trim(), ilce = (a.district_name || '').trim(), mah = mahAdi(a.mah_name);
      if (!il || !ilce) continue;
      if (!iller.has(il)) iller.set(il, new Map());
      const ilceler = iller.get(il);
      if (!ilceler.has(ilce)) ilceler.set(ilce, new Set());
      if (mah) ilceler.get(ilce).add(mah);
    }
    for (const [il, ilceler] of iller) {
      sonuc.push({
        kaynak: KAYNAK,
        kaynak_id: iller.size > 1 ? `${k.id}-${il}` : String(k.id),
        il,
        ilceler: [...ilceler.keys()],
        detay: [...ilceler].map(([ilce, m]) => ({ ilce, mahalleler: [...m].map((ad) => ({ ad })) })),
        baslangic, bitis,
        neden: k.title || 'Planlı çalışma',
      });
    }
  }
  return sonuc;
}
