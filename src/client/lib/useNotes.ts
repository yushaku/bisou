import { useEffect, useState } from "react";
import { queries } from "./queries";
import { useServerQuery } from "./serverQuery";

export function useNotes(onSignedOut: () => void) {
  const { data: lists, failed, refresh } = useServerQuery(queries.notes, onSignedOut);
  const [version, tick] = useState(0);
  useEffect(() => {
    const now = Date.now();
    const next = Math.min(
      ...(lists?.fromMe
        .filter((n) => n.state === "draft" && n.scheduledAt !== undefined)
        .map((n) => Math.max(n.scheduledAt! + 1_000, now + 60_000)) ?? []),
    );
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(
      () => {
        tick((v) => v + 1);
        void refresh();
      },
      Math.min(next - now + 100, 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [lists, refresh, version]);
  return { lists, failed, refresh };
}
