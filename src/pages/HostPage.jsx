import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../hooks/useRoom";
import { createRoom, startRoom } from "../firebase/roomService";
import { errorMessage } from "../utils/errors";
import AuthNotice from "../components/AuthNotice";
import RoomView, { isConnected } from "../components/RoomView";
export default function HostPage() {
  const { user } = useAuth();
  const [code, setCode] = useState(
    () => localStorage.getItem("ai-host-room") || "",
  );
  const {
    room,
    error: roomError,
    online,
    member,
    loading,
  } = useRoom(code, user, "host");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  async function action(fn) {
    if (busy || !user) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const players = Object.values(room?.players || {});
  const active = players.filter(isConnected).length;
  return (
    <div className="room-page">
      <div className="eyebrow">KHÔNG GIAN NGƯỜI DẪN · MÀN HÌNH TRÌNH CHIẾU</div>
      <AuthNotice />
      {(error || roomError) && (
        <p className="notice error" role="alert">
          {error || roomError}
        </p>
      )}
      {!code ? (
        <section className="create-room panel">
          <span className="welcome-symbol">✳</span>
          <h1>
            Một lớp học.
            <br />
            Nhiều góc nhìn.
          </h1>
          <p>
            Tạo không gian cho tối đa 35 sinh viên cùng khám phá cách làm chủ
            AI.
          </p>
          <button
            className="primary"
            disabled={!user || busy}
            onClick={() =>
              action(async () => {
                const c = await createRoom(user.uid);
                localStorage.setItem("ai-host-room", c);
                setCode(c);
              })
            }
          >
            {busy ? "Đang tạo phòng…" : "Tạo phòng"} <span>↗</span>
          </button>
          <small>Bản dựng kết nối lớp học · Phase 1 + 2</small>
        </section>
      ) : (
        <>
          {user && loading && <p>Đang tải phòng…</p>}
          {room && member && (
            <>
              <div className="host-top">
                <div>
                  <span className="pill">
                    {room.status === "waiting"
                      ? "ĐANG CHỜ NGƯỜI CHƠI"
                      : "LỚP HỌC ĐÃ BẮT ĐẦU"}
                  </span>
                  <h1>
                    {room.status === "waiting"
                      ? "Cùng nhau, sẵn sàng."
                      : "Kết nối đã sẵn sàng."}
                  </h1>
                  <p>
                    {online
                      ? "Giữ trang này mở trong suốt buổi học."
                      : "Đang kết nối lại. Vui lòng kiểm tra mạng."}
                  </p>
                </div>
                <div className="room-code">
                  <span>MÃ PHÒNG CỦA BẠN</span>
                  <strong>{code}</strong>
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(code);
                        setCopied(true);
                      } catch {
                        setError(
                          "Không sao chép được. Hãy ghi lại mã phòng trên màn hình.",
                        );
                      }
                    }}
                  >
                    {copied ? "Đã sao chép ✓" : "Sao chép mã ↗"}
                  </button>
                </div>
              </div>
              <div className="metrics">
                <div>
                  <strong>
                    {players.length}
                    <small> / 35</small>
                  </strong>
                  <span>Đã tham gia</span>
                </div>
                <div>
                  <strong>{active}</strong>
                  <span>Đang kết nối</span>
                </div>
                <div>
                  <strong>{room.status === "waiting" ? "01" : "02"}</strong>
                  <span>
                    {room.status === "waiting"
                      ? "Sẵn sàng vào lớp"
                      : "Đã gửi tín hiệu bắt đầu"}
                  </span>
                </div>
              </div>
              <RoomView room={room} uid={user.uid} />
              {room.status === "waiting" ? (
                <div className="start-row">
                  <p>
                    Người chơi sẽ tự động chuyển màn hình khi bắt đầu.
                    <br />
                    <small>Cần ít nhất 1 người chơi đang kết nối.</small>
                  </p>
                  <button
                    className="primary"
                    disabled={busy || !online || active === 0}
                    onClick={() => action(() => startRoom(code, user.uid))}
                  >
                    {busy ? "Đang bắt đầu…" : "Bắt đầu"} <span>→</span>
                  </button>
                </div>
              ) : (
                <div className="notice">
                  Đã hoàn thành luồng tạo phòng → tham gia → bắt đầu. Gameplay,
                  sự kiện toàn lớp và bảng kết quả sẽ có ở các phase tiếp theo.
                </div>
              )}
            </>
          )}
          {((!loading && !room) || (room && !member)) && (
            <button
              className="text-button"
              onClick={() => {
                localStorage.removeItem("ai-host-room");
                setCode("");
              }}
            >
              Tạo phòng khác →
            </button>
          )}
        </>
      )}
    </div>
  );
}
