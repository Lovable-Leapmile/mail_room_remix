import { useEffect, useState } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();

/** Ask every screen listening via useRefreshTick to re-fetch its APIs. */
export function triggerRefresh() {
  listeners.forEach((l) => l());
}

/**
 * Returns a counter that increments on mount, when the tab becomes visible
 * again, when the window regains focus, and when triggerRefresh() is called —
 * use it as an effect dependency to re-fetch APIs.
 */
export function useRefreshTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // bump on mount (client-side navigation into the screen)
    setTick((t) => t + 1);

    const bump = () => setTick((t) => t + 1);
    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };
    listeners.add(bump);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", bump);
    return () => {
      listeners.delete(bump);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", bump);
    };
  }, []);

  return tick;
}
