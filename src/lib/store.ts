// A tiny external store for useSyncExternalStore and for code outside React (the animation loop).

export type Store<S extends object> = {
  get(): S;
  /** Merges the patch. Subscribers run only when a value actually changed. */
  set(patch: Partial<S>): void;
  subscribe(listener: () => void): () => void;
};

export function createStore<S extends object>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set(patch) {
      const keys = Object.keys(patch) as (keyof S)[];
      if (keys.every((k) => Object.is(state[k], patch[k]))) return;
      state = { ...state, ...patch };
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
