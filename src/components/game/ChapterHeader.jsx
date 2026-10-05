import { chapters } from "../../data/chapters";
export default function ChapterHeader({ state }) {
  const chapter = chapters[state.currentChapter - 1];
  return (
    <div className="chapter-header">
      <div>
        <span className="eyebrow">
          HÀNH TRÌNH CỦA BẠN · CHƯƠNG {state.currentChapter}
        </span>
        <h2>{chapter?.title}</h2>
      </div>
      <ol
        className="chapter-progress"
        aria-label={`Tiến trình: hoàn thành ${state.currentCheckpoint} trên 4 chương`}
      >
        {chapters.map((item) => (
          <li
            key={item.id}
            title={item.title}
            aria-current={
              item.number === state.currentChapter ? "step" : undefined
            }
            className={
              item.number <= state.currentCheckpoint
                ? "complete"
                : item.number === state.currentChapter
                  ? "current"
                  : ""
            }
          >
            <span>
              {item.number <= state.currentCheckpoint ? "✓" : item.number}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
