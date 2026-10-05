# Phase 4 — Sự kiện toàn lớp realtime

## 1–2. Tệp tạo và sửa

Tạo `src/data/communityEvents.js`, `src/game/communityEngine.js`, `src/firebase/communityCoordinator.js`, `src/hooks/useCommunityCoordinator.js`, năm component trong `src/components/community/`, `tests/community.test.js` và tài liệu này. Sửa `HostPage.jsx`, `PlayerGamePage.jsx`, `PersonalGame.jsx`, `CheckpointScreen.jsx`, `styles.css`, `firebase.rules.json`, `tests/rooms.test.js` và `README.md`. Các chỉnh sửa nhạc nền có sẵn được giữ nguyên.

## 3. Schema Firebase

```text
rooms/{code}/community
  currentEvent: { id, checkpoint, status, startedAt, endsAt? }
  triggered/{eventId}: true
  events/{eventId}
    id, checkpoint, status, startedAt, endsAt
    votes/{uid}: { choiceId, votedAt }
    result: { counts/{choiceId}, totalVotes, outcomeId, completedAt }
```

`currentEvent` trỏ tới sự kiện mới nhất; `events` giữ toàn bộ lịch sử. Không ghi thêm phase `community` vào tiến trình cá nhân. Người chơi vẫn ở `gamePhase: checkpoint` cho tới khi tự bấm tiếp tục sau kết quả.

## 4–5. Kích hoạt và active players

Host theo dõi room realtime. Active là người có ít nhất một connection, chưa `finished`, trong room `playing`. Ở mỗi checkpoint, đếm active player có `currentCheckpoint >= checkpoint`; đủ 80% mới mở. Để tránh mở sự kiện khi cả lớp vừa mất mạng, còn cần ít nhất `min(số người đã tham gia, max(2, ceil(số người đã tham gia × 25%)))` người active. Phòng một người vẫn chơi thử được.

Transaction trên cả room kiểm tra lại host, status, ngưỡng, `triggered` và sự kiện đang active, rồi cùng lúc ghi `currentEvent`, `triggered` và bản ghi lịch sử. Listener gọi lại hoặc nhiều tab host không tạo bản trùng.

## 6. Coordinator

`communityCoordinator.js` chứa logic độc lập UI. Host tự kích hoạt, điền deadline và chốt kết quả. Khi host mất kết nối, player ở checkpoint chờ; khi host trở lại, listener đọc state hiện có và tiếp tục. Nếu host rời hẳn, sự kiện không tự tiến triển trong MVP. Không có Cloud Functions hay leader election.

## 7. Bình chọn

Player ghi transaction tại `votes/{uid}`. Vote đã tồn tại khiến transaction dừng; lựa chọn cũ được trả về và không đổi. `votedAt` dùng server timestamp. Rules yêu cầu UID chính chủ, đã tham gia, đang ở checkpoint đúng, event active và chưa quá deadline; choice ID phải thuộc event. UI chỉ hiện tổng số người đã chọn, không hiện phân bố trước khi chốt.

## 8. Chốt kết quả

Host chốt khi tất cả người đang kết nối **và đã đến checkpoint** bình chọn, hoặc khi hết 20 giây. Người còn ở chapter cũ không giữ cả lớp chờ. Transaction trên cả room kiểm tra lại người đủ điều kiện và `status: active`, đếm vote hiện tại, chọn outcome theo tỷ lệ lựa chọn thận trọng ≥60%, ghi result và đổi cả event lẫn pointer sang `completed` trong một lần. Callback lặp lại không chốt lần hai.

`startedAt` do Firebase server timestamp cấp. Sau khi server trả timestamp đã resolve, host transaction điền `endsAt = startedAt + 20.000ms`. Các màn hình dùng `.info/serverTimeOffset` để hiển thị đếm ngược; host dùng cùng đồng hồ đã hiệu chỉnh để yêu cầu chốt. Rules so deadline vote với `now` của Firebase. Đây là đồng hồ ước lượng phía host, không phải một bộ hẹn giờ chạy trên server; nếu host offline, kết quả chỉ xuất hiện khi host kết nối lại.

## 9–10. Người đến muộn, refresh và reconnect

Event chỉ render khi tiến trình cá nhân thực sự ở checkpoint 1–3. Người còn ở scene/consequence không bị cắt ngang. Khi đến muộn, họ đọc `events/{eventId}`: nếu active thì có thể vote trong thời hạn; nếu completed thì thấy kết quả rồi mới bấm sang chương tiếp theo. Refresh ở màn vote hoặc result đọc lại room và vote; sau khi tiếp tục, tiến trình cá nhân được lưu transaction Phase 3 nên event cũ không xuất hiện nữa. Không cần thêm acknowledgement riêng. Nếu lưu tiến trình gián đoạn, cơ chế pending mutation/revision của Phase 3 vẫn khôi phục.

## 11. Rules

`firebase.rules.json` thêm nhánh `community`, chặn player kích hoạt/chốt event hoặc ghi vote UID khác, giới hạn choice và ngăn đổi vote. Bước từ checkpoint 1–3 sang chapter tiếp theo chỉ hợp lệ sau khi event tương ứng `completed`. Quy tắc quyền Phase 3 cho phòng, presence, tiến trình và điểm cuối được giữ. Host vẫn là vai trò tin cậy có quyền ghi room theo kiến trúc cũ.

**Khi deploy:** publish lại toàn bộ `firebase.rules.json` trong Firebase Realtime Database Rules, sau đó redeploy Vercel. Chỉ deploy Vercel sẽ không cập nhật rules. Không cần biến môi trường mới.

## 12. Ba sự kiện

1. Sau checkpoint 1: video deepfake về giảng viên, hậu quả chung là hạn chế hoặc lan rộng tin giả.
2. Sau checkpoint 2: công cụ AI đòi danh sách sinh viên, hậu quả về quyền riêng tư.
3. Sau checkpoint 3: AI đề xuất danh sách dự án có dấu hiệu thiên kiến, hậu quả về công bằng và trách nhiệm con người.

Các lựa chọn là quyết định trong tình huống, không có đáp án đúng/sai và không cộng điểm cá nhân.

## 13. Thử với 3–5 trình duyệt

1. Mở host ở một profile, tạo phòng và giữ trang mở. Mở 3–5 profile/incognito riêng để mỗi player có UID khác, vào cùng mã phòng.
2. Bắt đầu. Cho dưới 80% người tới checkpoint 1: màn player ghi “Đang chờ cả lớp”. Đưa thêm người tới mốc 80%: event tự mở, không bấm host.
3. Bình chọn trên vài player, kiểm tra host chỉ thấy x/y và đồng hồ. Thử refresh trước vote, sau vote và sau result; lựa chọn đã ghi không bị mất hoặc đổi.
4. Để một người ở scene cũ trong lúc event hết giờ. Người đó tiếp tục đến checkpoint: chỉ lúc này mới thấy result; bấm “Tiếp tục hành trình” sẽ vào chapter 2.
5. Refresh host giữa event, thử ngắt mạng host rồi kết nối lại. Event không được tạo trùng, kết quả cuối chỉ ghi một lần. Lặp lại ở checkpoint 2 và 3.

Tự động: `npm test` (Firebase Emulator), `npm run lint`, `npm run build`.

## 14–15. Giới hạn và Phase 5

Host là coordinator duy nhất; nếu host rời hoàn toàn, checkpoint chờ. Chưa có Cloud Functions, election, analytics hay giải thưởng Phase 5. Sức chứa phòng mới đã nâng lên 60 người, nhưng chưa được thử tải 60 thiết bị đồng thời trên mạng lớp. Room chứa tất cả votes và lịch sử. Quyền đọc room hiện tại cho người đã đăng nhập và biết mã; vote UID hiển thị trong dữ liệu RTDB cho client kỹ thuật, dù giao diện không hiện tên bình chọn. Nếu cần bí mật phiếu ở cấp dữ liệu, cần backend/server ở phase sau.
