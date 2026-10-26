# Mahalle Duyuru — Veri Toplayıcı

Türkiye'deki bir sunucuda çalışan küçük program. Türk kurumlarının siteleri yurt dışı
IP'leri engellediği için veriyi buradan toplayıp Supabase'e (`mahalle-duyuru` projesi) yazar.

## Ne yapar?
- **AFAD**: her 10 dakikada son 6 saatin depremleri → `afad_ham_isle()`
- **Elektrik kesintileri**: (keşiften sonra eklenecek) → `elektrik_kesinti_kaydet()`
- **Keşif aracı** (`npm run kesif`): 21 dağıtım şirketinin kesinti sayfalarını gerçek tarayıcıyla
  açar, arka plandaki veri isteklerini `kesif_kayitlari` tablosuna yazar.

## Kurulum (Ubuntu 24.04, root)
```bash
curl -fsSL https://raw.githubusercontent.com/osman6193/mahalle-duyuru-toplayici/main/kurulum.sh | bash
```

## Sık kullanılan komutlar
```bash
tail -f /var/log/toplayici.log                                  # canlı log
cd /opt/mahalle-duyuru-toplayici && sudo -u toplayici npm run kesif           # tüm şirketleri keşfet
cd /opt/mahalle-duyuru-toplayici && sudo -u toplayici npm run kesif -- bedas  # tek şirket
sudo -u toplayici /usr/local/bin/toplayici-calistir             # elle bir tur çalıştır
```

## Güvenlik
- `.env` (service_role anahtarı) sadece sunucuda durur, GitHub'a gitmez, izni 600.
- Program ayrı bir `toplayici` kullanıcısıyla çalışır; güvenlik duvarında sadece SSH açık.
- Her çalışmada GitHub'dan son kodu çeker: repoya giren kod otomatik devreye girer.
