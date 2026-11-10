const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function decodeHtml(str = '') {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function fetchGameKNews() {
  try {
    const res = await fetch('https://gamek.vn/manga-film.chn', {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'vi-VN,vi;q=0.9'
      }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const body = html.slice(html.indexOf('<body'));
    const idx = body.indexOf('newsupdate');
    if (idx === -1) return [];

    const section = body.slice(idx, idx + 80000);
    const articles = section.split('<article').slice(1);
    const items = [];

    for (const art of articles) {
      const linkTitleMatch =
        art.match(/<a[^>]+href=([^\s>]+?\.chn)[^>]+title="([^"]+)"/i) ||
        art.match(/<a[^>]+href="([^"]+?\.chn)"[^>]+title="([^"]+)"/i);
      if (!linkTitleMatch) continue;

      const rawHref = linkTitleMatch[1].replace(/['"]/g, '');
      const fullLink = rawHref.startsWith('http') ? rawHref : `https://gamek.vn${rawHref}`;
      const title = decodeHtml(linkTitleMatch[2]);

      const imgMatch =
        art.match(/srcset="[^"]*?(https:\/\/gamek\.mediacdn\.vn[^\s,]+)/i) ||
        art.match(/src=([^\s>]+\.(?:jpg|jpeg|png|webp)[^\s>]*)/i) ||
        art.match(/src="([^"]+)"/i);
      const imageUrl = imgMatch
        ? imgMatch[1].replace(/['"]/g, '')
        : 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg';

      // Lấy sapo (mô tả ngắn) và thời gian
      const infoSplit = art.split('<div class=info>')[1] || art.split('<div class="info">')[1] || art;
      const pMatches = [...infoSplit.matchAll(/<p(?:\s+class=[^\s>]+)?[^>]*>([\s\S]*?)(?=<p|<\/div|<\/article)/gi)];
      let summary = '';
      let timeText = 'Mới cập nhật';
      let author = 'GameK';

      for (const pm of pMatches) {
        const rawP = pm[0];
        if (rawP.includes('class=time') || rawP.includes('class="time"')) {
          const tMatch = rawP.match(/\|\s*([^<]+)/);
          if (tMatch) timeText = decodeHtml(tMatch[1]);
          const aMatch = rawP.match(/class=author[^>]*>([^<]+)/) || rawP.match(/class="author"[^>]*>([^<]+)/);
          if (aMatch) author = decodeHtml(aMatch[1]);
        } else if (!summary) {
          summary = decodeHtml(pm[1]);
        }
      }

      if (title && fullLink) {
        items.push({
          id: `gk_${Buffer.from(fullLink).toString('base64').slice(0, 16)}`,
          title,
          summary: summary || title,
          imageUrl,
          link: fullLink,
          publishedAt: timeText,
          source: 'GameK Manga/Film',
          region: 'vn',
          author
        });
      }
      if (items.length >= 18) break;
    }
    return items;
  } catch (_) {
    return [];
  }
}

async function fetchMalNews() {
  try {
    const res = await fetch('https://myanimelist.net/rss/news.xml', {
      headers: { 'User-Agent': USER_AGENT }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const rawItems = xml.split('<item>').slice(1);
    const items = [];

    for (const it of rawItems) {
      const title = decodeHtml(it.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
      const link = (it.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
      const desc = decodeHtml(it.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '');
      const pubDateRaw = (it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();
      const thumb = (it.match(/<media:thumbnail>([\s\S]*?)<\/media:thumbnail>/)?.[1] || '').trim();

      let timeText = 'Mới nhất';
      if (pubDateRaw) {
        const d = new Date(pubDateRaw);
        if (!isNaN(d.getTime())) {
          timeText = d.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }

      if (title && link) {
        items.push({
          id: `mal_${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          summary: desc || title,
          imageUrl:
            thumb ||
            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg',
          link,
          publishedAt: timeText,
          source: 'MyAnimeList News',
          region: 'global',
          author: 'MAL Editorial'
        });
      }
      if (items.length >= 15) break;
    }
    return items;
  } catch (_) {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const urlObj = new URL(req.url || '', 'http://localhost');
    const region = req.query?.region || urlObj.searchParams.get('region') || 'all';
    const keyword = (req.query?.keyword || urlObj.searchParams.get('keyword') || '').trim().toLowerCase();

    const [gkItems, malItems] = await Promise.all([
      region === 'global' ? Promise.resolve([]) : fetchGameKNews(),
      region === 'vn' ? Promise.resolve([]) : fetchMalNews()
    ]);

    let combined = [...gkItems, ...malItems];

    if (keyword) {
      combined = combined.filter(
        (n) =>
          n.title.toLowerCase().includes(keyword) ||
          n.summary.toLowerCase().includes(keyword)
      );
    }

    res.status(200).json({ items: combined });
  } catch (err) {
    res.status(500).json({ error: err.message, items: [] });
  }
}

