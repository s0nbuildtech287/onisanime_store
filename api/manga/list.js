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
    const urlObj = new URL(req.url || '', 'http://localhost');
    const page = req.query?.page || urlObj.searchParams.get('page') || '1';
    const keyword = req.query?.keyword || urlObj.searchParams.get('keyword') || '';
    const type = req.query?.type || urlObj.searchParams.get('type') || 'truyen-moi';

    let fetchUrl = `${NETTRUYEN_HOST}/?page=${page}`;
    if (keyword && keyword.trim()) {
      fetchUrl = `${NETTRUYEN_HOST}/tim-truyen?keyword=${encodeURIComponent(keyword.trim())}&page=${page}`;
    } else if (type === 'hot') {
      fetchUrl = `${NETTRUYEN_HOST}/truyen-tranh-hot?page=${page}`;
    } else if (type === 'manga') {
      fetchUrl = `${NETTRUYEN_HOST}/tim-truyen/manga-112?page=${page}`;
    } else if (type === 'action') {
      fetchUrl = `${NETTRUYEN_HOST}/tim-truyen/action-95?page=${page}`;
    }

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8'
      }
    });
    const html = await response.text();

    const blocks = html.split('<div class="item"');
    const items = [];

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const titleMatch = block.match(/<a [^>]*title="([^"]+)"[^>]*href="([^"]+)"/);
      const imgMatch = block.match(/<img [^>]*(?:data-original|src)="([^"]+)"/);
      const chapMatch = block.match(/<a [^>]*href="[^"]*\/chapter-[^"]*"[^>]*>([^<]+)<\/a>/) ||
                       block.match(/<figcaption>[\s\S]*?<ul>[\s\S]*?<a [^>]*>([^<]+)<\/a>/);

      if (titleMatch) {
        const rawHref = titleMatch[2];
        const slugMatch = rawHref.match(/\/truyen-tranh\/([^/?#]+)/);
        const slug = slugMatch ? slugMatch[1] : rawHref;

        const title = titleMatch[1].replace(/^Truyện tranh\s*/i, '').trim();
        const latestChapter = chapMatch ? chapMatch[1].trim() : 'Mới cập nhật';

        const rawImg = imgMatch ? imgMatch[1] : '';
        const originalThumb = rawImg.startsWith('http') ? rawImg : `https:${rawImg}`;
        const thumbUrl = `/api/manga-image?url=${encodeURIComponent(originalThumb)}`;

        items.push({
          id: slug,
          slug,
          title,
          thumbUrl,
          status: 'Đang phát hành',
          latestChapter,
          genres: ['Manga', 'Việt Hóa']
        });
      }
    }

    const pagiBlock = html.match(/<ul class="pagination"[\s\S]*?<\/ul>/);
    let totalPages = 50;
    if (pagiBlock) {
      const pageNumbers = [...pagiBlock[0].matchAll(/page=([0-9]+)/g)].map((m) => parseInt(m[1], 10));
      if (pageNumbers.length > 0) {
        totalPages = Math.max(...pageNumbers);
      }
    }

    res.status(200).json({ items, totalPages });
  } catch (err) {
    res.status(500).json({ error: err.message, items: [], totalPages: 1 });
  }
}

