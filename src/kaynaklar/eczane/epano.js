// Birçok il eczacı odasının kullandığı ortak site altyapısı ("epano") için çözücü.
// Eczane blokları:
//   Bursa:  <h4 class="red"><strong>AD</strong> - İLÇE</h4>
//   İzmir:  <h4 class="red"><i class="fa fa-home"></i> <strong>AD - BÖLGE</strong> </h4>
// Ardından: <i class='fa fa-home main-color'></i> ADRES ... <i class='fa fa-phone ...'></i> <a href="tel:...">
//           <a href="https://www.google.com/maps?q=ENLEM,BOYLAM">  (varsa) "GG.AA.YYYY SS:DD / GG.AA.YYYY SS:DD"
const metne = (h) =>
  h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
const zaman = (g, a, y, s, d) => `${y}-${a}-${g}T${s}:${d}:00+03:00`;

export function coz(html) {
  const bloklar = html.split(/<h4 class="red">/i).slice(1);
  const sonuc = [];
  for (const b of bloklar) {
    // "<strong>AD</strong> - İLÇE</h4>"  ya da  "<strong>AD - İLÇE</strong>"
    const b1 = b.match(/^[\s\S]*?<strong>([^<]+)<\/strong>\s*-\s*([^<]+)<\/h4>/i);
    const b2 = b.match(/^[\s\S]*?<strong>([^<]+?)\s+-\s+([^<]+)<\/strong>/i);
    const baslik = b1 ?? b2;
    if (!baslik) continue;
    const [bolge, ...alt] = baslik[2].split(' - ').map((x) => x.trim());
    const adres = b.match(/fa-home main-color['"]><\/i>([\s\S]*?)<i class=["']fa fa-phone/i);
    const tel = [...b.matchAll(/href="tel:([^"]+)"/gi)].map((m) => m[1].trim()).filter(Boolean);
    const konum = b.match(/maps\?q=(-?[\d.]+),(-?[\d.]+)/);
    const saat = b.match(/(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}) \/ (\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/);
    sonuc.push({
      ad: baslik[1].trim(),
      ilce: bolge,
      not: alt.length ? alt.join(' - ') : null,
      adres: adres ? metne(adres[1]) || null : null,
      telefon: tel.join(' / ') || null,
      enlem: konum ? Number(konum[1]) : null,
      boylam: konum ? Number(konum[2]) : null,
      baslangic: saat ? zaman(saat[1], saat[2], saat[3], saat[4], saat[5]) : null,
      bitis: saat ? zaman(saat[6], saat[7], saat[8], saat[9], saat[10]) : null,
    });
  }
  return sonuc;
}

export async function getir(url) {
  const yanit = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' },
    signal: AbortSignal.timeout(45000),
  });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return yanit.text();
}
