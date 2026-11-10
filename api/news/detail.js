function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html = '') {
  return decodeHtmlEntities(String(html).replace(/<[^>]+>/g, ' '));
}

function extractAttr(tag = '', attrName) {
  const re = new RegExp(`${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = tag.match(re);
  return (m && (m[1] || m[2] || m[3]) || '').trim();
}

function cleanArticleContainer(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<zone[\s\S]*?<\/zone>/gi, ' ')
    .replace(/<div[^>]*(?:link-content-footer|tag-list|related|ads)[^>]*>[\s\S]*?<\/div>/gi, ' ');
}

function parseGamekArticle(html = '') {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match ? stripTags(h1Match[1]) : '';

  const sapoMatch = html.match(/<h2[^>]*(?:data-field\s*=\s*["']?sapo["']?|class\s*=\s*["']?sapo["']?)[^>]*>([\s\S]*?)<\/h2>/i);
  const sapo = sapoMatch ? stripTags(sapoMatch[1]) : '';

  const bodyMatch =
    html.match(/<section[^>]*itemprop\s*=\s*["']?articleBody["']?[^>]*>([\s\S]*?)<\/section>/i) ||
    html.match(/<div[^>]*class\s*=\s*["']?[^"']*rightdetail_content[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i);

  const rawBody = bodyMatch ? cleanArticleContainer(bodyMatch[1]) : cleanArticleContainer(html);
  const blocks = [];
  const seen = new Set();

  const tokenRegex = /<p\b[^>]*>[\s\S]*?(?=<\/p>|<p\b|<h[2-4]\b|<div\b|<figure\b|<\/section>|$)|<h[2-4]\b[^>]*>[\s\S]*?<\/h[2-4]>|<img\b[^>]*>/gi;
  let match;
  while ((match = tokenRegex.exec(rawBody)) !== null) {
    const chunk = match[0];
    if (/^<img\b/i.test(chunk)) {
      const src =
        extractAttr(chunk, 'data-original') ||
        extractAttr(chunk, 'data-src') ||
        extractAttr(chunk, 'src');
      if (
        src &&
        /^https?:\/\//i.test(src) &&
        !/\/(icon|logo|avatar|loading|placeholder|1x1)\b/i.test(src) &&
        !seen.has(src)
      ) {
        seen.add(src);
        blocks.push({ type: 'image', content: src });
      }
      continue;
    }

    // Extract any nested images inside <p>
    const innerImgs = chunk.match(/<img\b[^>]*>/gi) || [];
    for (const imgTag of innerImgs) {
      const src =
        extractAttr(imgTag, 'data-original') ||
        extractAttr(imgTag, 'data-src') ||
        extractAttr(imgTag, 'src');
      if (
        src &&
        /^https?:\/\//i.test(src) &&
        !/\/(icon|logo|avatar|loading|placeholder|1x1)\b/i.test(src) &&
        !seen.has(src)
      ) {
        seen.add(src);
        blocks.push({ type: 'image', content: src });
      }
    }

    const text = stripTags(chunk);
    if (
      text &&
      text.length >= 12 &&
      !/^(Tin liên quan|Xem thêm|Theo dõi|Copy link)/i.test(text) &&
      !seen.has(text)
    ) {
      seen.add(text);
      blocks.push({ type: 'text', content: text });
    }
  }

  return { title, sapo, blocks };
}

function parseMalArticle(html = '') {
  const h1Match = html.match(/<h1[^>]*class\s*=\s*["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match ? stripTags(h1Match[1]) : '';

  const contentMatch = html.match(/<div[^>]*class\s*=\s*["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<div[^>]*class\s*=\s*["'][^"']*news-info-block/i) ||
    html.match(/<div[^>]*class\s*=\s*["'][^"']*news-container[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  const rawBody = contentMatch ? cleanArticleContainer(contentMatch[1]) : '';
  const blocks = [];
  const seen = new Set();

  if (rawBody) {
    const imgs = rawBody.match(/<img\b[^>]*>/gi) || [];
    for (const imgTag of imgs) {
      const src = extractAttr(imgTag, 'data-src') || extractAttr(imgTag, 'src');
      if (src && /^https?:\/\//i.test(src) && !seen.has(src)) {
        seen.add(src);
        blocks.push({ type: 'image', content: src });
      }
    }
    const cleanText = rawBody
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');
    const lines = cleanText.split(/\n+/).map((l) => decodeHtmlEntities(l)).filter((l) => l.length > 20);
    for (const line of lines) {
      if (!seen.has(line)) {
        seen.add(line);
        blocks.push({ type: 'text', content: line });
      }
    }
  }

  return { title, sapo: '', blocks };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawUrl = String(req.query?.url || '').trim();
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
    return res.status(400).json({ error: 'Missing or invalid url parameter' });
  }

  const allowedHosts = ['gamek.vn', 'www.gamek.vn', 'myanimelist.net', 'www.myanimelist.net'];
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Malformed url' });
  }

  if (!allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
    return res.status(403).json({ error: 'Unsupported news host' });
  }

  try {
    const response = await fetch(rawUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,*/*'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Upstream HTTP ${response.status}` });
    }

    const html = await response.text();
    const isGamek = parsedUrl.hostname.toLowerCase().includes('gamek.vn');
    const result = isGamek ? parseGamekArticle(html) : parseMalArticle(html);

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to crawl article detail',
      blocks: []
    });
  }
}
