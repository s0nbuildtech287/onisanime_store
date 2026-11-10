import { resolveMangaChapterPages } from '../../lib/mangaSources.js';
import { forwardJsonViaVnProxy } from '../../lib/proxyForward.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const urlObj = new URL(req.url || '', 'http://localhost');
    const chapterUrl = String(req.query?.url || urlObj.searchParams.get('url') || '');
    if (!chapterUrl) {
      res.status(400).json({ error: 'Missing chapter url', pages: [] });
      return;
    }

    if (!chapterUrl.startsWith('md_chap:') && !chapterUrl.startsWith('mp_chap:')) {
      const proxied = await forwardJsonViaVnProxy('/api/manga/chapter', { url: chapterUrl });
      if (proxied && Array.isArray(proxied.pages) && proxied.pages.length > 0) {
        res.status(200).json(proxied);
        return;
      }
    }

    const pages = await resolveMangaChapterPages(chapterUrl);
    res.status(200).json({ pages });
  } catch (err) {
    res.status(500).json({ error: err.message, pages: [] });
  }
}
