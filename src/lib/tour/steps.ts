/*
 * The first-visit tour (FirstVisitTour): one step per control, in the order
 * the lantern visits them. A step points at the control's `data-tour` name;
 * a step whose control isn't on screen (phone vs desktop, reading mode, no
 * share link yet…) is left out. To add a control to the tour: give it
 * `data-tour="<name>"` and add a step here, with its strings in i18n/tour.ts.
 */

export interface TourStep {
  /** `data-tour` of the control; none: a card in the middle of the screen. */
  target?: string;
  /** English text — the i18n key (i18n/tour.ts). */
  title: string;
  text: string;
}

export const TOUR_STEPS: TourStep[] = [
  { title: "A quick look around", text: "A little lantern will show you what each button does. It takes half a minute." },
  { target: "prayer", title: "Prayer times", text: "The prayer of the hour where you are. Tap it for the whole day's times." },
  { target: "translation", title: "Translation", text: "Show the meaning under each ayah, in the language you choose." },
  { target: "tajweed", title: "Tajweed & script", text: "Colour the letters by their tajweed rules, or change the Quran script." },
  { target: "reciter", title: "Reciter", text: "Choose whose voice recites the Quran for you." },
  { target: "reading", title: "Reading mode", text: "Read the whole Surah page by page, with the recited ayah lit." },
  { target: "browse", title: "Surahs, Juz & search", text: "Find any Surah, Juz or ayah — search by words, topic or voice. Settings are here too." },
  { target: "feedback", title: "Feedback", text: "Found a problem or have an idea? Tap the little lantern at the edge and tell us." },
  { target: "install", title: "Add to Home Screen", text: "Keep HuDa on your Home Screen and open it like an app." },
  { target: "favourites", title: "Favourites", text: "The Surahs and Juz you've liked, kept on this device." },
  { target: "bookmark", title: "Bookmark", text: "Mark the ayah you're on and come back to it later." },
  { target: "share", title: "Share", text: "Send a link to this Surah or ayah, or record it as a video to share." },
  { target: "community", title: "Listening together", text: "How many are listening now, how many have listened, and their comments." },
  { target: "play", title: "Play", text: "Start the recitation. Arrows step ayah by ayah; tap the Surah's name to pick another." },
  { title: "You're ready", text: "You can take this tour again any time from Settings." },
];

/** Set once the tour has been finished or skipped in this browser. */
export const TOUR_DONE_KEY = "huda-tour-done";
/** Settings › App tour: shows it again. */
export const OPEN_TOUR_EVENT = "huda:open-tour";
