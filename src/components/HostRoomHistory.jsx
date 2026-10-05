import useHostRooms from "../hooks/useHostRooms";
export default function HostRoomHistory({
  uid,
  currentCode,
  onOpen,
  disabled,
}) {
  const { rooms, loading, error } = useHostRooms(uid);
  return (
    <details className="panel host-history">
      <summary>
        Phòng đã tạo <span>{rooms.length} phòng · Xem danh sách cũ</span>
      </summary>
      <p className="ranking-note">
        Mở phòng để xem lại người tham gia và bảng điểm. Lịch sử gắn với tài
        khoản ẩn danh trên trình duyệt này; xóa dữ liệu trình duyệt có thể làm
        mất quyền truy cập.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {uid && loading && <p role="status">Đang tải lịch sử…</p>}
      {!loading && !error && !rooms.length && (
        <p>Chưa có phòng nào được tạo.</p>
      )}
      <div className="history-list">
        {rooms.map((room) => (
          <button
            className="history-room"
            key={room.code}
            disabled={disabled || currentCode === room.code}
            onClick={() => onOpen(room.code)}
          >
            <span>
              <strong>{room.code}</strong>
              <small>{new Date(room.createdAt).toLocaleString("vi-VN")}</small>
            </span>
            <span>
              {room.finished}/{room.total} hoàn thành
              <small>
                {currentCode === room.code
                  ? "Đang xem"
                  : room.status === "waiting"
                    ? "Phòng chờ · Mở →"
                    : room.total > 0 && room.finished === room.total
                      ? "Đã hoàn thành · Xem kết quả →"
                      : "Đã bắt đầu · Mở →"}
              </small>
            </span>
          </button>
        ))}
      </div>
    </details>
  );
}
