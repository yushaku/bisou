import { useEffect, useState } from "react";

/* "Today" in the device's calendar; moves on at local midnight and when the app comes back. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const current = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-syncs with the clock when the effect restarts after Activity reveals the screen
    if (current.toDateString() !== now.toDateString()) setNow(current);
    const tomorrow = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
    const id = setTimeout(() => setNow(new Date()), tomorrow.getTime() - current.getTime() + 1000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [now]);
  return now;
}
