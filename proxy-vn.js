import express from 'express';
import {
  resolveMangaList,
  resolveMangaDetail,
  resolveMangaChapterPages,
  resolveMangaImage
} from './lib/mangaSources.js';

const app = express();
const PORT = Number(process.env.PORT || 3456);
const SECRET = (process.env.MANGA_PROXY_SECRET || '').trim();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-proxy-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (SECRET && req.path !== '/health' && req.headers['x-proxy-secret'] !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized proxy request' });
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'onisanime-vn-manga-proxy', port: PORT });
});

app.get('/api/manga/list', async (req, res) => {
  try {
    const page = String(req.query.page || '1');
    const keyword = String(req.query.keyword || '');
    const type = String(req.query.type || 'truyen-moi');
    const result = await resolveMangaList({ page, keyword, type });
    if (!result?.items?.length) {
      return res.status(502).json({ error: 'Empty manga list', items: [], totalPages: 1 });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, items: [], totalPages: 1 });
  }
});

app.get('/api/manga/detail', async (req, res) => {
  try {
    const slug = String(req.query.slug || '');
    if (!slug) return res.status(400).json({ error: 'Missing slug', chapters: [] });
    const detail = await resolveMangaDetail(slug);
    if (!detail || !detail.title) {
      return res.status(404).json({ error: 'Manga not found', chapters: [] });
    }
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message, chapters: [] });
  }
});

app.get('/api/manga/chapter', async (req, res) => {
  try {
    const chapterUrl = String(req.query.url || '');
    if (!chapterUrl) return res.status(400).json({ error: 'Missing url', pages: [] });
    const pages = await resolveMangaChapterPages(chapterUrl);
    if (!pages.length) return res.status(404).json({ error: 'Pages not found', pages: [] });
    res.json({ pages });
  } catch (err) {
    res.status(500).json({ error: err.message, pages: [] });
  }
});

app.get('/api/manga-image', async (req, res) => {
  try {
    const targetUrl = String(req.query.url || '');
    const title = String(req.query.title || '');
    const alId = String(req.query.alId || '');
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) return res.status(400).end();

    const result = await resolveMangaImage({ targetUrl, title, alId });
    if (!result || result.status !== 200 || !result.buffer) {
      return res.status(result?.status || 502).end();
    }
    res.setHeader('Content-Type', result.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(result.buffer);
  } catch {
    res.status(500).end();
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[VN Manga Proxy] Running at http://127.0.0.1:${PORT}`);
});

