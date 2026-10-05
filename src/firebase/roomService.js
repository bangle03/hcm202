import {
  get,
  ref,
  runTransaction,
  serverTimestamp,
  update,
} from "firebase/database";
import { db } from "./config";
export const CAPACITY = 60;
export function validateJoin(name, code) {
  if (!name.trim() || name.trim().length > 30)
    throw new Error("Tên cần có từ 1 đến 30 ký tự.");
  if (!/^[A-Z2-9]{6}$/.test(code))
    throw new Error("Mã phòng gồm 6 chữ cái hoặc số, không có 0 và 1.");
}
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    (v) => chars[v % chars.length],
  ).join("");
}
export async function createRoom(uid) {
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const result = await runTransaction(
      ref(db, `rooms/${code}`),
      (room) =>
        room
          ? undefined
          : {
              roomCode: code,
              hostId: uid,
              status: "waiting",
              createdAt: serverTimestamp(),
              capacity: CAPACITY,
            },
      { applyLocally: false },
    );
    if (result.committed) return code;
  }
  throw new Error("Chưa tạo được mã phòng. Vui lòng thử lại.");
}
export async function joinRoom(uid, name, code) {
  validateJoin(name, code);
  for (let attempt = 0; attempt < CAPACITY; attempt++) {
    const room = (await get(ref(db, `rooms/${code}`))).val();
    if (!room) throw new Error("Không tìm thấy phòng. Hãy kiểm tra lại mã.");
    if (room.hostId === uid)
      throw new Error(
        "Bạn là người dẫn phòng này. Dùng trình duyệt khác để tham gia với vai trò sinh viên.",
      );
    if (room.players?.[uid]) return code;
    if (room.status !== "waiting")
      throw new Error("Phòng đã bắt đầu và không nhận thêm người chơi.");
    const roomCapacity = Math.min(room.capacity || CAPACITY, CAPACITY);
    const available = Array.from({ length: roomCapacity }, (_, i) =>
      String(i + 1),
    ).filter((seat) => !room.seats?.[seat]);
    if (!available.length) throw new Error(`Phòng đã đủ ${roomCapacity} người.`);
    const seat =
      available[
        crypto.getRandomValues(new Uint32Array(1))[0] % available.length
      ];
    try {
      // Both writes succeed together; rules reject an occupied seat or a started room.
      await update(ref(db, `rooms/${code}`), {
        [`seats/${seat}`]: uid,
        [`players/${uid}`]: {
          name: name.trim(),
          seat,
          joinedAt: serverTimestamp(),
          currentChapter: 0,
          currentCheckpoint: 0,
          finished: false,
        },
      });
      return code;
    } catch (error) {
      if (
        error.code !== "PERMISSION_DENIED" &&
        error.code !== "permission-denied"
      )
        throw error;
      const latest = (await get(ref(db, `rooms/${code}`))).val();
      if (latest?.players?.[uid]) return code;
      if (!latest || latest.status !== "waiting")
        throw new Error("Phòng đã bắt đầu hoặc không còn tồn tại.");
      if (!latest.seats?.[seat]) throw error;
    }
  }
  throw new Error("Nhiều người đang tham gia cùng lúc. Vui lòng thử lại.");
}
export async function startRoom(code, uid) {
  const result = await runTransaction(
    ref(db, `rooms/${code}`),
    (room) => {
      if (
        !room ||
        room.hostId !== uid ||
        room.status !== "waiting" ||
        !Object.values(room.players || {}).some(
          (p) => Object.keys(p.connections || {}).length > 0,
        )
      )
        return;
      return { ...room, status: "playing", gameStartedAt: serverTimestamp() };
    },
    { applyLocally: false },
  );
  if (!result.committed)
    throw new Error(
      "Cần ít nhất một người chơi đang kết nối và phòng đang chờ.",
    );
}
