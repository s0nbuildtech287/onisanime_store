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
  Film,
  Compass
} from 'lucide-react';
import {
  AnimeCardItem,
  AppTab,
  MangaCardItem,
  MediaCategory,
  MediaItem,
  MediaStatus,
  ScheduleAnimeItem
} from './types';
import { animeApi, mangaApi, storageApi } from './services/otakuApi';
import AnimePlayerModal from './components/AnimePlayerModal';
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('anime');
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  // Anime Tab States
  const [animeList, setAnimeList] = useState<AnimeCardItem[]>([]);
  const [loadingAnime, setLoadingAnime] = useState(false);
  const [animePage, setAnimePage] = useState(1);
  const [animeTotalPages, setAnimeTotalPages] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState<'all' | 'nhat-ban' | 'trung-quoc'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<'kkphim' | 'nguonc'>('kkphim');

  // Schedule Tab States (Jikan MyAnimeList)
  const [scheduleDay, setScheduleDay] = useState<string>('monday');
  const [scheduleList, setScheduleList] = useState<ScheduleAnimeItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Manga Tab States (OTruyen API)
  const [mangaList, setMangaList] = useState<MangaCardItem[]>([]);
  const [loadingManga, setLoadingManga] = useState(false);
  const [mangaPage, setMangaPage] = useState(1);
  const [mangaTotalPages, setMangaTotalPages] = useState(1);
  const [mangaType, setMangaType] = useState<string>('truyen-moi');

  // Watchlist / Readlist States
  const [watchlist, setWatchlist] = useState<MediaItem[]>([]);

  // Active Modals
  const [playingAnime, setPlayingAnime] = useState<{
    slug?: string;
    title: string;
    originTitle?: string;
    posterUrl?: string;
    bannerUrl?: string;
    synopsis?: string;
    year?: string | number;
    malScore?: number;
  } | null>(null);

  const [readingMangaSlug, setReadingMangaSlug] = useState<string | null>(null);

  // Load Watchlist
  useEffect(() => {
    storageApi.getAll().then(setWatchlist);
  }, []);

  // Load Anime List
  useEffect(() => {
    if (activeTab !== 'anime') return;
    setLoadingAnime(true);
    animeApi
      .getAnimeList({
        page: animePage,
        country: selectedCountry,
        year: selectedYear,
        keyword: submittedSearch,
        source: selectedSource
      })
      .then((res) => {
        setAnimeList(res.items);
        setAnimeTotalPages(res.totalPages);
      })
      .finally(() => setLoadingAnime(false));
  }, [activeTab, animePage, selectedCountry, selectedYear, submittedSearch, selectedSource]);

  // Load Weekly Schedule (Anime Phát Sóng Tuần)
  useEffect(() => {
    if (activeTab !== 'schedule') return;
    setLoadingSchedule(true);
    const dayIdx = WEEKDAYS.findIndex(d => d.id === scheduleDay);
    animeApi
      .getWeeklySchedule(dayIdx >= 0 ? dayIdx : 0)
      .then(setScheduleList)
      .finally(() => setLoadingSchedule(false));
  }, [activeTab, scheduleDay]);

  // Load Manga List (OTruyen API)
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

  const featuredAnime = animeList[0];

  return (
    <div className="min-h-screen bg-[#06070d] text-slate-100 flex flex-col">
      {/* ================= HEADER & NAVIGATION ================= */}
      <header className="sticky top-0 z-40 glass-header">
        <div className="max-w-[1750px] mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => {
              setActiveTab('anime');
              setSubmittedSearch('');
              setSearchQuery('');
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
                  PRO HUB
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Multi-Server Anime (KKPhim • OPhim • NguonC) & Manga Reader
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
              <span>Lịch Chiếu (MAL)</span>
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
                  : 'Tìm Anime: Frieren, One Piece, Conan, Doraemon...'
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
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* 1. TAB XEM ANIME MULTI-SERVER */}
        {activeTab === 'anime' && (
          <div className="space-y-6">
            {/* Hero Banner */}
            {featuredAnime && !submittedSearch && (
              <div className="relative rounded-3xl overflow-hidden border border-white/15 min-h-[320px] sm:min-h-[380px] flex items-end p-6 sm:p-10 shadow-2xl">
                <img
                  src={featuredAnime.bannerUrl || featuredAnime.posterUrl}
                  alt={featuredAnime.title}
                  className="absolute inset-0 w-full h-full object-cover object-center scale-105 blur-[1px] opacity-45"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06070d] via-[#06070d]/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#06070d] via-[#06070d]/60 to-transparent" />

                <div className="relative z-10 max-w-2xl space-y-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-pink-500 text-white text-xs font-extrabold flex items-center gap-1 shadow-lg shadow-pink-500/30">
                      <Flame className="w-3.5 h-3.5" /> ANIME HOT MÙA NÀY
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-amber-300">
                      ★ {featuredAnime.malScore || 8.8}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-xs font-bold text-violet-300">
                      {featuredAnime.episodeCurrent || 'Đang phát sóng'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-xs font-bold text-emerald-300">
                      Multi-Server: KKPhim + OPhim + NguonC
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                    {featuredAnime.title}
                  </h1>
                  {featuredAnime.originTitle && (
                    <p className="text-xs sm:text-sm text-pink-300 font-semibold">
                      {featuredAnime.originTitle} ({featuredAnime.year || 2026})
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() =>
                        setPlayingAnime({
                          slug: featuredAnime.slug,
                          title: featuredAnime.title,
                          originTitle: featuredAnime.originTitle,
                          posterUrl: featuredAnime.posterUrl,
                          bannerUrl: featuredAnime.bannerUrl,
                          year: featuredAnime.year,
                          malScore: featuredAnime.malScore
                        })
                      }
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white font-extrabold text-sm shadow-xl shadow-pink-500/30 transition-all hover:scale-105"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>XEM NGAY (MULTI-SERVER)</span>
                    </button>

                    <button
                      onClick={() =>
                        handleSaveToWatchlist({
                          id: `anime_${featuredAnime.slug}`,
                          title: featuredAnime.title,
                          originTitle: featuredAnime.originTitle,
                          category: MediaCategory.ANIME,
                          status: MediaStatus.PLAN_TO_WATCH,
                          rating: featuredAnime.malScore || 9.0,
                          description: featuredAnime.originTitle || '',
                          imageUrl: featuredAnime.posterUrl,
                          bannerUrl: featuredAnime.bannerUrl,
                          genres: featuredAnime.genres || ['Anime'],
                          createdAt: Date.now(),
                          slug: featuredAnime.slug,
                          releaseYear: featuredAnime.year
                        })
                      }
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm backdrop-blur-md transition-all"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>+ Lưu Vào Tủ</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-slate-400 mr-1 flex items-center gap-1">
                  <Compass className="w-4 h-4 text-pink-400" /> BỘ LỌC:
                </span>

                {/* Lọc Quốc gia: Nhật Bản (Anime) vs Trung Quốc (Hoạt hình 3D) */}
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

                {/* Chọn Năm */}
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setAnimePage(1);
                  }}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-pink-500"
                >
                  <option value="all">Tất cả năm</option>
                  <option value="2026">Năm 2026</option>
                  <option value="2025">Năm 2025</option>
                  <option value="2024">Năm 2024</option>
                  <option value="2023">Năm 2023</option>
                  <option value="2022">Năm 2022</option>
                </select>
              </div>

              {/* Đổi nguồn danh sách chính: KKPhim vs OPhim */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-violet-400" /> Nguồn duyệt:
                </span>
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
                  Server KKPhim
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
                  Server NguonC
                </button>
              </div>
            </div>

            {/* Lưới Danh Sách Anime */}
            {loadingAnime ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-2xl skeleton-shimmer" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {animeList.map((anime) => {
                  const isSaved = watchlist.some((w) => w.slug === anime.slug);
                  return (
                    <div
                      key={anime.id}
                      onClick={() =>
                        setPlayingAnime({
                          slug: anime.slug,
                          title: anime.title,
                          originTitle: anime.originTitle,
                          posterUrl: anime.posterUrl,
                          bannerUrl: anime.bannerUrl,
                          year: anime.year,
                          malScore: anime.malScore
                        })
                      }
                      className="group relative rounded-2xl overflow-hidden bg-[#0c1020] border border-white/10 hover:border-pink-500/60 transition-all duration-300 cursor-pointer flex flex-col shadow-lg hover:shadow-pink-500/15 hover:-translate-y-1"
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                        <img
                          src={anime.posterUrl}
                          alt={anime.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#090c18] via-transparent to-transparent opacity-80" />

                        {/* Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded-lg bg-pink-600/90 backdrop-blur-md text-white text-[10px] font-extrabold shadow">
                            {anime.episodeCurrent || 'FHD'}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveToWatchlist({
                              id: `anime_${anime.slug}`,
                              title: anime.title,
                              originTitle: anime.originTitle,
                              category: MediaCategory.ANIME,
                              status: MediaStatus.PLAN_TO_WATCH,
                              rating: anime.malScore || 9.0,
                              description: anime.originTitle || '',
                              imageUrl: anime.posterUrl,
                              bannerUrl: anime.bannerUrl,
                              genres: anime.genres || ['Anime'],
                              createdAt: Date.now(),
                              slug: anime.slug,
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

                        {/* Hover Play Overlay */}
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
                          {anime.originTitle && (
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
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                disabled={animePage <= 1}
                onClick={() => setAnimePage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-xs font-bold border border-white/10"
              >
                <ChevronLeft className="w-4 h-4" /> Trang trước
              </button>
              <span className="text-xs font-extrabold text-pink-400 px-3">
                Trang {animePage} / {animeTotalPages}
              </span>
              <button
                disabled={animePage >= animeTotalPages}
                onClick={() => setAnimePage((p) => p + 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-xs font-bold border border-pink-500/30"
              >
                Trang tiếp <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2. TAB LỊCH CHIẾU ANIME TUẦN (JIKAN / MYANIMELIST) */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-pink-400" />
                  <span>LỊCH CHIẾU ANIME TRONG TUẦN (CHUẨN MYANIMELIST)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dữ liệu đồng bộ trực tiếp từ Jikan v4 API — Bấm vào bất kỳ bộ nào để Smart Matcher tự động tìm link phát Vietsub!
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
                  Đang tải lịch chiếu từ MyAnimeList (Jikan API)...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scheduleList.map((item) => {
                  const poster =
                    item.images?.webp?.large_image_url ||
                    item.images?.jpg?.large_image_url ||
                    '';
                  return (
                    <div
                      key={item.mal_id}
                      className="glass-panel rounded-2xl p-4 flex gap-4 hover:border-pink-500/50 transition-all group"
                    >
                      <img
                        src={poster}
                        alt={item.title}
                        className="w-24 h-36 object-cover rounded-xl border border-white/10 shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px] font-bold">
                              {item.broadcast?.time ? `🕒 ${item.broadcast.time} (JST)` : 'Simulcast'}
                            </span>
                            {item.score && (
                              <span className="text-xs font-extrabold text-amber-300">
                                ★ {item.score}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-extrabold text-white line-clamp-2 group-hover:text-pink-400">
                            {item.title}
                          </h3>
                          {item.title_english && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {item.title_english}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {item.synopsis || 'Đang phát sóng hàng tuần tại Nhật Bản.'}
                          </p>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                          <button
                            onClick={() =>
                              setPlayingAnime({
                                title: item.title_english || item.title,
                                originTitle: item.title,
                                posterUrl: poster,
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

        {/* 3. TAB ĐỌC MANGA / MANHWA (OTRUYEN API) */}
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
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                disabled={mangaPage <= 1}
                onClick={() => setMangaPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-xs font-bold border border-white/10"
              >
                <ChevronLeft className="w-4 h-4" /> Trang trước
              </button>
              <span className="text-xs font-extrabold text-emerald-400 px-3">
                Trang {mangaPage} / {mangaTotalPages}
              </span>
              <button
                disabled={mangaPage >= mangaTotalPages}
                onClick={() => setMangaPage((p) => p + 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30"
              >
                Trang tiếp <ChevronRight className="w-4 h-4" />
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
                          slug: item.slug,
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

        {/* 5. TAB BẢNG XẾP HẠNG PODIUM */}
        {activeTab === 'ranking' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold">
                <Crown className="w-4 h-4" /> HALL OF FAME
              </div>
              <h2 className="text-2xl font-black text-white">
                BẢNG XẾP HẠNG TUYỆT PHẨM OTAKU
              </h2>
              <p className="text-xs text-slate-400">
                Xếp hạng theo điểm đánh giá cá nhân & thứ tự ưu tiên trong Tủ của bạn
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...watchlist]
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 3)
                .map((item, idx) => {
                  const medals = [
                    { label: 'TOP 1 • HUYỀN THOẠI', color: 'from-amber-400 to-yellow-600' },
                    { label: 'TOP 2 • CỰC PHẨM', color: 'from-slate-300 to-slate-500' },
                    { label: 'TOP 3 • ĐÁNG XEM', color: 'from-amber-600 to-orange-700' }
                  ];
                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        setPlayingAnime({
                          slug: item.slug,
                          title: item.title,
                          originTitle: item.originTitle,
                          posterUrl: item.imageUrl,
                          bannerUrl: item.bannerUrl,
                          synopsis: item.description,
                          year: item.releaseYear,
                          malScore: item.rating
                        })
                      }
                      className="glass-panel rounded-3xl p-5 flex gap-4 items-center cursor-pointer hover:border-amber-400/50 transition-all"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-24 h-36 object-cover rounded-2xl border border-white/15 shrink-0"
                      />
                      <div className="space-y-2">
                        <span
                          className={`inline-block px-3 py-1 rounded-lg bg-gradient-to-r ${medals[idx].color} text-slate-950 text-[10px] font-black`}
                        >
                          {medals[idx].label}
                        </span>
                        <h3 className="text-base font-extrabold text-white line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs font-extrabold text-amber-300">
                          Điểm đánh giá: ★ {item.rating} / 10
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
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

