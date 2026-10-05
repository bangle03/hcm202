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
import {
  createInitialState,
  applyChoice,
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
test("Firebase syncs each checkpoint and final fields; completed result remains immutable", async () => {
  let state = await startAndInitialize();
  const checkpoints = [];
  for (let i = 0; i < 70 && !state.finished; i++) {
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
