# LÀM CHỦ AI

Web game lớp học cho khoảng 35 sinh viên, chủ đề **Đạo đức và tu dưỡng trong thời đại AI** (Tư tưởng Hồ Chí Minh).

## Phạm vi hiện tại

Đã triển khai **Phase 1–3**: React, Vite, Tailwind, Firebase Anonymous Auth, phòng realtime và hành trình cá nhân gồm 4 chương, 15 tình huống hành động, 4 checkpoint. Có phân nhánh, hậu quả, 5 chỉ số, lưu/khôi phục tiến trình và hồ sơ cuối game. Luồng tạo phòng → tham gia → chờ → bắt đầu được giữ nguyên.

**Chưa triển khai Community Event, leaderboard hoặc giải thưởng.** Nội dung MVP dựa trên nguyên tắc người dùng cung cấp, chưa đối chiếu tài liệu học thuật gốc. Xem [báo cáo Phase 3](PHASE3.md) để biết schema, các file, cách kiểm thử và phần dành cho Phase 4.

**Khi nâng cấp từ Phase 2:** publish lại toàn bộ `firebase.rules.json` trong Firebase Console rồi redeploy Vercel. Rules cũ chỉ cho phép tiến trình bằng 0 nên sẽ từ chối lưu gameplay. Không cần xóa phòng cũ: người chơi chưa có state sẽ bắt đầu hành trình khi phòng đang chơi.

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

## Schema phòng RTDB (các trường nền tảng Phase 2)

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

Phase 3 bổ sung tiến trình và kết quả dưới `players/{uid}`, xem schema trong `PHASE3.md`. `activeCommunityEventId` và nhánh `community` sẽ được thêm cùng rules ở Phase 4.

## Đồng bộ và quyền truy cập

- Tạo phòng: transaction giữ chỗ mã, thử mã khác khi trùng. Không cho liệt kê toàn bộ `rooms`.
- Đọc một phòng theo mã: cần đăng nhập ẩn danh. Mã phòng là thông tin để truy cập, không phải cơ chế bảo mật mạnh cho dữ liệu nhạy cảm.
- Tham gia: atomic update đồng thời `players/{uid}` và một trong 35 `seats`; rules kiểm tra chỗ còn trống, liên kết UID ↔ chỗ và trạng thái chờ ở phía server. Client thử chỗ khác khi có tranh chấp. Nếu hai người tranh suất cuối hoặc host đã bắt đầu, server từ chối lượt không hợp lệ.
- Bắt đầu: host transaction trên phòng, kiểm tra trạng thái và ít nhất một người online. Ghi `playing` và `gameStartedAt` cùng lúc; không cập nhật lẻ từng player.
- Player chỉ tạo bản ghi của chính mình; khi phòng bắt đầu, được ghi tiến trình của mình với phiên bản tăng dần. Không đổi tên, seat, UID host hoặc trạng thái phòng và không ghi sang UID khác. Host điều khiển phòng.
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

`data/`, `game/`, `components/game/`, `gameService`, `useGameState` và `ResultPage` đã được bổ sung trong Phase 3; xem `PHASE3.md`.

## Kiểm thử tự động

`npm test` chạy Firebase Database Emulator trên cổng 9000 với project demo, không ghi lên Firebase thật. Cần Java 17+ cho Firebase CLI 14; lần đầu cần mạng để tải emulator. Bộ kiểm thử bao gồm quyền đọc/ghi, host bắt đầu, chặn tham gia muộn, tranh suất thứ 35 và presence nhiều tab.

## Kiểm thử trên Firebase thật trước buổi học

1. Laptop `/host`: tạo phòng; kiểm tra mã 6 ký tự.
2. Browser/profile khác `/`: nhập tên + mã, host nhận danh sách realtime.
3. Refresh cả host/player: mã, UID và danh sách còn đúng.
4. Mở 2 tab player rồi đóng một tab: vẫn online; đóng hết và chờ Firebase phát hiện ngắt: offline.
5. Host Start: mọi player chuyển sang tình huống đầu tiên; nhấn lại không thay thời điểm bắt đầu.
6. Người mới vào sau Start bị từ chối, UID cũ vẫn quay lại được.
7. Kiểm tra 35 người và 2 lượt cạnh tranh suất cuối: không vượt 35.
8. Kiểm tra ở điện thoại rộng 360px và laptop/projector; tên dài không phá bố cục.
9. Kiểm tra quyền: player không đổi status, hostId hoặc dữ liệu người khác; người chưa đăng nhập không đọc được phòng.

Firebase có hạn mức tạo anonymous account theo IP. Trước buổi học, cần thử trên mạng Wi-Fi thực tế của lớp và xem hạn mức dự án; 35 thiết bị chung một IP có thể cần chuẩn bị trước.

## Tài liệu kỹ thuật

Kiểm tra Phase 3 ngày 05/10/2026: build/lint đạt, 18/18 kiểm thử engine + Firebase Emulator đạt (gồm 6 kiểm thử phòng Phase 2). Đã thử trên trình duyệt: host tạo/bắt đầu, player chơi hết 4 chương, refresh tại hậu quả và kết quả, host nhận checkpoint/finished. Kiểm tra bố cục 390px và 1366px; không ghi nhận lỗi console. Lượt kiểm tra này dùng project demo cục bộ, chưa deploy rules hoặc kiểm tra tải 35 thiết bị trên Firebase production. Nhánh công cụ Firebase CLI 14 giữ để tương thích Java 17; các cảnh báo dependency công cụ phát triển đã nêu ở Phase 2 chưa nằm trong phạm vi nâng cấp này.

- [Firebase Anonymous Authentication](https://firebase.google.com/docs/auth/web/anonymous-auth)
- [Firebase transactions](https://firebase.google.com/docs/database/web/read-and-write)
- [Firebase presence](https://firebase.google.com/docs/database/web/offline-capabilities)
- [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite)

## Nhạc nền, bảng điểm và phòng cũ

- Thanh nhạc trên đầu trang: **Bật nhạc nền**, **Tắt nhạc**, âm lượng. Nhạc ambient tổng hợp riêng bằng Web Audio, hợp âm chậm, không lời/không trống, không tải nhạc bên ngoài. Mặc định tắt, âm lượng 25%; cần người dùng bấm để phát theo chính sách trình duyệt. Khi ẩn tab, nhạc tạm dừng; quay lại bấm bật để phát tiếp. Trong lớp nên chỉ bật ở laptop host.
- Host có **Top điểm làm chủ AI** hiển thị toàn bộ người đã hoàn thành, điểm giảm dần; cùng điểm ưu tiên `finishedAt` sớm hơn. Người chưa hoàn thành không bị tính là 0 điểm. Chưa có phân giải thưởng.
- **Phòng đã tạo → Xem danh sách cũ** nằm ngay phía trên trang host. Mở mục này và chọn mã phòng để xem lại người tham gia/bảng điểm. Tự tìm cả các phòng tạo trước bản cập nhật, miễn `hostId` còn trùng UID hiện tại. Không xóa dữ liệu phòng cũ khi tạo phòng mới.
- Cần **publish lại `firebase.rules.json`** để bật query lịch sử theo `hostId` và chỉ mục tương ứng. Không cho query danh sách phòng của UID khác hoặc đọc toàn bộ rooms không lọc. Lịch sử vẫn cần giữ phiên anonymous của host; không tự nhận lại quyền chủ phòng khi xóa dữ liệu trình duyệt hoặc đổi tài khoản.
- Sau khi publish rules, redeploy Vercel. Không cần thêm biến môi trường, API âm nhạc hay dependency mới.
