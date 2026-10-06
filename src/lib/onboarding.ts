/*
 * The first-open sequence, one thing at a time:
 * splash → location permission → Add to Home Screen guide → content browser.
 * Each step waits for the one before it to be answered or skipped, so the
 * prompts never stack on top of each other.
 */

type Stage = "location" | "install";

const resolvers: Partial<Record<Stage, () => void>> = {};
const promises: Partial<Record<Stage, Promise<void>>> = {};

function stage(s: Stage): Promise<void> {
  if (!promises[s]) promises[s] = new Promise<void>((r) => (resolvers[s] = r));
  return promises[s]!;
}

/** Marks a step as answered (or skipped); the next step may start. */
export function finishStage(s: Stage) {
  stage(s);
  resolvers[s]!();
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
