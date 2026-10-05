import { createContext, useContext, useEffect, useState } from "react";
import { ensureUser } from "../firebase/auth";
import { configured } from "../firebase/config";
import { errorMessage } from "../utils/errors";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    loading: configured,
    error: "",
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!configured) return;
    let live = true;
    ensureUser()
      .then((user) => {
        if (live) setState({ user, loading: false, error: "" });
      })
      .catch((error) => {
        if (live)
          setState({ user: null, loading: false, error: errorMessage(error) });
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  return (
    <AuthContext.Provider
      value={{
        ...state,
        configured,
        retry: () => {
          setState({ user: null, loading: true, error: "" });
          setAttempt((x) => x + 1);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  return useContext(AuthContext);
}
