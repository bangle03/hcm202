import { test } from "node:test";
import assert from "node:assert/strict";
import { getLeaderboard } from "../src/game/leaderboard.js";
test("ranking uses completed scores, then finish time, retaining different UIDs with same name", () => {
  const ranking = getLeaderboard({
    a: { name: "An", finished: true, finalScore: 80, finishedAt: 30 },
    b: { name: "An", finished: true, finalScore: 80, finishedAt: 20 },
    c: { finished: false, finalScore: 100 },
    d: { finished: true, finalScore: 90, finishedAt: 40 },
    e: { finished: true },
  });
  assert.deepEqual(
    ranking.map((player) => player.uid),
    ["d", "b", "a"],
  );
  assert.deepEqual(getLeaderboard(), []);
});
