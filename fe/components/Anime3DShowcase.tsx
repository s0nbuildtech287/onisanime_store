import React, { useState } from 'react';
import {
  Play,
  Sparkles,
  Flame,
  Star,
  ArrowRight,
  BookOpen,
  Trophy,
  Tv,
  Zap,
  Calendar
} from 'lucide-react';
import { AppTab } from '../types';
import { PlayerTargetAnime } from './AnimePlayerModal';
import BrandLogo from './BrandLogo';

interface Anime3DShowcaseProps {
  onEnterApp: (tab?: AppTab) => void;
  onPlayFeaturedAnime: (anime: PlayerTargetAnime) => void;
}

const FLOATING_3D_CARDS = [
  {
    anilistId: 151807,
    title: 'Solo Leveling',
    originTitle: 'Ore dake Level Up na Ken',
    badge: 'SIÊU PHẨM ACTION',
    rating: 9.8,
    year: 2024,
    img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iwfIsLu.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg',
    classAnimation: 'animate-fly-3d-1',
    position: 'top-20 left-6 xl:left-16',
    tagColor: 'from-violet-600 to-indigo-600'
  },
  {
    anilistId: 154587,
    title: 'Sousou no Frieren',
    originTitle: 'Sousou no Frieren',
    badge: 'TOP #1 ANIME',
    rating: 9.9,
    year: 2023,
    img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-gHSraOSa0nBG.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg',
    classAnimation: 'animate-fly-3d-2',
    position: 'bottom-20 left-8 xl:left-24',
    tagColor: 'from-pink-500 to-rose-600'
  },
  {
    anilistId: 101922,
    title: 'Kimetsu no Yaiba',
    originTitle: 'Kimetsu no Yaiba',
    badge: 'UFOTABLE 4K',
    rating: 9.6,
    year: 2019,
    img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgYL.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgYL.jpg',
    classAnimation: 'animate-fly-3d-3',
    position: 'top-24 right-6 xl:right-16',
    tagColor: 'from-amber-500 to-orange-600'
  },
  {
    anilistId: 21,
    title: 'One Piece',
    originTitle: 'One Piece',
    badge: 'HUYỀN THOẠI',
    rating: 9.7,
    year: 1999,
    img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-ELSYx3yMPcKM.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-ELSYx3yMPcKM.jpg',
    classAnimation: 'animate-fly-3d-4',
    position: 'bottom-20 right-8 xl:right-24',
    tagColor: 'from-emerald-500 to-teal-600'
  }
];

const POSTERS_ROW_1 = [
  { title: 'Attack on Titan', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-buvcRTBx4NSm.jpg' },
  { title: 'Jujutsu Kaisen', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-LHBAeoZDIsnF.jpg' },
  { title: 'Solo Leveling', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iwfIsLu.png' },
  { title: 'Frieren', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-gHSraOSa0nBG.jpg' },
  { title: 'Chainsaw Man', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-DdP4vAdssLoz.png' },
  { title: 'Hunter x Hunter', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx11061-y5gsT1hoHuHw.png' }
];

const POSTERS_ROW_2 = [
  { title: 'Demon Slayer', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgYL.jpg' },
  { title: 'One Piece', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-ELSYx3yMPcKM.jpg' },
  { title: 'Your Name', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21519-SUo3ZQuCbYhJ.png' },
  { title: 'One-Punch Man', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21087-B5DHjqZ3kW4b.jpg' },
  { title: 'Naruto', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20-dE6UHbFFg1A5.jpg' },
  { title: 'Fullmetal Alchemist', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx5114-nSWCgQlmOMtj.jpg' }
];

const POSTERS_ROW_3 = [
  { title: 'Death Note', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1535-kUgkcrfOrkUM.jpg' },
  { title: 'A Silent Voice', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20954-sYRfE5jQRtSB.jpg' },
  { title: 'My Hero Academia', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg' },
  { title: 'Sword Art Online', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx11757-SxYDUzdr9rh2.jpg' },
  { title: 'Attack on Titan Final', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx110277-sKUNXAsWMNFw.jpg' },
  { title: 'The Promised Neverland', img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-8UR7r9MNVpz2.jpg' }
];

const Anime3DShowcase: React.FC<Anime3DShowcaseProps> = ({
  onEnterApp,
  onPlayFeaturedAnime
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    const x = ((clientX - left) / width - 0.5) * 2;
    const y = ((clientY - top) / height - 0.5) * 2;
    setMousePos({ x, y });
  };

  const tiltX = -mousePos.y * 10;
  const tiltY = mousePos.x * 10;

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-screen w-full bg-[#06070d] text-slate-100 flex flex-col justify-between p-5 sm:p-10 select-none overflow-hidden perspective-cinema"
    >
      {/* ================= 1. NỀN POSTER WALL ANIME CHẠY NGANG RỰC RỠ ================= */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex flex-col justify-center gap-5 opacity-95">
        <div className="animate-marquee-left gap-4">
          {[...POSTERS_ROW_1, ...POSTERS_ROW_1, ...POSTERS_ROW_1].map((p, i) => (
            <div
              key={`r1-${i}`}
              className="w-36 sm:w-52 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden bg-slate-900 border border-white/20 shadow-2xl brightness-105 contrast-105"
            >
              <img src={p.img} alt={p.title} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <div className="animate-marquee-right gap-4">
          {[...POSTERS_ROW_2, ...POSTERS_ROW_2, ...POSTERS_ROW_2].map((p, i) => (
            <div
              key={`r2-${i}`}
              className="w-36 sm:w-52 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden bg-slate-900 border border-white/20 shadow-2xl brightness-105 contrast-105"
            >
              <img src={p.img} alt={p.title} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <div className="animate-marquee-left gap-4 hidden md:flex">
          {[...POSTERS_ROW_3, ...POSTERS_ROW_3, ...POSTERS_ROW_3].map((p, i) => (
            <div
              key={`r3-${i}`}
              className="w-36 sm:w-52 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden bg-slate-900 border border-white/20 shadow-2xl brightness-105 contrast-105"
            >
              <img src={p.img} alt={p.title} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Vignette nhẹ ở viền ngoài & ánh sáng Neon Sakura-Violet */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(6,7,13,0.42) 0%, rgba(6,7,13,0.82) 72%, rgba(6,7,13,0.96) 100%)'
        }}
      />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-pink-600/20 blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[150px] pointer-events-none z-0" />

      {/* ================= 2. 4 THẺ SIÊU PHẨM 3D BAY LƠ LỬNG ================= */}
      {FLOATING_3D_CARDS.map((card, i) => (
        <div
          key={i}
          onClick={() =>
            onPlayFeaturedAnime({
              anilistId: card.anilistId,
              title: card.title,
              originTitle: card.originTitle,
              posterUrl: card.img,
              bannerUrl: card.bannerUrl,
              year: card.year,
              malScore: card.rating
            })
          }
          className={`hidden lg:flex flex-col w-44 xl:w-52 rounded-2xl overflow-hidden bg-[#0c1020]/95 border border-white/25 shadow-2xl shadow-pink-500/20 absolute z-20 cursor-pointer group hover:border-pink-400 hover:scale-110 transition-all duration-300 ${card.position} ${card.classAnimation}`}
          title={`Bấm để xem ngay ${card.title}`}
        >
          <div className="relative aspect-[2/3] w-full overflow-hidden">
            <img
              src={card.img}
              alt={card.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

            <div
              className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-gradient-to-r ${card.tagColor} text-[9px] font-black text-white shadow-lg`}
            >
              {card.badge}
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/45">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 flex items-center justify-center shadow-xl">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>

            <div className="absolute bottom-2.5 left-3 right-3">
              <p className="text-xs font-black text-white truncate">{card.title}</p>
              <div className="flex items-center justify-between text-[10px] text-amber-300 font-extrabold mt-0.5">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-300" /> {card.rating}
                </span>
                <span className="text-slate-300">{card.year}</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* ================= 3. TOP BAR ================= */}
      <header className="relative z-20 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <BrandLogo className="w-12 h-12 shadow-xl shadow-pink-500/30 rounded-2xl" />
          <div>
            <span className="font-heading text-xl font-black tracking-tight text-white">
              ONISANIME <span className="text-pink-400">PRO</span>
            </span>
            <p className="text-[11px] text-slate-300 font-medium">
              Otaku Cinema & Manga Universe
            </p>
          </div>
        </div>

        <button
          onClick={() => onEnterApp('anime')}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-pink-500 text-white text-xs font-extrabold border border-white/20 backdrop-blur-md transition-all flex items-center gap-1.5"
        >
          <span>Bỏ qua Intro</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* ================= 4. CENTER HERO GLASS PANEL (3D TILT) ================= */}
      <main className="relative z-20 flex-1 flex items-center justify-center my-6">
        <div
          style={{
            transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
            transition: 'transform 0.12s ease-out'
          }}
          className="luxury-otaku-glass rounded-[32px] p-7 sm:p-12 max-w-2xl w-full text-center space-y-6"
        >
          {/* Status Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-200 text-xs font-extrabold shadow-lg">
            <Flame className="w-4 h-4 text-pink-400 animate-pulse" />
            <span>SIÊU NỀN TẢNG ANIME & MANGA ĐA NGUỒN</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-3">
            <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              THẾ GIỚI{' '}
              <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">
                ANIME & MANGA
              </span>{' '}
              ĐỈNH CAO
            </h1>
            <p className="text-xs sm:text-base text-slate-200 max-w-xl mx-auto leading-relaxed">
              Thưởng thức hàng ngàn bộ Anime Vietsub Full HD 1080p với Multi-Server siêu mượt, theo dõi lịch chiếu Simulcast thời gian thực và đọc trọn bộ Manga tiếng Việt không giới hạn.
            </p>
          </div>

          {/* 3 Nút Hành Động Chính */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onEnterApp('anime')}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white font-black text-sm shadow-2xl shadow-pink-500/40 transition-all hover:scale-105 cursor-pointer"
            >
              <Tv className="w-5 h-5" />
              <span>KHÁM PHÁ ANIME NGAY</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onEnterApp('manga')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 cursor-pointer"
            >
              <BookOpen className="w-5 h-5" />
              <span>ĐỌC MANGA</span>
            </button>
          </div>

          {/* Quick Links phụ */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs font-bold text-slate-300">
            <button
              onClick={() => onEnterApp('schedule')}
              className="flex items-center gap-1.5 hover:text-pink-400 transition-colors"
            >
              <Calendar className="w-4 h-4 text-pink-400" />
              <span>Lịch Chiếu Tuần</span>
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => onEnterApp('ranking')}
              className="flex items-center gap-1.5 hover:text-amber-300 transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>BXH Podium Top 1-24</span>
            </button>
            <span className="text-slate-600">•</span>
            <span className="hidden lg:inline-flex items-center gap-1.5 text-cyan-300">
              <Zap className="w-4 h-4" /> Click 4 thẻ 3D xung quanh để xem ngay!
            </span>
          </div>
        </div>
      </main>

      {/* ================= 5. FOOTER STATS ================= */}
      <footer className="relative z-20 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { num: '3.600+', label: 'Anime Vietsub & Donghua', color: 'text-pink-400' },
            { num: '20.000+', label: 'Truyện Manga / Manhwa', color: 'text-emerald-400' },
            { num: '1080p HLS', label: 'Multi-Server Không Lag', color: 'text-cyan-400' },
            { num: '24/7 Live', label: 'Lịch Chiếu & BXH Toàn Cầu', color: 'text-amber-400' }
          ].map((st, idx) => (
            <div
              key={idx}
              className="px-3 py-2.5 rounded-2xl bg-black/55 border border-white/10 backdrop-blur-md"
            >
              <p className={`text-sm sm:text-base font-black ${st.color}`}>{st.num}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium">{st.label}</p>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default Anime3DShowcase;

