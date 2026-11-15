type HomeModule = typeof import("../screens/Home");

let home: HomeModule["Home"] | undefined;

/* One import for the Home chunk: App renders it and boot starts it early (ADR 0014). */
export const loadHome = () => import("../screens/Home").then((module) => {
  home = module.Home;
  return module;
});

/*
 * Home once its chunk has loaded. React.lazy always suspends on its first render, even for a loaded
 * module, and React holds a revealed Suspense boundary back for about 300 ms after showing its
 * fallback, so a preloaded Home would still paint late. Rendering the loaded component directly avoids that.
 */
export const loadedHome = () => home;
