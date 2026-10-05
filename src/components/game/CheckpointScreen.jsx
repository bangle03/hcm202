import { chapters } from "../../data/chapters";
import { statDefinitions } from "../../data/stats";
import { StatBar } from "./StatsPanel";
export default function CheckpointScreen({ state, disabled, onContinue, hideContinue = false }) {
  const chapter = chapters[state.currentChapter - 1];
  return (
    <section className="panel story-card checkpoint-card">
      <span className="welcome-symbol" aria-hidden="true">
        ✳
      </span>
      <div className="eyebrow">CHƯƠNG {chapter.number} HOÀN THÀNH</div>
      <h1>{chapter.title}</h1>
      <p className="scene-description">{chapter.reflection}</p>
      <div className="checkpoint-stats">
        {statDefinitions.slice(0, 4).map((stat) => (
          <StatBar key={stat.id} {...stat} value={state.stats[stat.id]} />
        ))}
      </div>
      <p className="scene-footnote">
        Các quyết định của bạn đang hình thành cách bạn sử dụng AI.
      </p>
      {!hideContinue && <button className="primary" disabled={disabled} onClick={onContinue}>
        {chapter.number === 4 ? "Xem hồ sơ của bạn" : "Tiếp tục hành trình"}{" "}
        <span>→</span>
      </button>}
    </section>
  );
}
