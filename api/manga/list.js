import { resolveMangaList } from '../../lib/mangaSources.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const urlObj = new URL(req.url || '', 'http://localhost');
    const page = req.query?.page || urlObj.searchParams.get('page') || '1';
    const keyword = req.query?.keyword || urlObj.searchParams.get('keyword') || '';
    const type = req.query?.type || urlObj.searchParams.get('type') || 'truyen-moi';

    const result = await resolveMangaList({ page, keyword, type });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, items: [], totalPages: 1 });
  }
}
