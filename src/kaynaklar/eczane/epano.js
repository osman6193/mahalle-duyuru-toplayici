// Birçok il eczacı odasının kullandığı ortak site altyapısı ("epano") için çözücü.
// Sayfa: https://www.<oda>/nobetci-eczaneler  (çok illi odalarda /nobetci-eczaneler/<plaka>)
// Her eczane kartında "epano.gif" simgesi bulunur; kartlar bu simgeye göre ayrılır. Başlık şablonları:
//   <h4 class="red"><strong>AD</strong> - İLÇE</h4>                 (Bursa)
//   <h4 class="red"><i ...></i> <strong>AD - BÖLGE</strong> </h4>  (İzmir)
//   <h4 class="red border"><strong>AD</strong> - İLÇE</h4>          (Balıkesir…)
//   <h4 class="red border"><strong>AD</strong></h4> <p><i class='fa fa-arrow-right …'></i> İLÇE<br> (Kayseri…)
// Ardından: fa-home ADRES · fa-phone <a href="tel:..."> · maps?q=ENLEM,BOYLAM · (varsa) "GG.AA.YYYY SS:DD / GG.AA.YYYY SS:DD"
const metne = (h) =>
  h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const zaman = (g, a, y, s, d) => `${y}-${a}-${g}T${s}:${d}:00+03:00`;

// "İ" vb. için Türkçe büyük/küçük harf: "ALTIEYLÜL" -> "Altıeylül"
const basHarf = (s) =>
  s.toLocaleLowerCase('tr').replace(/(^|[\s\-(/.])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase('tr'));
const duzelt = (s) => (s && s === s.toLocaleUpperCase('tr') ? basHarf(s) : s);

// Bir icon satırının (fa-xxx / icon-xxx) metni: bir sonraki <br>, icon ya da paragraf sonuna kadar
function satir(b, ikon) {
  const m = b.match(new RegExp(`(?:fa|icon)-(?:${ikon})\\b[^>]*>\\s*<\\/i>([\\s\\S]*?)(?:<br\\s*\\/?>|<i\\s|<\\/p>|<a\\s|<\\/h\\d>)`, 'i'));
  return m ? metne(m[1]) || null : null;
}

// 37°54'39.4"N  ->  37.910944
function dms(d, m, s) {
  return Number(d) + Number(m) / 60 + Number(s) / 3600;
}
function konumBul(b) {
  const t = b.replace(/%2C/gi, ',').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
  const ondalik = t.match(/maps[^"'<>]*?[?&](?:q|query|ll|daddr)=(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/)
    ?? t.match(/maps[^"'<>]*?(?:\/place\/|\/@)(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (ondalik) return [Number(ondalik[1]), Number(ondalik[2])];
  const d = t.match(/(\d{2})°(\d{1,2})'([\d.]+)"?N\s*,\s*(\d{2})°(\d{1,2})'([\d.]+)"?E/);
  if (d) return [dms(d[1], d[2], d[3]), dms(d[4], d[5], d[6])];
  return [null, null];
}

// Bölüm başlığı (ilçe): <h3|h4|h5 …><strong>SEYHAN BUGÜN NÖBETÇİ ECZANELER</strong></h4>, <h4><strong>MERKEZ</strong></h4>
const BASLIK = /<h([2-6])[^>]*>([\s\S]{2,160}?)<\/h\1>/gi;
// "SEYHAN BUGÜN NÖBETÇİ ECZANELER" -> "SEYHAN"; "MERKEZ/AKSARAY …" -> "MERKEZ"; tarih/odası/düğme -> null
// "MERKEZ/AKSARAY" -> { ad: "MERKEZ", il: "AKSARAY" }
function bolumCoz(t) {
  const tam = bolumAdi(t);
  if (tam == null) return { ad: null, il: null };
  const [ad, il] = tam.split('/').map((x) => x.trim());
  return { ad: ad || null, il: il || null };
}
function bolumAdi(t) {
  let s = metne(t).replace(/\b(BUGÜN|BUGUN|Bugün)\b/gi, '')
    .replace(/N[ÖOöo]BET[ÇCçc][İIi]\s+ECZANE(LER[İIi]?|S[İIi])?/gi, '').replace(/\s*-\s*$/, '').trim();
  if (!s || s.length > 40 || /\d/.test(s) || /'(da|de|ta|te)\b/i.test(s)) return null;
  if (/oda(s[ıi])?\b|göster|goster|harita|eczanes[iİ]|duyuru|menü|giriş|arama|yazdır|kart/i.test(s)) return null;
  return s;
}

// Kart içindeki başlık etiketleri: <h3..h5>, <font>; adı ve (varsa) " - İLÇE" kısmını verir
function kartBasligi(seg) {
  const ad = seg.match(/nobet-card-name["'][^>]*>([^<]+)</i);
  if (ad) return { ad: metne(ad[1]), bolge: seg.match(/nobet-card-ilce["'][^>]*>([^<]+)</i)?.[1] ?? null, son: 0 };
  const m = seg.match(/<(h[2-6]|font)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (!m) return null;
  const ic = m[2];
  const son = m.index + m[0].length;
  const kucuk = ic.match(/^([\s\S]*?)<br\s*\/?>\s*<small>([^<]+)<\/small>/i);
  if (kucuk) return { ad: metne(kucuk[1]), bolge: kucuk[2], son };
  const b1 = ic.match(/<strong>([\s\S]+?)<\/strong>\s*-\s*([^<]+)/i);
  if (b1) return { ad: metne(b1[1]), bolge: b1[2], son };
  const duz = metne(ic);
  const ayr = duz.match(/^(.+?ECZANES[İI]|.+?Eczanesi)\s+-\s+(.+)$/i) ?? duz.match(/^(.+?)\s+-\s+(.+)$/);
  if (ayr) return { ad: ayr[1], bolge: ayr[2], son };
  return { ad: duz, bolge: null, son };
}

export function coz(html) {
  // Her nöbet kartında "epano.gif" simgesi var: iki simge arası bir eczane
  const isaret = (re) => [...html.matchAll(re)].map((m) => ({ i: m.index, son: m.index + m[0].length, alt: m[0].match(/alt=["']([^"']*)["']/i)?.[1] ?? '' }));
  // Kart simgesi (epano.gif, Trabzon'da nobet-elogo.png); yoksa "nobetci" kart kutusu (Isparta)
  let kartlar = isaret(/<img[^>]+(?:epano\.gif|nobet-e?logo\.\w+)[^>]*>/gi);
  if (!kartlar.length) kartlar = isaret(/<div[^>]+class=["'][^"']*\bnobetci\b[^"']*["'][^>]*>/gi);
  // O da yoksa kart başlıklarına göre böl (başlık etiketi kartın içinde kalsın)
  if (!kartlar.length)
    kartlar = [...html.matchAll(/<h[3-5] class=["'](?:t?red|text-danger)[^"']*["'][^>]*>|<font[^>]*class=["'](?:kirmizi|color)["'][^>]*>/gi)].map((m) => ({ i: m.index, son: m.index, alt: '' }));
  const basliklar = [...html.matchAll(BASLIK)].map((m) => ({ i: m.index, ...bolumCoz(m[2]) }));
  const sonuc = [];
  let bolum = null;
  let bolumIl = null;
  let onceki = 0; // bir önceki kartın içeriğinin bittiği yer (bölüm başlığı bundan sonra aranır)
  for (let k = 0; k < kartlar.length; k++) {
    const kart = kartlar[k];
    for (const h of basliklar) if (h.i >= onceki && h.i < kart.i && h.ad) [bolum, bolumIl] = [h.ad, h.il];
    const seg = html.slice(kart.son, kartlar[k + 1]?.i ?? Math.min(html.length, kart.son + 6000));
    const bas = kartBasligi(seg);
    let ad = bas?.ad || '';
    if (!/eczane|ecz\./i.test(ad) && /eczane/i.test(kart.alt) && !/^n[öo]bet[çc]i eczane/i.test(kart.alt)) ad = metne(kart.alt);
    // içerik sonu: son harita/telefon bağlantısı
    const icerikSon = Math.max(seg.lastIndexOf('maps'), seg.lastIndexOf('tel:'), 0);
    onceki = kart.son + icerikSon;
    if (!ad || /nöbet kartı|nobet karti/i.test(ad)) continue;
    const b = seg.slice(bas?.son ?? 0);
    let ilce = null;
    let not = null;
    if (bas?.bolge) {
      const [ilk, ...alt] = metne(bas.bolge).split(' - ').map((x) => x.trim());
      ilce = ilk || null;
      if (alt.length) not = alt.join(' - ');
    }
    // Isparta: başlığın hemen altında <h5>MERKEZ</h5>
    const altBaslik = b.match(/^\s*<h[4-6][^>]*>([^<]{2,40})<\/h[4-6]>/i);
    ilce = ilce ?? (altBaslik ? metne(altBaslik[1]) : null) ?? satir(b, 'arrow-right|hand-right|map-signs') ?? bolum;
    let adres = satir(b, 'home|house');
    if (!adres) {
      const im = satir(b, 'map-marker|location-dot');
      if (im && !/harita|tıklay|konum/i.test(im)) adres = im;
    }
    const tel = [...b.matchAll(/href=["']tel:([^"']+)["']/gi)].map((m) => m[1].trim()).filter(Boolean);
    const telMetin = tel.length ? null : satir(b, 'phone');
    const [enlem, boylam] = konumBul(b);
    // Telefonu, adresi ve konumu olmayan "kart" bir eczane değildir (düğme, form…)
    if (!tel.length && !telMetin && !adres && enlem == null) continue;
    const saat = b.match(/(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}) [\/-] (\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/);
    sonuc.push({
      ad,
      ilce: ilce ? duzelt(ilce) : null,
      not: not ? duzelt(not) : null,
      bolum_il: bolumIl,
      adres,
      telefon: tel.length ? [...new Set(tel)].join(' / ') : telMetin,
      // Türkiye dışı ya da boş (0,0) koordinatlar yok sayılır
      enlem: enlem && enlem > 35 && enlem < 43 ? enlem : null,
      boylam: boylam && boylam > 25 && boylam < 45 ? boylam : null,
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
  // Bazı odalar windows-1254 kullanıyor
  const tampon = await yanit.arrayBuffer();
  const tur = yanit.headers.get('content-type') ?? '';
  let kod = /charset=([\w-]+)/i.exec(tur)?.[1];
  if (!kod) {
    const bas = new TextDecoder('latin1').decode(tampon.slice(0, 4000));
    kod = /charset=["']?([\w-]+)/i.exec(bas)?.[1];
  }
  try {
    return new TextDecoder(kod && !/utf-?8/i.test(kod) ? kod : 'utf-8').decode(tampon);
  } catch {
    return new TextDecoder('utf-8').decode(tampon);
  }
}
