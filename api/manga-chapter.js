const NETTRUYEN_HOST = 'https://nettruyenww.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url: chapterUrl } = req.query;
    if (!chapterUrl) {
      res.status(400).json({ error: 'Missing chapter url' });
      return;
    }

    const fetchUrl = chapterUrl.replace(/https?:\/\/[^\/]+/, NETTRUYEN_HOST);
    const response = await fetch(fetchUrl, {
      headers: { 'User-Agent': USER_AGENT }
    });
    const html = await response.text();

    const pRegex = /<div class=['"]page-chapter['"][^>]*>\s*<img[^>]+data-src=['"]([^'"]+)['"]/g;
    let pMatch;
    const pages = [];
    while ((pMatch = pRegex.exec(html)) !== null) {
      const rawUrl = pMatch[1].startsWith('http') ? pMatch[1] : `https:${pMatch[1]}`;
      pages.push(`/api/manga-image?url=${encodeURIComponent(rawUrl)}`);
    }

    res.status(200).json({ pages });
  } catch (err) {
    res.status(500).json({ error: err.message, pages: [] });
  }
}

