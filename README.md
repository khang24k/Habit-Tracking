# MyLife — Quản lý nhiệm vụ & Thói quen hằng ngày

Ứng dụng web quản lý nhiệm vụ hằng ngày, thói quen lặp lại và theo dõi chuỗi ngày hoàn thành (**Streak**), sử dụng **PostgreSQL trên Neon** và deploy miễn phí trên **Vercel**.

## Tính năng chính

- **Kế hoạch hằng ngày (Hôm nay)**: Theo dõi tiến độ tổng hợp, thêm nhanh nhiệm vụ, dời các nhiệm vụ quá hạn sang hôm nay chỉ với 1 bấm.
- **Thói quen lặp lại & Streak**: Hỗ trợ lặp lại mỗi ngày, ngày làm việc (T2–T6), cuối tuần hoặc tùy chỉnh thứ trong tuần; tự động tính chuỗi ngày liên tiếp hiện tại, kỷ lục cao nhất và tỉ lệ hoàn thành 30 ngày.
- **Tất cả nhiệm vụ**: Tìm kiếm, lọc theo trạng thái (chưa xong, quá hạn, đã hoàn thành), danh mục và mức độ ưu tiên.
- **Thống kê & Heatmap 12 tuần**: Biểu đồ nhiệt hoạt động 84 ngày gần nhất và bảng xếp hạng độ ổn định từng thói quen.
- **Tài khoản & Giao diện**: Đăng ký/Đăng nhập bảo mật bằng session cookie (`scrypt` + SHA-256), hỗ trợ chế độ Sáng/Tối và giao diện tối ưu cho cả máy tính lẫn điện thoại.

## Công nghệ sử dụng

- **Frontend & Backend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Cơ sở dữ liệu**: Neon Serverless PostgreSQL + Drizzle ORM
- **Hosting miễn phí**: Vercel (Hobby plan) + Neon (Free tier)

## Hướng dẫn chạy trên máy (Local)

### 1. Tạo cơ sở dữ liệu Neon miễn phí

1. Truy cập [console.neon.tech](https://console.neon.tech) và đăng nhập bằng GitHub hoặc Google.
2. Tạo dự án mới (gợi ý chọn region **Singapore** `ap-southeast-1` để phản hồi nhanh tại Việt Nam).
3. Sao chép **Connection string** (dạng `postgresql://...sslmode=require`).

### 2. Cài đặt và cấu hình

```bash
npm install
```

Tạo tệp `.env.local` dựa trên [`.env.example`](.env.example):

```env
DATABASE_URL="postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
```

Đẩy cấu trúc bảng lên Neon và chạy ứng dụng:

```bash
npm run db:push
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`.

## Hướng dẫn deploy miễn phí lên Vercel

1. Đẩy toàn bộ mã nguồn lên một repository GitHub của bạn.
2. Truy cập [vercel.com](https://vercel.com), chọn **Add New Project** và import repository vừa tạo.
3. Trong mục **Environment Variables**, thêm biến `DATABASE_URL` với chuỗi kết nối Neon của bạn (hoặc kết nối trực tiếp qua Vercel Neon Integration).
4. Nhấn **Deploy**. Hệ thống sẽ tự động khởi tạo bảng dữ liệu khi bạn truy cập và đăng ký tài khoản đầu tiên (hoặc bạn có thể chạy `npm run db:push` từ máy).

## Kiểm tra chất lượng mã nguồn

```bash
npm run typecheck
npm test
npm run build
```
