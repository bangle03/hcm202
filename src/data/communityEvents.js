export const communityEvents = [
  {
    id: "deepfake_class",
    checkpoint: 1,
    title: "Một video đang lan truyền",
    description: "Một video có hình ảnh giảng viên xuất hiện trong nhóm lớp. Vài chi tiết trông không tự nhiên và có thể đây là deepfake. Bạn sẽ làm gì?",
    durationSeconds: 20,
    choices: [
      { id: "share", text: "Chia sẻ cho bạn bè xem" },
      { id: "ignore", text: "Bỏ qua" },
      { id: "verify", text: "Kiểm chứng nguồn trước" },
      { id: "report", text: "Báo cáo nội dung" },
    ],
    safeChoices: ["verify", "report"],
    outcomes: [
      { id: "contained", title: "Tin giả được hạn chế", description: "Phần lớn lớp chọn kiểm chứng hoặc báo cáo trước khi chia sẻ. Nội dung đáng ngờ được ngăn lan rộng." },
      { id: "spread", title: "Nội dung tiếp tục lan rộng", description: "Video được nhiều người nhìn thấy trước khi nguồn gốc được xác minh. Cả lớp cần cùng đính chính thông tin." },
    ],
  },
  {
    id: "privacy_class",
    checkpoint: 2,
    title: "Một lời mời phân tích dữ liệu",
    description: "Một công cụ AI đề nghị tải lên danh sách sinh viên gồm họ tên, email và kết quả học tập để phân tích hiệu quả. Bạn sẽ xử lý thế nào?",
    durationSeconds: 20,
    choices: [
      { id: "upload", text: "Tải danh sách lên ngay" },
      { id: "redact", text: "Loại bỏ dữ liệu nhận dạng trước" },
      { id: "consent", text: "Hỏi ý kiến những người có dữ liệu" },
      { id: "decline", text: "Từ chối đưa dữ liệu lên công cụ này" },
    ],
    safeChoices: ["redact", "consent", "decline"],
    outcomes: [
      { id: "protected", title: "Dữ liệu được tôn trọng", description: "Cả lớp ưu tiên quyền riêng tư. Việc phân tích chỉ tiếp tục khi dữ liệu được xử lý phù hợp." },
      { id: "exposed", title: "Thông tin cần được thu hồi", description: "Dữ liệu cá nhân đã được chia sẻ quá vội. Cả lớp phải dừng lại, thông báo và tìm cách thu hồi." },
    ],
  },
  {
    id: "bias_class",
    checkpoint: 3,
    title: "Danh sách được AI đề xuất",
    description: "AI chọn sinh viên tham gia một dự án, nhưng kết quả có dấu hiệu ưu tiên một nhóm dù năng lực tương đương. Bạn sẽ làm gì?",
    durationSeconds: 20,
    choices: [
      { id: "accept", text: "Dùng ngay danh sách AI đưa ra" },
      { id: "review", text: "Kiểm tra tiêu chí và dữ liệu đầu vào" },
      { id: "appeal", text: "Mời người bị ảnh hưởng góp ý và khiếu nại" },
      { id: "human", text: "Đề nghị con người xét lại quyết định" },
    ],
    safeChoices: ["review", "appeal", "human"],
    outcomes: [
      { id: "fair", title: "Cơ hội được xem xét công bằng hơn", description: "Cả lớp yêu cầu kiểm tra thiên kiến và để con người chịu trách nhiệm với quyết định cuối cùng." },
      { id: "biased", title: "Một số bạn bị bỏ lại", description: "Danh sách AI được chấp nhận quá nhanh. Cả lớp cần xem lại tiêu chí để không bỏ sót người xứng đáng." },
    ],
  },
];
