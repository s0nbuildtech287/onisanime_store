# 🌸 ONISANIME STORE PRO — KẾ HOẠCH PHÁT TRIỂN NỀN TẢNG ANIME & MANGA ĐA NGUỒN (HYBRID OTAKU HUB)

> **Tầm nhìn dự án:** Xây dựng một siêu ứng dụng (Super Web App) chuyên biệt cho **Anime & Manga** với độ phủ dữ liệu **100% chuẩn Quốc tế (MyAnimeList / AniList)** kết hợp **Trình phát Multi-Server thông minh (Vietsub truyền thống + HiAnime 1080p Softsub + AI Dịch Phụ Đề Tự Động)** và **Trình đọc Manga/Manhwa mượt mà**, hoàn toàn không tốn chi phí lưu trữ video.

---

## 🎯 I. GIẢI QUYẾT BÀI TOÁN CỐT LÕI (WHY HYBRID?)

| Vấn đề của các web hiện tại | Giải pháp của **Onisanime Store Pro** |
| :--- | :--- |
| **Chỉ dùng OPhim / KKPhim**: Chỉ có ~60-70% Anime, thiếu Anime ngách theo mùa, thiếu OVA, đặt tên thuần Việt khó tra cứu theo Season. | Dùng **AniList GraphQL & Jikan (MyAnimeList) API** làm khung dữ liệu gốc (Master Metadata) → Đầy đủ **100% Anime toàn cầu**, chia đúng Season 1, Season 2, Movie, OVA, Lịch chiếu theo thứ. |
| **Web Việt Nam (AnimeVietsub/AnimeHay)**: Chặn Cloudflare gắt, đổi tên miền liên tục, dính quảng cáo chèn vào video (Hardsub). | Kết hợp **3 nguồn Vietsub CMS (OPhim + PhimAPI + NguonC)** làm Server Vietsub tự động + **Nguồn Quốc tế HiAnime (`aniwatch-api`)** làm Server 1080p sạch không quảng cáo. |
| **Xem trên HiAnime chỉ có Engsub**: Nhiều bộ Anime hiếm không có nhóm dịch tiếng Việt hoặc ra sub chậm. | **Công nghệ AI Softsub Translator**: Tự động lấy file phụ đề rời `.vtt` tiếng Anh từ HiAnime và dịch sang **Tiếng Việt chuẩn văn phong Anime** trong vài giây (hoặc nạp song ngữ Anh - Việt). |
| **Xem Anime và Đọc Manga bị tách rời**: Xem hết Anime Season 1 muốn đọc tiếp Manga phải sang web khác tìm. | Tích hợp **Manga Reader (OTruyen API + MangaDex API)** ngay trong cùng hệ sinh thái, liên kết trực tiếp giữa bộ Anime đang xem và bộ Manga gốc. |

---

## 🏗️ II. KIẾN TRÚC HỆ THỐNG ĐA NGUỒN (3-LAYER HYBRID ARCHITECTURE)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND: ONISANIME STORE PRO (React 19 + Vite)          │
│  • Giao diện Otaku Cyber-Glassmorphism  • ArtPlayer / HLS Custom Player    │
│  • Watchlist / Readlist cá nhân         • Manga Reader (Webtoon & Page)    │
└───────────────┬────────────────────────────────┬───────────────────────────┘
                │                                │
                ▼                                ▼
┌───────────────────────────────┐  ┌─────────────────────────────────────────┐
│ LỚP 1: MASTER METADATA ENGINE │  │ LỚP 3: CLOUD SYNC & AI ASSISTANT        │
│ • AniList GraphQL API         │  │ • Google Sheets Cloud DB (Apps Script)  │
│ • Jikan v4 API (MyAnimeList)  │  │ • LocalStorage Cache + data.json        │
│ → Lịch chiếu tuần, Anime mùa, │  │ • Gemini AI: Gợi ý Anime + Dịch .vtt    │
│   Seiyuu, Nhân vật, Thứ tự xem│  └─────────────────────────────────────────┘
└───────────────┬───────────────┘
                │ (Smart Title & ID Matcher)
                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   LỚP 2: MULTI-SOURCE STREAMING & MANGA ENGINE             │
├─────────────────────────┬──────────────────────────┬───────────────────────┤
│ 🇻🇳 SERVER VIETSUB (CMS) │ 🌍 SERVER QUỐC TẾ (RAW)  │ 📖 MANGA / MANHWA API │
│ • Server 1: PhimAPI     │ • HiAnime (aniwatch-api) │ • OTruyen API (VN)    │
│ • Server 2: OPhim       │ • Luồng HLS .m3u8 1080p  │ • MangaDex API (VN/EN)│
│ • Server 3: NguonC      │ • Softsub .vtt đa ngôn ngữ│ • CDN Ảnh tốc độ cao │
│ (Hardsub truyền thống)  │ • Auto-Skip Intro/Outro  │                       │
└─────────────────────────┴──────────────────────────┴───────────────────────┘
```

---

## 🔥 III. CÁC TÍNH NĂNG ĐỘT PHÁ (KEY FEATURES)

### 1. 🧭 Trung Tâm Khám Phá Chuẩn Otaku (Otaku Discovery Hub)
- **Hero Banner Điện Ảnh**: Lấy ảnh Banner độ phân giải cao từ AniList kết hợp Trailer YouTube tự phát mượt mà.
- **Lịch Chiếu Anime Trong Tuần (Simulcast Schedule)**:
  - Chia theo Thứ 2 ➔ Chủ Nhật, hiển thị giờ phát sóng tập mới nhất kèm đồng hồ đếm ngược (Countdown tới tập tiếp theo).
- **Khám Phá Theo Mùa (Seasonal Anime Browser)**:
  - Lọc nhanh: *Mùa Đông / Mùa Xuân / Mùa Hạ / Mùa Thu* của từng năm (ví dụ: *Fall 2026*, *Summer 2026*...).
- **Bộ Lọc Chuyên Sâu**:
  - Định dạng: *TV Series, Movie, OVA, ONA, Special, Donghua (Hoạt hình 3D Trung Quốc)*.
  - Thể loại chuẩn MAL: *Isekai, Shonen, Seinen, Romance, Mecha, Psychological, Slice of Life, Dark Fantasy...*
  - Bảng xếp hạng: *Top Airing (Đang chiếu hot nhất)*, *Top All-Time (Huyền thoại)*, *Most Popular (Được yêu thích nhất)*.

### 2. 🎬 Trình Phát Anime Chuyên Nghiệp (Next-Gen Anime Player)
Sử dụng **ArtPlayer / HLS.js** tùy biến riêng cho Anime thay vì chỉ nhúng iframe đơn thuần:
- **Chuyển đổi Multi-Server tức thì (Zero-reload Switch)**:
  - `🇻🇳 Server Vietsub #1 (KKPhim)` — Phù hợp xem nhanh, có sẵn Thuyết minh / Lồng tiếng ở nhiều bộ.
  - `🇻🇳 Server Vietsub #2 (OPhim)` — Kho Anime bộ dài tập ổn định.
  - `🇻🇳 Server Vietsub #3 (NguonC)` — Server dự phòng tốc độ cao.
  - `🌍 Server HiAnime Pro (1080p Softsub)` — Video gốc siêu nét không logo, kèm phụ đề rời `.vtt` (Anh / Việt / Song ngữ).
- **Tính năng độc quyền từ nguồn HiAnime**:
  - **Auto-Skip Intro / Outro**: Tự động nhận diện mốc thời gian nhạc mở đầu (OP) và kết thúc (ED) để hiện nút *"Bỏ qua Intro"* giống Netflix.
  - **Tùy chỉnh Phụ đề rời (Softsub Styler)**: Đổi kích thước chữ, viền chữ, màu sắc, độ mờ nền, hoặc bật **Phụ đề Song Ngữ (Việt + Anh)** để vừa xem Anime vừa học tiếng Anh/Nhật.
- **Sơ đồ Thứ Tự Xem (Franchise Watch Order)**:
  - Hiển thị ngay dưới trình phát: *Season 1 ➔ Movie ➔ OVA ➔ Season 2 ➔ Season 3* để người xem không bị lạc thứ tự.

### 3. 📖 Phân Hệ Đọc Truyện Tranh (Manga / Manhwa / Light Novel Reader)
- Tích hợp trực tiếp **OTruyen API** (truyện tiếng Việt) và **MangaDex API** (đa ngôn ngữ Việt/Anh, ảnh chất lượng cao).
- **2 Chế độ đọc chuyên dụng**:
  - **Webtoon / Manhwa Mode (Cuộn dọc liên tục)**: Tối ưu cho truyện Hàn/Trung và thói quen lướt điện thoại/chuột.
  - **Manga Page Mode (Lật trang trái/phải)**: Chuẩn phong cách đọc Manga Nhật Bản, hỗ trợ phím mũi tên `←` `→`.
- Tự động đánh dấu **Chapter đang đọc dở** và thông báo khi có Chapter mới.

### 4. 🗂️ Tủ Anime & Manga Cá Nhân (My Otaku List — Đồng bộ Google Sheets)
- Kế thừa và nâng cấp từ `oniscenary_store`:
  - Quản lý 2 danh sách: **Anime Watchlist** ( lưu tập đang xem dở, ví dụ: *Tập 8/12*) và **Manga Readlist** (lưu chap đang đọc dở, ví dụ: *Chap 104*).
  - Trạng thái chuẩn MAL: *Đang xem/đọc (Watching/Reading)*, *Hoàn thành (Completed)*, *Dự định (Plan to Watch)*, *Tạm ngưng (On-Hold)*, *Bỏ dở (Dropped)*.
  - Đồng bộ 2 chiều lên **Google Sheets cá nhân** + lưu đệm **LocalStorage** + **file `data.json`**.

### 5. 🏆 Bảng Xếp Hạng (Podium) & 📊 Thống Kê Otaku (Otaku Analytics)
- Vinh danh Top 1, Top 2, Top 3 bộ Anime / Manga đỉnh nhất trong lòng người dùng.
- Thống kê tổng số tập Anime đã cày, tổng số giờ xem, tổng số chap truyện đã đọc, biểu đồ Radar các thể loại yêu thích (ví dụ: thiên hướng *Isekai + Action*).

### 6. 🤖 Trợ Lý AI "Oni-chan" (Powered by Gemini AI)
- Tư vấn Anime/Manga theo tâm trạng hoặc tìm phim qua mô tả cốt truyện mơ hồ (*"Tìm bộ anime có main tóc trắng bá đạo giả làm học sinh yếu..."*).
- Hỗ trợ dịch nhanh phụ đề `.vtt` từ tiếng Anh sang tiếng Việt cho những tập Anime mới ra lò trên HiAnime chưa kịp có nhóm Vietsub dịch.

---

## 🔌 IV. CHI TIẾT CÁC NGUỒN API SẼ TÍCH HỢP

| Phân hệ | Tên API | Base Endpoint | Vai trò chính |
| :--- | :--- | :--- | :--- |
| **Metadata 1** | **Jikan API v4 (MAL)** | `https://api.jikan.moe/v4` | Lịch chiếu tuần (`/schedules`), Anime theo mùa (`/seasons/now`), Top MAL, Nhân vật & Seiyuu. |
| **Metadata 2** | **AniList GraphQL** | `https://graphql.anilist.co` | Ảnh Banner ngang HD, quan hệ giữa các Season (Relations), màu chủ đạo, tìm kiếm tên Nhật/Anh. |
| **Vietsub 1** | **PhimAPI (KKPhim)** | `https://phimapi.com` | Nguồn Anime Vietsub / Thuyết minh & Hoạt hình 3D (`/v1/api/danh-sach/hoat-hinh`). |
| **Vietsub 2** | **OPhim API** | `https://ophim1.com` | Nguồn Anime bộ dài tập Vietsub dự phòng (`/v1/api/danh-sach/hoat-hinh`). |
| **Vietsub 3** | **NguonC API** | `https://phim.nguonc.com` | Nguồn Server dự phòng số 3 (`/api/films/danh-sach/hoat-hinh`). |
| **Quốc tế** | **HiAnime API (`aniwatch`)** | Proxy / Serverless API | Nguồn 100% Anime thế giới, luồng `.m3u8` 1080p sạch + Softsub `.vtt` + mốc Intro/Outro. |
| **Manga VN** | **OTruyen API** | `https://otruyenapi.com/v1/api` | Kho truyện tranh Manga/Manhwa/Manhua tiếng Việt đầy đủ chapter. |
| **Manga Quốc tế**| **MangaDex API** | `https://api.mangadex.org` | Kho Manga quốc tế chất lượng cao (lọc `translatedLanguage[]=vi` và `en`). |

---

## 🧠 V. THUẬT TOÁN TỰ ĐỘNG GHÉP NGUỒN (SMART MULTI-SOURCE MATCHER)

Khi người dùng bấm vào một bộ Anime bất kỳ (ví dụ: **Sousou no Frieren / Pháp Sư Tiễn Táng**), hệ thống sẽ chạy thuật toán **Smart Matcher** song song (`Promise.allSettled`) trong ~400ms:

1. **Bước 1 — Lấy bộ tên đa ngôn ngữ từ AniList/Jikan**:
   - Tên Romaji: `Sousou no Frieren`
   - Tên Tiếng Anh: `Frieren: Beyond Journey's End`
   - Tên Tiếng Nhật: `葬送のフリーレン`
   - Năm phát hành: `2023` | Số tập: `28`
2. **Bước 2 — Quét tìm song song trên các cổng phát**:
   - **Cổng Quốc tế (HiAnime)**: Tìm kiếm theo `Sousou no Frieren` → Khớp chính xác 99.9% vì HiAnime dùng chuẩn tên Romaji/English của MAL → Lấy ngay danh sách 28 tập `1080p + Sub rời`.
   - **Cổng Vietsub (PhimAPI + OPhim + NguonC)**: Tìm kiếm theo từ khóa chính (`Frieren`) + kiểm tra năm phát hành (`2023`) và thể loại (`hoat-hinh`) → Tự động gom tất cả các server `Vietsub` và `Thuyết minh` tìm được về chung 1 trình phát.
3. **Bước 3 — Hợp nhất vào Player**:
   - Người dùng mở lên sẽ thấy đầy đủ các tab Server:
     `[🇻🇳 Vietsub - KKPhim]` | `[🇻🇳 Vietsub - OPhim]` | `[🎙️ Thuyết Minh]` | `[🌍 HiAnime 1080p + AI Sub]`

---

## 📁 VI. CẤU TRÚC THƯ MỤC DỰ ÁN (`onisanime_store`)

```
onisanime_store/
├── public/                        # Assets tĩnh, icon thương hiệu Onisanime
├── fe/                            # Mã nguồn Frontend chính (React 19 + TypeScript)
│   ├── components/
│   │   ├── layout/                # Sidebar, Header, MobileNav, BrandLogo
│   │   ├── showcase/              # Anime3DShowcase (Màn hình Intro 3D Otaku)
│   │   ├── anime/                 # AnimeDiscoveryView, AiringSchedule, SeasonalBrowser
│   │   ├── player/                # AnimePlayerModal (HLS/ArtPlayer + Multi-Server + Softsub)
│   │   ├── manga/                 # MangaDiscoveryView, MangaReaderModal (Webtoon/Page)
│   │   ├── watchlist/             # MyOtakuListView, RankingPodiumView, StatsView
│   │   └── ai/                    # OniChanChatBot (Trợ lý AI gợi ý & dịch sub)
│   ├── services/
│   │   ├── anilistService.ts      # Gọi AniList GraphQL & Jikan v4 API (Metadata, Lịch chiếu)
│   │   ├── vietsubService.ts      # Gọi song song PhimAPI + OPhim + NguonC
│   │   ├── hianimeService.ts      # Gọi HiAnime API (m3u8 + .vtt softsub + intro/outro)
│   │   ├── mangaService.ts        # Gọi OTruyen API + MangaDex API
│   │   ├── sourceMatcher.ts       # Thuật toán ghép nối thông minh Metadata <-> Nguồn phát
│   │   ├── subtitleTranslator.ts  # Dịch nhanh phụ đề .vtt Anh -> Việt bằng AI/Translate API
│   │   └── storageService.ts      # Đồng bộ Google Sheets + LocalStorage + data.json
│   ├── types/
│   │   └── index.ts               # Định nghĩa kiểu dữ liệu Anime, Manga, Episode, Chapter
│   ├── App.tsx                    # Điều hướng chính & State toàn cục
│   ├── main.tsx
│   └── index.css
├── backend/                       # Proxy Server & Google Apps Script
│   ├── proxy/                     # Middleware xử lý CORS cho luồng m3u8 / HiAnime API
│   └── google-apps-script/        # Mã nguồn Code.js đồng bộ Google Sheets
├── data.json                      # Kho dữ liệu Watchlist/Readlist cục bộ
├── server.js                      # Express Production Server + Stream Proxy
├── vite.config.ts                 # Cấu hình Vite + Dev API Middleware
├── package.json
└── MASTER_PLAN.md                 # Tài liệu kế hoạch tổng thể này
```

---

## 🗓️ VII. LỘ TRÌNH TRIỂN KHAI TỪNG BƯỚC (IMPLEMENTATION ROADMAP)

### 🔹 Giai đoạn 1: Khởi tạo Nền tảng & Giao diện Otaku Cyber-Glassmorphism
- Khởi tạo dự án React 19 + TypeScript + Vite 6 + TailwindCSS + `lucide-react` + `hls.js`.
- Thiết kế bộ nhận diện **Onisanime Store Pro** (tông màu Deep Midnight kết hợp Neon Sakura Pink / Cyber Violet đặc trưng của giới Anime).
- Xây dựng hệ thống Layout: Sidebar thông minh (chuyển đổi mượt giữa **Xem Anime**, **Đọc Manga**, **Lịch Chiếu**, **Tủ Của Tôi**, **Bảng Xếp Hạng**, **Thống Kê**).

### 🔹 Giai đoạn 2: Tích hợp Master Metadata & Multi-Server Anime Engine
- Xây dựng `anilistService.ts` & `vietsubService.ts` + `hianimeService.ts`.
- Hiển thị trang chủ Anime với:
  - **Hero Banner** (Top Trending Anime mùa hiện tại).
  - **Lịch chiếu Anime theo thứ trong tuần** (Thứ 2 → Chủ Nhật).
  - **Bộ lọc Anime theo Mùa / Năm / Thể loại / Quốc gia (Nhật Bản & Donghua Trung Quốc)**.
- Viết thuật toán `sourceMatcher.ts` tự động gộp link phát từ **PhimAPI + OPhim + NguonC + HiAnime**.

### 🔹 Giai đoạn 3: Xây dựng Trình Phát Anime Chuyên Dụng (Pro Anime Player)
- Tích hợp trình phát hỗ trợ cả **HLS `.m3u8` trực tiếp** (tua nhanh không giật, không dính quảng cáo popup) lẫn **Embed Player**.
- Hỗ trợ hiển thị **Phụ đề rời (`.vtt`)**, tùy chỉnh cỡ chữ/màu chữ và tính năng **Dịch Phụ Đề Tiếng Việt Tự Động** cho nguồn HiAnime.
- Lưu lịch sử tập đã xem (đánh dấu màu các tập đã xem, tự động mở lại đúng tập đang xem dở).

### 🔹 Giai đoạn 4: Xây dựng Phân hệ Đọc Truyện Manga / Manhwa
- Tích hợp **OTruyen API** & **MangaDex API**.
- Xây dựng màn hình khám phá truyện mới, tìm kiếm truyện, danh sách chapter và **Manga Reader Modal** (chế độ cuộn dọc Webtoon & chế độ lật trang, chỉnh độ sáng, phóng to/thu nhỏ trang truyện).

### 🔹 Giai đoạn 5: Đồng bộ Đám Mây Google Sheets, Bảng Xếp Hạng & AI Oni-chan
- Tích hợp đồng bộ 2 chiều với Google Sheets (lưu cả tiến độ tập Anime đang xem và chap Manga đang đọc).
- Hoàn thiện Bảng xếp hạng Podium Top 1-2-3, Thống kê Otaku và Trợ lý AI Oni-chan.
- Kiểm thử toàn diện, tối ưu tốc độ tải trang và đóng gói sẵn sàng triển khai (Vercel / Railway).

