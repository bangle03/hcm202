import { communityEvents } from "../data/communityEvents.js";

export const COMMUNITY_THRESHOLD = 0.8;
export const getCommunityEventByCheckpoint = (checkpoint) =>
  communityEvents.find((event) => event.checkpoint === checkpoint) || null;
export const getCommunityEventById = (id) =>
  communityEvents.find((event) => event.id === id) || null;

export function getActivePlayers(room) {
  if (room?.status !== "playing") return [];
  return Object.entries(room.players || {}).filter(([, player]) =>
    Object.keys(player.connections || {}).length > 0 && !player.finished,
  );
}

export function getCheckpointProgress(room, checkpoint) {
  const active = getActivePlayers(room);
  const arrived = active.filter(([, player]) => player.currentCheckpoint >= checkpoint);
  const joined = Object.keys(room?.players || {}).length;
  // A large class should not trigger because nearly everybody briefly went offline.
  const minimumActive = Math.min(joined, Math.max(2, Math.ceil(joined * 0.25)));
  return {
    active: active.length,
    arrived: arrived.length,
    minimumActive,
    ready: active.length >= minimumActive && active.length > 0 && arrived.length / active.length >= COMMUNITY_THRESHOLD,
  };
}

export function countVotes(event, votes = {}) {
  const counts = Object.fromEntries(event.choices.map(({ id }) => [id, 0]));
  for (const vote of Object.values(votes))
    if (Object.hasOwn(counts, vote?.choiceId)) counts[vote.choiceId]++;
  return { counts, totalVotes: Object.values(counts).reduce((sum, count) => sum + count, 0) };
}

export function determineOutcome(event, counts, totalVotes) {
  const safe = event.safeChoices.reduce((sum, id) => sum + (counts[id] || 0), 0);
  return event.outcomes[totalVotes > 0 && safe / totalVotes >= 0.6 ? 0 : 1].id;
}

export function getVoteProgress(room, eventId) {
  const votes = room?.community?.events?.[eventId]?.votes || {};
  const active = getActivePlayers(room);
  const eligible = active.filter(([, player]) =>
    player.gamePhase === "checkpoint" && player.currentCheckpoint === getCommunityEventById(eventId)?.checkpoint,
  );
  return {
    voted: active.filter(([uid]) => !!votes[uid]).length,
    eligible: active.length,
    allEligibleVoted: eligible.length > 0 && eligible.every(([uid]) => !!votes[uid]),
  };
}

export function hasPlayerVoted(eventState, uid) {
  return !!eventState?.votes?.[uid];
}

export function shouldShowCommunity(state, room) {
  if (state?.gamePhase !== "checkpoint") return null;
  const event = getCommunityEventByCheckpoint(state.currentCheckpoint);
  return event ? { event, eventState: room?.community?.events?.[event.id] || null } : null;
}
