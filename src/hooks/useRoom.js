import { useEffect, useState } from "react";
import {
  onValue,
  onDisconnect,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
} from "firebase/database";
import { db } from "../firebase/config";
import { errorMessage } from "../utils/errors";
export function useRoom(code, user, role) {
  const [state, setState] = useState({ room: null, loading: true, error: "" });
  const [online, setOnline] = useState(false);
  useEffect(() => {
    if (!db || !code || !user) return;
    return onValue(
      ref(db, `rooms/${code}`),
      (snap) =>
        setState({
          code,
          room: snap.val(),
          loading: false,
          error: snap.exists() ? "" : "Phòng không tồn tại hoặc đã bị xóa.",
        }),
      (error) =>
        setState((previous) => ({
          ...previous,
          code,
          room: previous.code === code ? previous.room : null,
          loading: false,
          error: errorMessage(error),
        })),
    );
  }, [code, user]);
  const currentState =
    state.code === code ? state : { room: null, loading: true, error: "" };
  const member =
    !!currentState.room &&
    (role === "host"
      ? currentState.room.hostId === user?.uid
      : !!currentState.room.players?.[user?.uid]);
  useEffect(() => {
    if (!db || !code || !user || !member) return;
    let live = true;
    const connections = new Set();
    const unsub = onValue(ref(db, ".info/connected"), async (snap) => {
      setOnline(snap.val() === true);
      if (snap.val() !== true) return;
      const path =
        role === "host"
          ? `rooms/${code}/hostConnections`
          : `rooms/${code}/players/${user.uid}/connections`;
      const connection = push(ref(db, path));
      connections.add(connection);
      try {
        await onDisconnect(connection).remove();
        if (live) await set(connection, serverTimestamp());
        if (!live) await remove(connection);
      } catch (error) {
        if (live) setState((s) => ({ ...s, error: errorMessage(error) }));
      }
    });
    return () => {
      live = false;
      unsub();
      for (const connection of connections) remove(connection).catch(() => {});
    };
  }, [code, user, role, member]);
  return { ...currentState, online: member && online, member };
}
