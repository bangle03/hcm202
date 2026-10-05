import { shuffledChoices } from "../../game/choiceOrder";

export function ChoiceCard({ choice, disabled, onChoose }) {
  return (
    <button
      className="choice-card"
      disabled={disabled}
      onClick={() => onChoose(choice.id)}
    >
      <span>{choice.text}</span>
      <span aria-hidden="true">↗</span>
    </button>
  );
}
export default function SceneCard({ scene, disabled, onChoose, choiceSeed, remainingSeconds, timerReady, timerExpired }) {
  const choices = shuffledChoices(scene.choices, `${choiceSeed}:${scene.id}`);
  return (
    <section className="panel story-card">
      <span className="scene-time">◷ {scene.time}</span>
      <h1>{scene.title}</h1>
      <p className="scene-description">{scene.description}</p>
      <div className={`scene-countdown${remainingSeconds <= 5 && timerReady && !timerExpired ? " urgent" : ""}`} role="status">
        <span>{timerExpired ? "Đã hết giờ" : timerReady ? "Thời gian chọn" : "Đang chuẩn bị đồng hồ…"}</span>
        {timerReady && !timerExpired && <strong>00:{String(remainingSeconds).padStart(2, "0")}</strong>}
      </div>
      {timerExpired && <p className="notice">Hết 20 giây: mỗi chỉ số cá nhân đã giảm 3 điểm. Bạn vẫn có thể chọn để tiếp tục.</p>}
      <h2 className="choice-heading">Bạn sẽ làm gì?</h2>
      <div className="choice-list">
        {choices.map((choice) => (
          <ChoiceCard
            key={choice.id}
            choice={choice}
            disabled={disabled || !timerReady}
            onChoose={onChoose}
          />
        ))}
      </div>
      <p className="scene-footnote">
        Cân nhắc điều bạn coi trọng trong tình huống này.
      </p>
    </section>
  );
}
