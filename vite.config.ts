import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const NETTRUYEN_HOST = 'https://nettruyenww.com';
const NETTRUYEN_REFERER = 'https://nettruyenar.com/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function onisanimeBackendPlugin(): Plugin {
  return {
    name: 'onisanime-backend-plugin',
    configureServer(server) {
      // 1. Local JSON Database (/api/data)
      server.middlewares.use('/api/data', (req, res) => {
        const filePath = path.resolve(process.cwd(), 'data.json');
        if (req.method === 'GET') {
          try {
            if (!fs.existsSync(filePath)) {
              fs.writeFileSync(filePath, '[]', 'utf-8');
            }
            const data = fs.readFileSync(filePath, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const json = JSON.parse(body);
              fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end();
        }
      });

      // 2. Manga List API (/api/manga/list)
      server.middlewares.use('/api/manga/list', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const page = urlObj.searchParams.get('page') || '1';
          const keyword = urlObj.searchParams.get('keyword');
          const type = urlObj.searchParams.get('type') || 'truyen-moi';

          let fetchUrl = `${NETTRUYEN_HOST}/?page=${page}`;
          if (keyword && keyword.trim()) {
            fetchUrl = `${NETTRUYEN_HOST}/tim-truyen?keyword=${encodeURIComponent(keyword.trim())}&page=${page}`;
          } else if (type === 'hot') {
            fetchUrl = `${NETTRUYEN_HOST}/truyen-tranh-hot?page=${page}`;
          } else if (type === 'manga') {
            fetchUrl = `${NETTRUYEN_HOST}/tim-truyen/manga-112?page=${page}`;
          } else if (type === 'action') {
            fetchUrl = `${NETTRUYEN_HOST}/tim-truyen/action-95?page=${page}`;
          } else if (type === 'top-all') {
            fetchUrl = `${NETTRUYEN_HOST}/tim-truyen?status=-1&sort=10&page=${page}`;
          } else if (type === 'top-month') {
            fetchUrl = `${NETTRUYEN_HOST}/tim-truyen?status=-1&sort=11&page=${page}`;
          } else if (type === 'top-week') {
            fetchUrl = `${NETTRUYEN_HOST}/tim-truyen?status=-1&sort=12&page=${page}`;
          } else if (type === 'top-follow') {
            fetchUrl = `${NETTRUYEN_HOST}/tim-truyen?status=-1&sort=20&page=${page}`;
          }

          const response = await fetch(fetchUrl, {
            headers: { 'User-Agent': USER_AGENT }
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

          // Kiểm tra tổng số trang từ khối pagination của NetTruyen
          const pagiBlock = html.match(/<ul class="pagination"[\s\S]*?<\/ul>/);
          let totalPages = 50;
          if (pagiBlock) {
            const pageNumbers = [...pagiBlock[0].matchAll(/page=([0-9]+)/g)].map((m) => parseInt(m[1], 10));
            if (pageNumbers.length > 0) {
              totalPages = Math.max(...pageNumbers);
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ items, totalPages }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message, items: [], totalPages: 1 }));
        }
      });

      // 3. Manga Detail API (/api/manga/detail?slug=...)
      server.middlewares.use('/api/manga/detail', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const slug = urlObj.searchParams.get('slug');
          if (!slug) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing slug' }));
            return;
          }

          const fetchUrl = `${NETTRUYEN_HOST}/truyen-tranh/${slug}`;
          const response = await fetch(fetchUrl, {
            headers: { 'User-Agent': USER_AGENT }
          });
          const html = await response.text();

          // Title
          const titleMatch = html.match(/<h1 class="title-detail">([^<]+)<\/h1>/);
          const title = titleMatch ? titleMatch[1].trim() : slug;

          // Description
          const descMatch = html.match(/<div class="detail-content">([\s\S]*?)<\/div>/);
          const description = descMatch
            ? descMatch[1].replace(/<[^>]+>/g, '').trim()
            : '';

          // Thumb
          const thumbMatch = html.match(/<div class="col-image">\s*<img [^>]*src="([^"]+)"/);
          const rawThumb = thumbMatch ? thumbMatch[1] : '';
          const thumbUrl = rawThumb
            ? `/api/manga-image?url=${encodeURIComponent(rawThumb.startsWith('http') ? rawThumb : `https:${rawThumb}`)}`
            : '';

          // Trích xuất comicId & comicSlug để gọi API lấy TRỌN BỘ 100% chapter
          const cIdMatch = html.match(/gOpts\.comicId\s*=\s*['"]?([0-9]+)['"]?/) ||
                           html.match(/comicId\s*[:=]\s*['"]?([0-9]+)['"]?/) ||
                           slug.match(/-([0-9]+)$/);
          const cSlugMatch = html.match(/gOpts\.comicSlug\s*=\s*['"]([^'"]+)['"]/);

          const comicId = cIdMatch ? cIdMatch[1] : '';
          const comicSlug = cSlugMatch ? cSlugMatch[1] : slug.replace(/-[0-9]+$/, '');

          let chapters: Array<{ chapter_name: string; chapter_title: string; chapter_api_data: string }> = [];

          // Gọi API ChapterList để lấy TRỌN BỘ (hàng trăm đến hàng ngàn chapter)
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
                  chapters = chapData.data.map((item: any) => ({
                    chapter_name: (item.chapter_name || '').replace(/^Chapter\s*/i, '').trim(),
                    chapter_title: item.chapter_name || `Chapter ${item.chapter_num}`,
                    chapter_api_data: `${NETTRUYEN_HOST}/truyen-tranh/${comicSlug}/${item.chapter_slug}/${item.chapter_id}`
                  }));
                }
              }
            } catch (_) {}
          }

          // Fallback: nếu gọi API ChapterList không được, lấy từ HTML ban đầu
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

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({
            id: slug,
            slug,
            title,
            thumbUrl,
            description,
            chapters
          }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message, chapters: [] }));
        }
      });

      // 4. Manga Chapter Pages API (/api/manga/chapter?url=...)
      server.middlewares.use('/api/manga/chapter', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const chapterUrl = urlObj.searchParams.get('url');
          if (!chapterUrl) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing chapter url' }));
            return;
          }

          const fetchUrl = chapterUrl.replace(/https?:\/\/[^\/]+/, NETTRUYEN_HOST);
          const response = await fetch(fetchUrl, {
            headers: { 'User-Agent': USER_AGENT }
          });
          const html = await response.text();

          const pRegex = /<div class=['"]page-chapter['"][^>]*>\s*<img[^>]+(?:data-src|data-sv1|data-original|src)=['"]([^'"]+)['"]/g;
          let pMatch;
          const pages: string[] = [];
          while ((pMatch = pRegex.exec(html)) !== null) {
            const rawUrl = pMatch[1].startsWith('http') ? pMatch[1] : `https:${pMatch[1]}`;
            // Chuyển URL ảnh qua proxy image local để giải quyết 100% lỗi 403 Anti-Hotlinking
            pages.push(`/api/manga-image?url=${encodeURIComponent(rawUrl)}`);
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ pages }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message, pages: [] }));
        }
      });

      // 5. Anti-Hotlinking Image Proxy (/api/manga-image?url=...)
      server.middlewares.use('/api/manga-image', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const targetUrl = urlObj.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.end();
            return;
          }

          const imgRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': USER_AGENT,
              'Referer': NETTRUYEN_REFERER
            }
          });

          if (!imgRes.ok) {
            res.statusCode = imgRes.status;
            res.end();
            return;
          }

          const buffer = await imgRes.arrayBuffer();
          res.statusCode = 200;
          res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(Buffer.from(buffer));
        } catch (_) {
          res.statusCode = 500;
          res.end();
        }
      });

      // 6. News List Crawler (/api/news/list?region=all|vn|global&keyword=...)
      const decodeNewsHtml = (str = '') =>
        String(str)
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
          .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
          .replace(/&quot;/g, '"')
          .replace(/&apos;|&#039;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const stripNewsTags = (html = '') => decodeNewsHtml(String(html).replace(/<[^>]+>/g, ' '));

      const extractNewsAttr = (tag = '', attrName: string) => {
        const re = new RegExp(`${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
        const m = tag.match(re);
        return ((m && (m[1] || m[2] || m[3])) || '').trim();
      };

      server.middlewares.use('/api/news/list', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const region = urlObj.searchParams.get('region') || 'all';
          const keyword = (urlObj.searchParams.get('keyword') || '').trim().toLowerCase();

          const fetchGameK = async () => {
            try {
              const r = await fetch('https://gamek.vn/manga-film.chn', {
                headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'vi-VN,vi;q=0.9' }
              });
              if (!r.ok) return [];
              const html = await r.text();
              const body = html.slice(html.indexOf('<body'));
              const idx = body.indexOf('newsupdate');
              if (idx === -1) return [];
              const section = body.slice(idx, idx + 80000);
              const articles = section.split('<article').slice(1);
              const items: any[] = [];
              for (const art of articles) {
                const linkTitleMatch =
                  art.match(/<a[^>]+href=([^\s>]+?\.chn)[^>]+title="([^"]+)"/i) ||
                  art.match(/<a[^>]+href="([^"]+?\.chn)"[^>]+title="([^"]+)"/i);
                if (!linkTitleMatch) continue;
                const rawHref = linkTitleMatch[1].replace(/['"]/g, '');
                const fullLink = rawHref.startsWith('http') ? rawHref : `https://gamek.vn${rawHref}`;
                const title = stripNewsTags(linkTitleMatch[2]);
                const imgMatch =
                  art.match(/srcset="[^"]*?(https:\/\/gamek\.mediacdn\.vn[^\s,]+)/i) ||
                  art.match(/src=([^\s>]+\.(?:jpg|jpeg|png|webp)[^\s>]*)/i) ||
                  art.match(/src="([^"]+)"/i);
                const imageUrl = imgMatch
                  ? imgMatch[1].replace(/['"]/g, '')
                  : 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg';
                const infoSplit = art.split('<div class=info>')[1] || art.split('<div class="info">')[1] || art;
                const pMatches = [...infoSplit.matchAll(/<p(?:\s+class=[^\s>]+)?[^>]*>([\s\S]*?)(?=<p|<\/div|<\/article)/gi)];
                let summary = '';
                let timeText = 'Mới cập nhật';
                let author = 'GameK';
                for (const pm of pMatches) {
                  const rawP = pm[0];
                  if (rawP.includes('class=time') || rawP.includes('class="time"')) {
                    const tMatch = rawP.match(/\|\s*([^<]+)/);
                    if (tMatch) timeText = stripNewsTags(tMatch[1]);
                    const aMatch = rawP.match(/class=author[^>]*>([^<]+)/) || rawP.match(/class="author"[^>]*>([^<]+)/);
                    if (aMatch) author = stripNewsTags(aMatch[1]);
                  } else if (!summary) {
                    summary = stripNewsTags(pm[1]);
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
            } catch {
              return [];
            }
          };

          const fetchMal = async () => {
            try {
              const r = await fetch('https://myanimelist.net/rss/news.xml', {
                headers: { 'User-Agent': USER_AGENT }
              });
              if (!r.ok) return [];
              const xml = await r.text();
              const rawItems = xml.split('<item>').slice(1);
              const items: any[] = [];
              for (const it of rawItems) {
                const title = stripNewsTags(it.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
                const link = (it.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
                const desc = stripNewsTags(it.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '');
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
            } catch {
              return [];
            }
          };

          const [gkItems, malItems] = await Promise.all([
            region === 'global' ? Promise.resolve([]) : fetchGameK(),
            region === 'vn' ? Promise.resolve([]) : fetchMal()
          ]);
          let combined = [...gkItems, ...malItems];
          if (keyword) {
            combined = combined.filter(
              (n) => n.title.toLowerCase().includes(keyword) || n.summary.toLowerCase().includes(keyword)
            );
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ items: combined }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message, items: [] }));
        }
      });

      // 7. News Article Detail Crawler (/api/news/detail?url=...)
      server.middlewares.use('/api/news/detail', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const rawUrl = (urlObj.searchParams.get('url') || '').trim();
          if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing or invalid url parameter', blocks: [] }));
            return;
          }

          const parsedUrl = new URL(rawUrl);
          const allowedHosts = ['gamek.vn', 'www.gamek.vn', 'myanimelist.net', 'www.myanimelist.net'];
          if (!allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Unsupported news host', blocks: [] }));
            return;
          }

          const r = await fetch(rawUrl, {
            headers: {
              'User-Agent': USER_AGENT,
              Accept: 'text/html,application/xhtml+xml,*/*'
            }
          });
          if (!r.ok) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Upstream HTTP ${r.status}`, blocks: [] }));
            return;
          }

          const html = await r.text();
          const cleanBox = (s = '') =>
            s
              .replace(/<script[\s\S]*?<\/script>/gi, ' ')
              .replace(/<style[\s\S]*?<\/style>/gi, ' ')
              .replace(/<zone[\s\S]*?<\/zone>/gi, ' ')
              .replace(/<div[^>]*(?:link-content-footer|tag-list|related|ads)[^>]*>[\s\S]*?<\/div>/gi, ' ');

          const blocks: Array<{ type: 'text' | 'image'; content: string }> = [];
          const seen = new Set<string>();
          let title = '';
          let sapo = '';

          if (parsedUrl.hostname.toLowerCase().includes('gamek.vn')) {
            const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            title = h1Match ? stripNewsTags(h1Match[1]) : '';
            const sapoMatch = html.match(/<h2[^>]*(?:data-field\s*=\s*["']?sapo["']?|class\s*=\s*["']?sapo["']?)[^>]*>([\s\S]*?)<\/h2>/i);
            sapo = sapoMatch ? stripNewsTags(sapoMatch[1]) : '';
            const bodyMatch =
              html.match(/<section[^>]*itemprop\s*=\s*["']?articleBody["']?[^>]*>([\s\S]*?)<\/section>/i) ||
              html.match(/<div[^>]*class\s*=\s*["']?[^"']*rightdetail_content[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i);
            const rawBody = bodyMatch ? cleanBox(bodyMatch[1]) : cleanBox(html);
            const tokenRegex = /<p\b[^>]*>[\s\S]*?(?=<\/p>|<p\b|<h[2-4]\b|<div\b|<figure\b|<\/section>|$)|<h[2-4]\b[^>]*>[\s\S]*?<\/h[2-4]>|<img\b[^>]*>/gi;
            let m;
            while ((m = tokenRegex.exec(rawBody)) !== null) {
              const chunk = m[0];
              if (/^<img\b/i.test(chunk)) {
                const src =
                  extractNewsAttr(chunk, 'data-original') ||
                  extractNewsAttr(chunk, 'data-src') ||
                  extractNewsAttr(chunk, 'src');
                if (src && /^https?:\/\//i.test(src) && !/\/(icon|logo|avatar|loading|placeholder|1x1)\b/i.test(src) && !seen.has(src)) {
                  seen.add(src);
                  blocks.push({ type: 'image', content: src });
                }
                continue;
              }
              const innerImgs = chunk.match(/<img\b[^>]*>/gi) || [];
              for (const imgTag of innerImgs) {
                const src =
                  extractNewsAttr(imgTag, 'data-original') ||
                  extractNewsAttr(imgTag, 'data-src') ||
                  extractNewsAttr(imgTag, 'src');
                if (src && /^https?:\/\//i.test(src) && !/\/(icon|logo|avatar|loading|placeholder|1x1)\b/i.test(src) && !seen.has(src)) {
                  seen.add(src);
                  blocks.push({ type: 'image', content: src });
                }
              }
              const text = stripNewsTags(chunk);
              if (text && text.length >= 12 && !/^(Tin liên quan|Xem thêm|Theo dõi|Copy link)/i.test(text) && !seen.has(text)) {
                seen.add(text);
                blocks.push({ type: 'text', content: text });
              }
            }
          } else {
            const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            title = h1Match ? stripNewsTags(h1Match[1]) : '';
            const contentMatch =
              html.match(/<div[^>]*class\s*=\s*["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<div[^>]*class\s*=\s*["'][^"']*news-info-block/i) ||
              html.match(/<div[^>]*class\s*=\s*["'][^"']*news-container[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
            const rawBody = contentMatch ? cleanBox(contentMatch[1]) : '';
            if (rawBody) {
              const imgs = rawBody.match(/<img\b[^>]*>/gi) || [];
              for (const imgTag of imgs) {
                const src = extractNewsAttr(imgTag, 'data-src') || extractNewsAttr(imgTag, 'src');
                if (src && /^https?:\/\//i.test(src) && !seen.has(src)) {
                  seen.add(src);
                  blocks.push({ type: 'image', content: src });
                }
              }
              const cleanText = rawBody
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>|<\/div>/gi, '\n')
                .replace(/<[^>]+>/g, ' ');
              const lines = cleanText.split(/\n+/).map((l) => decodeNewsHtml(l)).filter((l) => l.length > 20);
              for (const line of lines) {
                if (!seen.has(line)) {
                  seen.add(line);
                  blocks.push({ type: 'text', content: line });
                }
              }
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ title, sapo, blocks }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message, blocks: [] }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5174,
      host: '0.0.0.0',
    },
    plugins: [react(), onisanimeBackendPlugin()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'fe'),
      }
    }
  };
});
