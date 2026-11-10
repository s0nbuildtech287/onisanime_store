import React, { useState, useEffect } from 'react';
import {
  Play,
  BookOpen,
  Calendar,
  Bookmark,
  Trophy,
  Search,
  Sparkles,
  Flame,
  Star,
  Check,
  Tv,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Crown,
  Server,
  Compass,
  Clock,
  RotateCcw,
  History
} from 'lucide-react';
import {
  AnimeCardItem,
  AppTab,
  MangaCardItem,
  MediaCategory,
  MediaItem,
  MediaStatus,
  ScheduleAnimeItem,
  WatchHistoryItem
} from './types';
import {
  anilistApi,
  animeApi,
  mangaApi,
  storageApi,
  watchHistoryApi
} from './services/otakuApi';
import AnimePlayerModal, { PlayerTargetAnime } from './components/AnimePlayerModal';
import MangaReaderModal from './components/MangaReaderModal';

const WEEKDAYS = [
  { id: 'monday', label: 'Thứ 2' },
  { id: 'tuesday', label: 'Thứ 3' },
  { id: 'wednesday', label: 'Thứ 4' },
  { id: 'thursday', label: 'Thứ 5' },
  { id: 'friday', label: 'Thứ 6' },
  { id: 'saturday', label: 'Thứ 7' },
  { id: 'sunday', label: 'Chủ Nhật' }
];

const ANIME_FORMATS = [
  { id: 'all', label: 'Tất cả dạng' },
  { id: 'TV', label: '📺 Anime Bộ (TV)' },
  { id: 'MOVIE', label: '🎬 Chiếu Rạp (Movie)' },
  { id: 'OVA', label: '💿 OVA' },
  { id: 'ONA', label: '🌐 ONA' },
  { id: 'SPECIAL', label: '✨ Special' }
];

const ANIME_SEASONS = [
  { id: 'all', label: 'Tất cả mùa' },
  { id: 'WINTER', label: '❄️ Đông (Winter)' },
  { id: 'SPRING', label: '🌸 Xuân (Spring)' },
  { id: 'SUMMER', label: '☀️ Hạ (Summer)' },
  { id: 'FALL', label: '🍁 Thu (Fall)' }
];

const ANIME_SORTS = [
  { id: 'TRENDING_DESC', label: '🔥 Đang Thịnh Hành' },
  { id: 'SCORE_DESC', label: '⭐ Điểm Cao Nhất (Top)' },
  { id: 'POPULARITY_DESC', label: '👁️ Phổ Biến Nhất' },
  { id: 'FAVOURITES_DESC', label: '❤️ Yêu Thích Nhất' }
];

const ANIME_GENRES = [
  { id: 'all', label: 'Tất cả thể loại', isTag: false },
  { id: 'Action', label: 'Hành Động (Action)', isTag: false },
  { id: 'Adventure', label: 'Phiêu Lưu (Adventure)', isTag: false },
  { id: 'Isekai', label: 'Chuyển Sinh (Isekai)', isTag: true },
  { id: 'Fantasy', label: 'Phép Thuật (Fantasy)', isTag: false },
  { id: 'Romance', label: 'Tình Cảm (Romance)', isTag: false },
  { id: 'Comedy', label: 'Hài Hước (Comedy)', isTag: false },
  { id: 'Harem', label: 'Harem', isTag: true },
  { id: 'Ecchi', label: 'Ecchi', isTag: false },
  { id: 'Slice of Life', label: 'Đời Thường (Slice of Life)', isTag: false },
  { id: 'Psychological', label: 'Tâm Lý (Psychological)', isTag: false },
  { id: 'Mecha', label: 'Người Máy (Mecha)', isTag: false },
  { id: 'Mystery', label: 'Bí Ẩn (Mystery)', isTag: false },
  { id: 'Sports', label: 'Thể Thao (Sports)', isTag: false },
  { id: 'Supernatural', label: 'Siêu Nhiên', isTag: false }
];

function formatCountdown(seconds?: number): string {
  if (!seconds || seconds <= 0) return 'Đã phát sóng';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `Còn ${days} ngày ${hours}g`;
  if (hours > 0) return `Còn ${hours}g ${mins}p`;
  return `Còn ${mins} phút`;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('anime');
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  // Chế độ duyệt Anime: 'anilist' (Chuẩn Otaku TV/Movie/Season/Top) hoặc 'vn' (KKPhim/NguonC + Donghua 3D)
  const [animeBrowseMode, setAnimeBrowseMode] = useState<'anilist' | 'vn'>('anilist');

  // Bộ lọc AniList Hub (Chuẩn AnimeVietsub)
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('TRENDING_DESC');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Bộ lọc nguồn VN trực tiếp (Donghua / KKPhim / NguonC)
  const [selectedCountry, setSelectedCountry] = useState<'all' | 'nhat-ban' | 'trung-quoc'>('all');
  const [selectedSource, setSelectedSource] = useState<'kkphim' | 'nguonc'>('kkphim');

  // Anime List & Hero Carousel
  const [animeList, setAnimeList] = useState<AnimeCardItem[]>([]);
  const [loadingAnime, setLoadingAnime] = useState(false);
  const [animePage, setAnimePage] = useState(1);
  const [animeTotalPages, setAnimeTotalPages] = useState(1);
  const [heroIdx, setHeroIdx] = useState(0);

  // Continue Watching History
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>(() => watchHistoryApi.getAll());

  // Schedule Tab States (Simulcast thật theo ngày)
  const [scheduleDay, setScheduleDay] = useState<string>(() => {
    const jsDay = new Date().getDay();
    const mapIdx = jsDay === 0 ? 6 : jsDay - 1;
    return WEEKDAYS[mapIdx]?.id || 'monday';
  });
  const [scheduleList, setScheduleList] = useState<ScheduleAnimeItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Manga Tab States
  const [mangaList, setMangaList] = useState<MangaCardItem[]>([]);
  const [loadingManga, setLoadingManga] = useState(false);
  const [mangaPage, setMangaPage] = useState(1);
  const [mangaTotalPages, setMangaTotalPages] = useState(1);
  const [mangaType, setMangaType] = useState<string>('truyen-moi');

  // Watchlist / Readlist States
  const [watchlist, setWatchlist] = useState<MediaItem[]>([]);

  // Ranking Podium Tab States (Live Data Toàn Cầu cho cả Anime & Manga)
  const [rankingMedia, setRankingMedia] = useState<'anime' | 'manga'>('anime');
  const [rankingAnimeType, setRankingAnimeType] = useState<'TRENDING_DESC' | 'SCORE_DESC' | 'FAVOURITES_DESC'>('TRENDING_DESC');
  const [rankingMangaType, setRankingMangaType] = useState<'top-month' | 'top-all' | 'top-follow'>('top-month');
  const [rankingAnimeItems, setRankingAnimeItems] = useState<AnimeCardItem[]>([]);
  const [rankingMangaItems, setRankingMangaItems] = useState<MangaCardItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);

  // Active Modals
  const [playingAnime, setPlayingAnime] = useState<PlayerTargetAnime | null>(null);
  const [readingMangaSlug, setReadingMangaSlug] = useState<string | null>(null);

  // Load Watchlist
  useEffect(() => {
    storageApi.getAll().then(setWatchlist);
  }, []);

  // Load Live Global Ranking Data (Anime hoặc Manga)
  useEffect(() => {
    if (activeTab !== 'ranking') return;
    setLoadingRanking(true);
    if (rankingMedia === 'anime') {
      anilistApi
        .getFilteredAnime({ page: 1, perPage: 24, sort: rankingAnimeType })
        .then((res) => setRankingAnimeItems(res.items))
        .finally(() => setLoadingRanking(false));
    } else {
      mangaApi
        .getMangaList({ type: rankingMangaType, page: 1 })
        .then((res) => setRankingMangaItems(res.items.slice(0, 24)))
        .finally(() => setLoadingRanking(false));
    }
  }, [activeTab, rankingMedia, rankingAnimeType, rankingMangaType]);

  // Load Anime List (Tìm kiếm hợp nhất đa nguồn hoặc duyệt theo Bộ lọc)
  useEffect(() => {
    if (activeTab !== 'anime') return;
    setLoadingAnime(true);
    setHeroIdx(0);

    if (submittedSearch && submittedSearch.trim()) {
      animeApi
        .searchAllSources(submittedSearch.trim(), animePage)
        .then((res) => {
          setAnimeList(res.items);
          setAnimeTotalPages(res.totalPages);
        })
        .finally(() => setLoadingAnime(false));
      return;
    }

    if (animeBrowseMode === 'anilist') {
      const genreObj = ANIME_GENRES.find((g) => g.id === selectedGenre);
      anilistApi
        .getFilteredAnime({
          page: animePage,
          perPage: 24,
          format: selectedFormat,
          season: selectedSeason,
          seasonYear: selectedYear,
          genre: genreObj && !genreObj.isTag ? genreObj.id : 'all',
          tag: genreObj && genreObj.isTag ? genreObj.id : 'all',
          sort: selectedSort
        })
        .then((res) => {
          setAnimeList(res.items);
          setAnimeTotalPages(res.totalPages);
        })
        .finally(() => setLoadingAnime(false));
    } else {
      animeApi
        .getAnimeList({
          page: animePage,
          country: selectedCountry,
          year: selectedYear,
          source: selectedSource
        })
        .then((res) => {
          setAnimeList(res.items);
          setAnimeTotalPages(res.totalPages);
        })
        .finally(() => setLoadingAnime(false));
    }
  }, [
    activeTab,
    animeBrowseMode,
    animePage,
    selectedFormat,
    selectedSeason,
    selectedYear,
    selectedSort,
    selectedGenre,
    selectedCountry,
    selectedSource,
    submittedSearch
  ]);

  // Auto-rotate Hero Carousel (5 slides)
  useEffect(() => {
    if (activeTab !== 'anime' || animeList.length < 2 || submittedSearch) return;
    const timer = setInterval(() => {
      setHeroIdx((i) => (i + 1) % Math.min(5, animeList.length));
    }, 6500);
    return () => clearInterval(timer);
  }, [activeTab, animeList, submittedSearch]);

  // Load Weekly Schedule (Real Simulcast từ AniList + fallback KKPhim)
  useEffect(() => {
    if (activeTab !== 'schedule') return;
    setLoadingSchedule(true);
    const dayIdx = WEEKDAYS.findIndex((d) => d.id === scheduleDay);
    const safeIdx = dayIdx >= 0 ? dayIdx : 0;

    anilistApi
      .getRealWeeklySchedule(safeIdx)
      .then(async (realItems) => {
        if (realItems.length > 0) {
          setScheduleList(realItems);
        } else {
          const fallback = await animeApi.getWeeklySchedule(safeIdx);
          setScheduleList(fallback);
        }
      })
      .finally(() => setLoadingSchedule(false));
  }, [activeTab, scheduleDay]);

  // Load Manga List
  useEffect(() => {
    if (activeTab !== 'manga') return;
    setLoadingManga(true);
    mangaApi
      .getMangaList({
        type: mangaType,
        page: mangaPage,
        keyword: submittedSearch
      })
      .then((res) => {
        setMangaList(res.items);
        setMangaTotalPages(res.totalPages);
      })
      .finally(() => setLoadingManga(false));
  }, [activeTab, mangaType, mangaPage, submittedSearch]);

  const handleSaveToWatchlist = (item: MediaItem) => {
    setWatchlist((prev) => {
      const exists = prev.some(
        (i) => (item.slug && i.slug === item.slug) || i.title === item.title
      );
      const next = exists
        ? prev.map((i) =>
            (item.slug && i.slug === item.slug) || i.title === item.title ? item : i
          )
        : [item, ...prev];
      storageApi.saveAll(next);
      return next;
    });
  };

  const handleRemoveFromWatchlist = (id: string) => {
    setWatchlist((prev) => {
      const next = prev.filter((i) => i.id !== id);
      storageApi.saveAll(next);
      return next;
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAnimePage(1);
    setMangaPage(1);
    setSubmittedSearch(searchQuery);
    if (activeTab !== 'anime' && activeTab !== 'manga') {
      setActiveTab('anime');
    }
  };

  const handleResetAnimeFilters = () => {
    setSelectedFormat('all');
    setSelectedSeason('all');
    setSelectedYear('all');
    setSelectedSort('TRENDING_DESC');
    setSelectedGenre('all');
    setSelectedCountry('all');
    setSearchQuery('');
    setSubmittedSearch('');
    setAnimePage(1);
  };

  const openAnimePlayer = (anime: AnimeCardItem) => {
    setPlayingAnime({
      slug: anime.slug || undefined,
      anilistId: anime.anilistId,
      title: anime.title,
      originTitle: anime.originTitle,
      synonyms: anime.synonyms,
      posterUrl: anime.posterUrl,
      bannerUrl: anime.bannerUrl,
      synopsis: anime.synopsis,
      year: anime.year,
      malScore: anime.malScore,
      studios: anime.studios,
      trailerUrl: anime.trailerUrl
    });
  };

  const heroSlides = animeList.slice(0, 5);
  const featuredAnime = heroSlides[heroIdx] || animeList[0];

  return (
    <div className="min-h-screen bg-[#06070d] text-slate-100 flex flex-col">
      {/* ================= HEADER & NAVIGATION ================= */}
      <header className="sticky top-0 z-40 glass-header">
        <div className="max-w-[1750px] mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => {
              setActiveTab('anime');
              handleResetAnimeFilters();
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/25 group-hover:scale-105 transition-all">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-black tracking-tight text-white">
                  ONISANIME
                </span>
                <span className="px-2 py-0.5 rounded-md bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] font-extrabold">
                  V2 OTAKU HUB
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Siêu Nền Tảng Anime Đa Nguồn (Season • Top • TV/Movie) & Manga
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 overflow-x-auto">
            <button
              onClick={() => setActiveTab('anime')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'anime'
                  ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-lg shadow-pink-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Xem Anime</span>
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'schedule'
                  ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-lg shadow-pink-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Lịch Chiếu Tuần</span>
            </button>

            <button
              onClick={() => setActiveTab('manga')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'manga'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Đọc Manga</span>
            </button>

            <button
              onClick={() => setActiveTab('watchlist')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'watchlist'
                  ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Tủ Của Tôi ({watchlist.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ranking')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'ranking'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>BXH Podium</span>
            </button>
          </nav>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72 lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'manga'
                  ? 'Tìm truyện: One Piece, Conan, Solo Leveling...'
                  : 'Tìm Anime: Frieren, Solo Leveling, Naruto...'
              }
              className="w-full pl-10 pr-16 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSubmittedSearch('');
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white px-1"
              >
                Xóa
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 text-white text-[11px] font-bold"
            >
              Tìm
            </button>
          </form>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* 1. TAB XEM ANIME V2 (CHUẨN ANIMEVIETSUB / ANILIST HUB) */}
        {activeTab === 'anime' && (
          <div className="space-y-6">
            {/* Hero Banner Carousel (5 Slide Hot Nhất - Sáng Nét Điện Ảnh) */}
            {featuredAnime && !submittedSearch && animePage === 1 && (
              <div className="relative rounded-3xl overflow-hidden border border-white/15 min-h-[340px] sm:min-h-[420px] flex items-end p-6 sm:p-10 shadow-2xl transition-all group">
                <img
                  src={featuredAnime.bannerUrl || featuredAnime.posterUrl}
                  alt={featuredAnime.title}
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-100 transition-all duration-700"
                />
                {/* Gradient nhẹ chỉ ở mép dưới và mép trái để giữ ảnh sáng rực rỡ */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#06070d] via-[#06070d]/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#06070d]/85 via-[#06070d]/30 to-transparent sm:w-3/4" />

                <div className="relative z-10 max-w-2xl space-y-3.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-pink-500 text-white text-xs font-extrabold flex items-center gap-1 shadow-lg shadow-pink-500/30">
                      <Flame className="w-3.5 h-3.5" /> TOP #{heroIdx + 1} TRENDING
                    </span>
                    {featuredAnime.format && (
                      <span className="px-2.5 py-1 rounded-full bg-cyan-500/90 text-slate-950 text-xs font-black shadow">
                        {featuredAnime.format}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs font-bold text-amber-300">
                      ★ {featuredAnime.malScore || 8.8}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-violet-400/40 text-xs font-bold text-violet-200">
                      {featuredAnime.episodeCurrent || 'Đang phát sóng'}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight line-clamp-2">
                    {featuredAnime.title}
                  </h1>
                  {featuredAnime.originTitle && featuredAnime.originTitle !== featuredAnime.title && (
                    <p className="text-xs sm:text-sm text-pink-300 font-bold">
                      {featuredAnime.originTitle} ({featuredAnime.year || 2026})
                    </p>
                  )}
                  {featuredAnime.synopsis && (
                    <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 max-w-xl">
                      {featuredAnime.synopsis}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      onClick={() => openAnimePlayer(featuredAnime)}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white font-extrabold text-sm shadow-xl shadow-pink-500/30 transition-all hover:scale-105"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>XEM NGAY (VIETSUB)</span>
                    </button>

                    <button
                      onClick={() =>
                        handleSaveToWatchlist({
                          id: `anime_${featuredAnime.slug || featuredAnime.anilistId}`,
                          title: featuredAnime.title,
                          originTitle: featuredAnime.originTitle,
                          category: MediaCategory.ANIME,
                          status: MediaStatus.PLAN_TO_WATCH,
                          rating: featuredAnime.malScore || 9.0,
                          description: featuredAnime.synopsis || featuredAnime.originTitle || '',
                          imageUrl: featuredAnime.posterUrl,
                          bannerUrl: featuredAnime.bannerUrl,
                          genres: featuredAnime.genres || ['Anime'],
                          createdAt: Date.now(),
                          slug: featuredAnime.slug || `anilist_${featuredAnime.anilistId}`,
                          releaseYear: featuredAnime.year
                        })
                      }
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/50 hover:bg-black/70 border border-white/25 text-white font-bold text-sm backdrop-blur-md transition-all"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>+ Lưu Vào Tủ</span>
                    </button>
                  </div>
                </div>

                {/* Nút chuyển Slide + Chấm tròn */}
                {heroSlides.length > 1 && (
                  <div className="absolute bottom-5 right-6 z-20 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 mr-2">
                      <button
                        onClick={() => setHeroIdx((i) => (i - 1 + heroSlides.length) % heroSlides.length)}
                        className="p-1.5 rounded-full bg-black/60 hover:bg-pink-500 text-white border border-white/20 backdrop-blur-md transition-all"
                        title="Slide trước"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setHeroIdx((i) => (i + 1) % heroSlides.length)}
                        className="p-1.5 rounded-full bg-black/60 hover:bg-pink-500 text-white border border-white/20 backdrop-blur-md transition-all"
                        title="Slide tiếp theo"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    {heroSlides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setHeroIdx(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === heroIdx
                            ? 'w-7 bg-pink-500'
                            : 'w-2 bg-white/40 hover:bg-white/80'
                        }`}
                        title={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dải TIẾP TỤC XEM (Continue Watching) */}
            {watchHistory.length > 0 && !submittedSearch && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-pink-400" />
                    <span>TIẾP TỤC XEM GẦN ĐÂY</span>
                  </h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {watchHistory.slice(0, 8).map((h) => (
                    <div
                      key={h.id}
                      onClick={() =>
                        setPlayingAnime({
                          slug: h.slug,
                          anilistId: h.anilistId,
                          title: h.title,
                          originTitle: h.originTitle,
                          posterUrl: h.posterUrl,
                          bannerUrl: h.bannerUrl,
                          initialEpisodeName: h.episodeName
                        })
                      }
                      className="w-64 shrink-0 glass-panel rounded-2xl p-2.5 flex gap-3 items-center cursor-pointer hover:border-pink-500/50 transition-all group"
                    >
                      <img
                        src={h.posterUrl}
                        alt={h.title}
                        className="w-12 h-16 object-cover rounded-xl shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-extrabold text-white truncate group-hover:text-pink-400">
                          {h.title}
                        </h4>
                        <p className="text-[11px] text-pink-400 font-bold mt-0.5">
                          Đang xem: Tập {h.episodeName}
                          {h.lastTimeSec ? ` • ${Math.floor(h.lastTimeSec / 60)}p` : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWatchHistory(watchHistoryApi.remove(h.id));
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5"
                        title="Xóa khỏi lịch sử"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thanh Chế Độ Duyệt & Bộ Lọc Chuyên Sâu Chuẩn AnimeVietsub */}
            <div className="glass-panel rounded-2xl p-4 space-y-4">
              {/* Hàng 1: Chọn Hệ Sinh Thái Duyệt Phim */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setAnimeBrowseMode('anilist');
                      setAnimePage(1);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-2 ${
                      animeBrowseMode === 'anilist'
                        ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white border-pink-400 shadow-lg shadow-pink-500/20'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    <span>🌟 Anime Hub (TV • Movie • Season • Top BXH)</span>
                  </button>

                  <button
                    onClick={() => {
                      setAnimeBrowseMode('vn');
                      setSelectedCountry('trung-quoc');
                      setAnimePage(1);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-2 ${
                      animeBrowseMode === 'vn' && selectedCountry === 'trung-quoc'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-lg'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                    }`}
                  >
                    <span>🇨🇳 Hoạt Hình 3D (Donghua Tu Tiên)</span>
                  </button>

                  <button
                    onClick={() => {
                      setAnimeBrowseMode('vn');
                      setSelectedCountry('all');
                      setAnimePage(1);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-2 ${
                      animeBrowseMode === 'vn' && selectedCountry !== 'trung-quoc'
                        ? 'bg-gradient-to-r from-rose-500 to-orange-600 text-white border-rose-400 shadow-lg'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                    }`}
                  >
                    <Server className="w-4 h-4" />
                    <span>🇻🇳 Kho Vietsub Trực Tiếp (Server 1 & 2)</span>
                  </button>
                </div>

                <button
                  onClick={handleResetAnimeFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại bộ lọc</span>
                </button>
              </div>

              {/* Hàng 2: Bộ lọc Chi tiết theo Chế Độ */}
              {animeBrowseMode === 'anilist' ? (
                <div className="space-y-3">
                  {/* Lọc Dạng Phim + Mùa + Năm + BXH Sort */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Dạng Phim (Format)
                      </label>
                      <select
                        value={selectedFormat}
                        onChange={(e) => {
                          setSelectedFormat(e.target.value);
                          setAnimePage(1);
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                      >
                        {ANIME_FORMATS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Mùa (Season)
                      </label>
                      <select
                        value={selectedSeason}
                        onChange={(e) => {
                          setSelectedSeason(e.target.value);
                          setAnimePage(1);
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                      >
                        {ANIME_SEASONS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Năm Phát Hành
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          setAnimePage(1);
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                      >
                        <option value="all">Tất cả năm</option>
                        {['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'].map(
                          (yr) => (
                            <option key={yr} value={yr}>
                              Năm {yr}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Xếp Hạng / Top Anime
                      </label>
                      <select
                        value={selectedSort}
                        onChange={(e) => {
                          setSelectedSort(e.target.value);
                          setAnimePage(1);
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-pink-300 focus:outline-none focus:border-pink-500"
                      >
                        {ANIME_SORTS.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Thể Loại Chuẩn Otaku */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {ANIME_GENRES.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          setSelectedGenre(g.id);
                          setAnimePage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border shrink-0 ${
                          selectedGenre === g.id
                            ? 'bg-pink-500 text-white border-pink-400 shadow'
                            : 'bg-slate-900/90 text-slate-300 border-white/10 hover:text-white hover:border-pink-500/40'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Bộ lọc cho Kho Vietsub Trực Tiếp (KKPhim / NguonC) */
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: 'all', label: '🔥 Tất cả Hoạt Hình' },
                      { id: 'nhat-ban', label: '🇯🇵 Anime Nhật Bản' },
                      { id: 'trung-quoc', label: '🇨🇳 Hoạt Hình 3D (Donghua)' }
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCountry(c.id as any);
                          setAnimePage(1);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          selectedCountry === c.id
                            ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                            : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}

                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setAnimePage(1);
                      }}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-pink-500"
                    >
                      <option value="all">Tất cả năm</option>
                      {['2026', '2025', '2024', '2023', '2022'].map((y) => (
                        <option key={y} value={y}>
                          Năm {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">Nguồn duyệt:</span>
                    <button
                      onClick={() => {
                        setSelectedSource('kkphim');
                        setAnimePage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        selectedSource === 'kkphim'
                          ? 'bg-violet-600 text-white border-violet-400'
                          : 'bg-slate-900 text-slate-400 border-white/10'
                      }`}
                    >
                      Server 1
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSource('nguonc');
                        setAnimePage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        selectedSource === 'nguonc'
                          ? 'bg-cyan-600 text-white border-cyan-400'
                          : 'bg-slate-900 text-slate-400 border-white/10'
                      }`}
                    >
                      Server 2
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lưới Danh Sách Anime */}
            {loadingAnime ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-2xl skeleton-shimmer" />
                ))}
              </div>
            ) : animeList.length === 0 ? (
              <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
                <p className="text-base font-bold text-slate-200">
                  Không tìm thấy bộ Anime nào khớp với bộ lọc hiện tại!
                </p>
                <button
                  onClick={handleResetAnimeFilters}
                  className="px-4 py-2 rounded-xl bg-pink-500 text-white text-xs font-bold"
                >
                  Đặt lại tất cả bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {animeList.map((anime) => {
                  const isSaved = watchlist.some(
                    (w) =>
                      (anime.slug && w.slug === anime.slug) ||
                      w.title.toLowerCase() === anime.title.toLowerCase()
                  );
                  return (
                    <div
                      key={anime.id}
                      onClick={() => openAnimePlayer(anime)}
                      className="group relative rounded-2xl overflow-hidden bg-[#0c1020] border border-white/10 hover:border-pink-500/60 transition-all duration-300 cursor-pointer flex flex-col shadow-lg hover:shadow-pink-500/15 hover:-translate-y-1"
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                        <img
                          src={anime.posterUrl}
                          alt={anime.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#090c18] via-[#090c18]/50 to-transparent" />

                        {/* Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                          {anime.format && (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/90 text-slate-950 text-[10px] font-black shadow">
                              {anime.format}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-lg bg-pink-600/90 backdrop-blur-md text-white text-[10px] font-extrabold shadow">
                            {anime.episodeCurrent || 'FHD'}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveToWatchlist({
                              id: `anime_${anime.slug || anime.anilistId}`,
                              title: anime.title,
                              originTitle: anime.originTitle,
                              category: MediaCategory.ANIME,
                              status: MediaStatus.PLAN_TO_WATCH,
                              rating: anime.malScore || 9.0,
                              description: anime.synopsis || anime.originTitle || '',
                              imageUrl: anime.posterUrl,
                              bannerUrl: anime.bannerUrl,
                              genres: anime.genres || ['Anime'],
                              createdAt: Date.now(),
                              slug: anime.slug || `anilist_${anime.anilistId}`,
                              releaseYear: anime.year
                            });
                          }}
                          className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md border transition-all ${
                            isSaved
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                              : 'bg-black/60 hover:bg-pink-500 text-white border-white/15'
                          }`}
                          title="Lưu vào Tủ"
                        >
                          {isSaved ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/45">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                          </div>
                        </div>

                        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-bold">
                          <span className="text-amber-300 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-300" /> {anime.malScore || 8.5}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200 text-[10px]">
                            {anime.year || 2026}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 group-hover:text-pink-400 transition-colors">
                            {anime.title}
                          </h3>
                          {anime.originTitle && anime.originTitle !== anime.title && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {anime.originTitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-6 pb-4">
              <button
                disabled={animePage <= 1}
                onClick={() => {
                  setAnimePage(1);
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-bold border border-white/10"
              >
                « Đầu
              </button>
              <button
                disabled={animePage <= 1}
                onClick={() => {
                  setAnimePage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-bold border border-white/10"
              >
                <ChevronLeft className="w-4 h-4" /> Trang trước
              </button>
              <div className="px-4 py-2 rounded-xl bg-slate-900 border border-pink-500/30 text-xs font-extrabold text-pink-400">
                Trang {animePage} / {animeTotalPages}
              </div>
              <button
                disabled={animePage >= animeTotalPages}
                onClick={() => {
                  setAnimePage((p) => p + 1);
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-xs font-bold border border-pink-500/30"
              >
                Trang tiếp <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2. TAB LỊCH CHIẾU SIMULCAST THẬT THEO GIỜ VIỆT NAM */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-pink-400" />
                  <span>LỊCH CHIẾU SIMULCAST THỜI GIAN THỰC (GIỜ VIỆT NAM)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Đồng bộ trực tiếp giờ phát sóng từ Nhật Bản — Bấm vào bất kỳ bộ nào để mở Server Vietsub ngay!
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setScheduleDay(d.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      scheduleDay === d.id
                        ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-lg'
                        : 'bg-slate-900/90 text-slate-300 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingSchedule ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <Loader2 className="w-9 h-9 text-pink-500 animate-spin" />
                <p className="text-sm font-bold text-slate-300">
                  Đang đồng bộ lịch phát sóng Simulcast...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scheduleList.map((item, idx) => {
                  const poster =
                    item.images?.webp?.large_image_url ||
                    item.images?.jpg?.large_image_url ||
                    '';
                  return (
                    <div
                      key={`${item.mal_id}_${idx}`}
                      className="glass-panel rounded-2xl p-4 flex gap-4 hover:border-pink-500/50 transition-all group"
                    >
                      <img
                        src={poster}
                        alt={item.title}
                        className="w-24 h-36 object-cover rounded-xl border border-white/10 shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.broadcast?.time || 'Simulcast'}
                              {item.airingEpisode ? ` • Tập ${item.airingEpisode}` : ''}
                            </span>
                            {item.timeUntilAiring !== undefined && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                                {formatCountdown(item.timeUntilAiring)}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-extrabold text-white line-clamp-2 group-hover:text-pink-400">
                            {item.title}
                          </h3>
                          {item.title_english && item.title_english !== item.title && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {item.title_english}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {item.synopsis || 'Đang phát sóng hàng tuần.'}
                          </p>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                          <button
                            onClick={() =>
                              setPlayingAnime({
                                anilistId: item.anilistId,
                                title: item.title,
                                originTitle: item.title_english,
                                posterUrl: poster,
                                bannerUrl: item.bannerUrl,
                                synopsis: item.synopsis,
                                year: item.year,
                                malScore: item.score
                              })
                            }
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white text-xs font-extrabold shadow"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Dò Server & Xem</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. TAB ĐỌC MANGA / MANHWA */}
        {activeTab === 'manga' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-black text-white">
                  KHO TRUYỆN TRANH MANGA / MANHWA / MANHUA TIẾNG VIỆT
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'truyen-moi', label: '🔥 Mới Cập Nhật' },
                  { id: 'hot', label: '⚡ Truyện Hot Nhất' },
                  { id: 'manga', label: '🇯🇵 Manga Nhật Bản' },
                  { id: 'action', label: '⚔️ Hành Động / Shonen' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setMangaType(t.id);
                      setMangaPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      mangaType === t.id
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'bg-slate-900 text-slate-300 border border-white/10 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingManga ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-2xl skeleton-shimmer" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {mangaList.map((manga) => (
                  <div
                    key={manga.id}
                    onClick={() => setReadingMangaSlug(manga.slug)}
                    className="group rounded-2xl overflow-hidden bg-[#0b121c] border border-white/10 hover:border-emerald-500/60 transition-all cursor-pointer flex flex-col shadow-lg hover:-translate-y-1"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                      <img
                        src={manga.thumbUrl}
                        alt={manga.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-black shadow">
                          {manga.latestChapter}
                        </span>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                        <div className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-xl">
                          <BookOpen className="w-4 h-4" /> Đọc Ngay
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 group-hover:text-emerald-400">
                        {manga.title}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(manga.genres || []).slice(0, 2).map((g, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Manga Pagination */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-6 pb-4">
              <button
                disabled={mangaPage <= 1}
                onClick={() => {
                  setMangaPage(1);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-bold border border-white/10"
              >
                « Đầu
              </button>

              <button
                disabled={mangaPage <= 1}
                onClick={() => {
                  setMangaPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-bold border border-white/10"
              >
                <ChevronLeft className="w-4 h-4" /> Trang trước
              </button>

              <div className="px-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs font-extrabold text-emerald-400">
                Trang {mangaPage} / {mangaTotalPages}
              </div>

              <button
                disabled={mangaPage >= mangaTotalPages}
                onClick={() => {
                  setMangaPage((p) => p + 1);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-30 text-emerald-300 text-xs font-bold border border-emerald-500/30"
              >
                Trang tiếp <ChevronRight className="w-4 h-4" />
              </button>

              <button
                disabled={mangaPage >= mangaTotalPages}
                onClick={() => {
                  setMangaPage(mangaTotalPages);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-bold border border-white/10"
              >
                Cuối »
              </button>
            </div>
          </div>
        )}

        {/* 4. TAB TỦ OTAKU CỦA TÔI (WATCHLIST & READLIST) */}
        {activeTab === 'watchlist' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">
                  🗂️ TỦ ANIME & MANGA CÁ NHÂN ({watchlist.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Lưu trữ tiến độ tập đang xem & chapter đang đọc dở của bạn.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {watchlist.map((item) => {
                const isManga = item.category === MediaCategory.MANGA;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isManga && item.slug) {
                        setReadingMangaSlug(item.slug);
                      } else {
                        setPlayingAnime({
                          slug: item.slug?.startsWith('anilist_') ? undefined : item.slug,
                          anilistId: item.slug?.startsWith('anilist_')
                            ? parseInt(item.slug.replace('anilist_', ''), 10)
                            : undefined,
                          title: item.title,
                          originTitle: item.originTitle,
                          posterUrl: item.imageUrl,
                          bannerUrl: item.bannerUrl,
                          synopsis: item.description,
                          year: item.releaseYear,
                          malScore: item.rating
                        });
                      }
                    }}
                    className="group relative rounded-2xl overflow-hidden bg-[#0c1020] border border-white/10 hover:border-pink-500/50 transition-all cursor-pointer flex flex-col"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span
                        className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          isManga
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-pink-500 text-white'
                        }`}
                      >
                        {item.category}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromWatchlist(item.id);
                        }}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white"
                        title="Xóa khỏi tủ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-3 space-y-1">
                      <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-pink-400 font-bold">
                          {item.currentProgress || item.status}
                        </span>
                        <span className="text-amber-300 font-bold">★ {item.rating}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. TAB BẢNG XẾP HẠNG PODIUM (LIVE DATA TOÀN CẦU ANIME & MANGA) */}
        {activeTab === 'ranking' && (
          <div className="space-y-8">
            {/* Header & Controls */}
            <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold">
                  <Crown className="w-3.5 h-3.5" /> HALL OF FAME • LIVE RANKING
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {rankingMedia === 'anime'
                    ? '🏆 BẢNG XẾP HẠNG ANIME TOÀN CẦU'
                    : '📖 BẢNG XẾP HẠNG TRUYỆN TRANH ĐỈNH CAO'}
                </h2>
                <p className="text-xs text-slate-400">
                  Dữ liệu xếp hạng thời gian thực — Bấm vào bất kỳ bộ nào để xem / đọc ngay lập tức!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Chọn Anime hoặc Truyện Tranh */}
                <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-white/10">
                  <button
                    onClick={() => setRankingMedia('anime')}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      rankingMedia === 'anime'
                        ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Tv className="w-4 h-4" />
                    <span>BXH Anime</span>
                  </button>
                  <button
                    onClick={() => setRankingMedia('manga')}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      rankingMedia === 'manga'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>BXH Truyện Tranh</span>
                  </button>
                </div>

                {/* Chuyển 3 BXH con */}
                {rankingMedia === 'anime' ? (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'TRENDING_DESC', label: '🔥 Đang Hot Nhất' },
                      { id: 'SCORE_DESC', label: '👑 Điểm Cao Mọi Thời Đại' },
                      { id: 'FAVOURITES_DESC', label: '❤️ Yêu Thích Nhất' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setRankingAnimeType(t.id as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                          rankingAnimeType === t.id
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
                            : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'top-month', label: '🔥 Top Hot Tháng Này' },
                      { id: 'top-all', label: '👑 Top Mọi Thời Đại' },
                      { id: 'top-follow', label: '❤️ Yêu Thích Nhất' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setRankingMangaType(t.id as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                          rankingMangaType === t.id
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow'
                            : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {loadingRanking ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                <p className="text-sm font-bold text-slate-300">
                  Đang tổng hợp Bảng Xếp Hạng Live...
                </p>
              </div>
            ) : (
              (() => {
                const isAnime = rankingMedia === 'anime';
                const list = isAnime ? rankingAnimeItems : rankingMangaItems;
                const top3 = list.slice(0, 3);
                const rest = list.slice(3, 24);

                // Sắp xếp hiển thị bục Olympic trên desktop: Top 2 (trái) - Top 1 (giữa) - Top 3 (phải)
                const podiumOrder =
                  top3.length >= 3
                    ? [
                        { item: top3[1], rank: 2, orderClass: 'md:order-1 md:mt-6', badge: 'TOP 2 • BẠC', gradient: 'from-slate-200 via-slate-300 to-slate-400', border: 'border-slate-300/40', glow: 'shadow-slate-400/15' },
                        { item: top3[0], rank: 1, orderClass: 'md:order-2 md:-mt-2', badge: 'TOP 1 • VÀNG HUYỀN THOẠI', gradient: 'from-amber-300 via-yellow-400 to-amber-500', border: 'border-amber-400/70', glow: 'shadow-amber-500/25' },
                        { item: top3[2], rank: 3, orderClass: 'md:order-3 md:mt-8', badge: 'TOP 3 • ĐỒNG', gradient: 'from-amber-600 via-orange-600 to-amber-700', border: 'border-orange-500/40', glow: 'shadow-orange-500/15' }
                      ]
                    : top3.map((it, idx) => ({
                        item: it,
                        rank: idx + 1,
                        orderClass: '',
                        badge: `TOP ${idx + 1}`,
                        gradient: 'from-amber-400 to-yellow-500',
                        border: 'border-amber-400/50',
                        glow: ''
                      }));

                const handleItemClick = (item: any) => {
                  if (isAnime) {
                    openAnimePlayer(item as AnimeCardItem);
                  } else {
                    setReadingMangaSlug((item as MangaCardItem).slug);
                  }
                };

                return (
                  <div className="space-y-8">
                    {/* BỤC VINH QUANG PODIUM TOP 1 - 2 - 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch pt-2">
                      {podiumOrder.map(({ item, rank, orderClass, badge, gradient, border, glow }) => {
                        const title = item.title;
                        const img = isAnime
                          ? (item as AnimeCardItem).posterUrl
                          : (item as MangaCardItem).thumbUrl;
                        const subInfo = isAnime
                          ? `★ ${(item as AnimeCardItem).malScore || 8.8} • ${(item as AnimeCardItem).episodeCurrent || 'TV'}`
                          : (item as MangaCardItem).latestChapter || 'Mới cập nhật';
                        const desc = isAnime
                          ? (item as AnimeCardItem).synopsis
                          : (item as MangaCardItem).genres?.join(' • ');

                        return (
                          <div
                            key={`${rank}_${item.id}`}
                            onClick={() => handleItemClick(item)}
                            className={`relative glass-panel rounded-3xl p-5 flex gap-4 items-center cursor-pointer border ${border} shadow-2xl ${glow} hover:scale-[1.02] transition-all ${orderClass}`}
                          >
                            {rank === 1 && (
                              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-lg">
                                <Crown className="w-3.5 h-3.5" /> QUÁN QUÂN #1
                              </div>
                            )}

                            <div className="relative shrink-0">
                              <img
                                src={img}
                                alt={title}
                                className={`object-cover rounded-2xl border border-white/20 ${
                                  rank === 1 ? 'w-28 h-40' : 'w-24 h-36'
                                }`}
                              />
                              <div
                                className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br ${gradient} text-slate-950 font-black text-sm flex items-center justify-center shadow-lg border-2 border-[#06070d]`}
                              >
                                {rank}
                              </div>
                            </div>

                            <div className="space-y-2 min-w-0 flex-1">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-lg bg-gradient-to-r ${gradient} text-slate-950 text-[10px] font-black`}
                              >
                                {badge}
                              </span>
                              <h3 className="text-sm sm:text-base font-extrabold text-white line-clamp-2">
                                {title}
                              </h3>
                              <p
                                className={`text-xs font-extrabold ${
                                  isAnime ? 'text-amber-300' : 'text-emerald-400'
                                }`}
                              >
                                {subInfo}
                              </p>
                              {desc && (
                                <p className="text-[11px] text-slate-400 line-clamp-2">{desc}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* DANH SÁCH TOP 4 -> TOP 24 BÊN DƯỚI */}
                    {rest.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <span>BẢNG XẾP HẠNG TOP 4 → TOP {rest.length + 3}</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                          {rest.map((item, idx) => {
                            const rank = idx + 4;
                            const img = isAnime
                              ? (item as AnimeCardItem).posterUrl
                              : (item as MangaCardItem).thumbUrl;
                            const sub = isAnime
                              ? `★ ${(item as AnimeCardItem).malScore || 8.5} • ${(item as AnimeCardItem).format || 'TV'}`
                              : (item as MangaCardItem).latestChapter || 'Mới';

                            return (
                              <div
                                key={`${rank}_${item.id}`}
                                onClick={() => handleItemClick(item)}
                                className="glass-panel rounded-2xl p-3 flex items-center gap-3.5 cursor-pointer hover:border-amber-400/50 hover:bg-slate-900/90 transition-all group"
                              >
                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-sm text-slate-300 group-hover:text-amber-300 group-hover:border-amber-400/40 shrink-0">
                                  #{rank}
                                </div>
                                <img
                                  src={img}
                                  alt={item.title}
                                  loading="lazy"
                                  className="w-12 h-16 object-cover rounded-xl border border-white/10 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-extrabold text-white line-clamp-2 group-hover:text-amber-300 transition-colors">
                                    {item.title}
                                  </h4>
                                  <p
                                    className={`text-[11px] font-bold mt-1 ${
                                      isAnime ? 'text-amber-300' : 'text-emerald-400'
                                    }`}
                                  >
                                    {sub}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </main>

      {/* ================= MODALS ================= */}
      <AnimePlayerModal
        isOpen={!!playingAnime}
        onClose={() => setPlayingAnime(null)}
        targetAnime={playingAnime}
        watchlist={watchlist}
        onSaveToWatchlist={handleSaveToWatchlist}
        onSwitchAnime={(nextAnime) => setPlayingAnime(nextAnime)}
        onHistoryUpdated={() => setWatchHistory(watchHistoryApi.getAll())}
      />

      <MangaReaderModal
        isOpen={!!readingMangaSlug}
        onClose={() => setReadingMangaSlug(null)}
        targetMangaSlug={readingMangaSlug}
        watchlist={watchlist}
        onSaveToWatchlist={handleSaveToWatchlist}
      />
    </div>
  );
};

export default App;
