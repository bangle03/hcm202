import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../hooks/useRoom";
import AuthNotice from "../components/AuthNotice";
import RoomView from "../components/RoomView";
import PersonalGame from "../components/game/PersonalGame";
export default function PlayerGamePage() {
  const { user } = useAuth();
  const code = localStorage.getItem("ai-player-room");
  const { room, loading, error, online, member } = useRoom(
    code,
    user,
    "player",
  );
  if (!code)
    return (
      <div className="center-page">
        <h1>Bạn chưa tham gia phòng</h1>
        <Link to="/">Nhập mã phòng →</Link>
      </div>
    );
  return (
    <div className="room-page">
      <AuthNotice />
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {user && loading && <p role="status">Đang tải phòng…</p>}
      {room && member && (
        <>
          <div className="eyebrow">
            PHÒNG {code} · {online ? "ĐÃ KẾT NỐI" : "ĐANG KẾT NỐI LẠI…"}
          </div>
          {room.status === "waiting" ? (
            <>
              <section className="welcome">
                <span className="welcome-symbol">
                  {room.status === "waiting" ? "✳" : "↗"}
                </span>
                <h1>
                  {room.status === "waiting"
                    ? "Bạn đã có mặt."
                    : "Cả lớp đã bắt đầu!"}
                </h1>
                <p>
                  Xin chào <strong>{room.players[user.uid].name}</strong>.{" "}
                  {room.status === "waiting"
                    ? "Hãy giữ màn hình này mở. Bạn sẽ tự động nhận tín hiệu khi người dẫn bắt đầu."
                    : "Tín hiệu bắt đầu đã được đồng bộ đến thiết bị của bạn."}
                </p>
                {!Object.keys(room.hostConnections || {}).length && (
                  <p className="notice">
                    Người dẫn đang mất kết nối. Phòng và danh sách của bạn vẫn
                    được giữ lại.
                  </p>
                )}
              </section>
              <RoomView room={room} uid={user.uid} />
            </>
          ) : (
            <PersonalGame
              key={`${code}:${user.uid}:${room.gameStartedAt}`}
              code={code}
              uid={user.uid}
              startedAt={room.gameStartedAt}
              player={room.players[user.uid]}
              online={online}
            />
          )}
        </>
      )}
      {room && !member && (
        <p className="notice">
          Thiết bị này chưa tham gia phòng. <Link to="/">Tham gia lại →</Link>
        </p>
      )}
      <Link className="back-link" to="/">
        ← Về trang tham gia
      </Link>
    </div>
  );
}
