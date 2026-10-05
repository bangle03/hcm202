import { Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import JoinPage from "./pages/JoinPage";
import HostPage from "./pages/HostPage";
import PlayerGamePage from "./pages/PlayerGamePage";
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/play" element={<PlayerGamePage />} />
        <Route
          path="*"
          element={
            <div className="center-page">
              <h1>Không tìm thấy trang</h1>
              <Link to="/">Về lớp học →</Link>
            </div>
          }
        />
      </Routes>
    </Layout>
  );
}
