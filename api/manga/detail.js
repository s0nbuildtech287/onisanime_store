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
    const slug = req.query?.slug || urlObj.searchParams.get('slug');
    if (!slug) {
      res.status(400).json({ error: 'Missing slug' });
      return;
    }

    const fetchUrl = `${NETTRUYEN_HOST}/truyen-tranh/${slug}`;
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8'
      }
    });
    const html = await response.text();

    const titleMatch = html.match(/<h1 class="title-detail">([^<]+)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : slug;

    const descMatch = html.match(/<div class="detail-content">([\s\S]*?)<\/div>/);
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const thumbMatch = html.match(/<div class="col-image">\s*<img [^>]*src="([^"]+)"/);
    const rawThumb = thumbMatch ? thumbMatch[1] : '';
    const thumbUrl = rawThumb
      ? `/api/manga-image?url=${encodeURIComponent(rawThumb.startsWith('http') ? rawThumb : `https:${rawThumb}`)}`
      : '';

    const cIdMatch = html.match(/gOpts\.comicId\s*=\s*['"]?([0-9]+)['"]?/) ||
                     html.match(/comicId\s*[:=]\s*['"]?([0-9]+)['"]?/) ||
                     slug.match(/-([0-9]+)$/);
    const cSlugMatch = html.match(/gOpts\.comicSlug\s*=\s*['"]([^'"]+)['"]/);

    const comicId = cIdMatch ? cIdMatch[1] : '';
    const comicSlug = cSlugMatch ? cSlugMatch[1] : slug.replace(/-[0-9]+$/, '');

    let chapters = [];

    if (comicId && comicSlug) {
      try {
        const fullApiUrl = `${NETTRUYEN_HOST}/Comic/Services/ComicService.asmx/ChapterList?slug=${encodeURIComponent(comicSlug)}&comicId=${encodeURIComponent(comicId)}`;
        const chapApiRes = await fetch(fullApiUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': fetchUrl,
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        if (chapApiRes.ok) {
          const chapData = await chapApiRes.json();
          if (Array.isArray(chapData?.data) && chapData.data.length > 0) {
            chapters = chapData.data.map((item) => ({
              chapter_name: (item.chapter_name || '').replace(/^Chapter\s*/i, '').trim(),
              chapter_title: item.chapter_name || `Chapter ${item.chapter_num}`,
              chapter_api_data: `${NETTRUYEN_HOST}/truyen-tranh/${comicSlug}/${item.chapter_slug}/${item.chapter_id}`
            }));
          }
        }
      } catch (_) {}
    }

    if (chapters.length === 0) {
      const chRegex = /<div class="col-xs-5 chapter">\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
      let chMatch;
      while ((chMatch = chRegex.exec(html)) !== null) {
        chapters.push({
          chapter_name: chMatch[2].replace(/^Chapter\s*/i, '').trim(),
          chapter_title: chMatch[2].trim(),
          chapter_api_data: chMatch[1]
        });
      }
    }

    res.status(200).json({
      id: slug,
      slug,
      title,
      thumbUrl,
      description,
      chapters
    });
  } catch (err) {
    res.status(500).json({ error: err.message, chapters: [] });
  }
}

