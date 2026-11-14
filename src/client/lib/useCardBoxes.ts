import { useEffect } from "react";
import { readCache, writeCache } from "./cardBox";
import { queries } from "./queries";
import { useServerQuery } from "./serverQuery";

export function useCardBoxes(onSignedOut: () => void, scope: string) {
  const { data, failed, refresh } = useServerQuery({ ...queries.boxes,
    initialData: () => { const boxes = readCache(scope, "list"); return boxes ? { boxes } : undefined; },
    initialDataUpdatedAt: 0,
  }, onSignedOut);
  useEffect(() => { if (data) writeCache(scope, "list", data.boxes); }, [scope, data]);
  return { boxes: data?.boxes ?? null, failed, refresh };
}
