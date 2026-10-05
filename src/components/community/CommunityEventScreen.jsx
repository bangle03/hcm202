import { useState } from "react";
import { db } from "../../firebase/config";
import { voteInCommunity } from "../../firebase/communityCoordinator";
import { hasPlayerVoted } from "../../game/communityEngine";
import { errorMessage } from "../../utils/errors";
import CommunityChoiceCard from "./CommunityChoiceCard";
import CommunityResult from "./CommunityResult";
import VoteProgress from "./VoteProgress";

export default function CommunityEventScreen({ definition, eventState, code, uid, online, serverNow, progress, onContinue, disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const voted = hasPlayerVoted(eventState, uid);
  const remaining = Math.max(0, Math.ceil(((eventState?.endsAt || 0) - serverNow) / 1000));
  async function choose(choiceId) {
    if (busy || voted || !online) return;
    setBusy(true);
    setError("");
    try { await voteInCommunity(db, code, uid, definition.id, choiceId); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  if (eventState.status === "completed") return <CommunityResult definition={definition} result={eventState.result} onContinue={onContinue} disabled={disabled} />;
  return <section className="panel community-panel" aria-live="polite">
    <div className="eyebrow">SỰ KIỆN TOÀN LỚP · CHƯƠNG {definition.checkpoint}</div>
    <h2>{definition.title}</h2>
    <p>{definition.description}</p>
    <div className="community-meta"><VoteProgress voted={progress.voted} eligible={progress.eligible} /><strong>{eventState.endsAt ? `00:${String(remaining).padStart(2, "0")}` : "Đang bắt đầu…"}</strong></div>
    {error && <p className="notice error" role="alert">{error}</p>}
    {voted ? <p className="notice">Đã ghi nhận lựa chọn của bạn. Đang chờ các thành viên còn lại…</p> : <div className="community-choices">{definition.choices.map((choice) => <CommunityChoiceCard key={choice.id} choice={choice} disabled={busy || !online || remaining === 0 || !eventState.endsAt} onChoose={choose} />)}</div>}
  </section>;
}
