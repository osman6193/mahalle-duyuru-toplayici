// BEDAŞ (İstanbul Avrupa Yakası) planlı kesintiler — CK Enerji altyapısı
// Kaynak: https://www.bedas.com.tr/GetItemsData
//
// Mesaj kalıbı (keşifle doğrulandı, 127/127 kayıt):
//   "İSTANBUL ŞİŞLİ ilce MERKEZ-MAHMUT ŞEVKET PAŞA mah ERDEM 1, GAZİLER sk / KUSTEPE mah ... sk
//    // BEYOĞLU ilce MERKEZ-... mah ... sk  bölgelerinde 26/10/2026 09:00:00 - ..."
//   - İlçeler "//" ile, aynı ilçedeki mahalleler " / " ile ayrılır
//   - "SEMT-MAHALLE mah" -> mahalle adı tireden sonrası
import { ckKaynagi } from './ck-platform.js';

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

export const { KAYNAK, cek } = ckKaynagi({ kaynak: 'bedas', url: 'https://www.bedas.com.tr/GetItemsData', cozucu: mesajiCoz, varsayilanIl: 'İSTANBUL' });
