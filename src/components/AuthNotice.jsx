import { useAuth } from "../contexts/AuthContext";
export default function AuthNotice() {
  const { configured, loading, error, retry } = useAuth();
  if (!configured)
    return (
      <div className="notice" role="status">
        <strong>Chưa kết nối Firebase</strong>
        <p>
          Thêm cấu hình Firebase vào biến môi trường để tạo hoặc tham gia phòng.
          Xem hướng dẫn trong README của dự án.
        </p>
      </div>
    );
  if (loading)
    return (
      <div className="notice" role="status">
        Đang kết nối lớp học…
      </div>
    );
  if (error)
    return (
      <div className="notice error" role="alert">
        {error}{" "}
        <button className="text-button" onClick={retry}>
          Thử lại
        </button>
      </div>
    );
  return null;
}
