import { test } from "node:test";
import assert from "node:assert/strict";
import { scenes } from "../src/data/scenes.js";
import { initialStats } from "../src/data/stats.js";
import { profiles } from "../src/data/profiles.js";
import { applyEffects, calculateFinalScore } from "../src/game/scoreEngine.js";
import { getProfile } from "../src/game/profileEngine.js";
import {
  createInitialState,
  applyChoice,
  advanceState,
  getSceneById,
  getNextScene,
  validateSceneData,
  restoreState,
  stateError,
} from "../src/game/gameEngine.js";
import { loadPending, storePending } from "../src/game/recovery.js";
test("effects clamp 0–100 without mutating the previous profile", () => {
  const original = { ...initialStats, tuLuc: 95, nhanAi: 3 };
  const next = applyEffects(original, { tuLuc: 20, nhanAi: -50, hieuSuat: 8 });
  assert.equal(next.tuLuc, 100);
  assert.equal(next.nhanAi, 0);
  assert.equal(next.hieuSuat, 58);
  assert.equal(original.tuLuc, 95);
});
test("choice stays at consequence; continue resolves the actual branch and blocks duplicates", () => {
  const initial = createInitialState();
  const all = applyChoice(initial, "ai_all", 123);
  assert.equal(all.currentSceneId, "deadline_start");
  assert.equal(all.gamePhase, "consequence");
  assert.equal(all.history.length, 1);
  assert.equal(all.history[0].timestamp, 123);
  assert.equal(all.stats.tuLuc, 30);
  assert.equal(applyChoice(all, "ai_all"), all);
  assert.equal(advanceState(all).currentSceneId, "lecturer_question");
  assert.equal(
    advanceState(applyChoice(initial, "ai_support")).currentSceneId,
    "source_check",
  );
  assert.equal(
    getNextScene(getSceneById("deepfake").choices[1]).id,
    "repair_rumor",
  );
  assert.equal(
    getNextScene(getSceneById("class_file").choices[2]).id,
    "data_cleanup",
  );
});
test("refresh restores consequence and never applies effects again", () => {
  const chosen = applyChoice(createInitialState(), "ai_support", 500);
  const recovered = restoreState(JSON.parse(JSON.stringify(chosen)));
  assert.deepEqual(recovered.stats, chosen.stats);
  assert.equal(applyChoice(recovered, "ai_support"), recovered);
  assert.equal(advanceState(recovered).history.length, 1);
  assert.equal(advanceState(recovered).currentSceneId, "source_check");
  assert.deepEqual(
    restoreState({ ...chosen, history: { 0: chosen.history[0] } }).history,
    chosen.history,
  );
  assert.deepEqual(
    restoreState({ ...createInitialState(), history: undefined }).history,
    [],
  );
});
test("every content branch reaches a final checkpoint without cycles or missing scenes", () => {
  assert.deepEqual(validateSceneData(), []);
  const reached = new Set();
  function visit(id, path = new Set()) {
    assert.ok(!path.has(id), `Cycle at ${id}`);
    const scene = getSceneById(id);
    assert.ok(scene);
    reached.add(id);
    if (scene.final) return;
    const nextPath = new Set([...path, id]);
    for (const next of scene.checkpoint
      ? [scene.nextSceneId]
      : scene.choices.map((c) => c.nextSceneId))
      visit(next, nextPath);
  }
  visit("deadline_start");
  assert.equal(reached.size, scenes.length);
  assert.ok(
    validateSceneData([
      {
        ...scenes[0],
        choices: [{ ...scenes[0].choices[0], nextSceneId: "missing" }],
      },
    ]).length > 0,
  );
});
test("full journey produces four checkpoints, final score and stable completed state", () => {
  let state = createInitialState();
  const checkpoints = [];
  for (let i = 0; i < 70 && !state.finished; i++) {
    if (state.gamePhase === "scene")
      state = applyChoice(state, getSceneById(state.currentSceneId).choices[0]);
    else {
      if (state.gamePhase === "checkpoint")
        checkpoints.push(state.currentCheckpoint);
      state = advanceState(state);
    }
    assert.equal(stateError(state), "");
  }
  assert.deepEqual(checkpoints, [1, 2, 3, 4]);
  assert.equal(state.finished, true);
  assert.equal(state.gamePhase, "finished");
  assert.equal(state.finalScore, calculateFinalScore(state.stats));
  assert.equal(advanceState(state), state);
});
test("score excludes efficiency and profiles always have a reflection", () => {
  const stats = {
    liemChinh: 82,
    trachNhiem: 76,
    tuLuc: 68,
    nhanAi: 90,
    hieuSuat: 0,
  };
  assert.equal(calculateFinalScore(stats), 79);
  assert.equal(calculateFinalScore({ ...stats, hieuSuat: 100 }), 79);
  assert.equal(
    getProfile({ ...initialStats, hieuSuat: 90, tuLuc: 20 }).id,
    "efficient",
  );
  for (let i = 0; i <= 100; i++) {
    const profile = getProfile({
      liemChinh: i,
      trachNhiem: 100 - i,
      tuLuc: i % 71,
      nhanAi: i % 91,
      hieuSuat: i,
    });
    assert.ok(profiles[profile.id]);
    assert.ok(profile.description);
    assert.ok(profile.suggestion);
  }
});
test("invalid scene IDs produce a recovery error rather than a blank game", () => {
  const broken = { ...createInitialState(), currentSceneId: "no_such_scene" };
  assert.equal(getSceneById(broken.currentSceneId), null);
  assert.match(stateError(broken), /Không thể tải tình huống/);
  assert.throws(() => advanceState(broken), /Không thể tải tình huống/);
});
test("pending storage survives reload, ignores corrupted cache and handles storage failure", () => {
  const map = new Map();
  const storage = {
    getItem: (key) => map.get(key),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
  const mutation = {
    id: "one",
    baseRevision: 1,
    next: applyChoice({ ...createInitialState(), revision: 1 }, "ai_all"),
  };
  assert.equal(storePending(storage, "room:user", mutation), true);
  assert.deepEqual(loadPending(storage, "room:user"), mutation);
  assert.equal(loadPending(storage, "other:user"), null);
  map.set("room:user", '{"next":null}');
  assert.equal(loadPending(storage, "room:user"), null);
  assert.equal(
    storePending(
      {
        setItem() {
          throw new Error("quota");
        },
      },
      "key",
      mutation,
    ),
    false,
  );
});
