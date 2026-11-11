import { useCallback, useContext, useEffect, useLayoutEffect, useState } from "react";
import { createTabMemory, loadNotes, TabMemory } from "./tabMemory";
export function useNotes(onSignedOut: () => void) {
  const context = useContext(TabMemory);
  const [memory] = useState(() => context ?? createTabMemory());
  const [lists, setLists] = useState(() => memory.notes);
  const [failed, setFailed] = useState(false);
  const [, tick] = useState(0);
  useLayoutEffect(() => { memory.notes = lists; }, [lists, memory]);
  const refresh = useCallback(async (force = true) => {
    const res = await loadNotes(memory, force);
    if (res.ok) { setLists(res.data); setFailed(false); }
    else if (res.status === 401) onSignedOut();
    else setFailed(true);
  }, [memory, onSignedOut]);
  useEffect(() => {
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible); window.addEventListener("online", visible);
    return () => { document.removeEventListener("visibilitychange", visible); window.removeEventListener("online", visible); };
  }, [refresh]);
  useEffect(() => {
    const now = Date.now();
    const next = Math.min(...(lists?.fromMe.filter((n) => n.state === "draft" && n.sendableAt > now).map((n) => n.sendableAt) ?? []));
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(() => { tick((v) => v + 1); void refresh(); }, Math.min(next - now + 100, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [lists, refresh]);
  return { lists, failed, refresh };
}
