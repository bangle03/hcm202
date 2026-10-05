import { useEffect, useState } from "react";
import { equalTo, onValue, orderByChild, query, ref } from "firebase/database";
import { db } from "../firebase/config";
export default function useHostRooms(uid) {
  const [state, setState] = useState({ rooms: [], loading: true, error: "" });
  useEffect(() => {
    if (!db || !uid) return;
    setState({ rooms: [], loading: true, error: "" });
    return onValue(
      query(ref(db, "rooms"), orderByChild("hostId"), equalTo(uid)),
      (snapshot) => {
        const rooms = Object.entries(snapshot.val() || {})
          .map(([code, room]) => {
            const players = Object.values(room.players || {});
            return {
              code,
              createdAt: room.createdAt,
              status: room.status,
              total: players.length,
              finished: players.filter((p) => p.finished).length,
            };
          })
          .sort((a, b) => b.createdAt - a.createdAt);
        setState({ rooms, loading: false, error: "" });
      },
      () =>
        setState({
          rooms: [],
          loading: false,
          error:
            "Chưa tải được phòng cũ. Hãy kiểm tra kết nối và publish Firebase Rules mới để bật lịch sử phòng.",
        }),
    );
  }, [uid]);
  return state;
}
