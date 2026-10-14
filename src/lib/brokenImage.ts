import type { SyntheticEvent } from "react";

/**
 * A backdrop image that failed to load is hidden, so Safari doesn't draw its
 * broken-image "?" icon over the scene (the dark scene colour shows instead);
 * shown again once a (new) source loads.
 */
export function hideBrokenImage(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.visibility = "hidden";
}

export function showLoadedImage(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.visibility = "";
}
