// CK Enerji altyapısını kullanan şirketler için ortak çekici (BEDAŞ, Akdeniz EDAŞ ...)
// Hepsi "<site>/GetItemsData" adresinde tüm planlı kesintileri aynı JSON yapısında verir:
//   [{ id, updateDateTime, plannedOutage: { id, reason, city, county..., startDateTime, endDateTime, message } }]
// Şirketten şirkete değişen tek şey "message" metninin biçimi; onu çözen fonksiyon dışarıdan verilir.
//
// cozucu(mesaj) -> [{ il?, ilce, mahalleler: [{ ad, sokaklar? }] }]

const tarih = (s) => (s ? s.replace(' ', 'T') + '+03:00' : null); // "2026-10-27 09:00:00" -> İstanbul saati

export function ckKaynagi({ kaynak, url, cozucu, varsayilanIl = null }) {
  async function cek() {
    const yanit = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      signal: AbortSignal.timeout(30000),
    });
    if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
    const liste = await yanit.json();
    if (!Array.isArray(liste)) throw new Error('beklenmeyen format (dizi değil)');

    const sonuc = [];
    for (const k of liste) {
      const p = k.plannedOutage || {};
      const bolgeler = cozucu(p.message || '');
      const yedekIlceler = [p.county, p.county2, p.county3].filter(Boolean);

      // Kesinti birden fazla ili kapsıyorsa il başına ayrı kayıt (Supabase fonksiyonu tek il alır)
      const ilVarsayilan = p.city || varsayilanIl;
      const iller = [...new Set(bolgeler.map((b) => b.il || ilVarsayilan).filter(Boolean))];
      const ilListesi = iller.length ? iller : [ilVarsayilan];
      for (const il of ilListesi) {
        const ilBolgeleri = bolgeler.filter((b) => (b.il || ilVarsayilan) === il);
        sonuc.push({
          kaynak,
          kaynak_id: ilListesi.length > 1 ? `${k.id || p.id}-${il}` : String(k.id || p.id),
          il,
          ilceler: ilBolgeleri.length ? [...new Set(ilBolgeleri.map((b) => b.ilce))] : yedekIlceler,
          mahalleler: ilBolgeleri.flatMap((b) => b.mahalleler.map((m) => m.ad)),
          detay: ilBolgeleri,
          baslangic: tarih(p.startDateTime),
          bitis: tarih(p.endDateTime),
          neden: p.reason || null,
          mesaj: p.message || null,
          guncelleme: k.updateDateTime || null,
        });
      }
    }
    return sonuc;
  }
  return { KAYNAK: kaynak, cek };
}
