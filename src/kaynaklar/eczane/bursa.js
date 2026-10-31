// Bursa Eczacı Odası — bugünün nöbetçi eczaneleri (tüm ilçeler tek sayfada)
// Kaynak: https://www.beo.org.tr/nobetci-eczaneler  (sunucuda üretilen HTML)
// Her eczane bir <div class="col-md-12 nobetci"> bloğu:
//   <h4 class="red"><strong>LALE ECZANESİ</strong> - NİLÜFER</h4>            (ilçe; "OSMANGAZİ - DEMİRTAŞ" gibi alt bölge olabilir)
//   <i class='fa fa-home ...'></i> ADRES<br>(TARİF)<br><i class='fa fa-phone ...'></i>
//   <a href="tel:0224 245 76 00">  (bir ya da iki numara)
//   <a href="https://www.google.com/maps?q=40.2142077,28.9814976">
//   <span class="red"> 30.10.2026 18:30 / 31.10.2026 10:00 </span> nöbetçidir.
export const KAYNAK = 'eczane-bursa';
export const IL_ID = 16;
const URL = 'https://www.beo.org.tr/nobetci-eczaneler';

const metne = (h) =>
  h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
const zaman = (g, a, y, s, d) => `${y}-${a}-${g}T${s}:${d}:00+03:00`;

export function coz(html) {
  const bloklar = html.split(/class="col-md-12 nobetci"/).slice(1);
  const sonuc = [];
  for (const b of bloklar) {
    const baslik = b.match(/<h4[^>]*>\s*<strong>([^<]+)<\/strong>\s*-\s*([^<]+)<\/h4>/i);
    if (!baslik) continue;
    const [ilce, ...alt] = baslik[2].split(' - ').map((x) => x.trim());
    const adres = b.match(/fa-home[^>]*><\/i>([\s\S]*?)<i class=["']fa fa-phone/i);
    const tel = [...b.matchAll(/href="tel:([^"]+)"/gi)].map((m) => m[1].trim());
    const konum = b.match(/maps\?q=(-?[\d.]+),(-?[\d.]+)/);
    const saat = b.match(/(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}) \/ (\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/);
    sonuc.push({
      ad: baslik[1].trim(),
      ilce,
      not: alt.length ? alt.join(' - ') : null,
      adres: adres ? metne(adres[1]) : null,
      telefon: tel.join(' / ') || null,
      enlem: konum ? Number(konum[1]) : null,
      boylam: konum ? Number(konum[2]) : null,
      baslangic: saat ? zaman(saat[1], saat[2], saat[3], saat[4], saat[5]) : null,
      bitis: saat ? zaman(saat[6], saat[7], saat[8], saat[9], saat[10]) : null,
    });
  }
  return sonuc;
}

export async function cek() {
  const yanit = await fetch(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' },
    signal: AbortSignal.timeout(45000),
  });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return coz(await yanit.text());
}
