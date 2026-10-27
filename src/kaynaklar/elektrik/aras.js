// Aras EDAŞ (Erzurum, Erzincan, Bayburt, Ağrı, Kars, Iğdır, Ardahan) planlı kesintiler
// Kaynak: POST https://arasedas.com/api/planli-bakim-kesintileri/paginated
//   gövde: {pageNumber, pageSize:100, orderBy:{plannedStartedAt:"desc"}, filter:{}}
//   cevap: {objects:[{id, city:"IĞDIR", district:"TUZLUCA", plannedStartedAt:"...Z", plannedEndedAt:"...Z",
//           description:"... Kesintiden etkilenen yerler; Bekirhanlı, Cennetabat, Koçkıran köyü, ÖTR'ler,", isDatePassed}],
//           totalCount, hasNextPage}
//   Liste en yeni başlangıç tarihi önce gelir (geçmiş dahil ~19 bin kayıt); bitişi geçmiş kayda gelince durulur.
//   İl/ilçe yapılandırılmış; mahalle/köyler açıklama metninden çıkarılır. Hiçbiri eşleşmezse ilçe geneline bağlanır.

export const KAYNAK = 'aras';
const URL = 'https://arasedas.com/api/planli-bakim-kesintileri/paginated';
const MAKS_SAYFA = 40;

// "etkilenen yerler/bölgeler/müşterilerimiz ..." sonrasındaki listeden yer adları
// Not: JS'de /i bayrağı "İ"yi "i"ye katlamaz; bu yüzden aramalar tr küçük harfli kopya üzerinde yapılır.
const kucuk = (s) => s.toLocaleLowerCase('tr');

export function yerleriCoz(aciklama) {
  const metin = String(aciklama || '');
  const k = kucuk(metin);   // aynı uzunlukta (İ->i, I->ı)
  const m = k.match(/etkilene(?:n|cek)\s+(?:olan\s+)?(?:yerler|bölgeler|bölgele|müşterilerimiz)\s*[:;.]?\s*/);
  if (!m) {
    // "... X Mahallesinde / X Köyü genelinde" kalıbı
    const tek = metin.match(/([A-ZÇĞİÖŞÜ][^\s,.;]+(?:\s+[A-ZÇĞİÖŞÜ][^\s,.;]+)?)\s+(?:Mahalle(?:si|sinde)|Köyü|KÖYÜ|MAHALLES[İI](?:NDE)?)/);
    return tek ? [tek[1]] : [];
  }
  return metin.slice(m.index + m[0].length)
    .split(/[,;\n]|\s+ve\s+/i)
    .map((s) => {
      const ks = kucuk(s);
      let son = s.length;
      for (const kelime of ['şeklindedir', 'genelinde', 'bir kısmı', 'bölgesi']) { const p = ks.indexOf(kelime); if (p >= 0) son = Math.min(son, p); }
      s = s.slice(0, son);
      const b = kucuk(s).lastIndexOf('beldesi ');                       // "Halfeli Beldesi Said Nursi mahallesi"
      if (b >= 0) s = s.slice(b + 8);
      return s.replace(/\s+TR[-\s]?\d+\s*$/i, '')                   // "Yukarısivri TR-1"
        .replace(/\s+(köyü|Köyü|KÖYÜ|köyler|Köyler|KÖYLER|mahallesi|Mahallesi|MAHALLESİ|mahalle|Mahalle|MAHALLE|mah\.?|Mah\.?|MAH\.?|mezrası|Mezrası|MEZRASI)\s*\.?\s*$/, '')
        .replace(/[.'’]+$/, '').trim();
    })
    .filter((s) => s.length >= 3 && s.length <= 40)
    .filter((s) => !/ötr|otr|tr[-\s]?\d|trafo|kabin|mevki|\bdm\b|\bhat\b|hattı|turkcell|telekom|tcdd|botaş|jandarma|ilçesine bağlı|köyler/.test(kucuk(s)));
}

export async function cek() {
  const sonuc = [];
  const simdi = Date.now();
  for (let sayfa = 1; sayfa <= MAKS_SAYFA; sayfa++) {
    const yanit = await fetch(URL, {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'https://arasedas.com/' },
      body: JSON.stringify({ pageNumber: sayfa, pageSize: 50, orderBy: { plannedStartedAt: 'desc' }, filter: {} }),
      signal: AbortSignal.timeout(90000),   // sunucu yavaş: ilk turda 30 sn yetmedi
    });
    if (!yanit.ok) throw new Error(`HTTP ${yanit.status} (sayfa ${sayfa})`);
    const veri = await yanit.json();
    if (!Array.isArray(veri.objects)) throw new Error('beklenmeyen format');

    let gecmiseUlasildi = false;
    for (const k of veri.objects) {
      const bit = k.plannedEndedAt ? Date.parse(k.plannedEndedAt) : null;
      if (bit && bit < simdi) { gecmiseUlasildi = true; continue; }
      if (!k.city || !k.plannedStartedAt) continue;
      const yerler = yerleriCoz(k.description);
      sonuc.push({
        kaynak: KAYNAK,
        kaynak_id: String(k.id),
        il: k.city,
        ilceler: k.district ? [k.district] : [],
        detay: k.district ? [{ ilce: k.district, mahalleler: [...new Set(yerler)].map((ad) => ({ ad })) }] : [],
        baslangic: k.plannedStartedAt,
        bitis: k.plannedEndedAt,
        neden: 'Planlı bakım/çalışma',
        aciklama: String(k.description || '').slice(0, 500),
      });
    }
    if (gecmiseUlasildi || !veri.hasNextPage) break;
  }
  return sonuc;
}
