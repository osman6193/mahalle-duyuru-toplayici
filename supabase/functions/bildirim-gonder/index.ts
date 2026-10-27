// BİLDİRİM GÖNDERİCİ (Supabase Edge Function)
// Zamanlayıcı (pg_cron -> bildirim_tetikle) bekleyen bildirim varsa bunu çağırır.
// Kuyruktan alır, Firebase Cloud Messaging (HTTP v1) ile gönderir, sonucu yazar.
//
// Yetki: istek başlığındaki x-cron-anahtar, public.ayarlar.cron_anahtar ile aynı olmalı.
// Gizli değişken (Supabase > Edge Functions > Secrets):
//   FIREBASE_SERVICE_ACCOUNT  : Firebase hizmet hesabı JSON'u. YOKSA DENEME MODU: gönderilmez, 'deneme' olarak işaretlenir
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

type Satir = { id: number; token: string; baslik: string; govde: string; duyuru_id: string; kategori: string; tur: string };
type Sonuc = { id: number; durum: 'gonderildi' | 'hata' | 'deneme'; hata?: string; token_gecersiz?: boolean };

// ---- Google OAuth: hizmet hesabıyla FCM erişim anahtarı al ----
const b64url = (b: ArrayBuffer | string) =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function erisimAnahtari(sa: { client_email: string; private_key: string }) {
  const simdi = Math.floor(Date.now() / 1000);
  const baslik = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const icerik = b64url(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: simdi, exp: simdi + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const anahtar = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const imza = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', anahtar, new TextEncoder().encode(`${baslik}.${icerik}`));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${baslik}.${icerik}.${b64url(imza)}` }),
  });
  if (!r.ok) throw new Error(`OAuth hatası: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token as string;
}

async function gonder(s: Satir, projeId: string, erisim: string): Promise<Sonuc> {
  const acil = s.kategori === 'deprem';
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${projeId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${erisim}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: s.token,
        notification: { title: s.baslik, body: s.govde },
        data: { duyuru_id: s.duyuru_id, kategori: s.kategori, tur: s.tur },
        android: { priority: acil ? 'HIGH' : 'NORMAL', notification: { channel_id: s.kategori, tag: `${s.duyuru_id}-${s.tur}` } },
      },
    }),
  });
  if (r.ok) return { id: s.id, durum: 'gonderildi' };
  const hata = await r.text();
  const gecersiz = r.status === 404 || /UNREGISTERED|registration-token-not-registered/.test(hata) ||
                   (r.status === 400 && /INVALID_ARGUMENT/.test(hata) && /token/i.test(hata));
  return { id: s.id, durum: 'hata', hata: `${r.status} ${hata.slice(0, 300)}`, token_gecersiz: gecersiz };
}

let cronAnahtar: string | null = null;   // public.ayarlar'dan bir kez okunur

Deno.serve(async (req) => {
  if (!cronAnahtar) {
    const { data } = await db.from('ayarlar').select('deger').eq('anahtar', 'cron_anahtar').single();
    cronAnahtar = data?.deger ?? null;
  }
  if (!cronAnahtar || req.headers.get('x-cron-anahtar') !== cronAnahtar) return new Response('yetkisiz', { status: 401 });

  const { data: satirlar, error } = await db.rpc('bildirim_al', { p_adet: 500 });
  if (error) return new Response(`kuyruk alınamadı: ${error.message}`, { status: 500 });
  if (!satirlar?.length) return Response.json({ gonderilen: 0 });

  const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  let sonuclar: Sonuc[];
  if (!saJson) {
    // DENEME MODU: Firebase bağlanana kadar gerçekten gönderme
    sonuclar = (satirlar as Satir[]).map((s) => ({ id: s.id, durum: 'deneme' as const }));
  } else {
    let sa: { client_email?: string; private_key?: string; project_id?: string; type?: string };
    try { sa = JSON.parse(saJson); } catch { return new Response('FIREBASE_SERVICE_ACCOUNT geçerli bir JSON değil', { status: 500 }); }
    if (!sa.private_key || !sa.client_email || !sa.project_id) {
      const ipucu = (sa as Record<string, unknown>).project_info ? ' (google-services.json yapıştırılmış görünüyor; Proje ayarları > Hizmet hesapları > Yeni özel anahtar oluştur ile inen dosya gerekli)' : '';
      console.error('FIREBASE_SERVICE_ACCOUNT eksik alan: private_key/client_email/project_id' + ipucu);
      return new Response('FIREBASE_SERVICE_ACCOUNT bir hizmet hesabı anahtarı değil' + ipucu, { status: 500 });
    }
    const erisim = await erisimAnahtari(sa as { client_email: string; private_key: string });
    sonuclar = [];
    const liste = satirlar as Satir[];
    for (let i = 0; i < liste.length; i += 25) {   // 25'erli paralel
      sonuclar.push(...await Promise.all(liste.slice(i, i + 25).map((s) => gonder(s, sa.project_id!, erisim).catch(
        (e) => ({ id: s.id, durum: 'hata' as const, hata: String(e).slice(0, 300) })))));
    }
  }

  const { error: e2 } = await db.rpc('bildirim_sonuc', { p: sonuclar });
  if (e2) return new Response(`sonuç yazılamadı: ${e2.message}`, { status: 500 });
  const ozet = sonuclar.reduce((a, s) => ({ ...a, [s.durum]: (a[s.durum] || 0) + 1 }), {} as Record<string, number>);
  return Response.json({ gonderilen: sonuclar.length, ...ozet, mod: saJson ? 'canli' : 'deneme' });
});
