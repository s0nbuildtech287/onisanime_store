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

          const pRegex = /<div class=['"]page-chapter['"][^>]*>\s*<img[^>]+data-src=['"]([^'"]+)['"]/g;
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
