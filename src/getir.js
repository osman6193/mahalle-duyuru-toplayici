// fetch() yerine kullanılabilen, eksik ara sertifikayı tamamlayan istek yardımcısı.
//
// Bazı kurum siteleri (örn. İZSU) TLS'te sadece kendi sertifikasını gönderip ara (intermediate)
// sertifikayı göndermiyor. Tarayıcılar eksiği sertifikadaki "CA Issuers" (AIA) adresinden
// indirip tamamlar; Node yapmaz ve "fetch failed (UNABLE_TO_VERIFY_LEAF_SIGNATURE)" verir.
// Burada aynısını yapıyoruz: ara sertifikayı indirip sistem kök sertifikalarıyla birlikte
// vererek isteği TEKRAR DOĞRULAMALI yaparız. Doğrulama kapatılmaz; indirilen ara sertifika
// güvenilir bir köke zincirlenmiyorsa istek yine reddedilir.
import tls from 'node:tls';
import https from 'node:https';
import { X509Certificate } from 'node:crypto';

const EKSIK_ZINCIR = new Set(['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);
const araOnbellek = new Map(); // host -> PEM

/** Sunucunun yaprak sertifikasını okur (sadece okumak için; veri gönderilmez). */
function yaprakSertifika(host, port) {
  return new Promise((coz, red) => {
    const s = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: 20000 }, () => {
      const c = s.getPeerCertificate(false);
      s.end();
      coz(c);
    });
    s.on('error', red);
    s.on('timeout', () => { s.destroy(); red(new Error('TLS zaman aşımı')); });
  });
}

/** Yaprak sertifikadaki AIA adresinden ara sertifikayı indirir, PEM döndürür. */
async function araSertifika(host, port) {
  if (araOnbellek.has(host)) return araOnbellek.get(host);
  const yaprak = await yaprakSertifika(host, port);
  const aia = yaprak.infoAccess?.['CA Issuers - URI']?.[0];
  if (!aia) throw new Error(`${host}: ara sertifika adresi (AIA) yok`);
  const r = await fetch(aia, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`ara sertifika indirilemedi: HTTP ${r.status}`);
  const ham = Buffer.from(await r.arrayBuffer());
  const pem = ham.toString('latin1').includes('-----BEGIN CERTIFICATE-----')
    ? ham.toString('latin1')
    : new X509Certificate(ham).toString();
  araOnbellek.set(host, pem);
  return pem;
}

/** https.request ile, verilen ek CA'larla (doğrulamalı) istek. fetch benzeri basit yanıt döndürür. */
function istekAt(url, { method = 'GET', headers = {}, body, timeout = 30000 }, ca) {
  return new Promise((coz, red) => {
    const u = new URL(url);
    const req = https.request(
      u,
      { method, headers, ca: [...tls.rootCertificates, ca], timeout },
      (res) => {
        // Yönlendirmeyi bir kez takip et
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          istekAt(new URL(res.headers.location, u).toString(), { method: 'GET', headers, timeout }, ca).then(coz, red);
          return;
        }
        const parcalar = [];
        res.on('data', (p) => parcalar.push(p));
        res.on('end', () => {
          const govde = Buffer.concat(parcalar);
          coz({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            headers: { get: (k) => res.headers[k.toLowerCase()] ?? null },
            text: async () => govde.toString('utf8'),
            json: async () => JSON.parse(govde.toString('utf8')),
          });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('zaman aşımı')));
    req.on('error', red);
    if (body) req.write(body);
    req.end();
  });
}

/**
 * fetch ile aynı şekilde çağrılır. Sertifika zinciri eksikse ara sertifikayı tamamlayıp
 * doğrulamalı olarak tekrar dener. Diğer hatalar olduğu gibi fırlatılır.
 */
export async function getir(url, secenekler = {}) {
  try {
    return await fetch(url, secenekler);
  } catch (e) {
    if (!EKSIK_ZINCIR.has(e?.cause?.code)) throw e;
    const u = new URL(url);
    const ca = await araSertifika(u.hostname, Number(u.port) || 443);
    return istekAt(url, {
      method: secenekler.method,
      headers: secenekler.headers,
      body: secenekler.body,
      timeout: 30000,
    }, ca);
  }
}
