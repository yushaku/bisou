import { queries } from "./queries";
import { useServerQuery } from "./serverQuery";

export function useSharedWishes(onSignedOut: () => void) {
  const { data: jar, setData: setJar, failed, refresh } = useServerQuery(queries.sharedWishes, onSignedOut);
  return { jar, setJar, failed: failed && jar === null, refresh };
}
