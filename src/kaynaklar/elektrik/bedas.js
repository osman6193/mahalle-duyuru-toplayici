// BEDAŞ (İstanbul Avrupa Yakası) planlı kesintiler
// Kaynak: https://www.bedas.com.tr/GetItemsData  (GET, tüm planlı kesintiler tek JSON)
//
// Mesaj kalıbı (keşifle doğrulandı, 127/127 kayıt):
//   "İSTANBUL ŞİŞLİ ilce MERKEZ-MAHMUT ŞEVKET PAŞA mah ERDEM 1, GAZİLER sk / KUSTEPE mah ... sk
//    // BEYOĞLU ilce MERKEZ-... mah ... sk  bölgelerinde 26/10/2026 09:00:00 - ..."
//   - İlçeler "//" ile, aynı ilçedeki mahalleler " / " ile ayrılır
//   - "SEMT-MAHALLE mah" -> mahalle adı tireden sonrası
//   - "... sk" sokak listesi (şimdilik sadece saklanıyor)

export const KAYNAK = 'bedas';
const URL = 'https://www.bedas.com.tr/GetItemsData';

/** Mesajdan [{ilce, mahalleler:[{ad, sokaklar}]}] çıkarır. */
export function mesajiCoz(mesaj) {
  const govde = (mesaj || '').split(/\s+bölgelerinde\s+/)[0];
  const sonuc = [];
  for (let parca of govde.split(/\s*\/\/\s*/)) {
    parca = parca.replace(/^İSTANBUL\s+/i, '').trim();
    const m = parca.match(/^(.+?)\s+ilce\s+(.*)$/s);
    if (!m) continue;
    const ilce = m[1].trim();
    const mahalleler = [];
    for (const seg of m[2].split(/\s+\/\s+/)) {
      const mm = seg.match(/^(.+?)\s+mah\b\s*(.*)$/s);
      if (!mm) continue;
      let ad = mm[1].trim();
      const tire = ad.indexOf('-');
      if (tire >= 0) ad = ad.slice(tire + 1).trim();         // "MERKEZ-SULTANİYE" / "-TÜRKOBA" -> mahalle adı
      const sokaklar = mm[2].replace(/(^|\s+)sk\s*$/i, '').split(',').map((s) => s.trim()).filter(Boolean);
      if (ad) mahalleler.push({ ad, sokaklar });
    }
    sonuc.push({ ilce, mahalleler });
  }
  return sonuc;
}

const tarih = (s) => (s ? s.replace(' ', 'T') + '+03:00' : null); // "2026-10-27 09:00:00" -> ISO, İstanbul saati

/** BEDAŞ'tan çek, ortak formata çevir. */
export async function cek() {
  const yanit = await fetch(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    signal: AbortSignal.timeout(30000),
  });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  const liste = await yanit.json();
  if (!Array.isArray(liste)) throw new Error('beklenmeyen format (dizi değil)');

  return liste.map((k) => {
    const p = k.plannedOutage || {};
    const bolgeler = mesajiCoz(p.message);
    const yedekIlceler = [p.county, p.county2, p.county3].filter(Boolean);
    return {
      kaynak: KAYNAK,
      kaynak_id: String(k.id || p.id),
      il: p.city || 'İSTANBUL',
      ilceler: bolgeler.length ? bolgeler.map((b) => b.ilce) : yedekIlceler,
      mahalleler: bolgeler.flatMap((b) => b.mahalleler.map((m) => m.ad)),
      baslangic: tarih(p.startDateTime),
      bitis: tarih(p.endDateTime),
      neden: p.reason || null,
      mesaj: p.message || null,
      detay: bolgeler,
      guncelleme: k.updateDateTime || null,
    };
  });
}
