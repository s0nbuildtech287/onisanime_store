import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  SkipForward,
  SkipBack,
  Maximize2,
  Minimize2,
  Bookmark,
  Check,
  Server,
  Sparkles,
  Loader2,
  FastForward,
  Film,
  Layers,
  Search,
  GitBranch,
  Building2,
  Video
} from 'lucide-react';
import {
  AnimeEpisode,
  AnimeRelationItem,
  MediaCategory,
  MediaItem,
  MediaStatus,
  StreamServerGroup
} from '../types';
import {
  anilistApi,
  resolveMultiServerStreams,
  watchHistoryApi
} from '../services/otakuApi';

declare global {
  interface Window {
    Hls?: any;
  }
}

export interface PlayerTargetAnime {
  slug?: string;
  anilistId?: number;
  title: string;
  originTitle?: string;
  synonyms?: string[];
  posterUrl?: string;
  bannerUrl?: string;
  synopsis?: string;
  year?: string | number;
  malScore?: number;
  studios?: string[];
  trailerUrl?: string;
  initialEpisodeName?: string;
}

interface AnimePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAnime: PlayerTargetAnime | null;
  watchlist: MediaItem[];
  onSaveToWatchlist: (item: MediaItem) => void;
  onSwitchAnime?: (nextAnime: PlayerTargetAnime) => void;
  onHistoryUpdated?: () => void;
}

const AnimePlayerModal: React.FC<AnimePlayerModalProps> = ({
  isOpen,
  onClose,
  targetAnime,
  watchlist,
  onSaveToWatchlist,
  onSwitchAnime,
  onHistoryUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<StreamServerGroup[]>([]);
  const [selectedServerIdx, setSelectedServerIdx] = useState(0);
  const [currentEpisode, setCurrentEpisode] = useState<AnimeEpisode | null>(null);
  const [playerMode, setPlayerMode] = useState<'hls' | 'embed' | 'trailer'>('hls');
  const [isTheater, setIsTheater] = useState(false);
  const [epSearch, setEpSearch] = useState('');
  const [manualKeyword, setManualKeyword] = useState('');
  const [watchedEpisodes, setWatchedEpisodes] = useState<string[]>([]);
  const [relations, setRelations] = useState<AnimeRelationItem[]>([]);
  const [studios, setStudios] = useState<string[]>([]);

  const [resolvedMeta, setResolvedMeta] = useState<{
    title: string;
    originTitle?: string;
    synopsis?: string;
    posterUrl?: string;
    bannerUrl?: string;
    year?: string | number;
    quality?: string;
    genres?: string[];
    trailerUrl?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsInstanceRef = useRef<any>(null);
  const resumeTimeRef = useRef<number>(0);

  const loadStreams = async (customKw?: string) => {
    if (!targetAnime) return;
    setLoading(true);
    setServers([]);
    setCurrentEpisode(null);
    setSelectedServerIdx(0);

    try {
      const res = await resolveMultiServerStreams({
        slug: customKw ? undefined : targetAnime.slug,
        title: targetAnime.title,
        originTitle: targetAnime.originTitle,
        synonyms: targetAnime.synonyms,
        customSearchKeyword: customKw
      });

      setResolvedMeta({
        title: targetAnime.anilistId ? targetAnime.title : res.title || targetAnime.title,
        originTitle: res.originTitle || targetAnime.originTitle,
        synopsis: targetAnime.synopsis || res.synopsis,
        posterUrl: targetAnime.posterUrl || res.posterUrl,
        bannerUrl: targetAnime.bannerUrl || res.bannerUrl,
        year: targetAnime.year || res.year,
        quality: res.quality,
        genres: res.genres,
        trailerUrl: targetAnime.trailerUrl || res.trailerUrl
      });
      setServers(res.servers);

      // Kiểm tra lịch sử đã xem
      const historyKey = targetAnime.slug || (targetAnime.anilistId ? `anilist_${targetAnime.anilistId}` : targetAnime.title);
      const historyEntry = watchHistoryApi.getItem(historyKey) || watchHistoryApi.getItem(targetAnime.title);
      if (historyEntry) {
        setWatchedEpisodes(historyEntry.watchedEpisodes || []);
      } else {
        setWatchedEpisodes([]);
      }

      if (res.servers.length > 0 && res.servers[0].episodes.length > 0) {
        const eps = res.servers[0].episodes;
        const targetEpName = targetAnime.initialEpisodeName || historyEntry?.episodeName;
        const matchedEp = targetEpName ? eps.find((e) => e.name === targetEpName) : undefined;
        const chosenEp = matchedEp || eps[0];
        if (historyEntry && matchedEp && historyEntry.episodeName === matchedEp.name && historyEntry.lastTimeSec) {
          resumeTimeRef.current = historyEntry.lastTimeSec;
        } else {
          resumeTimeRef.current = 0;
        }
        setCurrentEpisode(chosenEp);
        setPlayerMode(chosenEp.link_m3u8 ? 'hls' : 'embed');
      } else if (targetAnime.trailerUrl || res.trailerUrl) {
        setPlayerMode('trailer');
      }
    } finally {
      setLoading(false);
    }
  };

  // Tải Server + Quan hệ giữa các phần (Relations) khi mở Modal
  useEffect(() => {
    if (!isOpen || !targetAnime) return;
    setManualKeyword('');
    setRelations([]);
    setStudios(targetAnime.studios || []);
    loadStreams();

    if (targetAnime.anilistId) {
      anilistApi.getAnimeRelations(targetAnime.anilistId).then((relRes) => {
        setRelations(relRes.relations);
        if (relRes.studios.length > 0) setStudios(relRes.studios);
        if (relRes.trailerUrl) {
          setResolvedMeta((prev) => (prev ? { ...prev, trailerUrl: prev.trailerUrl || relRes.trailerUrl } : prev));
        }
      });
    }
  }, [isOpen, targetAnime]);

  // Lưu lịch sử mỗi khi chuyển tập
  useEffect(() => {
    if (!isOpen || !targetAnime || !currentEpisode) return;
    const historyId = targetAnime.slug || (targetAnime.anilistId ? `anilist_${targetAnime.anilistId}` : targetAnime.title);
    watchHistoryApi.saveProgress({
      id: historyId,
      slug: targetAnime.slug,
      anilistId: targetAnime.anilistId,
      title: targetAnime.title,
      originTitle: targetAnime.originTitle,
      posterUrl: targetAnime.posterUrl || resolvedMeta?.posterUrl || '',
      bannerUrl: targetAnime.bannerUrl || resolvedMeta?.bannerUrl,
      episodeName: currentEpisode.name,
      lastTimeSec: resumeTimeRef.current
    });
    setWatchedEpisodes((prev) => Array.from(new Set([...prev, currentEpisode.name])));
    onHistoryUpdated?.();
  }, [isOpen, currentEpisode]);

  // Khởi tạo HLS.js khi phát ở chế độ Direct HLS (.m3u8)
  useEffect(() => {
    if (!isOpen || playerMode !== 'hls' || !currentEpisode?.link_m3u8 || !videoRef.current) {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    const m3u8Url = currentEpisode.link_m3u8;

    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    const setupTime = () => {
      if (resumeTimeRef.current > 5) {
        video.currentTime = resumeTimeRef.current;
        resumeTimeRef.current = 0;
      }
      video.play().catch(() => {});
    };

    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false
      });
      hlsInstanceRef.current = hls;
      hls.loadSource(m3u8Url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, setupTime);
      hls.on(window.Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          setPlayerMode('embed');
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = m3u8Url;
      video.addEventListener('loadedmetadata', setupTime, { once: true });
    } else {
      setPlayerMode('embed');
    }

    // Định kỳ lưu mốc thời gian xem mỗi 8 giây
    const saveInterval = setInterval(() => {
      if (video && !video.paused && video.currentTime > 5 && targetAnime && currentEpisode) {
        const historyId = targetAnime.slug || (targetAnime.anilistId ? `anilist_${targetAnime.anilistId}` : targetAnime.title);
        watchHistoryApi.saveProgress({
          id: historyId,
          slug: targetAnime.slug,
          anilistId: targetAnime.anilistId,
          title: targetAnime.title,
          originTitle: targetAnime.originTitle,
          posterUrl: targetAnime.posterUrl || '',
          bannerUrl: targetAnime.bannerUrl,
          episodeName: currentEpisode.name,
          lastTimeSec: Math.floor(video.currentTime)
        });
      }
    }, 8000);

    return () => {
      clearInterval(saveInterval);
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [isOpen, playerMode, currentEpisode]);

  if (!isOpen || !targetAnime) return null;

  const activeServer = servers[selectedServerIdx];
  const episodes = activeServer?.episodes || [];
  const filteredEpisodes = epSearch.trim()
    ? episodes.filter((ep) => ep.name.toLowerCase().includes(epSearch.trim().toLowerCase()))
    : episodes;

  const currentEpIndex = episodes.findIndex((e) => e.slug === currentEpisode?.slug);
  const hasPrevEp = currentEpIndex > 0;
  const hasNextEp = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1;

  const handleSkipIntro = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration || 9999,
        videoRef.current.currentTime + 85
      );
    }
  };

  const isSaved = watchlist.some(
    (w) =>
      (targetAnime.slug && w.slug === targetAnime.slug) ||
      w.title.toLowerCase() === targetAnime.title.toLowerCase()
  );

  const handleBookmark = () => {
    const newItem: MediaItem = {
      id: `anime_${targetAnime.slug || targetAnime.anilistId || Date.now()}`,
      title: resolvedMeta?.title || targetAnime.title,
      originTitle: resolvedMeta?.originTitle || targetAnime.originTitle,
      category: MediaCategory.ANIME,
      status: MediaStatus.WATCHING,
      rating: targetAnime.malScore || 9.0,
      description: resolvedMeta?.synopsis || targetAnime.synopsis || '',
      imageUrl:
        resolvedMeta?.posterUrl ||
        targetAnime.posterUrl ||
        'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-gHSraOSa0nBG.jpg',
      bannerUrl: resolvedMeta?.bannerUrl || targetAnime.bannerUrl,
      genres: resolvedMeta?.genres?.length ? resolvedMeta.genres : ['Anime'],
      createdAt: Date.now(),
      slug: targetAnime.slug || (targetAnime.anilistId ? `anilist_${targetAnime.anilistId}` : undefined),
      releaseYear: resolvedMeta?.year || targetAnime.year || 2026,
      malScore: targetAnime.malScore || 9.0,
      currentProgress: currentEpisode ? `Tập ${currentEpisode.name}` : 'Tập 1'
    };
    onSaveToWatchlist(newItem);
  };

  const handleManualRematch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualKeyword.trim()) return;
    loadStreams(manualKeyword.trim());
  };

  const trailerUrl = resolvedMeta?.trailerUrl || targetAnime.trailerUrl;

  return (
    <div className="fixed inset-0 z-50 bg-[#040509]/95 backdrop-blur-2xl overflow-y-auto animate-fadeIn">
      {/* Top Control Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-[#070913]/90 border-b border-white/10 backdrop-blur-xl gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-pink-500/20 text-slate-200 hover:text-pink-300 border border-white/10 transition-all text-xs font-bold shrink-0"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Đóng Rạp</span>
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
              {resolvedMeta?.title || targetAnime.title}
            </h2>
            <p className="text-[11px] text-pink-400 font-medium truncate">
              {currentEpisode
                ? `Đang phát: Tập ${currentEpisode.name}`
                : playerMode === 'trailer'
                ? 'Đang phát Trailer chính thức'
                : 'Đang dò tìm Multi-Server...'}
              {activeServer ? ` • Nguồn: ${activeServer.serverName}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Chuyển đổi HLS Player vs Embed Player vs Trailer */}
          {currentEpisode?.link_m3u8 && (
            <div className="hidden sm:flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setPlayerMode('hls')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  playerMode === 'hls'
                    ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ HLS Pro (Skip OP)
              </button>
              <button
                onClick={() => setPlayerMode('embed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  playerMode === 'embed'
                    ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🖥️ Embed Backup
              </button>
            </div>
          )}

          {trailerUrl && (
            <button
              onClick={() => setPlayerMode(playerMode === 'trailer' ? (currentEpisode?.link_m3u8 ? 'hls' : 'embed') : 'trailer')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                playerMode === 'trailer'
                  ? 'bg-rose-600 text-white border-rose-400'
                  : 'bg-white/5 hover:bg-rose-500/20 text-rose-300 border-white/10'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>{playerMode === 'trailer' ? 'Quay lại Phim' : 'Xem Trailer'}</span>
            </button>
          )}

          <button
            onClick={handleBookmark}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              isSaved
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/40 text-pink-300'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            <span className="hidden sm:inline">{isSaved ? 'Đã lưu Tủ' : '+ Lưu Tủ'}</span>
          </button>

          <button
            onClick={() => setIsTheater(!isTheater)}
            className="hidden lg:block p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
            title="Chế độ Rạp chiếu (Theater Mode)"
          >
            {isTheater ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Player & Episode Selector Layout */}
      <div
        className={`mx-auto px-3 sm:px-6 py-5 transition-all ${
          isTheater ? 'max-w-[1800px]' : 'max-w-[1550px]'
        }`}
      >
        <div className={`grid gap-6 ${isTheater ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
          {/* Cột Trái: Video Player + Multi-Server Switcher + Relations */}
          <div className={isTheater ? 'col-span-1 space-y-4' : 'lg:col-span-8 xl:col-span-9 space-y-4'}>
            {/* Khung Video 16:9 */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/15 shadow-2xl shadow-pink-500/10">
              {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#090c18] p-4 text-center">
                  <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
                  <p className="text-sm font-bold text-slate-200">
                    Đang tải nguồn phát tốc độ cao (Server 1 & Server 2)...
                  </p>
                  <p className="text-xs text-slate-400">
                    Đang đối chiếu tên phim & tổng hợp toàn bộ Server Vietsub / Thuyết minh
                  </p>
                </div>
              ) : playerMode === 'trailer' && trailerUrl ? (
                <iframe
                  src={`${trailerUrl}?autoplay=1`}
                  title="Official Anime Trailer"
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : currentEpisode ? (
                playerMode === 'hls' && currentEpisode.link_m3u8 ? (
                  <div className="relative w-full h-full group">
                    <video
                      ref={videoRef}
                      controls
                      playsInline
                      className="w-full h-full object-contain bg-black"
                      poster={resolvedMeta?.bannerUrl || targetAnime.bannerUrl || targetAnime.posterUrl}
                    />
                    <button
                      onClick={handleSkipIntro}
                      className="absolute bottom-16 right-5 z-20 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600/90 hover:bg-pink-500 text-white font-extrabold text-xs shadow-lg border border-pink-300/40 backdrop-blur-md transition-all hover:scale-105"
                    >
                      <FastForward className="w-4 h-4" />
                      <span>Bỏ qua Intro (+85s)</span>
                    </button>
                  </div>
                ) : (
                  <iframe
                    src={currentEpisode.link_embed}
                    title={currentEpisode.filename || currentEpisode.name}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#090c18]">
                  <Film className="w-12 h-12 text-slate-600 mb-3" />
                  <p className="text-base font-bold text-slate-200">
                    Chưa khớp tự động được bản Vietsub cho bộ Anime này
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    Một số bộ Anime rất mới hoặc đặt tên tiếng Việt khác hoàn toàn tên gốc. Bạn hãy gõ tên tiếng Việt ngắn gọn vào ô "Dò lại nguồn" ngay bên dưới để tìm trực tiếp!
                  </p>
                </div>
              )}
            </div>

            {/* Thanh điều khiển Tập trước / Tập tiếp & Dò lại nguồn thủ công */}
            <div className="glass-panel rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    disabled={!hasPrevEp}
                    onClick={() => {
                      if (hasPrevEp) {
                        resumeTimeRef.current = 0;
                        setCurrentEpisode(episodes[currentEpIndex - 1]);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-xs font-bold text-slate-200 border border-white/10 transition-all"
                  >
                    <SkipBack className="w-4 h-4" />
                    <span>Tập trước</span>
                  </button>
                  <button
                    disabled={!hasNextEp}
                    onClick={() => {
                      if (hasNextEp) {
                        resumeTimeRef.current = 0;
                        setCurrentEpisode(episodes[currentEpIndex + 1]);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 disabled:opacity-40 text-xs font-bold text-pink-300 border border-pink-500/30 transition-all"
                  >
                    <span>Tập tiếp theo</span>
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Ô dò lại nguồn thủ công nếu phim ra nhầm phần hoặc chưa tìm thấy */}
                <form onSubmit={handleManualRematch} className="flex items-center gap-2 flex-1 max-w-sm">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={manualKeyword}
                      onChange={(e) => setManualKeyword(e.target.value)}
                      placeholder="Sai phim? Gõ tên tiếng Việt dò lại..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shrink-0"
                  >
                    Dò Lại
                  </button>
                </form>
              </div>

              {/* Danh sách các Server tìm được */}
              {servers.length > 0 && (
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <Server className="w-4 h-4 text-pink-400" />
                      <span>CHỌN SERVER PHÁT ({servers.length} NGUỒN):</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {servers.map((srv, idx) => {
                      const active = idx === selectedServerIdx;
                      return (
                        <button
                          key={`${srv.serverName}_${idx}`}
                          onClick={() => {
                            setSelectedServerIdx(idx);
                            const sameEp =
                              srv.episodes.find((e) => e.name === currentEpisode?.name) ||
                              srv.episodes[0];
                            if (sameEp) {
                              resumeTimeRef.current = 0;
                              setCurrentEpisode(sameEp);
                              setPlayerMode(sameEp.link_m3u8 ? 'hls' : 'embed');
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 border ${
                            active
                              ? `bg-gradient-to-r ${srv.badgeColor} text-white border-white/30 shadow-lg scale-[1.02]`
                              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-white/10'
                          }`}
                        >
                          <span>{srv.serverName}</span>
                          <span className="px-1.5 py-0.5 rounded bg-black/30 text-[10px]">
                            {srv.episodes.length} tập
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sơ đồ Các Phần Liên Quan (Season 1 -> Movie -> Season 2) */}
            {relations.length > 0 && (
              <div className="glass-panel rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  <span>CÁC PHẦN LIÊN QUAN & THỨ TỰ XEM (FRANCHISE WATCH ORDER)</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                  {relations.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() =>
                        onSwitchAnime?.({
                          anilistId: rel.id,
                          title: rel.title,
                          originTitle: rel.englishTitle,
                          posterUrl: rel.posterUrl,
                          bannerUrl: rel.bannerUrl,
                          year: rel.year,
                          malScore: rel.score
                        })
                      }
                      className="w-56 shrink-0 flex gap-3 p-2.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-cyan-400/50 cursor-pointer transition-all group"
                    >
                      <img
                        src={rel.posterUrl}
                        alt={rel.title}
                        className="w-14 h-20 object-cover rounded-lg shrink-0"
                      />
                      <div className="min-w-0 flex flex-col justify-between">
                        <span className="inline-block self-start px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                          {rel.relationType} • {rel.format || 'TV'}
                        </span>
                        <p className="text-xs font-bold text-white line-clamp-2 group-hover:text-cyan-300">
                          {rel.title}
                        </p>
                        {rel.year && (
                          <span className="text-[10px] text-slate-400">Năm {rel.year}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thông tin chi tiết bộ Anime */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row gap-5">
              {(resolvedMeta?.posterUrl || targetAnime.posterUrl) && (
                <img
                  src={resolvedMeta?.posterUrl || targetAnime.posterUrl}
                  alt={targetAnime.title}
                  className="w-28 sm:w-32 h-40 sm:h-44 object-cover rounded-xl border border-white/10 shrink-0"
                />
              )}
              <div className="space-y-2.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[11px] font-bold">
                    {resolvedMeta?.quality || 'FHD 1080p'}
                  </span>
                  {studios.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {studios.join(', ')}
                    </span>
                  )}
                  {resolvedMeta?.year && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[11px] font-semibold">
                      Năm {resolvedMeta.year}
                    </span>
                  )}
                  {(resolvedMeta?.genres || []).map((g, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[11px]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  {resolvedMeta?.title || targetAnime.title}
                </h3>
                {resolvedMeta?.originTitle && (
                  <p className="text-xs text-slate-400 font-medium">
                    Tên gốc: <span className="text-slate-200">{resolvedMeta.originTitle}</span>
                  </p>
                )}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-4">
                  {resolvedMeta?.synopsis ||
                    targetAnime.synopsis ||
                    'Đang cập nhật nội dung tóm tắt cho bộ Anime này.'}
                </p>
              </div>
            </div>
          </div>

          {/* Cột Phải: Danh Sách Tập Phim (Đánh dấu các tập đã xem) */}
          <div className={isTheater ? 'col-span-1' : 'lg:col-span-4 xl:col-span-3'}>
            <div className="glass-panel rounded-2xl p-4 flex flex-col h-[520px] lg:h-[680px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-pink-400" />
                  <h3 className="text-sm font-extrabold text-white">
                    TẬP PHIM ({episodes.length})
                  </h3>
                </div>
                <input
                  type="text"
                  value={epSearch}
                  onChange={(e) => setEpSearch(e.target.value)}
                  placeholder="Tìm tập..."
                  className="w-24 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-white/10 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2 content-start">
                {filteredEpisodes.map((ep, idx) => {
                  const isCurrent = currentEpisode?.slug === ep.slug;
                  const isWatched = watchedEpisodes.includes(ep.name);
                  return (
                    <button
                      key={`${ep.slug}_${idx}`}
                      onClick={() => {
                        resumeTimeRef.current = 0;
                        setCurrentEpisode(ep);
                        setPlayerMode(ep.link_m3u8 ? 'hls' : 'embed');
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all border truncate ${
                        isCurrent
                          ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white border-pink-300/50 shadow-lg shadow-pink-500/25 scale-105'
                          : isWatched
                          ? 'bg-slate-800/40 text-violet-300 border-violet-500/30 hover:border-pink-500/40'
                          : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-white/10 hover:border-pink-500/40'
                      }`}
                      title={isWatched ? 'Đã xem' : `Tập ${ep.name}`}
                    >
                      {ep.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimePlayerModal;
