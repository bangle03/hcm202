import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  ref,
  set,
  update,
  get,
  runTransaction,
  serverTimestamp,
  remove,
} from "firebase/database";
let env;
const code = "ABC234";
const roomPath = `rooms/${code}`;
const dbFor = (uid) => env.authenticatedContext(uid).database();
const player = () => ({
  name: "Sinh viên",
  seat: "1",
  joinedAt: serverTimestamp(),
  currentChapter: 0,
  currentCheckpoint: 0,
  finished: false,
});
function join(uid, seat = "1", extra = {}) {
  return update(ref(dbFor(uid), roomPath), {
    [`players/${uid}`]: { ...player(), seat, ...extra },
    [`seats/${seat}`]: uid,
  });
}
async function create() {
  return set(ref(dbFor("host"), roomPath), {
    roomCode: code,
    hostId: "host",
    status: "waiting",
    capacity: 35,
    createdAt: serverTimestamp(),
  });
}
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-lamchuai",
    database: {
      host: "127.0.0.1",
      port: 9000,
      rules: await readFile("firebase.rules.json", "utf8"),
    },
  });
});
beforeEach(async () => {
  await env.clearDatabase();
  await create();
});
after(async () => {
  await env?.cleanup();
});
test("anonymous room access requires authentication and does not allow room listing", async () => {
  await assertFails(
    get(ref(env.unauthenticatedContext().database(), roomPath)),
  );
  await assertSucceeds(get(ref(dbFor("student"), roomPath)));
  await assertFails(get(ref(dbFor("student"), "rooms")));
});
test("player can join only their own UID and cannot alter host or another player", async () => {
  const db = dbFor("student");
  await assertSucceeds(join("student"));
  await assertFails(set(ref(db, `${roomPath}/players/other`), player()));
  await assertFails(
    update(ref(db, roomPath), {
      status: "playing",
      gameStartedAt: serverTimestamp(),
    }),
  );
  await assertFails(set(ref(db, `${roomPath}/hostId`), "student"));
  await assertFails(
    set(ref(db, `${roomPath}/players/student/finalScore`), 100),
  );
});
test("host transaction starts room; late joining denied and existing presence survives", async () => {
  const student = dbFor("student");
  await join("student");
  await assertSucceeds(
    runTransaction(ref(dbFor("host"), roomPath), (room) =>
      room
        ? { ...room, status: "playing", gameStartedAt: serverTimestamp() }
        : room,
    ),
  );
  await assertFails(join("late", "2"));
  await assertSucceeds(
    set(
      ref(student, `${roomPath}/players/student/connections/tab1`),
      serverTimestamp(),
    ),
  );
  await assertFails(
    set(ref(student, `${roomPath}/players/student/name`), "Đổi tên"),
  );
  await assertFails(set(ref(dbFor("host"), `${roomPath}/status`), "waiting"));
});
test("only one of two concurrent players can claim the 35th seat", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const players = Object.fromEntries(
      Array.from({ length: 34 }, (_, i) => [
        `seed${i}`,
        { ...player(), seat: String(i + 1), joinedAt: 1 },
      ]),
    );
    await update(ref(context.database(), roomPath), {
      players,
      seats: Object.fromEntries(
        Array.from({ length: 34 }, (_, i) => [String(i + 1), `seed${i}`]),
      ),
    });
  });
  const outcomes = await Promise.allSettled(
    ["a", "b"].map((uid) => join(uid, "35")),
  );
  assert.equal(outcomes.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(
    Object.keys((await get(ref(dbFor("host"), `${roomPath}/players`))).val())
      .length,
    35,
  );
});
test("multiple connections preserve presence and other users cannot remove them", async () => {
  const db = dbFor("student");
  const path = `${roomPath}/players/student`;
  await join("student");
  await set(ref(db, `${path}/connections/tab1`), serverTimestamp());
  await set(ref(db, `${path}/connections/tab2`), serverTimestamp());
  await assertFails(remove(ref(dbFor("other"), `${path}/connections/tab2`)));
  await remove(ref(db, `${path}/connections/tab1`));
  assert.equal((await get(ref(db, `${path}/connections/tab2`))).exists(), true);
  await assertSucceeds(remove(ref(db, `${path}/connections/tab2`)));
});
test("room collision cannot overwrite host and invalid player data rejected", async () => {
  await assertFails(
    set(ref(dbFor("intruder"), roomPath), {
      roomCode: code,
      hostId: "intruder",
      status: "waiting",
      capacity: 35,
      createdAt: serverTimestamp(),
    }),
  );
  await assertFails(join("student", "1", { name: "x".repeat(31) }));
  await assertFails(join("student", "36"));
});
import { saveProgress } from "../src/firebase/gameService.js";
import { triggerCommunityEvent, setEventDeadline, finalizeCommunityEvent, voteInCommunity } from "../src/firebase/communityCoordinator.js";
import { communityEvents } from "../src/data/communityEvents.js";
import { getCheckpointProgress } from "../src/game/communityEngine.js";
import {
  createInitialState,
  applyChoice,
  applySceneTimeout,
  advanceState,
  getSceneById,
  restoreState,
} from "../src/game/gameEngine.js";
async function startAndInitialize() {
  await join("student");
  await update(ref(dbFor("host"), roomPath), {
    status: "playing",
    gameStartedAt: serverTimestamp(),
  });
  return (
    await saveProgress(dbFor("student"), code, "student", {
      id: "init",
      baseRevision: 0,
      next: createInitialState(),
    })
  ).state;
}
async function persist(state, next, id = crypto.randomUUID()) {
  return saveProgress(dbFor("student"), code, "student", {
    id,
    baseRevision: state.revision,
    next,
  });
}
test("Firebase saves consequence, restores on refresh and retries mutation only once", async () => {
  const state = await startAndInitialize();
  const mutation = {
    id: "choice-once",
    baseRevision: state.revision,
    next: applyChoice(state, "ai_all", 1000),
  };
  const saved = (
    await saveProgress(dbFor("student"), code, "student", mutation)
  ).state;
  const retry = (
    await saveProgress(dbFor("student"), code, "student", mutation)
  ).state;
  const fresh = restoreState(
    (await get(ref(dbFor("student"), `${roomPath}/players/student`))).val(),
  );
  assert.equal(fresh.gamePhase, "consequence");
  assert.equal(fresh.selectedChoiceId, "ai_all");
  assert.equal(fresh.stats.tuLuc, 30);
  assert.equal(fresh.history.length, 1);
  assert.equal(retry.revision, saved.revision);
  assert.deepEqual(retry.stats, saved.stats);
  assert.equal(advanceState(fresh).currentSceneId, "lecturer_question");
});
test("scene timer is server-stamped and a 30-second timeout auto-advances only once", async () => {
  const initial = await startAndInitialize();
  assert.ok(Number.isFinite(initial.sceneStartedAt));
  const mutation = {
    id: "timer-once", baseRevision: initial.revision,
    next: applySceneTimeout(initial, initial.sceneStartedAt + 30000),
  };
  const saved = (await saveProgress(dbFor("student"), code, "student", mutation)).state;
  const retry = (await saveProgress(dbFor("student"), code, "student", mutation)).state;
  assert.equal(saved.timeoutCount, 1);
  assert.equal(retry.timeoutCount, 1);
  assert.ok(Object.values(saved.stats).every((value) => value === 47));
  assert.equal(saved.currentSceneId, "source_check");
  assert.equal(saved.gamePhase, "scene");
  assert.equal(saved.history[0].choiceId, "__timeout__");
  assert.equal(retry.currentSceneId, saved.currentSceneId);
  assert.ok(Number.isFinite(saved.sceneStartedAt));
  assert.ok(saved.sceneStartedAt >= initial.sceneStartedAt);
});
test("Firebase syncs each checkpoint and final fields; completed result remains immutable", async () => {
  let state = await startAndInitialize();
  const checkpoints = [];
  for (let i = 0; i < 70 && !state.finished; i++) {
    if (state.gamePhase === "checkpoint" && state.currentChapter < 4) {
      const event = communityEvents[state.currentChapter - 1];
      const previous = (await get(ref(dbFor("host"), `${roomPath}/community`))).val() || {};
      const finishedEvent = { id: event.id, checkpoint: event.checkpoint, status: "completed", startedAt: 1, endsAt: 20001, result: { counts: Object.fromEntries(event.choices.map((choice) => [choice.id, 0])), totalVotes: 0, outcomeId: event.outcomes[1].id, completedAt: 20001 } };
      await set(ref(dbFor("host"), `${roomPath}/community`), {
        currentEvent: { id: event.id, checkpoint: event.checkpoint, status: "completed", startedAt: 1, endsAt: 20001 },
        triggered: { ...previous.triggered, [event.id]: true },
        events: { ...previous.events, [event.id]: finishedEvent },
      });
    }
    const next =
      state.gamePhase === "scene"
        ? applyChoice(state, getSceneById(state.currentSceneId).choices[0])
        : advanceState(state);
    state = (await persist(state, next)).state;
    if (state.gamePhase === "checkpoint") {
      const stored = (
        await get(ref(dbFor("host"), `${roomPath}/players/student`))
      ).val();
      checkpoints.push(stored.currentCheckpoint);
      assert.equal(stored.currentChapter, stored.currentCheckpoint);
    }
  }
  assert.deepEqual(checkpoints, [1, 2, 3, 4]);
  const stored = (
    await get(ref(dbFor("host"), `${roomPath}/players/student`))
  ).val();
  assert.equal(stored.finished, true);
  assert.equal(stored.finalScore, state.finalScore);
  assert.ok(stored.finishedAt > 0);
  await assertFails(
    update(ref(dbFor("student"), `${roomPath}/players/student`), {
      finalScore: 0,
      revision: state.revision + 1,
    }),
  );
  await assertSucceeds(
    set(
      ref(
        dbFor("student"),
        `${roomPath}/players/student/connections/after_finish`,
      ),
      serverTimestamp(),
    ),
  );
});
test("community trigger, vote and finalize are idempotent and protected by rules", async () => {
  for (let i = 1; i <= 5; i++) await join(`p${i}`, String(i));
  await update(ref(dbFor("host"), roomPath), { status: "playing", gameStartedAt: serverTimestamp() });
  await env.withSecurityRulesDisabled(async (context) => {
    const database = context.database();
    for (let i = 1; i <= 5; i++) await update(ref(database, `${roomPath}/players/p${i}`), {
      connections: { tab: 1 }, currentChapter: 1, currentCheckpoint: i <= 3 ? 1 : 0,
      gamePhase: i <= 3 ? "checkpoint" : "scene", currentSceneId: i <= 3 ? "checkpoint_1" : "opening",
      stats: createInitialState().stats, revision: 1, mutationId: "seed", updatedAt: 1, selectedChoiceId: "",
    });
  });
  const definition = communityEvents[0];
  const host = dbFor("host");
  assert.equal((await triggerCommunityEvent(host, code, "host", definition)).committed, false);
  await env.withSecurityRulesDisabled(async (context) => {
    await update(ref(context.database(), `${roomPath}/players/p4`), { currentCheckpoint: 1, gamePhase: "checkpoint", currentSceneId: "checkpoint_1" });
  });
  assert.deepEqual(getCheckpointProgress((await get(ref(host, roomPath))).val(), 1), { active: 5, arrived: 4, minimumActive: 2, ready: true });
  assert.equal((await triggerCommunityEvent(host, code, "host", definition)).committed, true);
  assert.equal((await triggerCommunityEvent(host, code, "host", definition)).committed, false);
  await setEventDeadline(host, code, "host", definition);
  const eventPath = `${roomPath}/community/events/${definition.id}`;
  const active = (await get(ref(host, eventPath))).val();
  assert.equal(active.endsAt, active.startedAt + 20000);
  await assertFails(update(ref(dbFor("p1"), `${roomPath}/players/p1`), { currentChapter: 2, revision: 2 }));
  await assertFails(voteInCommunity(dbFor("p5"), code, "p4", definition.id, "share"));
  for (let i = 1; i <= 4; i++) await voteInCommunity(dbFor(`p${i}`), code, `p${i}`, definition.id, "verify");
  const repeat = await voteInCommunity(dbFor("p1"), code, "p1", definition.id, "share");
  assert.equal(repeat.choiceId, "verify");
  await assertFails(set(ref(dbFor("p1"), `${eventPath}/result`), { totalVotes: 99 }));
  assert.equal((await finalizeCommunityEvent(host, code, "host", definition, Date.now())).committed, true);
  const completed = (await get(ref(host, eventPath))).val();
  assert.equal(completed.result.totalVotes, 4);
  assert.equal(completed.result.outcomeId, "contained");
  await assertSucceeds(update(ref(dbFor("p1"), `${roomPath}/players/p1`), { currentChapter: 2, revision: 2, gamePhase: "scene" }));
  assert.equal((await finalizeCommunityEvent(host, code, "host", definition, Date.now() + 30000)).committed, false);
  assert.equal((await get(ref(host, eventPath))).val().result.totalVotes, 4);
});
test("finished player can join a new room on the same UID without losing the old result", async () => {
  await join("student");
  await env.withSecurityRulesDisabled(async (context) => {
    await update(ref(context.database(), `${roomPath}/players/student`), {
      finished: true, gamePhase: "finished", currentChapter: 4,
      currentCheckpoint: 4, finalScore: 82, finishedAt: 12345,
    });
  });
  const nextCode = "DEF234";
  const nextPath = `rooms/${nextCode}`;
  await set(ref(dbFor("host"), nextPath), {
    roomCode: nextCode, hostId: "host", status: "waiting", capacity: 35,
    createdAt: serverTimestamp(),
  });
  await assertSucceeds(update(ref(dbFor("student"), nextPath), {
    "players/student": { ...player(), name: "Sinh viên", seat: "1" },
    "seats/1": "student",
  }));
  await update(ref(dbFor("host"), nextPath), {
    status: "playing", gameStartedAt: serverTimestamp(),
  });
  const fresh = await saveProgress(dbFor("student"), nextCode, "student", {
    id: "new-room-init", baseRevision: 0, next: createInitialState(),
  });
  assert.equal(fresh.state.currentChapter, 1);
  assert.equal(fresh.state.finished, false);
  assert.equal((await get(ref(dbFor("host"), `${roomPath}/players/student`))).val().finalScore, 82);
});
test("concurrent choices from two tabs commit one revision and retain presence", async () => {
  const state = await startAndInitialize();
  await set(
    ref(dbFor("student"), `${roomPath}/players/student/connections/tab`),
    serverTimestamp(),
  );
  const result = await Promise.all([
    persist(state, applyChoice(state, "ai_all"), "tab-a"),
    persist(state, applyChoice(state, "ai_support"), "tab-b"),
  ]);
  assert.equal(result.filter((value) => value.conflict).length, 1);
  const stored = (
    await get(ref(dbFor("host"), `${roomPath}/players/student`))
  ).val();
  assert.equal(stored.revision, state.revision + 1);
  assert.equal(stored.history.length, 1);
  assert.ok(stored.connections.tab);
});
test("game writes reject another UID, stats outside range, identity changes and premature final score", async () => {
  const state = await startAndInitialize();
  const target = ref(dbFor("student"), `${roomPath}/players/student`);
  await assertFails(
    update(ref(dbFor("other"), `${roomPath}/players/student`), {
      revision: state.revision + 1,
      currentCheckpoint: 1,
    }),
  );
  await assertFails(
    update(target, { revision: state.revision + 1, "stats/tuLuc": 101 }),
  );
  await assertFails(
    update(target, { revision: state.revision + 1, name: "Impersonation" }),
  );
  await assertFails(
    update(target, { revision: state.revision + 1, finalScore: 100 }),
  );
});
import { query, orderByChild, equalTo } from "firebase/database";
test("host history query returns own old rooms and rejects querying another host", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database(), "rooms/OLD234"), {
      roomCode: "OLD234",
      hostId: "host",
      createdAt: 1,
      status: "playing",
      capacity: 35,
      gameStartedAt: 2,
    });
    await set(ref(context.database(), "rooms/XYZ234"), {
      roomCode: "XYZ234",
      hostId: "another-host",
      createdAt: 1,
      status: "waiting",
      capacity: 35,
    });
  });
  const history = await assertSucceeds(
    get(
      query(
        ref(dbFor("host"), "rooms"),
        orderByChild("hostId"),
        equalTo("host"),
      ),
    ),
  );
  assert.deepEqual(Object.keys(history.val()).sort(), ["ABC234", "OLD234"]);
  await assertFails(
    get(
      query(
        ref(dbFor("student"), "rooms"),
        orderByChild("hostId"),
        equalTo("host"),
      ),
    ),
  );
  await assertFails(
    get(
      query(
        ref(env.unauthenticatedContext().database(), "rooms"),
        orderByChild("hostId"),
        equalTo("host"),
      ),
    ),
  );
});
