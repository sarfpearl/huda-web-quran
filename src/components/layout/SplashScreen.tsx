import { DOT_LOADER_LOOKS, DotLoader } from "@/components/ui/DotLoader";

/**
 * Opening splash: logo, name and a loading bar, in the server HTML so it
 * paints before any JS. It fades once the page has loaded (the scene image and
 * fonts are in the HTML, so `load` waits for them), shown for at least 1.7s so
 * it doesn't flash, and never longer than MAX_MS. Hiding is a class on <html>
 * (which already takes suppressHydrationWarning) rather than removing the
 * node, so React hydration still matches; client navigations keep the class,
 * so the splash only shows on a full open of the app. The script also picks
 * the loader's look for this open (data-huda-dots): the next one after the
 * look this browser showed last time, so every open or reload shows a
 * different one and all of them come round in turn (a random one where
 * storage is blocked; ?dots=<look> forces one).
 */
const MIN_MS = 1700;
const MAX_MS = 8000;

const hideScript = `(function(){
var d=document.documentElement,t0=Date.now(),done=false;
var L=${JSON.stringify(DOT_LOADER_LOOKS)},q=/[?&]dots=([a-z]+)/.exec(location.search);
var n=Math.floor(Math.random()*L.length);
try{var k="huda-dots-look",p=L.indexOf(localStorage.getItem(k));if(p>=0)n=(p+1)%L.length;localStorage.setItem(k,L[n])}catch(e){}
d.setAttribute("data-huda-dots",q&&L.indexOf(q[1])>=0?q[1]:L[n]);
function hide(){if(done)return;done=true;setTimeout(function(){d.classList.add("huda-ready")},Math.max(0,${MIN_MS}-(Date.now()-t0)))}
if(document.readyState==="complete")hide();else window.addEventListener("load",hide);
setTimeout(hide,${MAX_MS});
})();`;

export function SplashScreen() {
  return (
    <>
      <div id="huda-splash" role="status" aria-label="Loading HuDa">
        {/* Wrappers are display: contents (a plain stack) except on a phone in
            landscape: then the name and tagline sit beside the logo. */}
        <div className="huda-splash-row">
          <span className="huda-splash-glow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/huda-logo.webp?v=3" alt="" width={190} height={190} fetchPriority="high" className="huda-splash-logo" />
          </span>
          <div className="huda-splash-text">
            <p className="huda-splash-name">HuDa</p>
            <p className="huda-splash-tagline">Guidance for every moment</p>
            {/* Loading mark: four dots rearranging, pure CSS so it paints with
                the server HTML before any script (landscape: under the tagline) */}
            <DotLoader className="huda-splash-mark" />
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: hideScript }} />
    </>
  );
}
