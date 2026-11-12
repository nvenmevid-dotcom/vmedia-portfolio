/* Ven Sarreal DRAFT — Locomotive Scroll v5 bridge.
   ONE scroll controller: the old Nino wheel handler is removed by the installer.
   Native scroll is the fallback if the CDN is blocked, a touch device is used,
   reduced-motion is preferred, or ?native=1 is in the URL.
   No extra parallax is attached to videos or the carousel. */
(() => {
  'use strict';
  if (window.__venScrollBridgeV1) return;
  window.__venScrollBridgeV1 = true;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)');
  const native = new URLSearchParams(location.search).has('native');
  const saveData = Boolean(navigator.connection?.saveData);
  let instance = null;

  function eligible() {
    return desktop.matches && !reduced.matches && !native && !saveData &&
      typeof window.LocomotiveScroll === 'function';
  }
  function stop() {
    if (instance) {
      try { instance.destroy(); } catch (_) {}
      instance = null;
      delete window.venPortfolioScroll;
    }
    document.documentElement.classList.remove('ven-scroll-v5');
  }
  function sync() {
    if (!eligible()) { stop(); return; }
    if (instance) return;
    try {
      instance = new window.LocomotiveScroll({
        lenisOptions: {
          lerp: 0.125,
          smoothWheel: true,
          syncTouch: false,
          wheelMultiplier: 0.90
        }
      });
      window.venPortfolioScroll = instance;
      document.documentElement.classList.add('ven-scroll-v5');
    } catch (err) {
      console.warn('Optional Locomotive Scroll initialization failed. Using native scroll.', err);
      stop();
    }
  }
  // Handles both a cached script that finishes before us and a delayed CDN response.
  document.getElementById('ven-scroll-cdn')?.addEventListener('load', sync);
  document.getElementById('ven-scroll-cdn')?.addEventListener('error', () => {
    console.info('Locomotive Scroll CDN unavailable. Native scrolling remains enabled.');
    stop();
  });
  desktop.addEventListener('change', sync);
  reduced.addEventListener('change', sync);
  window.addEventListener('load', sync, {once: true});
  sync();
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', sync);
})();
