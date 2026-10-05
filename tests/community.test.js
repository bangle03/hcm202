import { test } from "node:test";
import assert from "node:assert/strict";
import { communityEvents } from "../src/data/communityEvents.js";
import { countVotes, determineOutcome, getCheckpointProgress, getVoteProgress, shouldShowCommunity } from "../src/game/communityEngine.js";

const event = communityEvents[0];
function room(arrived, active = 5) {
  return { status: "playing", players: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [
    `p${i}`, { connections: i < active ? { tab: 1 } : {}, currentCheckpoint: i < arrived ? 1 : 0, gamePhase: i < arrived ? "checkpoint" : "scene", finished: false },
  ])) };
}
test("80% of connected unfinished players opens checkpoint, with an outage floor", () => {
  assert.equal(getCheckpointProgress(room(3), 1).ready, false);
  assert.equal(getCheckpointProgress(room(4), 1).ready, true);
  assert.equal(getCheckpointProgress(room(4, 1), 1).ready, false);
  assert.equal(getCheckpointProgress(room(0, 0), 1).ready, false);
});
test("votes are counted by choice and outcome uses a 60% collective threshold", () => {
  const votes = { p1: { choiceId: "verify" }, p2: { choiceId: "report" }, p3: { choiceId: "share" }, p4: { choiceId: "verify" } };
  const { counts, totalVotes } = countVotes(event, votes);
  assert.deepEqual(counts, { share: 1, ignore: 0, verify: 2, report: 1 });
  assert.equal(totalVotes, 4);
  assert.equal(determineOutcome(event, counts, totalVotes), "contained");
  assert.equal(determineOutcome(event, { share: 3 }, 3), "spread");
});
test("late player remains in personal scene, then sees active or completed event at checkpoint", () => {
  const state = { gamePhase: "scene", currentCheckpoint: 0 };
  assert.equal(shouldShowCommunity(state, room(4)), null);
  const waiting = shouldShowCommunity({ gamePhase: "checkpoint", currentCheckpoint: 1 }, room(4));
  assert.equal(waiting.event.id, event.id);
  assert.equal(waiting.eventState, null);
  const completedRoom = room(4);
  completedRoom.community = { events: { [event.id]: { status: "completed", result: { totalVotes: 4 } } } };
  assert.equal(shouldShowCommunity({ gamePhase: "checkpoint", currentCheckpoint: 1 }, completedRoom).eventState.status, "completed");
  assert.equal(shouldShowCommunity({ gamePhase: "scene", currentCheckpoint: 1 }, completedRoom), null);
});
test("vote progress counts connected players without requiring late arrivals to vote", () => {
  const sample = room(4);
  sample.community = { events: { [event.id]: { votes: { p0: { choiceId: "verify" }, p1: { choiceId: "report" }, p2: { choiceId: "verify" }, p3: { choiceId: "report" } } } } };
  assert.deepEqual(getVoteProgress(sample, event.id), { voted: 4, eligible: 5, allEligibleVoted: true });
});
