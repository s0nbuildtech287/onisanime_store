import { resolveMangaImage } from '../lib/mangaSources.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const urlObj = new URL(req.url || '', 'http://localhost');
    const targetUrl = String(req.query?.url || urlObj.searchParams.get('url') || '');
    const title = String(req.query?.title || urlObj.searchParams.get('title') || '');
    const alId = String(req.query?.alId || urlObj.searchParams.get('alId') || '');

    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      res.status(400).end();
      return;
    }

    const result = await resolveMangaImage({ targetUrl, title, alId });
    if (!result || result.status !== 200 || !result.buffer) {
      res.status(result?.status || 502).end();
      return;
    }

    res.setHeader('Content-Type', result.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=86400, stale-while-revalidate=604800');
    res.status(200).send(result.buffer);
  } catch (_) {
    res.status(500).end();
  }
}
