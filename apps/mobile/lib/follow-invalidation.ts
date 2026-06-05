type Listener = () => void;

const listeners = new Set<Listener>();

/** Notify screens (e.g. Following feed) to reload after follow/unfollow. */
export function notifyFollowGraphChanged() {
  listeners.forEach((cb) => cb());
}

export function subscribeFollowGraphChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
