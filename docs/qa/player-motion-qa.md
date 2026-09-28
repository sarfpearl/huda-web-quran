# Player motion: real-device QA checklist

This checklist covers the motion changes in PR #2:

- the mobile bar morphing into the Now Playing sheet
- drag-to-dismiss
- the track-change swap
- progress-bar scrubbing
- the SortTabs indicator

Automated emulation (Chromium with touch and safe-area overrides) cannot reproduce WebKit, Safari's
collapsing toolbar, or real touch latency. **Every row below must be run on a physical device before
merge.**

## Setup

1. Deploy the PR branch as a preview, or run `npm run build && npm run start` and open it over the LAN.
2. Open `/explore` and tap **Play** on any audio (non-YouTube) bayan. The compact bar appears above the bottom nav.
3. Test twice on iOS: once in a **Safari tab**, and once as a **home-screen app** (Share → Add to Home Screen).
   The home-screen app has the largest safe-area insets.
4. To read console errors:
   - **iOS:** Safari → Develop → [device] (Mac required).
   - **Android:** `chrome://inspect`.

## Device matrix

| Device | Browser | Expand | Collapse | Drag | Scrub | Light | Dark | Reduced motion | Issues |
|---|---|---|---|---|---|---|---|---|---|
| iPhone SE / small iPhone | Safari | | | | | | | | |
| iPhone 13/14 | Safari | | | | | | | | |
| iPhone 15/16 | Safari | | | | | | | | |
| iPhone Pro Max | Safari | | | | | | | | |
| iPad | Safari | n/a (desktop bar) | n/a | n/a | | | | | |
| Small Android | Chrome | | | | | | | | |
| Mid-range Android | Chrome | | | | | | | | |
| Large Android | Chrome | | | | | | | | |
| Samsung Galaxy | Chrome | | | | | | | | |
| Samsung Galaxy | Samsung Internet | | | | | | | | |
| Pixel | Chrome | | | | | | | | |

**Reduced motion setting:**

- **iOS:** Settings → Accessibility → Motion → Reduce Motion.
- **Android:** Settings → Accessibility → Remove animations.

**Dark mode:** use the in-app theme toggle, or the OS setting if the app follows it.

## Steps and expected results

| # | Step | Expected |
|---|---|---|
| 1 | Tap the bar's cover or title | The bar's surface grows into the full sheet. The cover and play button fly to their slots, and the text blurs in after the shape. No flash, no white frame, no text outside the shape. |
| 2 | Tap the chevron (Minimise) | The sheet shrinks back into the bar at the same spot. The cover lands in the bar; its icon fades in at the end. |
| 3 | Watch the cover during 1–2 | The gradient cover moves continuously with no stutter. The category icon never appears huge. |
| 4 | Tap play/pause in the bar and in the sheet | The state toggles and audio plays or pauses. The button scales slightly on press. |
| 5 | Tap **Next** in the sheet | The title blurs out and the new one blurs in without shifting position. The cover crossfades with no dip to the background colour. |
| 6a | Drag the artwork down about 2 cm slowly, then release | The sheet follows the finger 1:1, then springs back up. |
| 6b | Drag down about half the screen slowly, then release | The sheet closes and morphs into the bar from where it was released. |
| 6c | Flick down quickly (short distance) | The sheet closes. |
| 7 | Drag along the progress bar in the sheet | The thumb grows and a time bubble follows the finger. Audio seeks **once** on release, with no stutter while dragging. The sheet does not move. |
| 8 | Drag the volume slider | The volume changes and the sheet does not move. |
| 9 | Start a drag on the header vs the title text vs a slider | The header and artwork drag the sheet. The title text does nothing (and must not scroll the page). Sliders only move their value. |
| 10–11 | Repeat 1–8 in light and dark | Surfaces, text and the scrub bubble are readable in both themes. |
| 12 | Enable Reduce Motion and repeat 1–2 | The sheet appears and disappears without the morph. The drag still works. |
| 13–14 | Rotate to landscape with the sheet open | On a short landscape phone the layout becomes two columns (cover left, controls right). All controls are visible without scrolling. |
| 15 | iPhone with a notch or Dynamic Island, home-screen app | The Minimise and Queue buttons sit below the status bar or Dynamic Island. The speed and volume row sits above the home indicator. In landscape, nothing sits under the notch side. |
| 16 | With the bar visible on `/explore` | The bar sits above the bottom nav, with no overlap. |
| 17 | Bluetooth/USB keyboard or VoiceOver/TalkBack | The progress slider takes arrow keys and seeks immediately. Buttons have labels. (Known gap: the sheet has no focus trap and does not close on Esc.) |
| 18 | Throughout | No layout jump when the sheet opens or closes. The page does not shift under the bar. |
| 19 | Console | No errors. |
| 20 | Throughout | No visible frame drops, flicker or broken animation. |

## iOS Safari specifics

| Check | How | Expected |
|---|---|---|
| Toolbar collapse and expand | Scroll `/explore` so Safari's toolbar collapses, then open the sheet. Then tap the bottom edge to bring the toolbar back. | The sheet fills the visible viewport in both states, and the controls stay above the toolbar. |
| Dynamic Island and safe area | See step 15, in both portrait and landscape | As in step 15. |
| Swipe conflicts | Swipe down from the header, and swipe from the left screen edge (back gesture) | Pulling the header down dismisses the sheet. The edge swipe goes back and does not drag the sheet. |
| Background scroll lock | With the sheet open, swipe up and down on the title text | The page behind does not scroll or rubber-band. After closing, the page scrolls normally. |
| Reopen after dismiss | Dismiss by drag, then tap the bar | The sheet reopens normally. Repeat 5×. |
| Audio continuity | Play, then open, close, drag and scrub | Audio keeps playing throughout, except for the single seek on scrub release. |

## Issue template

```
Device + OS + browser:
Steps:
Expected / actual:
Screenshot / screen recording:
Severity (blocker / high / medium / low):
```

## Automated emulation results (not real devices)

**Setup:**

- Engine: Chromium 141 via Playwright, running a production build (`next build && next start`).
- Input: touch events sent over CDP.
- Safe areas: set with `Emulation.setSafeAreaInsetsOverride`. iPhones use home-screen-app insets, the worst case (for example, iPhone 15: top 59, bottom 34, landscape left/right 59).

**Result: 44/44 runs pass.** That is 11 device profiles, each in 4 modes: portrait light, landscape light, portrait dark and portrait reduced motion.

- **iOS profiles:** iPhone SE, 13, 15, 15 Pro Max, iPad (gen 7).
- **Android profiles:** Galaxy S9+ and Moto G4 (small), Pixel 5 (mid-range), Pixel 7, Galaxy S24, Galaxy A55 (large).

**Checks in each run:**

- bottom-nav overlap
- expand, and collapse via Minimise
- every sheet control fully inside the safe viewport
- background scroll lock (swipe on the title)
- progress and volume touch drags change their value without moving the sheet
- small slow drag springs back
- fast flick dismisses
- large drag from the header dismisses
- reopen after dismiss
- no layout jump in the bar after collapse
- reduced motion opens without animating
- no console errors

**Tablet:** tablet widths (≥768px) use the desktop bar; the check there is touch scrubbing.

**Emulation cannot cover:**

- WebKit rendering and gesture handling
- Safari's collapsing toolbar
- the iOS edge-swipe back gesture
- Samsung Internet
- real frame pacing and touch latency
- audio continuity on hardware

### Issues found by emulation and fixed

| # | Where | Severity | Root cause | Fix |
|---|---|---|---|---|
| 1 | Sheet, short screens (iPhone 15 at 659px, SE) and every phone in landscape | High | The cover had a fixed size (`max-w-xs` square), so the speed/volume row, and in landscape even the title and sliders, fell off-screen. | The cover now takes the remaining height (`cqmin`, square, at most 20rem). Short landscape screens switch to two columns. |
| 2 | Sheet on notched iPhones | High | With `viewport-fit=cover`, the full-screen sheet had no safe-area padding. The header sat under the status bar / Dynamic Island and the bottom row under the home indicator. | Safe-area padding on all four sides. |
| 3 | Sheet on all phones | Medium | Nothing locked the page, so a swipe on the sheet scrolled the page behind it (about 290px). | `overflow: hidden` and `overscroll-behavior: none` on `<html>` while the sheet is open. |
| 4 | Drag-to-dismiss | Medium | Offset (>140px) and velocity (>700px/s) were checked separately, so a quick short flick (120px at 685px/s) sprang back. | Project where the sheet would coast to, `offset + velocity × 0.2s`, and close if that passes 140px (as UIKit sheets do). |
| 5 | Desktop bar at tablet width (iPad portrait, 810px) | High (regression in this PR) | Wrapping the range input for the scrub bubble removed its intrinsic ~129px minimum width, so the progress bar collapsed to 0. | `min-w-32` on the wrapper. |
