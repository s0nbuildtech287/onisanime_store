import { resolveMangaChapterPages } from '../../lib/mangaSources.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const urlObj = new URL(req.url || '', 'http://localhost');
    const chapterUrl = req.query?.url || urlObj.searchParams.get('url');
    if (!chapterUrl) {
      res.status(400).json({ error: 'Missing chapter url', pages: [] });
      return;
    }

    const pages = await resolveMangaChapterPages(String(chapterUrl));
    res.status(200).json({ pages });
  } catch (err) {
    res.status(500).json({ error: err.message, pages: [] });
  }
}
