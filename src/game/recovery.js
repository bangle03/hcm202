import { restoreState, stateError } from "./gameEngine.js";
export function loadPending(storage, key) {
  try {
    const pending = JSON.parse(storage.getItem(key));
    if (
      !pending?.next ||
      typeof pending.id !== "string" ||
      !Number.isInteger(pending.baseRevision) ||
      pending.baseRevision < 0 ||
      stateError(pending.next)
    )
      return null;
    return { ...pending, next: restoreState(pending.next) };
  } catch {
    return null;
  }
}
export function storePending(storage, key, pending) {
  try {
    if (pending) storage.setItem(key, JSON.stringify(pending));
    else storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
