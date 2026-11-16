import { useEffect, useMemo } from "react";
import { readCache, writeCache } from "./cardBox";
import { queries } from "./queries";
import { useServerQuery } from "./serverQuery";

export function useCardBoxes(onSignedOut: () => void, scope: string) {
  const cached = useMemo(() => { const boxes = readCache(scope, "list"); return boxes ? { boxes } : undefined; }, [scope]);
  const { data, failed, refresh } = useServerQuery({ ...queries.boxes,
    placeholderData: cached,
  }, onSignedOut);
  useEffect(() => { if (data) writeCache(scope, "list", data.boxes); }, [scope, data]);
  return { boxes: data?.boxes ?? cached?.boxes ?? null, failed, refresh };
}
