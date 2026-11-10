const NETTRUYEN_REFERER = 'https://nettruyenar.com/';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const urlObj = new URL(req.url || '', 'http://localhost');
    const targetUrl = req.query?.url || urlObj.searchParams.get('url');
    if (!targetUrl || !/^https?:\/\//i.test(String(targetUrl))) {
      res.status(400).end();
      return;
    }

    const urlStr = String(targetUrl);
    const isMangaDex = /mangadex\.(org|network)/i.test(urlStr);

    const imgRes = await fetch(urlStr, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: isMangaDex ? 'https://mangadex.org/' : NETTRUYEN_REFERER
      },
      signal: AbortSignal.timeout(9000)
    });

    if (!imgRes.ok) {
      res.status(imgRes.status).end();
      return;
    }

    const buffer = await imgRes.arrayBuffer();
    res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(buffer));
  } catch (_) {
    res.status(500).end();
  }
}
