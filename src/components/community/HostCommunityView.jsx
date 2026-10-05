import { getCommunityEventById, getVoteProgress } from "../../game/communityEngine";
import CommunityResult from "./CommunityResult";
import VoteProgress from "./VoteProgress";

export default function HostCommunityView({ room, serverNow }) {
  const pointer = room?.community?.currentEvent;
  const definition = getCommunityEventById(pointer?.id);
  const eventState = room?.community?.events?.[pointer?.id];
  if (!definition || !eventState) return null;
  if (eventState.status === "completed") return <CommunityResult definition={definition} result={eventState.result} projector />;
  const progress = getVoteProgress(room, definition.id);
  const remaining = Math.max(0, Math.ceil(((eventState.endsAt || 0) - serverNow) / 1000));
  return <section className="panel community-panel host-community">
    <div className="eyebrow">SỰ KIỆN TOÀN LỚP</div><h2>{definition.title}</h2><p>{definition.description}</p>
    <div className="community-meta"><VoteProgress voted={progress.voted} eligible={progress.eligible} /><strong>{eventState.endsAt ? `00:${String(remaining).padStart(2, "0")}` : "Đang bắt đầu…"}</strong></div>
    <p>Lớp đang quyết định. Kết quả sẽ hiện khi sự kiện kết thúc.</p>
  </section>;
}
