import { useEffect, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase/config";
import { coordinateCommunity } from "../firebase/communityCoordinator";
import { errorMessage } from "../utils/errors";

export function useServerTime() {
  const [offset, setOffset] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, ".info/serverTimeOffset"), (snap) => setOffset(snap.val() || 0));
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 500);
    return () => clearInterval(timer);
  }, []);
  void tick;
  return Date.now() + offset;
}

export function useCommunityCoordinator({ code, uid, room, online }) {
  const serverNow = useServerTime();
  const busy = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!db || !code || !uid || !room || !online || busy.current) return;
    busy.current = true;
    coordinateCommunity(db, code, uid, room, serverNow)
      .then(() => setError(""))
      .catch((failure) => setError(errorMessage(failure)))
      .finally(() => { busy.current = false; });
  }, [code, uid, room, online, serverNow]);
  return { serverNow, error };
}
