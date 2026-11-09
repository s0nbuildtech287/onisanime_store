export enum MediaCategory {
  ANIME = 'Anime',
  DONGHUA = 'Hoạt Hình 3D (Donghua)',
  MANGA = 'Manga',
  MANHWA = 'Manhwa/Manhua'
}

export enum MediaStatus {
  WATCHING = 'Đang xem',
  COMPLETED = 'Hoàn thành',
  PLAN_TO_WATCH = 'Dự định xem',
  ON_HOLD = 'Tạm dừng',
  DROPPED = 'Bỏ dở'
}

export interface AnimeEpisode {
  name: string;
  slug: string;
  link_embed: string;
  link_m3u8?: string;
  filename?: string;
}

export interface StreamServerGroup {
  sourceId: 'kkphim' | 'ophim' | 'nguonc' | 'hianime';
  sourceLabel: string;
  serverName: string;
  badgeColor: string;
  episodes: AnimeEpisode[];
}

export interface AnimeCardItem {
  id: string;
  slug: string;
  title: string;
  originTitle?: string;
  posterUrl: string;
  bannerUrl?: string;
  year?: number | string;
  episodeCurrent?: string;
  quality?: string;
  lang?: string;
  country?: string;
  malScore?: number;
  genres?: string[];
  synopsis?: string;
  source?: 'kkphim' | 'ophim' | 'anilist' | 'jikan';
  malId?: number;
  anilistId?: number;
  trailerUrl?: string;
}

export interface MangaChapterItem {
  filename: string;
  chapter_name: string;
  chapter_title: string;
  chapter_api_data: string;
}

export interface MangaCardItem {
  id: string;
  slug: string;
  title: string;
  originTitle?: string;
  thumbUrl: string;
  status?: string;
  latestChapter?: string;
  updatedAt?: string;
  genres?: string[];
  author?: string[];
  description?: string;
  chapters?: MangaChapterItem[];
}

export interface ScheduleAnimeItem {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  images: {
    jpg: { large_image_url?: string; image_url?: string };
    webp?: { large_image_url?: string; image_url?: string };
  };
  score?: number;
  episodes?: number;
  broadcast?: {
    day?: string;
    time?: string;
    string?: string;
  };
  synopsis?: string;
  year?: number;
  genres?: Array<{ name: string }>;
  trailer?: { embed_url?: string; url?: string };
}

export interface MediaItem {
  id: string;
  title: string;
  originTitle?: string;
  category: MediaCategory | string;
  status: MediaStatus;
  rating: number;
  description: string;
  imageUrl: string;
  bannerUrl?: string;
  movieUrl?: string;
  topOrder?: number;
  genres: string[];
  createdAt: number;
  notes?: string;
  slug?: string;
  releaseYear?: number | string;
  malScore?: number;
  currentProgress?: string;
  username?: string;
}

export type AppTab = 'anime' | 'schedule' | 'manga' | 'watchlist' | 'ranking';

