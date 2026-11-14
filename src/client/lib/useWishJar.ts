import { queries } from "./queries";
import { useServerQuery } from "./serverQuery";

export function useWishJar(onSignedOut: () => void) {
  const { data: jar, setData: setJar, failed, refresh } = useServerQuery(queries.wishes, onSignedOut);
  return { jar, setJar, failed: failed && jar === null, refresh };
}
