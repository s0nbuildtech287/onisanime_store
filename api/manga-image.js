const NETTRUYEN_REFERER = 'https://nettruyenar.com/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

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
    if (!targetUrl) {
      res.status(400).end();
      return;
    }

    const imgRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': NETTRUYEN_REFERER
      }
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
