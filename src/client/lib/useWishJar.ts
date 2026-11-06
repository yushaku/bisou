import { useCallback, useContext, useEffect, useLayoutEffect, useState } from "react";
import { createTabMemory, loadWishes, TabMemory } from "./tabMemory";

export function useWishJar(onSignedOut: () => void) {
  const context = useContext(TabMemory);
  const [memory] = useState(() => context ?? createTabMemory());
  const [jar, setJar] = useState(() => memory.wishes);
  const [failed, setFailed] = useState(false);
  useLayoutEffect(() => { memory.wishes = jar; }, [jar, memory]);

  const refresh = useCallback(async (force = true) => {
    const res = await loadWishes(memory, force);
    if (res.ok) { setJar(res.data); setFailed(false); }
    else if (res.status === 401) onSignedOut();
    else setFailed(true);
  }, [memory, onSignedOut]);

  useEffect(() => {
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => { document.removeEventListener("visibilitychange", visible); window.removeEventListener("online", visible); };
  }, [refresh]);

  return { jar, setJar, failed, refresh };
}
