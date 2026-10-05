import { get, onValue, ref, runTransaction, serverTimestamp } from "firebase/database";
import { communityEvents } from "../data/communityEvents.js";
import {
  countVotes,
  determineOutcome,
  getCheckpointProgress,
  getVoteProgress,
} from "../game/communityEngine.js";

async function withObservedTransaction(target, callback) {
  let unsubscribe;
  try {
    await new Promise((resolve, reject) => {
      unsubscribe = onValue(target, resolve, reject);
    });
    return await runTransaction(target, callback, { applyLocally: false });
  } finally {
    unsubscribe?.();
  }
}

export async function triggerCommunityEvent(database, code, uid, definition) {
  const target = ref(database, `rooms/${code}`);
  return withObservedTransaction(target, (room) => {
    if (!room || room.hostId !== uid || room.status !== "playing") return;
    const community = room.community || {};
    if (community.triggered?.[definition.id] || community.currentEvent?.status === "active") return;
    if (!getCheckpointProgress(room, definition.checkpoint).ready) return;
    const startedAt = serverTimestamp();
    const next = {
      id: definition.id,
      checkpoint: definition.checkpoint,
      status: "active",
      startedAt,
    };
    return {
      ...room,
      community: {
        ...community,
        currentEvent: next,
        triggered: { ...community.triggered, [definition.id]: true },
        events: { ...community.events, [definition.id]: { ...next } },
      },
    };
  });
}

export async function setEventDeadline(database, code, uid, definition) {
  const target = ref(database, `rooms/${code}/community`);
  return withObservedTransaction(target, (community) => {
    const event = community?.events?.[definition.id];
    if (!event || event.status !== "active" || event.endsAt || !Number.isFinite(event.startedAt)) return;
    const endsAt = event.startedAt + definition.durationSeconds * 1000;
    return {
      ...community,
      currentEvent: { ...community.currentEvent, endsAt },
      events: { ...community.events, [definition.id]: { ...event, endsAt } },
    };
  });
}

export async function finalizeCommunityEvent(database, code, uid, definition, serverNow) {
  const target = ref(database, `rooms/${code}`);
  return withObservedTransaction(target, (room) => {
    if (!room || room.hostId !== uid || room.status !== "playing") return;
    const community = room.community;
    const event = community?.events?.[definition.id];
    if (!event || event.status !== "active" || community.currentEvent?.id !== definition.id || !event.endsAt) return;
    const progress = getVoteProgress(room, definition.id);
    if (serverNow < event.endsAt && !progress.allEligibleVoted) return;
    const { counts, totalVotes } = countVotes(definition, event.votes);
    const result = {
      counts,
      totalVotes,
      outcomeId: determineOutcome(definition, counts, totalVotes),
      completedAt: serverTimestamp(),
    };
    return {
      ...room,
      community: {
        ...community,
        currentEvent: { ...community.currentEvent, status: "completed" },
        events: {
          ...community.events,
          [definition.id]: { ...event, status: "completed", result },
        },
      },
    };
  });
}

export async function coordinateCommunity(database, code, uid, room, serverNow) {
  if (room?.status !== "playing" || room.hostId !== uid) return;
  const activeId = room.community?.currentEvent?.status === "active"
    ? room.community.currentEvent.id : null;
  if (activeId) {
    const definition = communityEvents.find((event) => event.id === activeId);
    if (!definition) return;
    const state = room.community.events?.[activeId];
    if (!state?.endsAt) await setEventDeadline(database, code, uid, definition);
    else await finalizeCommunityEvent(database, code, uid, definition, serverNow);
    return;
  }
  const next = communityEvents.find((definition) =>
    !room.community?.triggered?.[definition.id] &&
    getCheckpointProgress(room, definition.checkpoint).ready,
  );
  if (next) await triggerCommunityEvent(database, code, uid, next);
}

export async function voteInCommunity(database, code, uid, eventId, choiceId) {
  const definition = communityEvents.find((event) => event.id === eventId);
  if (!definition?.choices.some((choice) => choice.id === choiceId))
    throw new Error("Lựa chọn không hợp lệ.");
  const target = ref(database, `rooms/${code}/community/events/${eventId}/votes/${uid}`);
  const result = await runTransaction(target, (vote) =>
    vote ? undefined : { choiceId, votedAt: serverTimestamp() },
  { applyLocally: false });
  return result.committed ? result.snapshot.val() : (await get(target)).val();
}
