# LÀM CHỦ AI

Web game lớp học cho khoảng 35 sinh viên, chủ đề **Đạo đức và tu dưỡng trong thời đại AI** (Tư tưởng Hồ Chí Minh).

## Phạm vi hiện tại

Đã triển khai **Phase 1 + Phase 2**: React, Vite, Tailwind, routing, Firebase Anonymous Auth, tạo mã phòng 6 ký tự, tham gia bằng UID, danh sách realtime, host bắt đầu và mọi player nhận trạng thái mới. Giao diện tiếng Việt, mobile và màn hình trình chiếu. Phiên đăng nhập Firebase và mã phòng localStorage giữ đường quay lại sau refresh.

**Đây chưa phải game hoàn chỉnh.** Màn hình sau khi bắt đầu chủ động thông báo phạm vi bản dựng. Chưa triển khai scene, chỉ số, Community Event, hồ sơ, leaderboard hoặc giải thưởng. Chờ xác nhận trước Phase 3 theo yêu cầu ban đầu. Nội dung học thuật cần tài liệu nguồn của giảng viên trước khi hoàn thiện.

Frontend deploy **Vercel**, dữ liệu dùng **Firebase Realtime Database**. Không có Express, Socket.IO, Firestore, Cloud Functions hay backend riêng.

## Chạy trên máy

Yêu cầu Node.js 22.14+ và npm.

```sh
npm install
```

Sao chép `.env.example` thành `.env.local`, điền cấu hình Firebase rồi:

```sh
npm run dev
npm run lint
npm run build
```

Nếu chưa có cấu hình, trang vẫn hiển thị giao diện và thông báo thiết lập; nút tham gia/tạo phòng bị khóa. Không có phòng giả hoặc dữ liệu demo tự sinh.

## Thiết lập Firebase

1. Tạo Firebase project và thêm Web app.
2. Authentication → Sign-in method → bật **Anonymous**.
3. Tạo **Realtime Database**, chọn vùng phù hợp, bắt đầu ở chế độ khóa.
4. Database → Rules: dán toàn bộ nội dung `firebase.rules.json`, bấm Publish. Có thể dùng Firebase CLI: `firebase deploy --only database --project YOUR_PROJECT_ID`.
5. Project settings → Web app → lấy `apiKey`, `authDomain`, `projectId`, `appId`; lấy `databaseURL` chính xác từ Realtime Database (bao gồm vùng nếu có).
6. Điền 5 biến `VITE_FIREBASE_*` trong `.env.local`. Không dùng service account hoặc private key. Cấu hình web Firebase hiển thị trên client là bình thường; bảo vệ dữ liệu bằng rules.
7. Trong Authentication → Settings → Authorized domains, thêm localhost và tên miền Vercel sử dụng nếu chưa có.

## Deploy Vercel

1. Đẩy repository lên Git và import vào Vercel.
2. Framework preset: **Vite**; build: `npm run build`; output: `dist`.
3. Thêm đủ 5 biến trong `.env.example` vào Environment Variables cho môi trường cần dùng.
4. Deploy. Nếu thay đổi biến môi trường, redeploy vì Vite đóng gói chúng lúc build.
5. Mở `/host` trên laptop; sinh viên mở `/` trên điện thoại. `vercel.json` có SPA rewrite để refresh `/host` và `/play` không bị 404.

Vercel chỉ phục vụ frontend. Auth và RTDB chạy trực tiếp trên Firebase. Cần publish rules ở Firebase riêng; deploy Vercel không tự publish rules.

## Schema RTDB (Phase 2)

```text
rooms/{roomCode}
  roomCode: "AB2C3D"
  hostId: firebaseUid
  status: "waiting" | "playing"
  capacity: 35
  createdAt: serverTimestamp
  gameStartedAt: serverTimestamp (sau khi bắt đầu)
  hostConnections/{connectionId}: serverTimestamp
  seats/{1..35}: firebaseUid
  players/{uid}
    name: string (1–30 ký tự)
    seat: string ("1" đến "35")
    joinedAt: serverTimestamp
    currentChapter: 0
    currentCheckpoint: 0
    finished: false
    connections/{connectionId}: serverTimestamp
```

`connected` được suy ra từ việc `connections` có phần tử. Mỗi tab đăng ký một connection và `onDisconnect().remove()` trước khi đánh dấu online. Nhờ đó đóng một tab không làm mất trạng thái online của tab còn lại. Firebase có thể cần thời gian phát hiện mất mạng đột ngột.

`activeCommunityEventId`, nhánh `community`, `finalScore` và dữ liệu gameplay sẽ được thêm cùng rules tương ứng ở phase sau; hiện rules cố ý chặn các trường chưa triển khai.

## Đồng bộ và quyền truy cập

- Tạo phòng: transaction giữ chỗ mã, thử mã khác khi trùng. Không cho liệt kê toàn bộ `rooms`.
- Đọc một phòng theo mã: cần đăng nhập ẩn danh. Mã phòng là thông tin để truy cập, không phải cơ chế bảo mật mạnh cho dữ liệu nhạy cảm.
- Tham gia: atomic update đồng thời `players/{uid}` và một trong 35 `seats`; rules kiểm tra chỗ còn trống, liên kết UID ↔ chỗ và trạng thái chờ ở phía server. Client thử chỗ khác khi có tranh chấp. Nếu hai người tranh suất cuối hoặc host đã bắt đầu, server từ chối lượt không hợp lệ.
- Bắt đầu: host transaction trên phòng, kiểm tra trạng thái và ít nhất một người online. Ghi `playing` và `gameStartedAt` cùng lúc; không cập nhật lẻ từng player.
- Player chỉ tạo bản ghi của chính mình; sau đó chỉ ghi presence của mình. Không tự đổi tên, tiến trình, trạng thái phòng hoặc ghi sang UID khác. Host điều khiển phòng.
- Presence và listener được dọn khi rời màn hình. Không xóa bản ghi người chơi khi mất mạng, để refresh có thể khôi phục.
- Người đã tham gia có thể quay lại sau khi bắt đầu; UID mới không được vào giữa buổi.
- Hai tab cùng trình duyệt dùng chung UID. Muốn test nhiều người, dùng các browser/profile khác nhau. Host và player phải dùng UID khác nhau.
- Xóa dữ liệu trình duyệt/mất phiên anonymous có thể làm mất UID; không thể nhận lại danh tính chỉ bằng tên.
- Phòng lưu đến khi quản trị viên xóa trên Firebase; chưa có tự dọn phòng, đổi host hay host takeover.
- MVP cho lớp học tin cậy. Khi bổ sung điểm client ở phase sau, rules có thể giới hạn kiểu/range/quyền sở hữu nhưng không đảm bảo chống gian lận tính điểm như server authoritative.

## Cấu trúc

```text
src/
  components/  Layout, AuthNotice, RoomView
  contexts/    AuthContext
  firebase/    config, auth, roomService
  hooks/       useRoom (realtime + presence)
  pages/       JoinPage, HostPage, PlayerGamePage
  utils/       errors
  App.jsx      routing
  styles.css   Tailwind + giao diện responsive
```

Phase 3 sẽ thêm `data/` và `game/`, giữ nội dung độc lập với engine.

## Kiểm thử tự động

`npm test` chạy Firebase Database Emulator trên cổng 9000 với project demo, không ghi lên Firebase thật. Cần Java 17+ cho Firebase CLI 14; lần đầu cần mạng để tải emulator. Bộ kiểm thử bao gồm quyền đọc/ghi, host bắt đầu, chặn tham gia muộn, tranh suất thứ 35 và presence nhiều tab.

## Kiểm thử trên Firebase thật trước buổi học

1. Laptop `/host`: tạo phòng; kiểm tra mã 6 ký tự.
2. Browser/profile khác `/`: nhập tên + mã, host nhận danh sách realtime.
3. Refresh cả host/player: mã, UID và danh sách còn đúng.
4. Mở 2 tab player rồi đóng một tab: vẫn online; đóng hết và chờ Firebase phát hiện ngắt: offline.
5. Host Start: mọi player chuyển sang thông báo bắt đầu; nhấn lại không thay thời điểm bắt đầu.
6. Người mới vào sau Start bị từ chối, UID cũ vẫn quay lại được.
7. Kiểm tra 35 người và 2 lượt cạnh tranh suất cuối: không vượt 35.
8. Kiểm tra ở điện thoại rộng 360px và laptop/projector; tên dài không phá bố cục.
9. Kiểm tra quyền: player không đổi status, hostId hoặc dữ liệu người khác; người chưa đăng nhập không đọc được phòng.

Firebase có hạn mức tạo anonymous account theo IP. Trước buổi học, cần thử trên mạng Wi-Fi thực tế của lớp và xem hạn mức dự án; 35 thiết bị chung một IP có thể cần chuẩn bị trước.

## Tài liệu kỹ thuật

Kiểm tra bản dựng ngày 05/10/2026: build và lint thành công; 6/6 kiểm thử Firebase Emulator thành công; giao diện được kiểm tra ở 360px và 1366px, không ghi nhận lỗi console trong lượt kiểm tra. `npm audit --omit=dev` báo 0 lỗ hổng. Nhánh công cụ phát triển Firebase CLI 14 (để tương thích Java 17) còn cảnh báo dependency từ `npm audit` đầy đủ; CLI không được đóng gói vào frontend. Chưa thử Authentication/RTDB production hoặc 35 thiết bị thật vì chưa có cấu hình Firebase của dự án.

- [Firebase Anonymous Authentication](https://firebase.google.com/docs/auth/web/anonymous-auth)
- [Firebase transactions](https://firebase.google.com/docs/database/web/read-and-write)
- [Firebase presence](https://firebase.google.com/docs/database/web/offline-capabilities)
- [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite)
