/*
 * Tab switch as a view transition. The update callback does not render anything itself: it starts
 * the navigation and hands the browser a promise that settles once the new tab's content has
 * committed (signalled by the tab screen), or after a short timeout, so the old snapshot is never
 * held waiting for a render that does not come. React renders between the two, not inside the callback.
 */
let settle: (() => void) | null = null;

/* Called from a layout effect when a tab's content has just committed. */
export function notifyTabCommitted() {
  const done = settle;
  settle = null;
  done?.();
}

export const COMMIT_TIMEOUT_MS = 400;

export function whenTabCommitted(start: () => void, timeoutMs = COMMIT_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      clearTimeout(timer);
      if (settle === done) settle = null;
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    settle = done;
    try {
      start();
    } catch (error) {
      clearTimeout(timer);
      if (settle === done) settle = null;
      reject(error);
    }
  });
}

/*
 * The page is a tall document that scrolls. Named as it is, a view transition would snapshot all of
 * it (a long journal is many screens tall, so a texture of tens of thousands of pixels), twice.
 * While the class below is on <html>, styles.css turns <main data-tab-page> into a viewport-sized
 * box that is scrolled to the same place and clips the rest, so only what is on screen is
 * captured. The document stops scrolling for that time and the position is put back at the end.
 */
export const SWITCHING_CLASS = "tab-switching";

/* Scroll position the new tab asked for while the page was frozen; applied to the window when it thaws. */
let pendingScroll: number | null = null;

const frozen = () => document.documentElement.classList.contains(SWITCHING_CLASS);

/* Scrolls the page to `top`; while frozen, scrolls the clipped box instead and applies it to the window afterwards. */
export function placeTabScroll(top: number) {
  if (!frozen()) {
    window.scrollTo({ top, behavior: "instant" });
    return;
  }
  pendingScroll = top;
  const page = document.querySelector<HTMLElement>("[data-tab-page]");
  if (page) page.scrollTop = top;
}

export interface TransitionHost {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<unknown> };
  documentElement: { style: { setProperty(name: string, value: string): void; removeProperty(name: string): void }; classList: { add(name: string): void; remove(name: string): void } };
  /* The bottom edge of the sticky header, where the clipped page box starts. */
  headerBottom(): number;
  page(): { scrollTop: number } | null;
  scrollY: number;
  scrollTo(top: number): void;
}

export function browserHost(): TransitionHost {
  return {
    startViewTransition: document.startViewTransition?.bind(document),
    documentElement: document.documentElement,
    headerBottom: () => document.querySelector("header")?.getBoundingClientRect().bottom ?? 0,
    page: () => document.querySelector<HTMLElement>("[data-tab-page]"),
    scrollY: window.scrollY,
    scrollTo: (top) => window.scrollTo({ top, behavior: "instant" }),
  };
}

export function runTabTransition(go: () => void, direction: 1 | -1, host: TransitionHost, reduceMotion: boolean): void {
  if (!host.startViewTransition || reduceMotion) return go();
  const root = host.documentElement;
  const from = host.scrollY;
  root.style.setProperty("--tab-dir", String(direction));
  root.style.setProperty("--tab-top", `${host.headerBottom()}px`);
  root.classList.add(SWITCHING_CLASS);
  const page = host.page();
  if (page) page.scrollTop = from;
  pendingScroll = null;
  const thaw = () => {
    root.classList.remove(SWITCHING_CLASS);
    root.style.removeProperty("--tab-top");
    host.scrollTo(pendingScroll ?? from);
    pendingScroll = null;
  };
  try {
    host.startViewTransition(() => whenTabCommitted(go)).finished.then(thaw, thaw);
  } catch (error) {
    thaw();
    throw error;
  }
}
