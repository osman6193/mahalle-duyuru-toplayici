# Toplayıcı — çalışma kuralları

## Supabase istek bütçesi (28 Kasım 2026)
Supabase ücretsiz kotası aşıldı (ayda ~7,4 GB egress, ~6,4 GB log). Sebep: her kesinti ayrı RPC ile
gönderiliyordu (günde ~225 bin `elektrik_kesinti_kaydet` çağrısı).

- Kayıtları **asla döngü içinde tek tek RPC ile göndermeyin**; her zaman toplu fonksiyon kullanın
  (örn. `elektrik_kesinti_kaydet_toplu(p_liste jsonb)`, 300'lük parçalar — bkz. `src/kaynaklar/kesinti-calistir.js`).
- Yeni kaynak eklerken de aynı kural: tek kaynak = çalışma başına birkaç istek.
- Toplayıcı 10 dakikada bir çalışır; her ek istek ×144/gün demektir. İstek sayısını düşük tutun.
- Aynı kural Supabase edge function'ları için de geçerli.

## Erişim kuralı
Site engeli, IP engeli, oturum anahtarı/imzalı token gibi kısıtları aşmaya çalışmıyoruz.
Kapatılan kaynaklar: Oben "epano" eczane odaları (NosyAPI dolduruyor), TESKİ, Uludağ EDAŞ (27 Kasım 2026).
