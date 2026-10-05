import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { joinRoom } from "../firebase/roomService";
import { errorMessage } from "../utils/errors";
import AuthNotice from "../components/AuthNotice";
export default function JoinPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (busy || !user) return;
    setBusy(true);
    setError("");
    try {
      await joinRoom(user.uid, name, code);
      localStorage.setItem("ai-player-room", code);
      navigate("/play");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="landing">
      <section className="hero">
        <div className="eyebrow">
          <span className="dot" /> TRẢI NGHIỆM TƯƠNG TÁC DÀNH CHO LỚP HỌC
        </div>
        <h1>
          Công nghệ mới.
          <br />
          Lựa chọn của <em>bạn.</em>
        </h1>
        <p className="intro">
          Khi AI có thể làm rất nhiều điều, bạn sẽ chọn làm gì?
          <br />
          Cùng khám phá cách sử dụng AI có trách nhiệm, bắt đầu từ những quyết
          định nhỏ.
        </p>
        <div className="orbital" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="core">
            AI<span>BẠN LÀ NGƯỜI LÀM CHỦ</span>
          </div>
          <span className="orbit-tag tag-one">↗ Tự lực</span>
          <span className="orbit-tag tag-two">♡ Nhân ái</span>
          <span className="orbit-tag tag-three">◈ Liêm chính</span>
          <span className="orbit-tag tag-four">◎ Trách nhiệm</span>
        </div>
        <div className="hero-bottom">
          <span>01 — KẾT NỐI</span>
          <span>02 — LỰA CHỌN</span>
          <span>03 — SUY NGẪM</span>
        </div>
      </section>
      <section className="join-side">
        <div className="panel join-panel">
          <span className="pill">MỖI LỰA CHỌN ĐỀU CÓ Ý NGHĨA</span>
          <h2>Vào lớp thôi.</h2>
          <p>Nhập tên và mã phòng từ màn hình của giảng viên.</p>
          <AuthNotice />
          <form onSubmit={submit}>
            <label htmlFor="name">Bạn tên là gì?</label>
            <input
              id="name"
              autoComplete="nickname"
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên của bạn"
              required
            />
            <label htmlFor="code">Mã phòng</label>
            <input
              className="code-input"
              id="code"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/\s/g, ""))
              }
              placeholder="VD: AB2C3D"
              required
              minLength={6}
            />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={!user || busy}>
              {busy ? "Đang tham gia…" : "Tham gia lớp học"} <span>↗</span>
            </button>
          </form>
          <div className="privacy">
            ◈ Không cần tài khoản · Không cần mật khẩu
          </div>
          {localStorage.getItem("ai-player-room") && (
            <Link className="resume-link" to="/play">
              Quay lại phòng đã tham gia →
            </Link>
          )}
        </div>
        <div className="host-link">
          <span>Bạn là người dẫn lớp?</span>
          <Link to="/host">
            Tạo phòng mới <span>→</span>
          </Link>
        </div>
        <p className="footnote">
          Một trải nghiệm học tập để cùng suy ngẫm.
          <br />
          Không đánh giá ai là “người đạo đức hơn”.
        </p>
      </section>
    </div>
  );
}
