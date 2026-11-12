import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { createTabMemory, loadBoxes, TabMemory } from "./tabMemory";
import { readCache, writeCache } from "./cardBox";
export function useCardBoxes(onSignedOut: () => void, scope: string) {
  const context = useContext(TabMemory);
  const [memory] = useState(() => context ?? createTabMemory());
  const [boxes, setBoxes] = useState(() => memory.boxes ?? readCache(scope, "list"));
  const active = useRef(true);
  const [failed, setFailed] = useState(false);
  const refresh = useCallback(async () => {
    const res = await loadBoxes(memory, true);
    if (!active.current) return;
    if (res.ok) { setBoxes(res.data.boxes); writeCache(scope, "list", res.data.boxes); setFailed(false); }
    else if (res.status === 401) onSignedOut();
    else setFailed(true);
  }, [memory, onSignedOut, scope]);
  useEffect(() => {
    active.current = true;
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => { active.current = false; document.removeEventListener("visibilitychange", visible); window.removeEventListener("online", visible); };
  }, [refresh]);
  return { boxes, failed, refresh };
}
