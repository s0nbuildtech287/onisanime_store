import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Bookmark,
  Check,
  Columns,
  ScrollText,
  ZoomIn,
  ZoomOut,
  List,
  Sidebar as SidebarIcon,
  Search,
  Share2
} from 'lucide-react';
import {
  MangaCardItem,
  MangaChapterItem,
  MediaCategory,
  MediaItem,
  MediaStatus
} from '../types';
import { mangaApi } from '../services/otakuApi';

interface MangaReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMangaSlug: string | null;
  watchlist: MediaItem[];
  onSaveToWatchlist: (item: MediaItem) => void;
}

const CHUNK_SIZE = 50;

const MangaReaderModal: React.FC<MangaReaderModalProps> = ({
  isOpen,
  onClose,
  targetMangaSlug,
  watchlist,
  onSaveToWatchlist
}) => {
  const [mangaDetail, setMangaDetail] = useState<MangaCardItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeChapter, setActiveChapter] = useState<MangaChapterItem | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [readMode, setReadMode] = useState<'webtoon' | 'page'>('webtoon');
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [zoomWidth, setZoomWidth] = useState(800);
  const [chapSearch, setChapSearch] = useState('');
  const [isDescOrder, setIsDescOrder] = useState(false);
  const [selectedChunkIdx, setSelectedChunkIdx] = useState(0);
  const [showSidebar, setShowSidebar] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Tải thông tin truyện & danh sách Chapter khi mở modal
  useEffect(() => {
    if (!isOpen || !targetMangaSlug) return;
    setLoadingDetail(true);
    setMangaDetail(null);
    setActiveChapter(null);
    setPages([]);
    setSelectedChunkIdx(0);
    setChapSearch('');
    setErrorMsg(null);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowSidebar(false);
    }

    mangaApi
      .getMangaDetail(targetMangaSlug)
      .then((detail) => {
        if (!detail) {
          setErrorMsg('Không thể tải thông tin truyện từ server. Vui lòng thử lại.');
          return;
        }
        setMangaDetail(detail);
        if (detail?.chapters && detail.chapters.length > 0) {
          const first = isDescOrder ? detail.chapters[0] : detail.chapters[detail.chapters.length - 1];
          setActiveChapter(first || detail.chapters[0]);
        } else {
          setErrorMsg('Truyện này hiện chưa có chapter nào.');
        }
      })
      .catch(() => setErrorMsg('Lỗi kết nối khi tải danh sách chapter.'))
      .finally(() => setLoadingDetail(false));
  }, [isOpen, targetMangaSlug]);

  // Tải các trang ảnh của Chapter đang chọn
  useEffect(() => {
    if (!activeChapter?.chapter_api_data) return;
    setLoadingPages(true);
    setPages([]);
    setCurrentPageIdx(0);
    setErrorMsg(null);

    mangaApi
      .getChapterPages(activeChapter.chapter_api_data)
      .then((res) => {
        if (!res.pages || res.pages.length === 0) {
          setErrorMsg('Không tải được trang ảnh cho chapter này.');
        } else {
          setPages(res.pages);
        }
      })
      .catch(() => setErrorMsg('Lỗi kết nối khi tải trang ảnh.'))
      .finally(() => setLoadingPages(false));
  }, [activeChapter]);

  const rawChapters = useMemo(() => mangaDetail?.chapters || [], [mangaDetail]);
  const chapters = useMemo(
    () => (isDescOrder ? rawChapters : [...rawChapters].reverse()),
    [rawChapters, isDescOrder]
  );

  const filteredChapters = useMemo(() => {
    if (!chapSearch.trim()) return chapters;
    const kw = chapSearch.trim().toLowerCase();
    return chapters.filter(
      (c) =>
        c.chapter_name.toLowerCase().includes(kw) ||
        (c.chapter_title && c.chapter_title.toLowerCase().includes(kw))
    );
  }, [chapters, chapSearch]);

  // Chia nhỏ danh sách thành từng cụm 50 tập (Chunks)
  const totalChunks = Math.ceil(filteredChapters.length / CHUNK_SIZE);
  const currentChunkChapters = useMemo(() => {
    if (filteredChapters.length <= CHUNK_SIZE || chapSearch.trim()) {
      return filteredChapters;
    }
    const start = selectedChunkIdx * CHUNK_SIZE;
    return filteredChapters.slice(start, start + CHUNK_SIZE);
  }, [filteredChapters, selectedChunkIdx, chapSearch]);

  // Tự động chuyển Chunk khi activeChapter thay đổi
  useEffect(() => {
    if (!activeChapter || filteredChapters.length <= CHUNK_SIZE) return;
    const foundIdx = filteredChapters.findIndex(
      (c) => c.chapter_api_data === activeChapter.chapter_api_data
    );
    if (foundIdx !== -1) {
      const neededChunk = Math.floor(foundIdx / CHUNK_SIZE);
      if (neededChunk !== selectedChunkIdx) {
        setSelectedChunkIdx(neededChunk);
      }
    }
  }, [activeChapter, filteredChapters]);

  if (!isOpen || !targetMangaSlug) return null;

  const currentChapIdx = chapters.findIndex(
    (c) => c.chapter_api_data === activeChapter?.chapter_api_data
  );
  const hasPrevChap = currentChapIdx > 0;
  const hasNextChap = currentChapIdx >= 0 && currentChapIdx < chapters.length - 1;

  const isSaved = watchlist.some((w) => w.slug === targetMangaSlug);

  const handleBookmark = () => {
    if (!mangaDetail) return;
    const item: MediaItem = {
      id: `manga_${mangaDetail.slug}`,
      title: mangaDetail.title,
      originTitle: mangaDetail.originTitle,
      category: MediaCategory.MANGA,
      status: MediaStatus.WATCHING,
      rating: 9.5,
      description: mangaDetail.description || '',
      imageUrl: mangaDetail.thumbUrl,
      genres: mangaDetail.genres || ['Manga'],
      createdAt: Date.now(),
      slug: mangaDetail.slug,
      currentProgress: activeChapter ? `Chap ${activeChapter.chapter_name}` : 'Chap 1'
    };
    onSaveToWatchlist(item);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05060b]/95 backdrop-blur-2xl flex flex-col">
      {/* Top Reader Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-[#090c16] border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-white/10 text-xs font-bold transition-all"
          >
            <X className="w-4 h-4" />
            <span>Đóng</span>
          </button>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-xs sm:max-w-md">
              {mangaDetail?.title || 'Đang tải truyện...'}
            </h2>
            <p className="text-[11px] text-emerald-400 font-semibold truncate">
              {activeChapter ? `Chapter ${activeChapter.chapter_name}` : 'Chọn chapter'} •{' '}
              {pages.length} trang ảnh
            </p>
          </div>
        </div>

        {/* Chuyển Chapter nhanh + Chế độ đọc */}
        <div className="flex items-center gap-2">
          <button
            disabled={!hasPrevChap}
            onClick={() => hasPrevChap && setActiveChapter(chapters[currentChapIdx - 1])}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-slate-200"
            title="Chap trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={activeChapter?.chapter_api_data || ''}
            onChange={(e) => {
              const found = chapters.find((c) => c.chapter_api_data === e.target.value);
              if (found) setActiveChapter(found);
            }}
            className="bg-slate-900 border border-white/15 rounded-xl px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 max-w-[150px]"
          >
            {chapters.map((ch, idx) => (
              <option key={idx} value={ch.chapter_api_data}>
                Chapter {ch.chapter_name}
              </option>
            ))}
          </select>

          <button
            disabled={!hasNextChap}
            onClick={() => hasNextChap && setActiveChapter(chapters[currentChapIdx + 1])}
            className="p-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-30 border border-emerald-500/40 text-emerald-300"
            title="Chap tiếp theo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Chế độ Cuộn dọc (Webtoon) vs Lật trang (Page) */}
          <div className="hidden md:flex items-center bg-slate-900 p-0.5 rounded-xl border border-white/10">
            <button
              onClick={() => setReadMode('webtoon')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                readMode === 'webtoon'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Cuộn</span>
            </button>
            <button
              onClick={() => setReadMode('page')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                readMode === 'page'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Lật Trang</span>
            </button>
          </div>

          {/* Phóng to / Thu nhỏ */}
          <div className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setZoomWidth((w) => Math.max(500, w - 120))}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomWidth((w) => Math.min(1300, w + 120))}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href).catch(() => {});
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border bg-white/5 hover:bg-cyan-500/20 text-cyan-300 border-white/10 transition-all"
            title="Copy link chia sẻ truyện này"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden md:inline">{copiedLink ? 'Đã chép' : 'Chia sẻ'}</span>
          </button>

          <button
            onClick={handleBookmark}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              isSaved
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-pink-500/20 border-pink-500/40 text-pink-300'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            <span className="hidden sm:inline">{isSaved ? 'Đã Lưu' : '+ Lưu'}</span>
          </button>

          {/* Nút Ẩn/Hiện Sidebar Chapter */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-1.5 rounded-xl border transition-all ${
              showSidebar
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
            title="Đóng / Mở danh sách Chapter"
          >
            <SidebarIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: Cột đọc truyện + Sidebar chọn Chapter */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Khu vực hiển thị trang truyện */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-[#05060a] flex flex-col items-center py-3 px-1 sm:px-3">
          {loadingDetail || loadingPages ? (
            <div className="my-auto flex flex-col items-center gap-3 p-6 text-center">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <p className="text-sm font-bold text-slate-200">
                Đang tải các trang truyện từ CDN tốc độ cao...
              </p>
            </div>
          ) : errorMsg ? (
            <div className="my-auto text-center p-6 max-w-sm space-y-3">
              <BookOpen className="w-12 h-12 text-rose-400 mx-auto" />
              <p className="text-sm font-bold text-rose-300">{errorMsg}</p>
              <button
                onClick={() => {
                  if (activeChapter) {
                    const copy = { ...activeChapter };
                    setActiveChapter(null);
                    setTimeout(() => setActiveChapter(copy), 50);
                  } else if (targetMangaSlug) {
                    setErrorMsg(null);
                    setLoadingDetail(true);
                    mangaApi.getMangaDetail(targetMangaSlug).then(setMangaDetail).finally(() => setLoadingDetail(false));
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold"
              >
                Thử Tải Lại
              </button>
            </div>
          ) : pages.length === 0 ? (
            <div className="my-auto text-center p-6">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Chọn một Chapter bên phải để bắt đầu đọc.</p>
            </div>
          ) : readMode === 'webtoon' ? (
            <div className="flex flex-col items-center w-full" style={{ maxWidth: `${zoomWidth}px` }}>
              {pages.map((imgUrl, idx) => (
                <img
                  key={`${activeChapter?.chapter_api_data}_${idx}`}
                  src={imgUrl}
                  alt={`Trang ${idx + 1}`}
                  decoding="async"
                  className="w-full h-auto block select-none bg-slate-900 min-h-[120px]"
                />
              ))}

              {/* Nút chuyển chap cuối trang */}
              <div className="flex items-center gap-4 my-10">
                <button
                  disabled={!hasPrevChap}
                  onClick={() => hasPrevChap && setActiveChapter(chapters[currentChapIdx - 1])}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-extrabold text-white"
                >
                  ← Chapter Trước
                </button>
                <button
                  disabled={!hasNextChap}
                  onClick={() => hasNextChap && setActiveChapter(chapters[currentChapIdx + 1])}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-40 text-xs font-extrabold text-slate-950 shadow-lg"
                >
                  Chapter Tiếp Theo →
                </button>
              </div>
            </div>
          ) : (
            /* Chế độ Lật từng trang */
            <div className="flex flex-col items-center my-auto w-full max-w-4xl">
              <img
                src={pages[currentPageIdx]}
                alt={`Trang ${currentPageIdx + 1}`}
                className="max-h-[78vh] w-auto object-contain rounded-lg shadow-2xl border border-white/10"
              />
              <div className="flex items-center gap-4 mt-4">
                <button
                  disabled={currentPageIdx <= 0}
                  onClick={() => setCurrentPageIdx((i) => Math.max(0, i - 1))}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold disabled:opacity-40"
                >
                  ← Trang trước
                </button>
                <span className="text-xs font-bold text-emerald-400">
                  Trang {currentPageIdx + 1} / {pages.length}
                </span>
                <button
                  disabled={currentPageIdx >= pages.length - 1}
                  onClick={() => setCurrentPageIdx((i) => Math.min(pages.length - 1, i + 1))}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold disabled:opacity-40"
                >
                  Trang sau →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Backdrop cho Mobile khi mở Sidebar Drawer */}
        {showSidebar && (
          <div
            onClick={() => setShowSidebar(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-30"
          />
        )}

        {/* Sidebar danh sách Chapter bên phải (Drawer nổi trên Mobile, cột cố định trên Desktop) */}
        {showSidebar && (
          <div className="fixed lg:static inset-y-0 right-0 top-[52px] lg:top-auto w-80 sm:w-96 bg-[#080b14] border-l border-white/10 flex flex-col p-3.5 z-40 lg:z-20 shadow-2xl lg:shadow-none transition-all shrink-0">
            {/* Header Sidebar & Tìm kiếm */}
            <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-white/10 gap-2">
              <button
                onClick={() => setIsDescOrder(!isDescOrder)}
                className="text-xs font-extrabold text-white flex items-center gap-1.5 hover:text-emerald-400 transition-colors shrink-0"
                title="Đổi thứ tự xem chapter"
              >
                <List className="w-4 h-4 text-emerald-400" />
                <span>CHAP ({chapters.length}) {isDescOrder ? '↓ Mới' : '↑ Cũ'}</span>
              </button>

              <div className="relative flex-1 max-w-[150px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chapSearch}
                  onChange={(e) => setChapSearch(e.target.value)}
                  placeholder="Gõ số chap..."
                  className="w-full pl-8 pr-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Phân đoạn Chapter Chunks nếu truyện có hơn 50 chap */}
            {totalChunks > 1 && !chapSearch.trim() && (
              <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 no-scrollbar">
                {Array.from({ length: totalChunks }).map((_, cIdx) => {
                  const startNum = cIdx * CHUNK_SIZE + 1;
                  const endNum = Math.min((cIdx + 1) * CHUNK_SIZE, filteredChapters.length);
                  const isCurrent = selectedChunkIdx === cIdx;
                  return (
                    <button
                      key={cIdx}
                      onClick={() => setSelectedChunkIdx(cIdx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all border shrink-0 ${
                        isCurrent
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white border-white/10'
                      }`}
                    >
                      {startNum} - {endNum}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Danh Sách Nút Chapter (Grid 4 cột thoáng, số to rõ ràng) */}
            <div className="flex-1 overflow-y-auto grid grid-cols-4 sm:grid-cols-4 gap-2 content-start pr-1">
              {currentChunkChapters.map((ch, idx) => {
                const active = activeChapter?.chapter_api_data === ch.chapter_api_data;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveChapter(ch);
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        setShowSidebar(false);
                      }
                    }}
                    title={ch.chapter_title || `Chapter ${ch.chapter_name}`}
                    className={`h-10 px-1 rounded-xl text-xs font-black transition-all border flex items-center justify-center truncate ${
                      active
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 border-emerald-200 shadow-lg shadow-emerald-500/25 scale-[1.03]'
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-white/10 hover:border-emerald-500/40'
                    }`}
                  >
                    <span>{ch.chapter_name}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer tóm tắt số chap */}
            <div className="pt-2.5 mt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>Đang đọc: <strong className="text-emerald-400">Chap {activeChapter?.chapter_name || '1'}</strong></span>
              <span>Tổng: {chapters.length} tập</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MangaReaderModal;
