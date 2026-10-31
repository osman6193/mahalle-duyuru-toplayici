// Çoruh EDAŞ ve Fırat EDAŞ'ın ortak sitesi: "Bakım Programı ve Kesinti Listesi"
// GET https://<alan>/BilgiDanisma/GetKesintiler?yil=&ay=&il=<plaka>&ilce=  → HTML tablo (geçmiş dahil, yeniden eskiye)
//   <tr><td>İl</td><td>İlçe</td><td>Tarih GG.AA.YYYY</td><td>Başlama SS:DD</td><td>Bitiş SS:DD</td>
//       <td>Kesinti Nedeni</td><td>Etkilenecek Bölgeler ("İNÖNÜ MAH." / "EYMÜR KÖYÜ MERKEZ MEVKİİ")</td><td>Eklenme</td></tr>
// Her satır tek bir yer; aynı ilçe + gün + saat + neden olan satırlar tek kesintide birleştirilir.
import { createHash } from 'node:crypto';

const metne = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export function yerAdi(bolge) {
  const m = bolge.match(/^(.+?)\s+(?:MAH\.?|MAHALLESİ|KÖYÜ|KÖY|BELDESİ)(?:\s|$)/i);
  return m ? m[1].trim() : null;
}

export function coz(html, kaynak, simdi = Date.now()) {
  const gruplar = new Map();
  for (const satir of html.split(/<tr>\s*<td>/).slice(1)) {
    const td = ('<td>' + satir.split('</tr>')[0]).split(/<\/td>/).map(metne).filter((x, i, a) => i < a.length - 1);
    if (td.length < 7) continue;
    const [il, ilce, tarih, bas, bit, neden, bolge] = td;
    const t = tarih.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!t || !/^\d{2}:\d{2}$/.test(bas) || !/^\d{2}:\d{2}$/.test(bit)) continue;
    const gun = `${t[3]}-${t[2]}-${t[1]}`;
    const bitis = `${gun}T${bit}:00+03:00`;
    if (Date.parse(bitis) < simdi - 6 * 3600_000) continue;   // geçmiş kesintiler
    const anahtar = `${il}|${ilce}|${gun}|${bas}|${bit}|${neden}`;
    if (!gruplar.has(anahtar))
      gruplar.set(anahtar, { il, ilce, gun, bas, bitis, neden, yerler: new Set(), metin: [] });
    const g = gruplar.get(anahtar);
    const ad = yerAdi(bolge);
    if (ad) g.yerler.add(ad);
    g.metin.push(bolge);
  }
  return [...gruplar.entries()].map(([anahtar, g]) => ({
    kaynak,
    kaynak_id: createHash('sha1').update(anahtar).digest('hex').slice(0, 16),
    il: g.il,
    ilceler: [g.ilce],
    detay: [{ ilce: g.ilce, mahalleler: [...g.yerler].map((ad) => ({ ad })) }],
    baslangic: `${g.gun}T${g.bas}:00+03:00`,
    bitis: g.bitis,
    neden: g.neden || 'Planlı çalışma',
    aciklama: g.metin.join(', ').slice(0, 1000),
  }));
}

export function bilgiDanismaKaynagi({ kaynak, alan, iller }) {
  return {
    KAYNAK: kaynak,
    async cek() {
      const sonuc = [];
      for (const il of iller) {
        const yanit = await fetch(`https://${alan}/BilgiDanisma/GetKesintiler?yil=&ay=&il=${il}&ilce=`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            Referer: `https://${alan}/BilgiDanisma/BakimProgramiveKesintiListesi`,
          },
          signal: AbortSignal.timeout(60000),
        });
        if (!yanit.ok) throw new Error(`HTTP ${yanit.status} (il ${il})`);
        sonuc.push(...coz(await yanit.text(), kaynak));
      }
      return sonuc;
    },
  };
}
