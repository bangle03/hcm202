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
