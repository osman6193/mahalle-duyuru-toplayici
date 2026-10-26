// Türkiye'deki 21 elektrik dağıtım şirketi.
// "site" ana sayfa; "kesintiSayfalari" bilinen planlı kesinti sayfaları (keşif aracı ayrıca
// ana sayfadaki "kesinti" linklerini kendisi bulur). İl listeleri bölge eşleştirmesi içindir.
// NOT: Adresler keşif çalıştıkça doğrulanacak; "dogrulanmadi: true" olanlar tahmindir.

export const EDAS = [
  { kod: 'bedas',     ad: 'BEDAŞ (İstanbul Avrupa)',  site: 'https://www.bedas.com.tr/', iller: ['İstanbul'], kesintiSayfalari: [] },
  { kod: 'ayedas',    ad: 'AYEDAŞ (İstanbul Anadolu)', site: 'https://www.ayedas.com.tr/', iller: ['İstanbul'], kesintiSayfalari: [] },
  { kod: 'baskent',   ad: 'Başkent EDAŞ', site: 'https://www.baskentedas.com.tr/', iller: ['Ankara', 'Zonguldak', 'Kastamonu', 'Bartın', 'Karabük', 'Çankırı', 'Kırıkkale'],
    kesintiSayfalari: ['https://online.baskentedas.com.tr/elektrik-kesintisi-sorgulama'] },
  { kod: 'gediz',     ad: 'Gediz EDAŞ', site: 'https://gdzelektrik.com.tr/', iller: ['İzmir', 'Manisa'], kesintiSayfalari: [] },
  { kod: 'toroslar',  ad: 'Toroslar EDAŞ', site: 'https://www.toroslaredas.com.tr/', iller: ['Adana', 'Gaziantep', 'Mersin', 'Hatay', 'Osmaniye', 'Kilis'], kesintiSayfalari: [] },
  { kod: 'uludag',    ad: 'Uludağ EDAŞ', site: 'https://www.uedas.com.tr/', iller: ['Bursa', 'Balıkesir', 'Çanakkale', 'Yalova'],
    kesintiSayfalari: ['https://www.uedas.com.tr/tr/kesintiler'] },
  { kod: 'sakarya',   ad: 'SEDAŞ', site: 'https://www.sedas.com/', iller: ['Sakarya', 'Kocaeli', 'Bolu', 'Düzce'], kesintiSayfalari: [] },
  { kod: 'akdeniz',   ad: 'Akdeniz EDAŞ', site: 'https://www.akdenizedas.com.tr/', iller: ['Antalya', 'Isparta', 'Burdur'], kesintiSayfalari: [] },
  { kod: 'meram',     ad: 'Meram EDAŞ', site: 'https://www.meramedas.com.tr/', iller: ['Konya', 'Aksaray', 'Niğde', 'Nevşehir', 'Karaman', 'Kırşehir'], kesintiSayfalari: [] },
  { kod: 'osmangazi', ad: 'Osmangazi EDAŞ', site: 'https://www.oedas.com.tr/', iller: ['Eskişehir', 'Afyonkarahisar', 'Bilecik', 'Kütahya', 'Uşak'], kesintiSayfalari: [], dogrulanmadi: true },
  { kod: 'aydem',     ad: 'ADM / Aydem EDAŞ', site: 'https://www.admelektrik.com.tr/', iller: ['Aydın', 'Denizli', 'Muğla'], kesintiSayfalari: [] },
  { kod: 'trakya',    ad: 'Trakya EDAŞ', site: 'https://www.trakyaedas.com.tr/', iller: ['Edirne', 'Kırklareli', 'Tekirdağ'], kesintiSayfalari: [], dogrulanmadi: true },
  { kod: 'yesilirmak',ad: 'Yeşilırmak EDAŞ', site: 'https://www.yesilirmakedas.com/', iller: ['Samsun', 'Ordu', 'Çorum', 'Amasya', 'Sinop'], kesintiSayfalari: [], dogrulanmadi: true },
  { kod: 'camlibel',  ad: 'Çamlıbel EDAŞ', site: 'https://www.camlibeledas.com.tr/', iller: ['Sivas', 'Tokat', 'Yozgat'], kesintiSayfalari: [], dogrulanmadi: true },
  { kod: 'kayseri',   ad: 'Kayseri ve Civarı EDAŞ', site: 'https://www.kcetas.com.tr/', iller: ['Kayseri'], kesintiSayfalari: [], dogrulanmadi: true },
  { kod: 'akedas',    ad: 'Akedaş EDAŞ', site: 'https://www.akedaselektrik.com.tr/', iller: ['Kahramanmaraş', 'Adıyaman'], kesintiSayfalari: [], dogrulanmadi: true },
  { kod: 'firat',     ad: 'Fırat EDAŞ', site: 'https://www.firatedas.com.tr/', iller: ['Elazığ', 'Bingöl', 'Malatya', 'Tunceli'], kesintiSayfalari: [] },
  { kod: 'coruh',     ad: 'Çoruh EDAŞ', site: 'https://www.coruhedas.com.tr/', iller: ['Trabzon', 'Rize', 'Artvin', 'Giresun', 'Gümüşhane'], kesintiSayfalari: [], dogrulanmadi: true },
  { kod: 'aras',      ad: 'Aras EDAŞ', site: 'https://www.arasedas.com/', iller: ['Erzurum', 'Ağrı', 'Bayburt', 'Erzincan', 'Iğdır', 'Kars', 'Ardahan'], kesintiSayfalari: [], dogrulanmadi: true },
  { kod: 'vangolu',   ad: 'VEDAŞ (Vangölü)', site: 'https://www.vedas.com.tr/', iller: ['Van', 'Bitlis', 'Muş', 'Hakkari'], kesintiSayfalari: [], dogrulanmadi: true },
  { kod: 'dicle',     ad: 'Dicle EDAŞ', site: 'https://www.dicleedas.com.tr/', iller: ['Diyarbakır', 'Şanlıurfa', 'Mardin', 'Batman', 'Siirt', 'Şırnak'], kesintiSayfalari: [] },
];
