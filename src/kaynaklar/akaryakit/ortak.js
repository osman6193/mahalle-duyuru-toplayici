const BASLIK = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
  'Accept-Language': 'tr-TR,tr;q=0.9',
};

async function getir(url, kabul) {
  const yanit = await fetch(url, { headers: { ...BASLIK, Accept: kabul }, signal: AbortSignal.timeout(45000) });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status} ${url}`);
  return yanit;
}
export const getirMetin = async (url) => (await getir(url, 'text/html,*/*')).text();
export const getirJson = async (url) => (await getir(url, 'application/json, text/plain, */*')).json();
