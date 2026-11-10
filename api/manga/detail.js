import { resolveMangaDetail } from '../../lib/mangaSources.js';
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
    const slug = String(req.query?.slug || urlObj.searchParams.get('slug') || '');
    if (!slug) {
      res.status(400).json({ error: 'Missing slug', chapters: [] });
      return;
    }

    if (!slug.startsWith('md_') && !slug.startsWith('mp_')) {
      const proxied = await forwardJsonViaVnProxy('/api/manga/detail', { slug });
      if (proxied && proxied.title && Array.isArray(proxied.chapters) && proxied.chapters.length > 0) {
        res.status(200).json(proxied);
        return;
      }
    }

    const detail = await resolveMangaDetail(slug);
    if (!detail || !detail.title) {
      res.status(404).json({ error: 'Manga chapters not available', chapters: [] });
      return;
    }

    res.status(200).json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message, chapters: [] });
  }
}
