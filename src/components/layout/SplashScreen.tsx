/**
 * Opening splash: logo, name and a loading bar, in the server HTML so it
 * paints before any JS. It fades once the page has loaded (the scene image and
 * fonts are in the HTML, so `load` waits for them), shown for at least 1.7s so
 * it doesn't flash, and never longer than MAX_MS. Hiding is a class on <html>
 * (which already takes suppressHydrationWarning) rather than removing the
 * node, so React hydration still matches; client navigations keep the class,
 * so the splash only shows on a full open of the app.
 */
const MIN_MS = 1700;
const MAX_MS = 8000;

const hideScript = `(function(){
var d=document.documentElement,t0=Date.now(),done=false;
function hide(){if(done)return;done=true;setTimeout(function(){d.classList.add("huda-ready")},Math.max(0,${MIN_MS}-(Date.now()-t0)))}
if(document.readyState==="complete")hide();else window.addEventListener("load",hide);
setTimeout(hide,${MAX_MS});
})();`;

export function SplashScreen() {
  return (
    <>
      <div id="huda-splash" role="status" aria-label="Loading HuDa">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/huda-logo.webp?v=3" alt="" width={190} height={190} fetchPriority="high" className="huda-splash-logo" />
        <p className="huda-splash-name">HuDa</p>
        <p className="huda-splash-tagline">Guidance for every moment</p>
        {/* Loading mark: an eight-point Rub-el-Hizb star (the Quran's own
            section glyph ۞), turning slowly in gold — reads as "loading" but in
            the app's Arabic character, not a plain sweeping bar. Inline SVG, so
            it paints with the server HTML before any font or script. */}
        <svg className="huda-splash-mark" viewBox="0 0 64 64" width="56" height="56" fill="none" role="img" aria-label="Loading">
          <g className="huda-splash-mark-spin">
            <rect x="15" y="15" width="34" height="34" rx="3.5" stroke="#fcd34d" strokeWidth="2" opacity="0.92" />
            <rect x="15" y="15" width="34" height="34" rx="3.5" stroke="#fcd34d" strokeWidth="2" opacity="0.5" transform="rotate(45 32 32)" />
          </g>
          <circle className="huda-splash-mark-core" cx="32" cy="32" r="3.5" fill="#fcd34d" />
        </svg>
      </div>
      <script dangerouslySetInnerHTML={{ __html: hideScript }} />
    </>
  );
}
