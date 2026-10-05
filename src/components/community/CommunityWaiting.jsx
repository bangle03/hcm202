export default function CommunityWaiting({ progress, hostOnline }) {
  return <section className="panel community-panel" role="status">
    <div className="eyebrow">SỰ KIỆN TOÀN LỚP</div>
    <h2>Đang chờ cả lớp…</h2>
    <p>{progress.arrived} / {progress.active} người đang kết nối đã hoàn thành chương này.</p>
    {!hostOnline && <p>Người dẫn đang mất kết nối. Sự kiện sẽ tự bắt đầu khi người dẫn trở lại.</p>}
  </section>;
}
