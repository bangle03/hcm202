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
export default function SceneCard({ scene, disabled, onChoose }) {
  return (
    <section className="panel story-card">
      <span className="scene-time">◷ {scene.time}</span>
      <h1>{scene.title}</h1>
      <p className="scene-description">{scene.description}</p>
      <h2 className="choice-heading">Bạn sẽ làm gì?</h2>
      <div className="choice-list">
        {scene.choices.map((choice) => (
          <ChoiceCard
            key={choice.id}
            choice={choice}
            disabled={disabled}
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
