# Phase 3 — Hành trình cá nhân

## File mới

- `src/data/chapters.js`, `scenes.js`, `stats.js`, `profiles.js`: nội dung và tên chỉ số.
- `src/game/gameEngine.js`: state machine, lựa chọn, chuyển cảnh, checkpoint, khôi phục, xác thực nội dung.
- `src/game/scoreEngine.js`, `profileEngine.js`, `recovery.js`: clamp, điểm, hồ sơ và bộ nhớ dự phòng.
- `src/firebase/gameService.js`: transaction lưu tiến trình độc lập với React.
- `src/hooks/useGameState.js`: nối state cá nhân, Firebase và khôi phục.
- `src/components/game/SceneCard.jsx`, `ConsequenceCard.jsx`, `CheckpointScreen.jsx`, `StatsPanel.jsx`, `ChapterHeader.jsx`, `FinalProfile.jsx`, `PersonalGame.jsx`: màn hình và thành phần chơi.
- `src/pages/ResultPage.jsx`: route kết quả dùng chung cơ chế xác thực/phòng/presence.
- `tests/game.test.js`: kiểm thử engine và recovery.
- `PHASE3.md`: báo cáo và hướng dẫn này.

## File sửa

- `src/pages/PlayerGamePage.jsx`: giữ phòng chờ, mở hành trình sau Host Start.
- `src/pages/HostPage.jsx`: số hoàn thành và số đạt checkpoint theo chương; chưa có leaderboard.
- `src/App.jsx`: thêm `/result`.
- `src/hooks/useRoom.js`: giữ snapshot cũ khi listener báo lỗi, tránh mất màn hình đang chơi.
- `src/firebase/config.js`, `firebase.json`: thêm kết nối Auth/RTDB Emulator chỉ trong dev khi được bật rõ ràng.
- `firebase.rules.json`: quyền ghi tiến trình theo UID, dữ liệu hợp lệ, revision, checkpoint, kết quả.
- `src/styles.css`: action cards, hậu quả, hồ sơ, checkpoint và responsive.
- `tests/rooms.test.js`: thêm kiểm thử game với Firebase Emulator, giữ kiểm thử Phase 2.
- `README.md`: cập nhật phạm vi và yêu cầu publish rules.

Không thêm dependency.

## Flow hiện tại

Host tạo phòng → player nhập tên + mã → phòng chờ → Host Start → tình huống → chọn hành động → hậu quả → Tiếp tục → tình huống kế hoặc checkpoint → chương kế → checkpoint 4 → hồ sơ cuối `/result`.

State machine hiển thị `loading`, `waiting` tại ranh giới trang; state lưu của game là `scene`, `consequence`, `checkpoint`, `finished`. Không có cờ giao diện rời rạc để quyết định scene/hậu quả.

Có 15 scene hành động và 4 scene checkpoint. Mỗi người gặp số tình huống khác nhau do phân nhánh. Tiến trình hiển thị theo chương.

## Các nhánh

1. `deadline_start`: `ai_all` → `lecturer_question` → `source_check`. `ai_support`/`self_only` → thẳng `source_check`.
2. `deepfake`: `share_warning` → `repair_rumor` → `unverified_share`. Các lựa chọn còn lại → thẳng `unverified_share`.
3. `class_file`: `upload` → `data_cleanup` → `class_photo`. Các lựa chọn còn lại → thẳng `class_photo`.

Các nhánh là hậu quả của hành động trước, không phải câu hỏi dành cho mọi người giống nhau. Nội dung được biên soạn từ các nguyên tắc trong yêu cầu; cần giảng viên duyệt với tài liệu môn học trước khi dùng chính thức.

## Dữ liệu đồng bộ

Bổ sung dưới `rooms/{roomCode}/players/{uid}`:

```text
currentSceneId
gamePhase: scene | consequence | checkpoint | finished
selectedChoiceId: string (rỗng khi chưa chọn)
stats: { liemChinh, trachNhiem, tuLuc, nhanAi, hieuSuat }
history/{index}: { sceneId, choiceId, timestamp, effects }
currentChapter: 1..4
currentCheckpoint: 0..4
finished: boolean
revision: số phiên bản tăng dần
mutationId: ID của thao tác đã lưu
updatedAt: serverTimestamp
finalScore: số nguyên 0..100 (chỉ khi hoàn thành)
finishedAt: serverTimestamp (chỉ khi hoàn thành)
```

Các trường phòng cũ và presence được giữ nguyên. Lưu lúc khởi tạo, lựa chọn, chuyển scene/checkpoint và hoàn thành; không ghi sau mỗi render/animation. Điểm là `Math.round((liemChinh + trachNhiem + tuLuc + nhanAi) / 4)`.

Checkpoint được ghi khi vào màn hình hoàn thành chương, trước khi cho tiếp tục. Checkpoint 4 có trước bước xem hồ sơ. Phase 4 có thể giữ người chơi ở `CheckpointScreen` hoặc phủ sự kiện lên scene đang chơi mà không áp dụng lại lựa chọn.

## Refresh, mất mạng và hai tab

- Engine áp dụng hiệu ứng một lần, lưu ngay `gamePhase=consequence`, `selectedChoiceId`, stats đã cập nhật và history. Khôi phục chỉ đọc snapshot, không replay hiệu ứng.
- Mỗi thao tác có `baseRevision` và ID ổn định. Transaction chỉ chấp nhận đúng phiên bản; callback không thực hiện cộng điểm hay sinh thời gian lựa chọn.
- Retry cùng thao tác trả lại bản đã ghi; hai tab cùng chọn chỉ một thao tác thắng. Tab còn lại tải tiến trình mới và báo cho người chơi.
- Trước khi gửi, lưu thao tác chờ vào localStorage theo phòng + UID + thời điểm bắt đầu. Refresh khi ghi chưa xong sẽ thử lại thao tác này. Khi xác nhận lưu thành công, xóa bản chờ.
- Mất mạng: giữ nội dung và chỉ số hiện có, khóa lựa chọn/tiếp tục cho đến khi kết nối lại. Không tự reset. Nếu tải lại khi hoàn toàn offline, cần mạng để xác thực/đọc phòng trước; app chưa phải PWA offline.
- Lỗi quyền ghi có nút thử lại và hướng dẫn publish rules; dữ liệu local không bị xóa bởi lỗi ghi. Trình duyệt chặn localStorage sẽ có thông báo hạn chế bản dự phòng.
- Identity, tên, seat và presence không bị ghi đè bằng snapshot game cũ. Kết quả hoàn thành không được player sửa lại; presence vẫn hoạt động sau khi kết thúc.
- Rules bảo vệ quyền sở hữu, kiểu/range và một số bất biến; engine vẫn chạy trên client, chưa chống người dùng cố ý giả mạo cả một hành trình. Đây là MVP cho lớp học tin cậy.

## Cách thử bằng hai browser

1. Publish `firebase.rules.json` mới; giữ Anonymous Auth bật. Chạy app với `.env.local` hiện có hoặc redeploy Vercel với 5 biến Firebase.
2. Browser A vào `/host`, tạo phòng. Browser B (khác browser/profile để có UID khác) vào `/`, nhập tên và mã.
3. Host thấy player; bấm Bắt đầu. Player thấy “Deadline còn 20 phút”.
4. Chọn “Để AI viết phần còn lại và nộp nguyên văn”: thấy hậu quả và Tự lực 30. Refresh ngay tại đây: vẫn hậu quả, Tự lực vẫn 30.
5. Tiếp tục: gặp “Em giải thích lập luận này nhé?”. Với người chơi khác chọn AI gợi ý cấu trúc, nhánh này được bỏ qua.
6. Chơi hết chương 1: host thấy checkpoint 1 tăng; Firebase có `currentCheckpoint=1`. Tiếp tục bình thường sang chương 2.
7. Ngắt mạng rồi kết nối lại; mở thêm tab cùng browser player để kiểm tra đồng bộ phiên bản. Không chọn được hành động mới khi offline hoặc đang lưu.
8. Hoàn thành chương 4, xem hồ sơ: Firebase có `finished`, `finalScore`, `stats`, `finishedAt`. Refresh `/result` giữ nguyên kết quả.

## Kiểm thử cục bộ không dùng dữ liệu thật

`npm test` dùng Database Emulator với project `demo-lamchuai`. `node --test tests/game.test.js` chạy riêng engine không cần Java/emulator. `npm run lint` và `npm run build` kiểm tra mã và bundle.

Để thử UI với Auth + Database Emulator, chạy hai terminal PowerShell:

```powershell
npx firebase emulators:start --only "auth,database" --project demo-lamchuai
```

```powershell
$env:VITE_USE_FIREBASE_EMULATORS='true'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort
```

Trong browser, có thể dùng `http://localhost:5174/host` và `http://127.0.0.1:5174/` làm hai origin riêng để có hai UID. Chế độ này dùng cấu hình demo, không ghi vào Firebase thật. Biến emulator chỉ hoạt động với Vite dev; không bật nó trên Vercel. Java 17+ với CLI 14 hiện tại. Emulator xóa dữ liệu demo khi dừng nếu không export.

## Để dành cho Phase 4

Chưa có Community Event, ngưỡng 80%, coordinator, bỏ phiếu, kết quả toàn lớp hay tạm dừng đồng bộ. Chưa có leaderboard/awards (Phase 5), Cloud Functions hoặc tự kết thúc trạng thái phòng. Kết quả cá nhân đã được lưu để các phase sau sử dụng.

Phase 4 cần bổ sung trạng thái sự kiện, lưu scene bị tạm dừng, khóa checkpoint/continue khi có sự kiện, tính active players từ presence và xử lý host mất kết nối. `CheckpointScreen`, `gamePhase`, checkpoint và history đã tách riêng để mở rộng.
