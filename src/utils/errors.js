export function errorMessage(error) {
  const messages = {
    "auth/operation-not-allowed": "Chưa bật đăng nhập ẩn danh trong Firebase.",
    "auth/network-request-failed":
      "Không thể kết nối. Hãy kiểm tra mạng và thử lại.",
    "auth/too-many-requests":
      "Có quá nhiều lượt đăng nhập. Vui lòng thử lại sau.",
    "auth/invalid-api-key": "Cấu hình Firebase chưa hợp lệ.",
    PERMISSION_DENIED:
      "Không có quyền thực hiện. Hãy kiểm tra mã phòng và Firebase Rules.",
    "permission-denied":
      "Không có quyền thực hiện. Hãy kiểm tra mã phòng và Firebase Rules.",
  };
  return (
    messages[error.code] ||
    (error.code
      ? "Không thể thực hiện. Vui lòng thử lại hoặc kiểm tra cấu hình Firebase."
      : error.message)
  );
}
