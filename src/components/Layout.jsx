import { Link } from "react-router-dom";
export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header>
        <Link className="brand" to="/">
          <span className="brand-icon">✳</span> LÀM CHỦ AI
          <span className="edition"> / LỚP HỌC KẾT NỐI</span>
        </Link>
        <span className="header-label">TƯ TƯỞNG HỒ CHÍ MINH</span>
      </header>
      <main>{children}</main>
      <footer>
        <span>Đạo đức và tu dưỡng trong thời đại AI</span>
        <span>Con người suy nghĩ. AI hỗ trợ.</span>
      </footer>
    </div>
  );
}
