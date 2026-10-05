import { Link } from "react-router-dom";
import { getProfile } from "../../game/profileEngine";
import { statDefinitions } from "../../data/stats";
import { StatBar } from "./StatsPanel";
export default function FinalProfile({ state, playerName }) {
  const profile = getProfile(state.stats);
  return (
    <section className="panel final-profile">
      <div className="eyebrow">HỒ SƠ SỬ DỤNG AI CỦA BẠN</div>
      <div className="mastery-score">
        <strong>{state.finalScore}</strong>
        <span>Điểm làm chủ AI</span>
      </div>
      <p className="result-caption">
        Một lát cắt từ những lựa chọn trong hành trình này.
      </p>
      <div className="final-columns">
        <div>
          {statDefinitions.map((stat) => (
            <StatBar key={stat.id} {...stat} value={state.stats[stat.id]} />
          ))}
        </div>
        <div className="profile-reflection">
          <span className="pill">GÓC NHÌN PHẢN TƯ</span>
          <h1>{profile.title}</h1>
          <p>{profile.description}</p>
          <h2>Một việc nhỏ cho ngày mai</h2>
          <p>{profile.suggestion}</p>
        </div>
      </div>
      <p className="result-note">
        Điểm là trung bình của Liêm chính, Trách nhiệm, Tự lực và Nhân ái; không
        tính Hiệu suất. Hồ sơ giúp bạn suy ngẫm về cách dùng AI, không đánh giá
        nhân cách hay so sánh ai là người đạo đức hơn.
      </p>
      <div className="new-room-action">
        <p>Kết quả lượt này đã được lưu. Bạn có thể dùng chính thiết bị này để tham gia một phòng mới.</p>
        <Link className="primary" to="/" state={{ newRoom: true, playerName }}>
          Vào phòng khác <span>↗</span>
        </Link>
      </div>
    </section>
  );
}
