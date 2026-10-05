import { CAPACITY } from "../firebase/roomService";

export function isConnected(player) {
  return Object.keys(player.connections || {}).length > 0;
}
export default function RoomView({ room, uid }) {
  const players = Object.entries(room.players || {}).sort(
    (a, b) => a[1].joinedAt - b[1].joinedAt,
  );
  return (
    <section className="panel roster">
      <div className="section-heading">
        <h2>Lớp học của chúng ta</h2>
        <span>{players.length} / {room.capacity || CAPACITY} người</span>
      </div>
      {players.length ? (
        <div className="player-grid">
          {players.map(([id, p], index) => (
            <div className="player" key={id}>
              <span className={`avatar color-${index % 4}`}>
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>
                  {p.name}
                  {id === uid ? " (bạn)" : ""}
                </strong>
                <small>
                  <i className={isConnected(p) ? "dot" : "dot offline"} />
                  {isConnected(p) ? "Đã sẵn sàng" : "Mất kết nối"}
                </small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <span>◎</span>
          <h3>Chờ những người bạn đầu tiên</h3>
          <p>Chia sẻ mã phòng để cả lớp cùng tham gia.</p>
        </div>
      )}
    </section>
  );
}
