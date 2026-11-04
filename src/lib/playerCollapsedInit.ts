/** localStorage key of the player's remembered full / compact choice. */
export const PLAYER_COLLAPSED_KEY = "huda:player-collapsed";

/**
 * Head script: the server renders the full player, and hydration switches a
 * phone (or a remembered choice) to the compact pill — a 0.12 layout shift
 * on phones. This marks <html data-player-collapsed> before the first paint
 * so globals.css lays the unhydrated player out as the pill; the player
 * removes the mark once its own state has taken over.
 */
export const playerCollapsedInitScript = `
(function(){try{
  var s=localStorage.getItem('${PLAYER_COLLAPSED_KEY}');
  if(s!==null?s==='1':window.innerWidth<768)document.documentElement.setAttribute('data-player-collapsed','');
}catch(e){}})();
`;
