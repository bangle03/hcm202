import { statDefinitions } from "../../data/stats";
export default function ConsequenceCard({
  scene,
  state,
  disabled,
  onContinue,
}) {
  const choice = scene.choices.find(
    (item) => item.id === state.selectedChoiceId,
  );
  return (
    <section className="panel story-card consequence-card">
      <span className="eyebrow">LỰA CHỌN CỦA BẠN</span>
      <h1>{choice.text}</h1>
      <div className="effect-list">
        {statDefinitions
          .filter((stat) => choice.effects[stat.id])
          .map((stat) => (
            <span
              key={stat.id}
              className={
                choice.effects[stat.id] > 0
                  ? "effect increase"
                  : "effect decrease"
              }
            >
              {stat.label} {choice.effects[stat.id] > 0 ? "↑ +" : "↓ "}
              {choice.effects[stat.id]}
            </span>
          ))}
      </div>
      <h2 className="choice-heading">Hậu quả</h2>
      <p className="scene-description">{choice.consequence}</p>
      {state.timerExpired && <p className="notice">Bạn đã hết thời gian ở tình huống này; mỗi chỉ số cá nhân giảm 3 điểm.</p>}
      <p className="scene-footnote">
        Thay đổi theo lựa chọn; mỗi chỉ số được giới hạn từ 0 đến 100.
      </p>
      <button className="primary" disabled={disabled} onClick={onContinue}>
        Tiếp tục <span>→</span>
      </button>
    </section>
  );
}
