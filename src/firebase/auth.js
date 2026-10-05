import { signInAnonymously } from "firebase/auth";
import { auth } from "./config";
let pending;
export async function ensureUser() {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  pending ??= signInAnonymously(auth).finally(() => {
    pending = null;
  });
  return (await pending).user;
}
