/** Settings rows that open the full pickers (their sheets live elsewhere). */
export const OPEN_RECITERS_EVENT = "huda:open-reciters";
export const OPEN_PRAYER_TIMES_EVENT = "huda:open-prayer-times";
/** Opens the Add to Home Screen guide (InstallGuide). */
export const OPEN_INSTALL_GUIDE_EVENT = "huda:install-guide";
/** Opens Settings › Account (the header avatar). */
export const OPEN_ACCOUNT_EVENT = "huda:open-account";
/** Opens the feedback form (FeedbackLantern) — Settings › Send feedback. */
export const OPEN_FEEDBACK_EVENT = "huda:open-feedback";
/** The edge gift (SupportGift) and the feedback lantern: only one is out at
 *  a time — the one coming out says so, the other goes back to its place.
 *  detail: { who: "gift" | "feedback"; out: boolean } */
export const EDGE_OUT_EVENT = "huda:edge-out";
