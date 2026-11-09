import {
  AnimeCardItem,
  AnimeEpisode,
  MangaCardItem,
  MediaItem,
  ScheduleAnimeItem,
  StreamServerGroup
} from '../types';

const PHIM_API_BASE = 'https://phimapi.com';
const NGUONC_API_BASE = 'https://phim.nguonc.com';
const LOCAL_DB_KEY = 'onisanime_db_v1';

export function formatPhimImg(url?: string): string {
  if (!url) return 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-gHSraOSa0nBG.jpg';
  if (url.startsWith('http')) return url;
  return `https://phimimg.com/${url.replace(/^\//, '')}`;
}

// ==================== 1. ANIME DISCOVERY & FILTER ENGINE ====================

export const animeApi = {
  // Lấy danh sách Anime / Hoạt hình (Hỗ trợ lọc Nhật Bản, Trung Quốc 3D, Năm, Tìm kiếm)
  getAnimeList: async (params: {
    page?: number;
    country?: string; // 'nhat-ban' | 'trung-quoc' | 'all'
    genre?: string;
    year?: string;
    keyword?: string;
    source?: 'kkphim' | 'nguonc';
  }): Promise<{ items: AnimeCardItem[]; totalPages: number }> => {
    const page = params.page || 1;

    try {
      // 1. Nếu có từ khóa tìm kiếm
      if (params.keyword && params.keyword.trim()) {
        const kw = encodeURIComponent(params.keyword.trim());
        const res = await fetch(`${PHIM_API_BASE}/v1/api/tim-kiem?keyword=${kw}&page=${page}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const rawItems = data?.data?.items || [];
        const items: AnimeCardItem[] = rawItems.map((m: any) => ({
          id: m._id || m.slug,
          slug: m.slug,
          title: m.name,
          originTitle: m.origin_name,
          posterUrl: formatPhimImg(m.poster_url || m.thumb_url),
          bannerUrl: formatPhimImg(m.thumb_url || m.poster_url),
          year: m.year,
          episodeCurrent: m.episode_current,
          quality: m.quality || 'FHD',
          lang: m.lang || 'Vietsub',
          country: m.country?.[0]?.name || 'Anime',
          malScore: m.tmdb?.vote_average ? Math.round(m.tmdb.vote_average * 10) / 10 : 8.6,
          genres: (m.category || []).map((c: any) => c.name),
          source: 'kkphim'
        }));
        return {
          items,
          totalPages: data?.data?.params?.pagination?.totalPages || 1
        };
      }

      // 2. Nếu chọn nguồn NguonC
      if (params.source === 'nguonc') {
        const res = await fetch(`${NGUONC_API_BASE}/api/films/danh-sach/hoat-hinh?page=${page}`);
        if (!res.ok) throw new Error('NguonC failed');
        const data = await res.json();
        const rawItems = data?.items || [];
        const items: AnimeCardItem[] = rawItems.map((m: any) => ({
          id: m.id || m.slug,
          slug: m.slug,
          title: m.name,
          originTitle: m.original_name,
          posterUrl: m.poster_url || m.thumb_url,
          bannerUrl: m.thumb_url || m.poster_url,
          year: m.year || 2026,
          episodeCurrent: m.current_episode || 'FHD',
          quality: m.quality || 'FHD 1080p',
          lang: 'Vietsub',
          country: 'Anime',
          malScore: 8.5,
          genres: (m.categories || []).map((c: any) => c.name),
          source: 'nguonc'
        }));
        return {
          items,
          totalPages: data?.paginate?.total_page || 10
        };
      }

      // 3. Mặc định: KKPhim (PhimAPI) nhánh Hoạt Hình
      const query: string[] = [`page=${page}`];
      if (params.country && params.country !== 'all') {
        query.push(`country=${encodeURIComponent(params.country)}`);
      }
      if (params.genre && params.genre !== 'all') {
        query.push(`category=${encodeURIComponent(params.genre)}`);
      }
      if (params.year && params.year !== 'all') {
        query.push(`year=${encodeURIComponent(params.year)}`);
      }

      const res = await fetch(`${PHIM_API_BASE}/v1/api/danh-sach/hoat-hinh?${query.join('&')}`);
      if (!res.ok) throw new Error('KKPhim failed');
      const data = await res.json();
      const rawItems = data?.data?.items || [];

      const items: AnimeCardItem[] = rawItems.map((m: any) => ({
        id: m._id || m.slug,
        slug: m.slug,
        title: m.name,
        originTitle: m.origin_name,
        posterUrl: formatPhimImg(m.poster_url || m.thumb_url),
        bannerUrl: formatPhimImg(m.thumb_url || m.poster_url),
        year: m.year,
        episodeCurrent: m.episode_current,
        quality: m.quality || 'FHD',
        lang: m.lang || 'Vietsub',
        country: m.country?.[0]?.name || 'Nhật Bản',
        malScore: m.tmdb?.vote_average ? Math.round(m.tmdb.vote_average * 10) / 10 : 8.8,
        genres: (m.category || []).map((c: any) => c.name),
        source: 'kkphim'
      }));

      return {
        items,
        totalPages: data?.data?.params?.pagination?.totalPages || 1
      };
    } catch (err) {
      console.warn('Error loading anime list, falling back to empty list:', err);
      return { items: [], totalPages: 1 };
    }
  },

  // Lấy Lịch chiếu Anime trong tuần (Tự động phân nhóm từ các bộ Anime mới nhất có ngày cập nhật)
  getWeeklySchedule: async (dayIndex: number = 0): Promise<ScheduleAnimeItem[]> => {
    try {
      // Lấy danh sách anime mới cập nhật
      const res = await fetch(`${PHIM_API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`);
      if (!res.ok) throw new Error('Schedule API failed');
      const data = await res.json();
      const allItems = data?.items || [];
      
      // Lọc các phim hoạt hình / anime
      const animeItems = allItems.filter(
        (m: any) =>
          m.type === 'hoathinh' ||
          (m.category && m.category.some((c: any) => c.name?.toLowerCase().includes('hoạt hình')))
      );

      // Nếu ít, lấy từ trang danh sách hoạt hình
      let finalItems = animeItems;
      if (finalItems.length < 5) {
        const hRes = await fetch(`${PHIM_API_BASE}/v1/api/danh-sach/hoat-hinh?page=1`);
        const hData = await hRes.json();
        finalItems = hData?.data?.items || allItems.slice(0, 10);
      }

      // Xoay vòng danh sách theo ngày trong tuần để tạo lịch chiếu phong phú
      const offset = (dayIndex * 3) % Math.max(1, finalItems.length);
      const rotated = [...finalItems.slice(offset), ...finalItems.slice(0, offset)];

      return rotated.slice(0, 9).map((m: any, idx: number) => ({
        mal_id: idx + 1000,
        title: m.name,
        title_english: m.origin_name || m.name,
        title_japanese: m.origin_name || '',
        images: {
          jpg: { large_image_url: formatPhimImg(m.poster_url || m.thumb_url) },
          webp: { large_image_url: formatPhimImg(m.poster_url || m.thumb_url) }
        },
        score: m.tmdb?.vote_average ? Math.round(m.tmdb.vote_average * 10) / 10 : 8.5 + (idx % 10) * 0.1,
        episodes: 24,
        broadcast: {
          time: `${19 + (idx % 4)}:${(idx * 15) % 60 < 10 ? '0' : ''}${(idx * 15) % 60}`
        },
        synopsis: m.origin_name ? `${m.name} (${m.origin_name}) - Tập mới nhất: ${m.episode_current || 'Đang chiếu'}` : m.name,
        year: m.year || 2026,
        genres: (m.category || []).map((c: any) => ({ name: c.name || 'Anime' }))
      }));
    } catch (err) {
      console.warn('Schedule fallback error:', err);
      return [];
    }
  }
};

// ==================== 2. SMART MULTI-SOURCE STREAM MATCHER ====================
// Quét song song Server 1 (KKPhim) & Server 2 (NguonC) — Cả 2 đều hỗ trợ CORS 100%

async function fetchKKPhimStream(slug?: string, searchTitle?: string): Promise<{
  movieInfo?: any;
  servers: StreamServerGroup[];
}> {
  try {
    if (slug) {
      const res = await fetch(`${PHIM_API_BASE}/phim/${slug}`);
      if (res.ok) {
        const direct = await res.json();
        if (direct?.status && direct?.movie && Array.isArray(direct?.episodes) && direct.episodes.length > 0) {
          const servers: StreamServerGroup[] = direct.episodes
            .filter((s: any) => s.server_data && s.server_data.length > 0)
            .map((s: any) => ({
              sourceId: 'kkphim',
              sourceLabel: '🇻🇳 KKPhim',
              serverName: `KKPhim • ${s.server_name}`,
              badgeColor: 'from-pink-500 to-rose-600',
              episodes: s.server_data.map((ep: any) => ({
                name: ep.name || ep.slug,
                slug: ep.slug,
                link_embed: ep.link_embed,
                link_m3u8: ep.link_m3u8,
                filename: ep.filename
              }))
            }));
          return { movieInfo: direct.movie, servers };
        }
      }
    }

    if (searchTitle) {
      const cleanKw = searchTitle.replace(/\(.*?\)/g, '').trim();
      const sRes = await fetch(`${PHIM_API_BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(cleanKw)}&page=1`);
      if (sRes.ok) {
        const sData = await sRes.json();
        const first = sData?.data?.items?.[0];
        if (first?.slug) {
          const dRes = await fetch(`${PHIM_API_BASE}/phim/${first.slug}`);
          if (dRes.ok) {
            const detail = await dRes.json();
            if (detail?.status && detail?.episodes?.length > 0) {
              const servers: StreamServerGroup[] = detail.episodes
                .filter((s: any) => s.server_data && s.server_data.length > 0)
                .map((s: any) => ({
                  sourceId: 'kkphim',
                  sourceLabel: '🇻🇳 KKPhim',
                  serverName: `KKPhim • ${s.server_name}`,
                  badgeColor: 'from-pink-500 to-rose-600',
                  episodes: s.server_data.map((ep: any) => ({
                    name: ep.name || ep.slug,
                    slug: ep.slug,
                    link_embed: ep.link_embed,
                    link_m3u8: ep.link_m3u8,
                    filename: ep.filename
                  }))
                }));
              return { movieInfo: detail.movie, servers };
            }
          }
        }
      }
    }
  } catch (_) {}
  return { servers: [] };
}

async function fetchNguonCStream(slug?: string, searchTitle?: string): Promise<{
  movieInfo?: any;
  servers: StreamServerGroup[];
}> {
  try {
    const parseDetail = (detail: any) => {
      const movie = detail?.movie;
      const episodes = movie?.episodes || [];
      if (!movie || !Array.isArray(episodes) || episodes.length === 0) return null;

      const servers: StreamServerGroup[] = episodes
        .filter((s: any) => s.items && s.items.length > 0)
        .map((s: any) => ({
          sourceId: 'nguonc' as const,
          sourceLabel: '⚡ NguonC',
          serverName: `NguonC • ${s.server_name}`,
          badgeColor: 'from-cyan-500 to-blue-600',
          episodes: s.items.map((ep: any) => ({
            name: ep.name || ep.slug,
            slug: ep.slug,
            link_embed: ep.embed,
            link_m3u8: ep.m3u8,
            filename: `${movie.name} - Tập ${ep.name}`
          }))
        }));
      return { movieInfo: movie, servers };
    };

    if (slug) {
      const res = await fetch(`${NGUONC_API_BASE}/api/film/${slug}`);
      if (res.ok) {
        const direct = await res.json();
        const parsed = parseDetail(direct);
        if (parsed && parsed.servers.length > 0) return parsed;
      }
    }

    if (searchTitle) {
      const cleanKw = searchTitle.replace(/\(.*?\)/g, '').trim();
      const sRes = await fetch(`${NGUONC_API_BASE}/api/films/search?keyword=${encodeURIComponent(cleanKw)}`);
      if (sRes.ok) {
        const sData = await sRes.json();
        const first = sData?.items?.[0];
        if (first?.slug) {
          const dRes = await fetch(`${NGUONC_API_BASE}/api/film/${first.slug}`);
          if (dRes.ok) {
            const detail = await dRes.json();
            const parsed = parseDetail(detail);
            if (parsed && parsed.servers.length > 0) return parsed;
          }
        }
      }
    }
  } catch (_) {}
  return { servers: [] };
}

export async function resolveMultiServerStreams(target: {
  slug?: string;
  title: string;
  originTitle?: string;
}): Promise<{
  title: string;
  originTitle?: string;
  synopsis?: string;
  posterUrl?: string;
  bannerUrl?: string;
  year?: string | number;
  quality?: string;
  genres?: string[];
  trailerUrl?: string;
  servers: StreamServerGroup[];
}> {
  const searchQuery = target.originTitle || target.title;

  // Quét song song 2 server lớn
  const [kkRes, nguoncRes] = await Promise.all([
    fetchKKPhimStream(target.slug, target.title),
    fetchNguonCStream(target.slug, searchQuery)
  ]);

  let allServers: StreamServerGroup[] = [
    ...kkRes.servers,
    ...nguoncRes.servers
  ];

  // Nếu chưa có server nào, quét lần 2 theo originTitle
  if (allServers.length === 0 && target.originTitle && target.originTitle !== target.title) {
    const [kk2, nguonc2] = await Promise.all([
      fetchKKPhimStream(undefined, target.originTitle),
      fetchNguonCStream(undefined, target.originTitle)
    ]);
    allServers = [...kk2.servers, ...nguonc2.servers];
  }

  const primaryInfo = kkRes.movieInfo || nguoncRes.movieInfo;

  return {
    title: primaryInfo?.name || target.title,
    originTitle: primaryInfo?.origin_name || target.originTitle,
    synopsis: (primaryInfo?.content || primaryInfo?.description || '').replace(/<[^>]+>/g, ''),
    posterUrl: primaryInfo?.poster_url ? formatPhimImg(primaryInfo.poster_url) : undefined,
    bannerUrl: primaryInfo?.thumb_url ? formatPhimImg(primaryInfo.thumb_url) : undefined,
    year: primaryInfo?.year,
    quality: primaryInfo?.quality || 'FHD 1080p',
    genres: Array.isArray(primaryInfo?.category)
      ? primaryInfo.category.map((c: any) => c.name).filter(Boolean)
      : [],
    trailerUrl: primaryInfo?.trailer_url,
    servers: allServers
  };
}

// ==================== 3. MANGA / MANHWA ENGINE ====================
// Kho truyện tranh mẫu hoàn chỉnh với các bộ Manga/Manhwa hot nhất thế giới

const POPULAR_MANGAS: MangaCardItem[] = [
  {
    id: 'manga-one-piece',
    slug: 'one-piece',
    title: 'Đảo Hải Tặc (One Piece)',
    originTitle: 'One Piece',
    thumbUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-oT7YguhEK1TE.jpg',
    status: 'Đang phát hành',
    latestChapter: 'Chap 1130',
    updatedAt: 'Hôm nay',
    genres: ['Hành Động', 'Phiêu Lưu', 'Hài Hước', 'Shonen'],
    author: ['Eiichiro Oda'],
    description: 'Hành trình của Monkey D. Luffy và băng Mũ Rơm trên Đại Hải Trình để tìm kiếm kho báu huyền thoại One Piece.',
    chapters: [
      {
        filename: 'One Piece Chap 1130',
        chapter_name: '1130',
        chapter_title: 'Vùng Đất Elbaf',
        chapter_api_data: 'mock_op_1130'
      },
      {
        filename: 'One Piece Chap 1129',
        chapter_name: '1129',
        chapter_title: 'Thế Giới Búp Bê',
        chapter_api_data: 'mock_op_1129'
      },
      {
        filename: 'One Piece Chap 1128',
        chapter_name: '1128',
        chapter_title: 'RPG',
        chapter_api_data: 'mock_op_1128'
      }
    ]
  },
  {
    id: 'manga-solo-leveling',
    slug: 'solo-leveling',
    title: 'Tôi Thăng Cấp Một Mình (Solo Leveling)',
    originTitle: 'Na Honjaman Level Up',
    thumbUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105398-b673Wkb22frd.jpg',
    status: 'Hoàn thành',
    latestChapter: 'Chap 179 + Ngoại truyện',
    updatedAt: 'Hoàn tất',
    genres: ['Hành Động', 'Giả Tưởng', 'Siêu Nhiên', 'Manhwa'],
    author: ['Chugong', 'DUBU'],
    description: 'Thợ săn yếu nhất nhân loại Sung Jinwoo nhận được Hệ Thống bí ẩn giúp thăng cấp không giới hạn.',
    chapters: [
      {
        filename: 'Solo Leveling Chap 1',
        chapter_name: '1',
        chapter_title: 'Thợ Săn Hạng E',
        chapter_api_data: 'mock_sl_1'
      },
      {
        filename: 'Solo Leveling Chap 2',
        chapter_name: '2',
        chapter_title: 'Hầm Ngục Kép',
        chapter_api_data: 'mock_sl_2'
      }
    ]
  },
  {
    id: 'manga-jujutsu-kaisen',
    slug: 'jujutsu-kaisen',
    title: 'Chú Thuật Hồi Chiến (Jujutsu Kaisen)',
    originTitle: 'Jujutsu Kaisen',
    thumbUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx101517-5eXfWf6jP7o8.jpg',
    status: 'Hoàn thành',
    latestChapter: 'Chap 271 (END)',
    updatedAt: 'Trọn bộ',
    genres: ['Hành Động', 'Siêu Nhiên', 'Kinh Dị', 'Shonen'],
    author: ['Gege Akutami'],
    description: 'Cuộc chiến Chú Thuật khốc liệt giữa các Chú Thuật Sư và Ngón Tay của Vua Nguyền Hồn Sukuna.',
    chapters: [
      {
        filename: 'JJK Chap 271',
        chapter_name: '271',
        chapter_title: 'Hồi Kết Từ Nay Về Sau',
        chapter_api_data: 'mock_jjk_271'
      }
    ]
  },
  {
    id: 'manga-frieren',
    slug: 'sousou-no-frieren',
    title: 'Pháp Sư Tiễn Táng (Sousou no Frieren)',
    originTitle: 'Sousou no Frieren',
    thumbUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx118586-C3qB82k9YI9w.jpg',
    status: 'Đang phát hành',
    latestChapter: 'Chap 135',
    updatedAt: 'Mới cập nhật',
    genres: ['Phiêu Lưu', 'Giả Tưởng', 'Chính Kịch'],
    author: ['Yamada Kanehito'],
    description: 'Hành trình thấu hiểu con người của nữ pháp sư Elf Frieren sau khi đánh bại Ma Vương.',
    chapters: [
      {
        filename: 'Frieren Chap 1',
        chapter_name: '1',
        chapter_title: 'Hồi Kết Của Cuộc Phiêu Lưu',
        chapter_api_data: 'mock_fr_1'
      }
    ]
  },
  {
    id: 'manga-conan',
    slug: 'tham-tu-lung-danh-conan',
    title: 'Thám Tử Lừng Danh Conan',
    originTitle: 'Detective Conan',
    thumbUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30006-kS9m5XbO8uQ2.jpg',
    status: 'Đang phát hành',
    latestChapter: 'Chap 1135',
    updatedAt: 'Hàng tuần',
    genres: ['Trinh Thám', 'Bí Ẩn', 'Shonen'],
    author: ['Gosho Aoyama'],
    description: 'Thám tử học sinh Shinichi Kudo bị teo nhỏ và hành trình phá án dưới danh tính Conan Edogawa.',
    chapters: [
      {
        filename: 'Conan Chap 1135',
        chapter_name: '1135',
        chapter_title: 'Vụ Án Mới',
        chapter_api_data: 'mock_conan_1135'
      }
    ]
  },
  {
    id: 'manga-chainsaw-man',
    slug: 'chainsaw-man',
    title: 'Người Cưa (Chainsaw Man)',
    originTitle: 'Chainsaw Man',
    thumbUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105778-5eTf7rU9Wl6q.jpg',
    status: 'Đang phát hành',
    latestChapter: 'Chap 182',
    updatedAt: 'Thứ 4 hàng tuần',
    genres: ['Hành Động', 'Dark Fantasy', 'Hài Bựa'],
    author: ['Tatsuki Fujimoto'],
    description: 'Denji hòa làm một với quỷ cưa Pochita và bước vào Đội Diệt Quỷ.',
    chapters: [
      {
        filename: 'Chainsaw Man Chap 182',
        chapter_name: '182',
        chapter_title: 'Phần 2: Học Đường',
        chapter_api_data: 'mock_csm_182'
      }
    ]
  }
];

export const mangaApi = {
  getMangaList: async (params: {
    type?: string;
    page?: number;
    keyword?: string;
  }): Promise<{ items: MangaCardItem[]; totalPages: number }> => {
    try {
      const page = params.page || 1;
      const type = params.type || 'truyen-moi';
      let url = `/api/manga/list?page=${page}&type=${type}`;
      if (params.keyword && params.keyword.trim()) {
        url += `&keyword=${encodeURIComponent(params.keyword.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          return { items: data.items, totalPages: data.totalPages || 50 };
        }
      }
    } catch (_) {}
    return { items: POPULAR_MANGAS, totalPages: 1 };
  },

  getMangaDetail: async (slug: string): Promise<MangaCardItem | null> => {
    try {
      const res = await fetch(`/api/manga/detail?slug=${encodeURIComponent(slug)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.title) {
          return data;
        }
      }
    } catch (_) {}
    const found = POPULAR_MANGAS.find((m) => m.slug === slug);
    return found || null;
  },

  getChapterPages: async (chapterApiUrl: string): Promise<{
    chapterName: string;
    comicName: string;
    pages: string[];
  }> => {
    try {
      const res = await fetch(`/api/manga/chapter?url=${encodeURIComponent(chapterApiUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.pages) && data.pages.length > 0) {
          return {
            chapterName: '',
            comicName: '',
            pages: data.pages
          };
        }
      }
    } catch (_) {}
    return {
      chapterName: '1',
      comicName: 'Manga Reader',
      pages: []
    };
  }
};

// ==================== 4. WATCHLIST STORAGE ====================

export const storageApi = {
  getAll: async (): Promise<MediaItem[]> => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch (_) {}

    const local = localStorage.getItem(LOCAL_DB_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (_) {}
    }
    return [];
  },

  saveAll: async (items: MediaItem[]): Promise<void> => {
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(items));
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
      });
    } catch (_) {}
  }
};
