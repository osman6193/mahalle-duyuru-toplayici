// İZSU (İzmir) su arıza ve kesintileri
// Kaynak: https://www.izsu.gov.tr/bilgi-merkezi/ariza-ve-bakim-bilgisi-sorgulama  (Next.js, sunucuda üretilir)
//   Veri sayfanın içindeki RSC yükünde (self.__next_f.push) "waterOutageData" dizisi olarak gelir:
//   [{arizaTipId, tip:"Elektrik Arızası", ongoru, birim, kesintiTarihi:"2026-10-27T18:50:00",
//     arizaGiderilmeTarihi, aciklama, ilceId, ilceAdi:"TORBALI", mahalleler:"AYRANCILAR, İNÖNÜ", mahalleId, kesintiSuresi}]
//   Kesinti numarası yok; ilçe+mahalleler+başlangıç+birimden kararlı kimlik üretilir
//   (giderilme saati uzatılabildiği için kimliğe katılmaz).
// Aynı sayfadaki "Planlı Bakım Bilgileri" serbest HTML metin; şimdilik okunmuyor.
import { createHash } from 'node:crypto';
import { getir } from '../../getir.js';

export const KAYNAK = 'izsu';
const URL = 'https://www.izsu.gov.tr/bilgi-merkezi/ariza-ve-bakim-bilgisi-sorgulama';

const tarih = (s) => (s && !s.startsWith('0001') ? `${s.slice(0, 19)}+03:00` : null);

/** RSC parçalarını birleştirip metin olarak döndürür. */
function rscMetni(html) {
  const parcalar = [];
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try { parcalar.push(JSON.parse(m[1])); } catch { /* bozuk parça */ }
  }
  return parcalar.join('');
}

/** metin içinde `"anahtar":[` ile başlayan JSON dizisini (string kaçışlarına dikkat ederek) ayıklar. */
export function diziAyikla(metin, anahtar) {
  const bas = metin.indexOf(`"${anahtar}":[`);
  if (bas < 0) return null;
  let i = metin.indexOf('[', bas), derinlik = 0, tirnak = false;
  const ilk = i;
  for (; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) { if (c === '\\') i++; else if (c === '"') tirnak = false; continue; }
    if (c === '"') tirnak = true;
    else if (c === '[' || c === '{') derinlik++;
    else if (c === ']' || c === '}') { if (--derinlik === 0) return JSON.parse(metin.slice(ilk, i + 1)); }
  }
  return null;
}

export function coz(html) {
  const liste = diziAyikla(rscMetni(html), 'waterOutageData');
  if (!Array.isArray(liste)) throw new Error('waterOutageData bulunamadı (site yapısı değişmiş olabilir)');
  return liste.map((k) => {
    const mahalleler = String(k.mahalleler || '').split(',').map((s) => s.trim()).filter(Boolean);
    const anahtar = [k.ilceAdi, mahalleler.slice().sort().join('|'), k.kesintiTarihi, k.birim].join('#');
    return {
      kaynak: KAYNAK,
      kaynak_id: createHash('sha1').update(anahtar).digest('hex').slice(0, 20),
      il: 'İZMİR',
      ilceler: [k.ilceAdi],
      detay: [{ ilce: k.ilceAdi, mahalleler: mahalleler.map((ad) => ({ ad })) }],
      baslangic: tarih(k.kesintiTarihi),
      bitis: tarih(k.arizaGiderilmeTarihi),
      neden: k.tip || null,
      aciklama: k.aciklama || k.kesintiSuresi || null,
    };
  });
}

export async function cek() {
  // İZSU ara sertifikayı göndermiyor; getir() zinciri tamamlayıp doğrulamalı istek atar
  const yanit = await getir(URL, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' }, signal: AbortSignal.timeout(30000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return coz(await yanit.text());
}
