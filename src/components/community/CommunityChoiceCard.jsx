export default function CommunityChoiceCard({ choice, disabled, selected, onChoose }) {
  return <button className={`community-choice${selected ? " selected" : ""}`} disabled={disabled} onClick={() => onChoose(choice.id)}>{choice.text}<span aria-hidden="true">↗</span></button>;
}
