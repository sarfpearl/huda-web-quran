/**
 * Opening splash: logo, name and a loading bar, in the server HTML so it
 * paints before any JS. It fades once the page has loaded (the scene image and
 * fonts are in the HTML, so `load` waits for them), shown for at least 3s so
 * it doesn't flash, and never longer than MAX_MS. Hiding is a class on <html>
 * (which already takes suppressHydrationWarning) rather than removing the
 * node, so React hydration still matches; client navigations keep the class,
 * so the splash only shows on a full open of the app.
 */
const MIN_MS = 3000;
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
        <img src="/splash-logo.webp" alt="" width={190} height={192} fetchPriority="high" className="huda-splash-logo" />
        <p className="huda-splash-name">HuDa</p>
        <p className="huda-splash-tagline">Guidance for every moment</p>
        <div className="huda-splash-bar" aria-hidden="true">
          <span />
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: hideScript }} />
    </>
  );
}
