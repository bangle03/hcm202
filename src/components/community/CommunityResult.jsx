export default function CommunityResult({ definition, result, onContinue, disabled, projector = false }) {
  if (!result) return <p role="status">Đang tổng hợp quyết định của lớp…</p>;
  const outcome = definition.outcomes.find((item) => item.id === result.outcomeId);
  return <section className="panel community-panel community-result">
    <div className="eyebrow">KẾT QUẢ TOÀN LỚP</div>
    <h2>{result.totalVotes} người đã quyết định</h2>
    <div className="community-bars">
      {definition.choices.map((choice) => {
        const count = result.counts?.[choice.id] || 0;
        return <div className="community-bar" key={choice.id}>
          <div><span>{choice.text}</span><strong>{count}</strong></div>
          <div className="community-bar-track"><span style={{ width: `${result.totalVotes ? (count / result.totalVotes) * 100 : 0}%` }} /></div>
        </div>;
      })}
    </div>
    <div className="community-outcome"><h3>{outcome?.title}</h3><p>{outcome?.description}</p></div>
    {!projector && <button className="primary" disabled={disabled} onClick={onContinue}>Tiếp tục hành trình <span>→</span></button>}
  </section>;
}
