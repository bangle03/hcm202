import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../hooks/useRoom";
import { CAPACITY, createRoom, startRoom } from "../firebase/roomService";
import { errorMessage } from "../utils/errors";
import AuthNotice from "../components/AuthNotice";
import RoomView, { isConnected } from "../components/RoomView";
import Leaderboard from "../components/Leaderboard";
import HostRoomHistory from "../components/HostRoomHistory";
import { useCommunityCoordinator } from "../hooks/useCommunityCoordinator";
import HostCommunityView from "../components/community/HostCommunityView";
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
  const { serverNow, error: communityError } = useCommunityCoordinator({ code, uid: user?.uid, room, online });
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
  const allFinished =
    room?.status !== "waiting" &&
    players.length > 0 &&
    players.every((player) => player.finished);
  async function openNewRoom() {
    const nextCode = await createRoom(user.uid);
    localStorage.setItem("ai-host-room", nextCode);
    setCopied(false);
    setCode(nextCode);
  }
  function openPastRoom(nextCode) {
    localStorage.setItem("ai-host-room", nextCode);
    setCopied(false);
    setError("");
    setCode(nextCode);
  }
  return (
    <div className="room-page">
      <div className="eyebrow">KHÔNG GIAN NGƯỜI DẪN · MÀN HÌNH TRÌNH CHIẾU</div>
      <AuthNotice />
      <HostRoomHistory
        uid={user?.uid}
        currentCode={code}
        onOpen={openPastRoom}
        disabled={busy}
      />
      {(error || roomError || communityError) && (
        <p className="notice error" role="alert">
          {error || roomError || communityError}
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
            Tạo không gian cho tối đa {CAPACITY} sinh viên cùng khám phá cách làm chủ
            AI.
          </p>
          <button
            className="primary"
            disabled={!user || busy}
            onClick={() => action(openNewRoom)}
          >
            {busy ? "Đang tạo phòng…" : "Tạo phòng"} <span>↗</span>
          </button>
          <small>4 chương · Mỗi người một hành trình</small>
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
                      : allFinished
                        ? "CẢ LỚP ĐÃ HOÀN THÀNH"
                        : "LỚP HỌC ĐÃ BẮT ĐẦU"}
                  </span>
                  <h1>
                    {room.status === "waiting"
                      ? "Cùng nhau, sẵn sàng."
                      : allFinished
                        ? "Một hành trình đã hoàn thành."
                        : "Những lựa chọn đang tiếp diễn."}
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
                    <small> / {room.capacity || CAPACITY}</small>
                  </strong>
                  <span>Đã tham gia</span>
                </div>
                <div>
                  <strong>{active}</strong>
                  <span>Đang kết nối</span>
                </div>
                <div>
                  <strong>
                    {room.status === "waiting"
                      ? "01"
                      : players.filter((player) => player.finished).length}
                  </strong>
                  <span>
                    {room.status === "waiting"
                      ? "Sẵn sàng vào lớp"
                      : "Đã hoàn thành hành trình"}
                  </span>
                </div>
              </div>
              {room.status !== "waiting" && (
                <Leaderboard players={room.players} />
              )}
              <HostCommunityView room={room} serverNow={serverNow} />
              <RoomView room={room} uid={user.uid} />
              {allFinished && (
                <div className="start-row">
                  <p>
                    Tất cả người chơi đã hoàn thành. Bạn có thể tạo phòng cho
                    lượt tiếp theo.
                    <br />
                    <small>
                      Kết quả trong phòng cũ vẫn được giữ. Người chơi nhập mã
                      phòng mới để chơi lại.
                    </small>
                  </p>
                  <button
                    className="primary"
                    disabled={busy || !online}
                    onClick={() => action(openNewRoom)}
                  >
                    {busy ? "Đang tạo phòng…" : "Tạo phòng mới"} <span>↗</span>
                  </button>
                </div>
              )}
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
                  {allFinished
                    ? "Hồ sơ cuối đã được lưu cho tất cả người chơi."
                    : "Mỗi người đang tự khám phá hành trình của mình. Tiến trình được lưu khi lựa chọn, chuyển tình huống và hoàn thành chương."}
                  <div className="host-checkpoints">
                    {[1, 2, 3, 4].map((chapter) => (
                      <span key={chapter}>
                        Chương {chapter}:{" "}
                        <strong>
                          {
                            players.filter(
                              (player) => player.currentCheckpoint >= chapter,
                            ).length
                          }
                          /{players.length}
                        </strong>{" "}
                        hoàn thành
                      </span>
                    ))}
                  </div>
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
