# 🌸 ONISANIME STORE PRO — Siêu Nền Tảng Anime & Manga Đa Nguồn

Onisanime Store Pro là ứng dụng web hiện đại (SPA) chuyên biệt cho **Anime & Manga** được phát triển trên nền tảng **React 19 + TypeScript + Vite 6 + TailwindCSS + Lucide Icons**.

---

## 🚀 Tính Năng Nổi Bật

1. **🎬 Xem Anime Đa Nguồn (Smart Multi-Server Matcher)**:
   - Tự động quét và hợp nhất song song các server streaming lớn nhất: **KKPhim / PhimAPI** và **NguonC**.
   - Hỗ trợ phát trực tiếp **Direct HLS (.m3u8 1080p)** mượt mà không quảng cáo popup + Embed Player dự phòng.
   - Tính năng **Bỏ qua Intro (+85s)** giúp trải nghiệm cày phim liên tục.
   - Bộ lọc chi tiết: Anime Nhật Bản, Hoạt hình 3D Trung Quốc (Donghua), lọc theo Năm và tìm kiếm realtime.

2. **📅 Lịch Chiếu Anime Trong Tuần (Weekly Airing Schedule)**:
   - Danh sách Anime phát sóng theo từng thứ trong tuần (Thứ 2 đến Chủ Nhật).
   - Tích hợp 1 chạm *"Dò Server & Xem"* tự động tìm link phát và chuyển thẳng vào Player.

3. **📖 Đọc Truyện Manga / Manhwa Thực Tế**:
   - Tích hợp hàng chục ngàn bộ truyện tranh tiếng Việt đầy đủ các chapter.
   - Hỗ trợ 2 chế độ đọc: **Cuộn Dọc (Webtoon / Manhwa Mode)** và **Lật Trang (Manga Mode)**.
   - Bộ xử lý ảnh chuyên dụng qua proxy cục bộ chống 403 Anti-Hotlinking, ảnh sắc nét tốc độ cao.

4. **🗂️ Tủ Otaku Cá Nhân (Watchlist & Readlist)**:
   - Quản lý đồng bộ tiến độ cày tập Anime và chapter Manga đang đọc dở.
   - Bảng xếp hạng Podium Hall of Fame vinh danh Top 1, Top 2, Top 3 tác phẩm đỉnh cao.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19, TypeScript, Vite 6, TailwindCSS, `lucide-react`, `hls.js`.
- **Backend / Proxy**: Vite Dev Server Middleware & Express Streaming Proxy.
- **Data Source**: PhimAPI Streaming Engine, NguonC Streaming CDN, NetTruyen Engine.

---

## ⚡ Hướng Dẫn Cài Đặt & Chạy

```bash
# 1. Cài đặt dependencies
npm install

# 2. Khởi chạy môi trường phát triển (Local)
npm run dev
```

Truy cập trên trình duyệt: `http://localhost:5174`

