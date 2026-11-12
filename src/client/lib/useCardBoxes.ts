import { useCallback, useContext, useEffect, useState } from "react";
import { createTabMemory, loadBoxes, TabMemory } from "./tabMemory";
export function useCardBoxes(onSignedOut: () => void) {
  const context = useContext(TabMemory);
  const [memory] = useState(() => context ?? createTabMemory());
  const [boxes, setBoxes] = useState(() => memory.boxes);
  const [failed, setFailed] = useState(false);
  const refresh = useCallback(async () => {
    const res = await loadBoxes(memory, true);
    if (res.ok) { setBoxes(res.data.boxes); setFailed(false); }
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
  return { boxes, failed, refresh };
}
