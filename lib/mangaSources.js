const NETTRUYEN_MIRRORS = ['https://nettruyenar.com', 'https://nettruyenww.com'];
const MANGADEX_API = 'https://api.mangadex.org';
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function isBlockedHtml(html = '') {
  if (!html || html.length < 400) return true;
  return (
    html.includes('Just a moment...') ||
    html.includes('cf-browser-verification') ||
    html.includes('Attention Required! | Cloudflare') ||
    html.includes('Enable JavaScript and cookies to continue')
  );
}

function buildNetTruyenListUrl(host, { page = '1', keyword = '', type = 'truyen-moi' }) {
  if (keyword && keyword.trim()) {
    return `${host}/tim-truyen?keyword=${encodeURIComponent(keyword.trim())}&page=${page}`;
  }
  switch (type) {
    case 'hot':
      return `${host}/truyen-tranh-hot?page=${page}`;
    case 'manga':
      return `${host}/tim-truyen/manga-112?page=${page}`;
    case 'action':
      return `${host}/tim-truyen/action-95?page=${page}`;
    case 'top-all':
      return `${host}/tim-truyen?status=-1&sort=10&page=${page}`;
    case 'top-month':
      return `${host}/tim-truyen?status=-1&sort=11&page=${page}`;
    case 'top-week':
      return `${host}/tim-truyen?status=-1&sort=12&page=${page}`;
    case 'top-follow':
      return `${host}/tim-truyen?status=-1&sort=20&page=${page}`;
    default:
      return `${host}/?page=${page}`;
  }
}

function parseNetTruyenListHtml(html) {
  const blocks = html.split('<div class="item"');
  const items = [];

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const titleMatch = block.match(/<a [^>]*title="([^"]+)"[^>]*href="([^"]+)"/);
    const imgMatch = block.match(/<img [^>]*(?:data-original|src)="([^"]+)"/);
    const chapMatch =
      block.match(/<a [^>]*href="[^"]*\/chapter-[^"]*"[^>]*>([^<]+)<\/a>/) ||
      block.match(/<figcaption>[\s\S]*?<ul>[\s\S]*?<a [^>]*>([^<]+)<\/a>/);

    if (titleMatch) {
      const rawHref = titleMatch[2];
      const slugMatch = rawHref.match(/\/truyen-tranh\/([^/?#]+)/);
      const slug = slugMatch ? slugMatch[1] : rawHref;

      const title = titleMatch[1].replace(/^Truyện tranh\s*/i, '').trim();
      const latestChapter = chapMatch ? chapMatch[1].trim() : 'Mới cập nhật';

      const rawImg = imgMatch ? imgMatch[1] : '';
      const originalThumb = rawImg
        ? rawImg.startsWith('http')
          ? rawImg
          : `https:${rawImg}`
        : '';
      const thumbUrl = originalThumb
        ? `/api/manga-image?url=${encodeURIComponent(originalThumb)}`
        : '';

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
    const pageNumbers = [...pagiBlock[0].matchAll(/page=([0-9]+)/g)].map((m) =>
      parseInt(m[1], 10)
    );
    if (pageNumbers.length > 0) {
      totalPages = Math.max(...pageNumbers);
    }
  }

  return { items, totalPages };
}

async function fetchNetTruyenHtml(url, referer) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      ...(referer ? { Referer: referer } : {})
    },
    signal: AbortSignal.timeout(7000)
  });
  if (!res.ok) return null;
  const html = await res.text();
  if (isBlockedHtml(html)) return null;
  return html;
}

// ==================== MANGADEX CLOUD-SAFE FALLBACK ====================

function pickMdTitle(attributes) {
  const t = attributes?.title || {};
  if (t.vi) return t.vi;
  if (t.en) return t.en;
  if (t['ja-ro']) return t['ja-ro'];
  const firstTitle = Object.values(t)[0];
  if (firstTitle) return String(firstTitle);

  const alts = Array.isArray(attributes?.altTitles) ? attributes.altTitles : [];
  for (const lang of ['vi', 'en', 'ja-ro']) {
    const found = alts.find((a) => a && a[lang]);
    if (found) return String(found[lang]);
  }
  return 'Manga';
}

function pickMdDescription(attributes) {
  const d = attributes?.description || {};
  const raw = d.vi || d.en || Object.values(d)[0] || '';
  return String(raw).replace(/\[[^\]]+\]\([^)]+\)/g, '').trim();
}

function buildMdCoverUrl(manga) {
  const rel = (manga.relationships || []).find((r) => r.type === 'cover_art');
  const fileName = rel?.attributes?.fileName;
  if (!fileName) return '';
  const rawCover = `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.512.jpg`;
  return `/api/manga-image?url=${encodeURIComponent(rawCover)}`;
}

async function fetchMangaDexList({ page = '1', keyword = '', type = 'truyen-moi' }) {
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limit = 24;
  const offset = (pageNum - 1) * limit;

  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('offset', String(offset));
  qs.append('includes[]', 'cover_art');
  qs.append('availableTranslatedLanguage[]', 'vi');
  qs.append('contentRating[]', 'safe');
  qs.append('contentRating[]', 'suggestive');

  if (keyword && keyword.trim()) {
    qs.set('title', keyword.trim());
    qs.set('order[relevance]', 'desc');
  } else if (type === 'top-all' || type === 'top-follow') {
    qs.set('order[followedCount]', 'desc');
  } else if (type === 'hot' || type === 'top-month' || type === 'top-week') {
    qs.set('order[rating]', 'desc');
  } else {
    qs.set('order[latestUploadedChapter]', 'desc');
  }

  const res = await fetch(`${MANGADEX_API}/manga?${qs.toString()}`, {
    headers: { 'User-Agent': 'OnisanimeStore/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) return { items: [], totalPages: 1 };
  const data = await res.json();
  const list = Array.isArray(data?.data) ? data.data : [];

  const items = list.map((m) => {
    const attr = m.attributes || {};
    const statusMap = {
      completed: 'Hoàn thành',
      ongoing: 'Đang phát hành',
      hiatus: 'Tạm ngưng',
      cancelled: 'Đã hủy'
    };
    const genres = (attr.tags || [])
      .slice(0, 3)
      .map((tag) => tag.attributes?.name?.en)
      .filter(Boolean);

    return {
      id: `md_${m.id}`,
      slug: `md_${m.id}`,
      title: pickMdTitle(attr),
      thumbUrl: buildMdCoverUrl(m),
      status: statusMap[attr.status] || 'Đang phát hành',
      latestChapter: attr.lastChapter ? `Chap ${attr.lastChapter}` : 'Tiếng Việt',
      genres: genres.length > 0 ? genres : ['Manga', 'Việt Hóa']
    };
  });

  const total = Math.min(Number(data?.total || items.length), 4800);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { items, totalPages };
}

async function fetchMangaDexDetail(slugOrId) {
  let mangaId = '';
  let mangaObj = null;

  if (slugOrId.startsWith('md_')) {
    mangaId = slugOrId.slice(3);
    const res = await fetch(`${MANGADEX_API}/manga/${mangaId}?includes[]=cover_art`, {
      headers: { 'User-Agent': 'OnisanimeStore/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      const data = await res.json();
      mangaObj = data?.data || null;
    }
  } else {
    const cleanQuery = slugOrId
      .replace(/-\d+$/, '')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const qs = new URLSearchParams({
      title: cleanQuery,
      limit: '1',
      'order[relevance]': 'desc'
    });
    qs.append('includes[]', 'cover_art');
    const res = await fetch(`${MANGADEX_API}/manga?${qs.toString()}`, {
      headers: { 'User-Agent': 'OnisanimeStore/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      const data = await res.json();
      mangaObj = Array.isArray(data?.data) ? data.data[0] : null;
      mangaId = mangaObj?.id || '';
    }
  }

  if (!mangaId || !mangaObj) return null;

  const fetchFeed = async (lang) => {
    const qs = new URLSearchParams({
      limit: '500',
      'order[chapter]': 'desc'
    });
    qs.append('translatedLanguage[]', lang);
    qs.append('contentRating[]', 'safe');
    qs.append('contentRating[]', 'suggestive');
    qs.append('contentRating[]', 'erotica');
    const r = await fetch(`${MANGADEX_API}/manga/${mangaId}/feed?${qs.toString()}`, {
      headers: { 'User-Agent': 'OnisanimeStore/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return [];
    const json = await r.json();
    return Array.isArray(json?.data) ? json.data : [];
  };

  let feed = await fetchFeed('vi');
  let usedLang = 'vi';
  if (feed.length === 0) {
    feed = await fetchFeed('en');
    usedLang = 'en';
  }

  const seenChap = new Set();
  const chapters = [];
  for (const ch of feed) {
    const attr = ch.attributes || {};
    if (attr.externalUrl || !attr.pages || attr.pages <= 0) continue;
    const chapNum = attr.chapter || 'Oneshot';
    if (seenChap.has(chapNum)) continue;
    seenChap.add(chapNum);

    chapters.push({
      chapter_name: usedLang === 'en' ? `${chapNum} (EN)` : String(chapNum),
      chapter_title: attr.title ? `Chapter ${chapNum}: ${attr.title}` : `Chapter ${chapNum}`,
      chapter_api_data: `md_chap:${ch.id}`
    });
  }

  if (chapters.length === 0) return null;

  return {
    id: `md_${mangaId}`,
    slug: slugOrId,
    title: pickMdTitle(mangaObj.attributes),
    thumbUrl: buildMdCoverUrl(mangaObj),
    description: pickMdDescription(mangaObj.attributes),
    chapters
  };
}

async function fetchMangaDexChapterPages(chapToken) {
  const chapId = chapToken.replace(/^md_chap:/, '').trim();
  if (!chapId) return [];
  const res = await fetch(`${MANGADEX_API}/at-home/server/${chapId}`, {
    headers: { 'User-Agent': 'OnisanimeStore/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) return [];
  const data = await res.json();
  const baseUrl = data?.baseUrl;
  const hash = data?.chapter?.hash;
  const files = Array.isArray(data?.chapter?.data) ? data.chapter.data : [];
  if (!baseUrl || !hash || files.length === 0) return [];

  return files.map(
    (file) => `/api/manga-image?url=${encodeURIComponent(`${baseUrl}/data/${hash}/${file}`)}`
  );
}

// ==================== PUBLIC EXPORTED RESOLVERS ====================

export async function resolveMangaList({ page = '1', keyword = '', type = 'truyen-moi' }) {
  for (const host of NETTRUYEN_MIRRORS) {
    try {
      const fetchUrl = buildNetTruyenListUrl(host, { page, keyword, type });
      const html = await fetchNetTruyenHtml(fetchUrl, `${host}/`);
      if (!html || !html.includes('<div class="item"')) continue;
      const parsed = parseNetTruyenListHtml(html);
      if (parsed.items.length > 0) return parsed;
    } catch (_) {}
  }

  try {
    const mdRes = await fetchMangaDexList({ page, keyword, type });
    if (mdRes.items.length > 0) return mdRes;
  } catch (_) {}

  return { items: [], totalPages: 1 };
}

export async function resolveMangaDetail(slug) {
  if (!slug) return null;

  if (!slug.startsWith('md_')) {
    for (const host of NETTRUYEN_MIRRORS) {
      try {
        let targetSlug = slug;
        let fetchUrl = `${host}/truyen-tranh/${targetSlug}`;
        let html = await fetchNetTruyenHtml(fetchUrl, `${host}/`);

        // Tự động tìm slug chuẩn NetTruyen nếu nhận slug chưa có đuôi ID (VD: sousou-no-frieren)
        if ((!html || !html.includes('title-detail')) && !/-[0-9]+$/.test(slug)) {
          const kw = slug.replace(/-/g, ' ').trim();
          const searchHtml = await fetchNetTruyenHtml(
            `${host}/tim-truyen?keyword=${encodeURIComponent(kw)}`,
            `${host}/`
          );
          if (searchHtml && searchHtml.includes('<div class="item"')) {
            const parsedList = parseNetTruyenListHtml(searchHtml);
            if (parsedList.items[0]?.slug) {
              targetSlug = parsedList.items[0].slug;
              fetchUrl = `${host}/truyen-tranh/${targetSlug}`;
              html = await fetchNetTruyenHtml(fetchUrl, `${host}/`);
            }
          }
        }

        if (!html || !html.includes('title-detail')) continue;

        const titleMatch = html.match(/<h1 class="title-detail">([^<]+)<\/h1>/);
        const title = titleMatch ? titleMatch[1].trim() : targetSlug;

        const descMatch = html.match(/<div class="detail-content">([\s\S]*?)<\/div>/);
        const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        const thumbMatch = html.match(/<div class="col-image">\s*<img [^>]*src="([^"]+)"/);
        const rawThumb = thumbMatch ? thumbMatch[1] : '';
        const thumbUrl = rawThumb
          ? `/api/manga-image?url=${encodeURIComponent(
              rawThumb.startsWith('http') ? rawThumb : `https:${rawThumb}`
            )}`
          : '';

        const cIdMatch =
          html.match(/gOpts\.comicId\s*=\s*['"]?([0-9]+)['"]?/) ||
          html.match(/comicId\s*[:=]\s*['"]?([0-9]+)['"]?/) ||
          targetSlug.match(/-([0-9]+)$/);
        const cSlugMatch = html.match(/gOpts\.comicSlug\s*=\s*['"]([^'"]+)['"]/);

        const comicId = cIdMatch ? cIdMatch[1] : '';
        const comicSlug = cSlugMatch ? cSlugMatch[1] : targetSlug.replace(/-[0-9]+$/, '');

        let chapters = [];
        if (comicId && comicSlug) {
          try {
            const fullApiUrl = `${host}/Comic/Services/ComicService.asmx/ChapterList?slug=${encodeURIComponent(
              comicSlug
            )}&comicId=${encodeURIComponent(comicId)}`;
            const chapApiRes = await fetch(fullApiUrl, {
              headers: {
                'User-Agent': USER_AGENT,
                Referer: fetchUrl,
                'X-Requested-With': 'XMLHttpRequest'
              },
              signal: AbortSignal.timeout(7000)
            });
            if (chapApiRes.ok) {
              const chapData = await chapApiRes.json();
              if (Array.isArray(chapData?.data) && chapData.data.length > 0) {
                chapters = chapData.data.map((item) => ({
                  chapter_name: (item.chapter_name || '').replace(/^Chapter\s*/i, '').trim(),
                  chapter_title: item.chapter_name || `Chapter ${item.chapter_num}`,
                  chapter_api_data: `${host}/truyen-tranh/${comicSlug}/${item.chapter_slug}/${item.chapter_id}`
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

        if (chapters.length > 0) {
          return {
            id: targetSlug,
            slug: targetSlug,
            title,
            thumbUrl,
            description,
            chapters
          };
        }
      } catch (_) {}
    }
  }

  try {
    const mdDetail = await fetchMangaDexDetail(slug);
    if (mdDetail) return mdDetail;
  } catch (_) {}

  return null;
}

export async function resolveMangaChapterPages(chapterUrl) {
  if (!chapterUrl) return [];

  if (chapterUrl.startsWith('md_chap:')) {
    try {
      return await fetchMangaDexChapterPages(chapterUrl);
    } catch (_) {
      return [];
    }
  }

  for (const host of NETTRUYEN_MIRRORS) {
    try {
      const fetchUrl = chapterUrl.replace(/https?:\/\/[^\/]+/, host);
      const html = await fetchNetTruyenHtml(fetchUrl, `${host}/`);
      if (!html) continue;

      const pRegex =
        /<div class=['"]page-chapter['"][^>]*>\s*<img[^>]+(?:data-src|data-sv1|data-original|src)=['"]([^'"]+)['"]/g;
      let pMatch;
      const pages = [];
      while ((pMatch = pRegex.exec(html)) !== null) {
        const rawUrl = pMatch[1].startsWith('http') ? pMatch[1] : `https:${pMatch[1]}`;
        pages.push(`/api/manga-image?url=${encodeURIComponent(rawUrl)}`);
      }
      if (pages.length > 0) return pages;
    } catch (_) {}
  }

  return [];
}

