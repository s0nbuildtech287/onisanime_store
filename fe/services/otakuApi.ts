import {
  AnimeCardItem,
  AnimeEpisode,
  AnimeRelationItem,
  MangaCardItem,
  MediaItem,
  NewsArticleItem,
  NewsContentBlock,
  ScheduleAnimeItem,
  StreamServerGroup,
  WatchHistoryItem
} from '../types';

const PHIM_API_BASE = 'https://phimapi.com';
const NGUONC_API_BASE = 'https://phim.nguonc.com';
const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';
const LOCAL_DB_KEY = 'onisanime_db_v1';
const WATCH_HISTORY_KEY = 'onisanime_watch_history_v1';

export function formatPhimImg(url?: string): string {
  if (!url) return 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-gHSraOSa0nBG.jpg';
  if (url.startsWith('http')) return url;
  return `https://phimimg.com/${url.replace(/^\//, '')}`;
}

// ==================== 0. ANILIST GRAPHQL ENGINE (CHUẨN OTAKU) ====================

async function queryAniList(query: string, variables: Record<string, any> = {}) {
  const res = await fetch(ANILIST_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  return await res.json();
}

export const anilistApi = {
  // Lấy danh sách Anime theo Dạng phim, Mùa, Năm, Thể loại, Tag (Isekai/Harem), BXH Top
  getFilteredAnime: async (params: {
    page?: number;
    perPage?: number;
    format?: string;     // 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL' | 'all'
    season?: string;     // 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | 'all'
    seasonYear?: string; // '2026' | '2025' ... | 'all'
    genre?: string;      // 'Action' | 'Fantasy' ... | 'all'
    tag?: string;        // 'Isekai' | 'Harem' ... | 'all'
    sort?: string;       // 'TRENDING_DESC' | 'SCORE_DESC' | 'POPULARITY_DESC' | 'FAVOURITES_DESC'
    search?: string;
  }): Promise<{ items: AnimeCardItem[]; totalPages: number }> => {
    try {
      const variables: Record<string, any> = {
        page: params.page || 1,
        perPage: params.perPage || 24,
        sort: [params.sort || 'TRENDING_DESC']
      };

      if (params.format && params.format !== 'all') variables.format = params.format;
      if (params.season && params.season !== 'all') variables.season = params.season;
      if (params.seasonYear && params.seasonYear !== 'all') variables.seasonYear = parseInt(params.seasonYear, 10);
      if (params.genre && params.genre !== 'all') variables.genre = params.genre;
      if (params.tag && params.tag !== 'all') variables.tag = params.tag;
      if (params.search && params.search.trim()) {
        variables.search = params.search.trim();
        if (!params.sort || params.sort === 'TRENDING_DESC') {
          variables.sort = ['SEARCH_MATCH'];
        }
      }

      const query = `
        query (
          $page: Int,
          $perPage: Int,
          $format: MediaFormat,
          $season: MediaSeason,
          $seasonYear: Int,
          $genre: String,
          $tag: String,
          $sort: [MediaSort],
          $search: String
        ) {
          Page(page: $page, perPage: $perPage) {
            pageInfo {
              total
              lastPage
              currentPage
              hasNextPage
            }
            media(
              type: ANIME,
              isAdult: false,
              format: $format,
              season: $season,
              seasonYear: $seasonYear,
              genre: $genre,
              tag: $tag,
              sort: $sort,
              search: $search
            ) {
              id
              idMal
              format
              season
              seasonYear
              episodes
              averageScore
              genres
              synonyms
              description(asHtml: false)
              title {
                romaji
                english
                native
              }
              coverImage {
                extraLarge
                large
              }
              bannerImage
              studios(isMain: true) {
                nodes {
                  name
                }
              }
              trailer {
                id
                site
              }
              nextAiringEpisode {
                airingAt
                episode
                timeUntilAiring
              }
            }
          }
        }
      `;

      const json = await queryAniList(query, variables);
      const pageData = json?.data?.Page;
      const rawList = pageData?.media || [];

      const items: AnimeCardItem[] = rawList.map((m: any) => {
        const displayTitle = m.title?.english || m.title?.romaji || 'Anime';
        const romaji = m.title?.romaji;
        const score = m.averageScore ? Math.round((m.averageScore / 10) * 10) / 10 : 8.5;
        const epText = m.nextAiringEpisode
          ? `Tập ${m.nextAiringEpisode.episode - 1} • Còn ${Math.max(1, Math.floor(m.nextAiringEpisode.timeUntilAiring / 86400))} ngày`
          : m.episodes
          ? `${m.episodes} Tập`
          : m.format || 'TV';

        return {
          id: `anilist_${m.id}`,
          slug: '', // Sẽ được Smart Matcher đối chiếu sang KKPhim/NguonC khi bấm xem
          anilistId: m.id,
          malId: m.idMal,
          title: displayTitle,
          originTitle: romaji,
          posterUrl: m.coverImage?.extraLarge || m.coverImage?.large || '',
          bannerUrl: m.bannerImage || m.coverImage?.extraLarge || '',
          year: m.seasonYear || 2026,
          season: m.season,
          format: m.format,
          episodeCurrent: epText,
          totalEpisodes: m.episodes,
          malScore: score,
          genres: m.genres || [],
          synopsis: (m.description || '').replace(/<[^>]+>/g, ''),
          studios: (m.studios?.nodes || []).map((s: any) => s.name),
          synonyms: m.synonyms || [],
          trailerUrl: m.trailer?.site === 'youtube' && m.trailer?.id ? `https://www.youtube.com/embed/${m.trailer.id}` : undefined,
          nextAiring: m.nextAiringEpisode || undefined,
          source: 'anilist'
        };
      });

      return {
        items,
        totalPages: pageData?.pageInfo?.lastPage || 50
      };
    } catch (err) {
      console.warn('AniList filter error:', err);
      return { items: [], totalPages: 1 };
    }
  },

  // Lấy thông tin cơ bản của 1 bộ Anime theo anilistId (hỗ trợ share link ?watch=anilist_...)
  getAnimeById: async (anilistId: number): Promise<AnimeCardItem | null> => {
    try {
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            format
            seasonYear
            episodes
            averageScore
            genres
            synonyms
            description(asHtml: false)
            title { romaji english native }
            coverImage { extraLarge large }
            bannerImage
            studios(isMain: true) { nodes { name } }
            trailer { id site }
          }
        }
      `;
      const json = await queryAniList(query, { id: anilistId });
      const m = json?.data?.Media;
      if (!m) return null;
      return {
        id: `anilist_${m.id}`,
        slug: '',
        anilistId: m.id,
        title: m.title?.english || m.title?.romaji || 'Anime',
        originTitle: m.title?.romaji,
        posterUrl: m.coverImage?.extraLarge || m.coverImage?.large || '',
        bannerUrl: m.bannerImage || m.coverImage?.extraLarge || '',
        year: m.seasonYear,
        format: m.format,
        malScore: m.averageScore ? Math.round((m.averageScore / 10) * 10) / 10 : 8.5,
        genres: m.genres || [],
        synopsis: (m.description || '').replace(/<[^>]+>/g, ''),
        studios: (m.studios?.nodes || []).map((s: any) => s.name),
        synonyms: m.synonyms || [],
        trailerUrl: m.trailer?.site === 'youtube' && m.trailer?.id ? `https://www.youtube.com/embed/${m.trailer.id}` : undefined,
        source: 'anilist'
      };
    } catch (_) {
      return null;
    }
  },

  // Lấy Chi tiết & Các Phần Liên Quan (Season 1 -> Movie -> Season 2)
  getAnimeRelations: async (anilistId: number): Promise<{
    relations: AnimeRelationItem[];
    studios: string[];
    trailerUrl?: string;
  }> => {
    try {
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            studios(isMain: true) {
              nodes { name }
            }
            trailer { id site }
            relations {
              edges {
                relationType
                node {
                  id
                  type
                  format
                  seasonYear
                  averageScore
                  title { romaji english }
                  coverImage { large }
                  bannerImage
                }
              }
            }
          }
        }
      `;
      const json = await queryAniList(query, { id: anilistId });
      const media = json?.data?.Media;
      if (!media) return { relations: [], studios: [] };

      const allowedTypes = ['PREQUEL', 'SEQUEL', 'SIDE_STORY', 'PARENT', 'SPIN_OFF'];
      const labelMap: Record<string, string> = {
        PREQUEL: 'Phần trước',
        SEQUEL: 'Phần tiếp theo',
        SIDE_STORY: 'Ngoại truyện',
        PARENT: 'Bản gốc',
        SPIN_OFF: 'Spin-off'
      };

      const relations: AnimeRelationItem[] = (media.relations?.edges || [])
        .filter((e: any) => e.node?.type === 'ANIME' && allowedTypes.includes(e.relationType))
        .map((e: any) => ({
          id: e.node.id,
          relationType: labelMap[e.relationType] || e.relationType,
          title: e.node.title?.english || e.node.title?.romaji || '',
          englishTitle: e.node.title?.romaji,
          format: e.node.format,
          posterUrl: e.node.coverImage?.large || '',
          bannerUrl: e.node.bannerImage || e.node.coverImage?.large || '',
          year: e.node.seasonYear,
          score: e.node.averageScore ? Math.round((e.node.averageScore / 10) * 10) / 10 : undefined
        }));

      return {
        relations,
        studios: (media.studios?.nodes || []).map((s: any) => s.name),
        trailerUrl: media.trailer?.site === 'youtube' && media.trailer?.id
          ? `https://www.youtube.com/embed/${media.trailer.id}`
          : undefined
      };
    } catch (_) {
      return { relations: [], studios: [] };
    }
  },

  // Lịch chiếu Simulcast thật 7 ngày trong tuần theo múi giờ Việt Nam
  getRealWeeklySchedule: async (dayIndex: number = 0): Promise<ScheduleAnimeItem[]> => {
    try {
      // dayIndex: 0 = Thứ 2 (Monday) ... 6 = Chủ nhật (Sunday)
      const now = new Date();
      const currentDayJs = now.getDay(); // 0=CN, 1=T2 ... 6=T7
      const currentMonIdx = currentDayJs === 0 ? 6 : currentDayJs - 1;
      const diffDays = dayIndex - currentMonIdx;

      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + diffDays);
      targetDate.setHours(0, 0, 0, 0);

      const startTs = Math.floor(targetDate.getTime() / 1000);
      const endTs = startTs + 86400;

      const query = `
        query ($start: Int, $end: Int) {
          Page(page: 1, perPage: 30) {
            airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
              airingAt
              episode
              timeUntilAiring
              media {
                id
                idMal
                isAdult
                format
                seasonYear
                episodes
                averageScore
                genres
                description(asHtml: false)
                title { romaji english native }
                coverImage { large }
                bannerImage
              }
            }
          }
        }
      `;

      const json = await queryAniList(query, { start: startTs, end: endTs });
      const schedules = json?.data?.Page?.airingSchedules || [];

      return schedules
        .filter((s: any) => s.media && !s.media.isAdult)
        .map((s: any) => {
          const m = s.media;
          const airDate = new Date(s.airingAt * 1000);
          const hh = String(airDate.getHours()).padStart(2, '0');
          const mm = String(airDate.getMinutes()).padStart(2, '0');

          return {
            mal_id: m.idMal || m.id,
            anilistId: m.id,
            title: m.title?.english || m.title?.romaji || 'Anime',
            title_english: m.title?.romaji,
            title_japanese: m.title?.native,
            format: m.format,
            images: {
              jpg: { large_image_url: m.coverImage?.large || '' },
              webp: { large_image_url: m.coverImage?.large || '' }
            },
            bannerUrl: m.bannerImage || m.coverImage?.large || '',
            score: m.averageScore ? Math.round((m.averageScore / 10) * 10) / 10 : undefined,
            episodes: m.episodes,
            airingEpisode: s.episode,
            airingAt: s.airingAt,
            timeUntilAiring: s.timeUntilAiring,
            broadcast: {
              time: `${hh}:${mm} (VN)`
            },
            synopsis: (m.description || '').replace(/<[^>]+>/g, ''),
            year: m.seasonYear,
            genres: (m.genres || []).map((g: string) => ({ name: g }))
          };
        });
    } catch (err) {
      console.warn('AniList real schedule error:', err);
      return [];
    }
  }
};

// ==================== 1. ANIME DISCOVERY & FILTER ENGINE ====================

export const animeApi = {
  // Tìm kiếm hợp nhất SONG SONG trên cả Server 1 + Server 2 + AniList
  searchAllSources: async (
    keyword: string,
    page: number = 1
  ): Promise<{ items: AnimeCardItem[]; totalPages: number }> => {
    const trimmed = keyword.trim();
    if (!trimmed) return { items: [], totalPages: 1 };

    const encodedKw = encodeURIComponent(trimmed);
    const hasVietnameseAccents = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(trimmed);

    const [kkRes, nguoncRes, anilistRes] = await Promise.allSettled([
      fetch(`${PHIM_API_BASE}/v1/api/tim-kiem?keyword=${encodedKw}&page=${page}`).then((r) => r.json()),
      fetch(`${NGUONC_API_BASE}/api/films/search?keyword=${encodedKw}&page=${page}`).then((r) => r.json()),
      !hasVietnameseAccents
        ? anilistApi.getFilteredAnime({ search: trimmed, page, perPage: 16 })
        : Promise.resolve({ items: [], totalPages: 1 })
    ]);

    const combined: AnimeCardItem[] = [];
    const seenSlugs = new Set<string>();
    const seenTitles = new Set<string>();

    const normalizeKey = (s?: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

    let maxTotalPages = 1;

    // 1. Kết quả từ Server 1 (KKPhim) - Ưu tiên Hoạt hình lên trước
    if (kkRes.status === 'fulfilled' && Array.isArray(kkRes.value?.data?.items)) {
      maxTotalPages = Math.max(maxTotalPages, kkRes.value?.data?.params?.pagination?.totalPages || 1);
      const rawKK = [...kkRes.value.data.items].sort((a: any, b: any) => {
        const aAnime = a.type === 'hoathinh' ? 1 : 0;
        const bAnime = b.type === 'hoathinh' ? 1 : 0;
        return bAnime - aAnime;
      });
      for (const m of rawKK) {
        if (!m.slug) continue;
        seenSlugs.add(m.slug);
        seenTitles.add(normalizeKey(m.name));
        if (m.origin_name) seenTitles.add(normalizeKey(m.origin_name));
        combined.push({
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
          format: m.type === 'hoathinh' ? 'ANIME' : undefined,
          source: 'kkphim'
        });
      }
    }

    // 2. Kết quả từ Server 2 (NguonC) - Bổ sung các phim chỉ Server 2 mới có
    if (nguoncRes.status === 'fulfilled' && Array.isArray(nguoncRes.value?.items)) {
      maxTotalPages = Math.max(maxTotalPages, nguoncRes.value?.paginate?.total_page || 1);
      for (const m of nguoncRes.value.items) {
        const normTitle = normalizeKey(m.name);
        const normOrig = normalizeKey(m.original_name);
        if ((m.slug && seenSlugs.has(m.slug)) || (normTitle && seenTitles.has(normTitle))) {
          continue;
        }
        if (m.slug) seenSlugs.add(m.slug);
        if (normTitle) seenTitles.add(normTitle);
        if (normOrig) seenTitles.add(normOrig);
        combined.push({
          id: m.id || m.slug,
          slug: m.slug,
          title: m.name,
          originTitle: m.original_name,
          posterUrl: m.poster_url || m.thumb_url,
          bannerUrl: m.thumb_url || m.poster_url,
          year: m.year || 2026,
          episodeCurrent: m.current_episode || 'FHD',
          quality: m.quality || 'FHD 1080p',
          lang: m.language || 'Vietsub',
          country: 'Anime',
          malScore: 8.5,
          synopsis: m.description,
          genres: ['Vietsub'],
          source: 'nguonc'
        });
      }
    }

    // 3. Kết quả từ AniList (nếu từ khóa tiếng Anh/Romaji)
    if (anilistRes.status === 'fulfilled' && Array.isArray(anilistRes.value?.items)) {
      maxTotalPages = Math.max(maxTotalPages, anilistRes.value.totalPages || 1);
      for (const m of anilistRes.value.items) {
        const normTitle = normalizeKey(m.title);
        const normOrig = normalizeKey(m.originTitle);
        if (seenTitles.has(normTitle) || (normOrig && seenTitles.has(normOrig))) {
          continue;
        }
        combined.push(m);
      }
    }

    return {
      items: combined,
      totalPages: maxTotalPages
    };
  },

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
      // 1. Nếu có từ khóa tìm kiếm -> Dùng Tìm kiếm hợp nhất đa nguồn
      if (params.keyword && params.keyword.trim()) {
        return await animeApi.searchAllSources(params.keyword.trim(), page);
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
              sourceLabel: '🇻🇳 Server 1',
              serverName: `Server 1 • ${s.server_name}`,
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
                  sourceLabel: '🇻🇳 Server 1',
                  serverName: `Server 1 • ${s.server_name}`,
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
          sourceLabel: '⚡ Server 2',
          serverName: `Server 2 • ${s.server_name}`,
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

// Helper rút gọn tên (bỏ "Season 2", "2nd Season", "Part 2"...) để dễ khớp trên KKPhim/NguonC
function simplifyAnimeTitle(title: string): string {
  return title
    .replace(/\(.*?\)/g, '')
    .replace(/\b(season|part|cour)\s*\d+\b/gi, '')
    .replace(/\b\d+(st|nd|rd|th)\s+season\b/gi, '')
    .replace(/[:\-–].*$/, '')
    .trim();
}

export async function resolveMultiServerStreams(target: {
  slug?: string;
  title: string;
  originTitle?: string;
  synonyms?: string[];
  customSearchKeyword?: string;
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
  let primaryInfo: any = null;
  let allServers: StreamServerGroup[] = [];

  // Nếu người dùng nhập tay từ khóa tìm lại trong player
  if (target.customSearchKeyword && target.customSearchKeyword.trim()) {
    const kw = target.customSearchKeyword.trim();
    const [kkRes, nguoncRes] = await Promise.all([
      fetchKKPhimStream(undefined, kw),
      fetchNguonCStream(undefined, kw)
    ]);
    allServers = [...kkRes.servers, ...nguoncRes.servers];
    primaryInfo = kkRes.movieInfo || nguoncRes.movieInfo;
  } else {
    // 1. Quét ưu tiên theo slug & title + originTitle
    const searchQuery = target.originTitle || target.title;
    const [kkRes, nguoncRes] = await Promise.all([
      fetchKKPhimStream(target.slug, target.title),
      fetchNguonCStream(target.slug, searchQuery)
    ]);
    allServers = [...kkRes.servers, ...nguoncRes.servers];
    primaryInfo = kkRes.movieInfo || nguoncRes.movieInfo;

    // 2. Nếu chưa ra, thử dò lần lượt theo các từ khóa biến thể (originTitle, synonyms, tên rút gọn)
    if (allServers.length === 0) {
      const candidateTitles = Array.from(
        new Set(
          [
            target.originTitle,
            simplifyAnimeTitle(target.title),
            target.originTitle ? simplifyAnimeTitle(target.originTitle) : undefined,
            ...(target.synonyms || []).filter((s) => /^[a-zA-Z0-9\s\-:!'.,]+$/.test(s)).slice(0, 2)
          ].filter((t): t is string => !!t && t.length >= 2)
        )
      );

      for (const kw of candidateTitles) {
        if (allServers.length > 0) break;
        const [kk2, nguonc2] = await Promise.all([
          fetchKKPhimStream(undefined, kw),
          fetchNguonCStream(undefined, kw)
        ]);
        if (kk2.servers.length > 0 || nguonc2.servers.length > 0) {
          allServers = [...kk2.servers, ...nguonc2.servers];
          primaryInfo = kk2.movieInfo || nguonc2.movieInfo;
          break;
        }
      }
    }
  }

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
    slug: 'one-piece-128',
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
    slug: 'solo-leveling-ragnarok-25356',
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
    slug: 'jujutsu-kaisen-chu-thuat-hoi-chien-5058',
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
    slug: 'sousou-no-frieren-10247',
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
    slug: 'conan-25867',
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
    slug: 'chainsaw-man-25908',
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
        if (data && data.title && Array.isArray(data.chapters) && data.chapters.length > 0) {
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

// ==================== 3.5 NEWS CRAWLER API ====================

export const newsApi = {
  async getNewsList(
    region: 'all' | 'vn' | 'global' = 'all',
    keyword = ''
  ): Promise<NewsArticleItem[]> {
    try {
      const qs = new URLSearchParams({ region });
      if (keyword.trim()) qs.set('keyword', keyword.trim());
      const res = await fetch(`/api/news/list?${qs.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.items) ? data.items : [];
    } catch {
      return [];
    }
  },

  async getArticleDetail(
    url: string
  ): Promise<{ title?: string; sapo?: string; blocks: NewsContentBlock[] }> {
    try {
      const res = await fetch(`/api/news/detail?url=${encodeURIComponent(url)}`);
      if (!res.ok) return { blocks: [] };
      const data = await res.json();
      return {
        title: data?.title || '',
        sapo: data?.sapo || '',
        blocks: Array.isArray(data?.blocks) ? data.blocks : []
      };
    } catch {
      return { blocks: [] };
    }
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

// ==================== 5. WATCH PROGRESS & HISTORY ====================

export const watchHistoryApi = {
  getAll: (): WatchHistoryItem[] => {
    try {
      const raw = localStorage.getItem(WATCH_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) : [];
    } catch (_) {
      return [];
    }
  },

  getItem: (keyOrTitle: string): WatchHistoryItem | undefined => {
    const list = watchHistoryApi.getAll();
    const low = keyOrTitle.toLowerCase();
    return list.find((h) => h.id === keyOrTitle || h.slug === keyOrTitle || h.title.toLowerCase() === low);
  },

  saveProgress: (entry: Omit<WatchHistoryItem, 'watchedEpisodes' | 'updatedAt'> & { episodeName: string }) => {
    const list = watchHistoryApi.getAll();
    const idx = list.findIndex(
      (h) => h.id === entry.id || (entry.slug && h.slug === entry.slug) || h.title.toLowerCase() === entry.title.toLowerCase()
    );
    const prevWatched = idx >= 0 ? list[idx].watchedEpisodes || [] : [];
    const watchedSet = Array.from(new Set([...prevWatched, entry.episodeName]));

    const updated: WatchHistoryItem = {
      ...entry,
      watchedEpisodes: watchedSet,
      updatedAt: Date.now()
    };

    const nextList = [updated, ...list.filter((_, i) => i !== idx)].slice(0, 24);
    try {
      localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(nextList));
    } catch (_) {}
    return nextList;
  },

  remove: (id: string) => {
    const list = watchHistoryApi.getAll().filter((h) => h.id !== id);
    try {
      localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(list));
    } catch (_) {}
    return list;
  }
};
