/*
 * The first-open sequence, one thing at a time:
 * splash → location permission → Add to Home Screen guide → first-visit tour
 * (FirstVisitTour) → content browser.
 * Each step waits for the one before it to be answered or skipped, so the
 * prompts never stack on top of each other.
 */

type Stage = "location" | "install" | "tour";

const resolvers: Partial<Record<Stage, () => void>> = {};
const promises: Partial<Record<Stage, Promise<void>>> = {};

function stage(s: Stage): Promise<void> {
  if (!promises[s]) promises[s] = new Promise<void>((r) => (resolvers[s] = r));
  return promises[s]!;
}

const ALL_STAGES: Stage[] = ["location", "install", "tour"];
const finished = new Set<Stage>();
const doneListeners = new Set<() => void>();

/** Marks a step as answered (or skipped); the next step may start. */
export function finishStage(s: Stage) {
  stage(s);
  resolvers[s]!();
  if (finished.has(s)) return;
  finished.add(s);
  if (!ALL_STAGES.every((x) => finished.has(x))) return;
  // Run right here, not in a promise callback: when the last step was closed
  // by a tap, a listener may start audio inside that tap (a user gesture —
  // Safari only lets a page start sound from one).
  const list = [...doneListeners];
  doneListeners.clear();
  list.forEach((cb) => cb());
}

/**
 * Calls `cb` once every onboarding step is answered or skipped — at once if
 * they already are — synchronously inside the `finishStage` call that ends
 * the last one. Returns an unsubscribe.
 */
export function onOnboardingDone(cb: () => void): () => void {
  if (ALL_STAGES.every((x) => finished.has(x))) {
    cb();
    return () => {};
  }
  doneListeners.add(cb);
  return () => doneListeners.delete(cb);
}

/** Resolves once that step has been answered or skipped. */
export const afterStage = (s: Stage) => stage(s);

/** Resolves once the splash has hidden (the `huda-ready` class on <html>, SplashScreen). */
export function afterSplash(): Promise<void> {
  const root = document.documentElement;
  if (root.classList.contains("huda-ready")) return Promise.resolve();
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!root.classList.contains("huda-ready")) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  });
}
