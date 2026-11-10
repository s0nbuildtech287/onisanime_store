# 🌸 KẾ HOẠCH NÂNG CẤP PHÂN HỆ XEM ANIME V2 (CHUẨN ANIMEVIETSUB / ANILIST HUB)

> **Mục tiêu:** Nâng cấp toàn diện trải nghiệm duyệt, tìm kiếm, lọc và xem Anime của **Onisanime Store Pro** lên chuẩn quốc tế tương tự `AnimeVietsub.best` / `HiAnime` bằng cách kết hợp **AniList GraphQL Engine** (làm bộ não dữ liệu & bộ lọc chuẩn Otaku) với **Multi-Server Vietsub (KKPhim + NguonC)** (làm nguồn phát video).

---

## 🎯 I. SO SÁNH TRẢI NGHIỆM TRƯỚC & SAU KHI NÂNG CẤP

| Tính năng | Hiện tại (V1) | Sau khi nâng cấp (V2) |
| :--- | :--- | :--- |
| **Bộ lọc phim** | Chỉ lọc được: Nhật Bản / Trung Quốc / Năm. | Lọc đa tầng chuẩn AnimeVietsub: **Dạng phim (TV/Movie/OVA/ONA)** + **Season (Xuân/Hạ/Thu/Đông)** + **Năm** + **Thể loại Otaku (Isekai, Ecchi, Harem, Action...)** + **Sắp xếp (Top Trending / Điểm cao / Phổ biến)**. |
| **Top Anime & Đề xuất** | Chỉ có 1 lưới danh sách chung. | Có thêm khu vực **Top Anime Đang Hot**, **Anime Mùa Thu 2026**, **Top Điểm Cao Mọi Thời Đại (Hall of Fame)**. |
| **Lịch chiếu tuần** | Xoay vòng danh sách hoạt hình có sẵn. | **Lịch chiếu Simulcast thật 100%** theo múi giờ Việt Nam (GMT+7) từ AniList, kèm **đồng hồ đếm ngược (Countdown)** tới giờ ra tập mới. |
| **Chi tiết & Watch Order** | Chỉ hiện tên phim, mô tả và tập phim. | Hiện thêm **Studio sản xuất** (MAPPA, Ufotable...), **Trailer YouTube**, và **Các phần liên quan (Prequel / Sequel / Movie)** để bấm chuyển sang Season 2, Season 3 ngay trong trình phát. |
| **Trải nghiệm xem tiếp** | Mở lại luôn chạy từ Tập 1. | **Tự động lưu Tập đang xem dở & mốc giây video** (`Continue Watching`), quay lại là xem tiếp đúng đoạn đang dừng. |

---

## 🏗️ II. CHI TIẾT CÁC HẠNG MỤC NÂNG CẤP

### 1. Bộ Lọc Chuyên Sâu Chuẩn AnimeVietsub (Advanced Otaku Filter Bar)
Tích hợp trực tiếp **AniList GraphQL API (`https://graphql.anilist.co`)** — đã kiểm thử chạy mượt 100%, mở CORS, không bị chặn từ Việt Nam hay Vercel:
- **Dạng Phim (`format`)**:
  - `Tất cả` | `Anime Bộ (TV)` | `Chiếu Rạp (Movie)` | `OVA` | `ONA` | `Special`
- **Mùa Phát Sóng (`season` & `seasonYear`)**:
  - `Mùa Xuân (Spring: Tháng 4-6)` | `Mùa Hạ (Summer: Tháng 7-9)` | `Mùa Thu (Fall: Tháng 10-12)` | `Mùa Đông (Winter: Tháng 1-3)`
  - Kết hợp chọn Năm (`2026`, `2025`, `2024`... `2000`).
- **Xếp Hạng / Sắp Xếp (`sort`)**:
  - `🔥 Đang Thịnh Hành (TRENDING_DESC)`
  - `⭐ Điểm Cao Nhất (SCORE_DESC)`
  - `👁️ Phổ Biến Nhất (POPULARITY_DESC)`
  - `❤️ Được Yêu Thích (FAVOURITES_DESC)`
- **Thể Loại Chuẩn Otaku (`genre` & `tag`)**:
  - Action (Hành Động), Adventure (Phiêu Lưu), Fantasy (Giả Tưởng), Romance (Tình Cảm), Comedy (Hài Hước), Isekai (Chuyển Sinh), Harem, Ecchi, Slice of Life (Đời Thường), Psychological (Tâm Lý), Mecha, Mystery (Bí Ẩn), Sports (Thể Thao), Supernatural (Siêu Nhiên).
- **Chuyển đổi nhanh chế độ Donghua 3D**:
  - Giữ riêng 1 tab chuyển nhanh **🇨🇳 Hoạt Hình 3D (Donghua)** lấy trực tiếp từ `KKPhim + NguonC` để anh vẫn cày các bộ Tu tiên Trung Quốc đầy đủ 100%.

### 2. Nâng Cấp Giao Diện Trang Chủ Xem Anime
- **Hero Banner Carousel (Slide 5 Bộ Hot Nhất)**:
  - Dùng ảnh `bannerImage` ngang siêu nét từ AniList, tự động chuyển slide hoặc cho phép bấm chấm tròn chuyển đổi giữa Top 5 bộ Anime đang làm mưa làm gió mùa hiện tại.
- **Dải "Tiếp Tục Xem" (Continue Watching)**:
  - Nếu người dùng đã xem dở bộ nào (ví dụ: *Frieren — Tập 14, phút 12:30*), hiện ngay một hàng nhỏ trên đầu để bấm 1 click là xem tiếp ngay lập tức.
- **Thẻ Phim (Anime Card) Thông Tin Giàu Hơn**:
  - Gắn Badge góc trên: `TV • 24 Tập` hoặc `Movie` hoặc `Tập 6 (Đếm ngược: 2 ngày)`.
  - Điểm đánh giá chuẩn AniList/MAL màu vàng nổi bật (ví dụ `★ 8.8`).

### 3. Nâng Cấp Trình Phát & Trang Chi Tiết (`AnimePlayerModal.tsx`)
- **Nâng cấp Thuật Toán Ghép Nguồn (`Smart Matcher V2`)**:
  - Khi bấm vào 1 bộ Anime từ AniList, hệ thống lấy bộ danh sách tên gồm: `title.romaji`, `title.english`, và `synonyms` (các tên gọi khác).
  - Tự động dò tìm theo thứ tự ưu tiên trên **KKPhim** và **NguonC**, lọc kết quả khớp nhất theo tên và năm phát hành để đảm bảo tỷ lệ lên link Vietsub/Thuyết minh cao nhất.
  - Nếu bộ nào mới ra chưa có trên KKPhim/NguonC -> Tự động hiện nút xem **Trailer YouTube chính thức** hoặc mở khung tìm kiếm từ khóa tùy chỉnh ngay trong modal để người dùng gõ lại tên tiếng Việt tìm nhanh.
- **Khu vực Các Phần Liên Quan (Franchise Watch Order)**:
  - Hiển thị danh sách thẻ nhỏ ngay dưới trình phát: *Phần trước (Prequel)* ➔ *Phần tiếp theo (Sequel)* ➔ *Movie ngoại truyện* -> Bấm vào là chuyển thẳng sang xem phần đó!
- **Lưu tiến độ tập đang xem & Đánh dấu tập đã xem**:
  - Những tập đã bấm xem sẽ tự động đổi màu viền khác biệt (tím/xám mờ) để người dùng nhớ mình đã cày tới tập nào.
  - Khi chạy trình phát HLS `.m3u8`, tự động lưu vị trí giây đang xem (`localStorage`) và tự động tua tiếp khi mở lại tập đó.

### 4. Lịch Chiếu Simulcast Thời Gian Thực (`Lịch Chiếu`)
- Gọi API `airingSchedules` từ **AniList GraphQL** theo khoảng thời gian 7 ngày trong tuần (từ Thứ 2 đến Chủ Nhật theo đúng múi giờ `Asia/Ho_Chi_Minh`).
- Hiển thị chính xác: **Giờ phát sóng dự kiến tại Nhật (quy đổi sang giờ VN)**, **Số tập sắp ra**, **Đếm ngược thời gian**, và nút bấm **Xem Tập Hiện Có** ngay trên thẻ.

---

## 🗓️ III. LỘ TRÌNH THỰC HIỆN (DỰ KIẾN 3 BƯỚC)

1. **Bước 1: Mở rộng Tầng API (`fe/services/otakuApi.ts` & `fe/types.ts`)**
   - Viết `anilistApi` (GraphQL queries cho Filter đa tầng, Airing Schedule thật, Detail + Relations).
   - Nâng cấp `resolveMultiServerStreams` hỗ trợ tìm kiếm đa từ khóa (`romaji` + `english` + `synonyms`) + cơ chế khớp thông minh (Fuzzy Title & Year Matching).
   - Viết `watchHistoryApi` lưu tiến độ xem từng tập & mốc thời gian.
2. **Bước 2: Nâng cấp Giao diện Khám Phá & Lịch Chiếu (`fe/App.tsx`)**
   - Xây dựng Hero Carousel Top Trending.
   - Xây dựng Thanh Bộ Lọc Otaku Đa Tầng (Dạng phim, Mùa, Năm, Thể loại, BXH Top).
   - Nâng cấp Tab Lịch Chiếu dùng dữ liệu Simulcast thật kèm bộ đếm ngược.
3. **Bước 3: Nâng cấp Trình Phát & Chi Tiết (`fe/components/AnimePlayerModal.tsx`)**
   - Hiển thị các phần liên quan (Season 1, 2, Movie).
   - Đánh dấu tập đã xem + Tiếp tục phát từ mốc giây cũ + Nút tìm kiếm thủ công nếu Smart Matcher tìm nhầm tên tiếng Việt.

---

> **Ghi chú:** Toàn bộ kiến trúc nâng cấp này chạy trực tiếp bằng HTTPS + CORS từ Client và Serverless Vercel sẵn có, đảm bảo hoạt động trơn tru trên cả **Laptop**, **Điện thoại** và khi deploy lên **Vercel**.

