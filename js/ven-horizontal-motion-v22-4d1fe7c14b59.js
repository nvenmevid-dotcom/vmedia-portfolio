/* Ven Sarreal | Refinement v2. js/main.js still owns the eight My Work players. */
(() => {
  'use strict';
  const root = document.querySelector('body.ven-portfolio');
  if (!root) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.getElementById('vp-header');
  const menuButton = document.querySelector('.vp-menu-toggle');
  const mobileMenu = document.getElementById('vp-mobile-nav');
  function setMenu(open) {
    if (!menuButton || !mobileMenu) return;
    mobileMenu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    header?.classList.toggle('is-menu-open', open);
  }
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      setMenu(false); menuButton.focus();
    }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 720) setMenu(false); }, { passive: true });
  const navLinks = [...document.querySelectorAll('[data-vp-nav]')];
  const targets = navLinks.map(link => ({ link, section: document.getElementById(link.hash.slice(1)) })).filter(item => item.section);
  let scrollFrame = 0;
  function updateNavigation() {
    scrollFrame = 0;
    header?.classList.toggle('is-scrolled', window.scrollY > 24);
    const line = (header?.offsetHeight || 76) + 95;
    let current = null;
    targets.forEach(item => { if (item.section.getBoundingClientRect().top <= line) current = item.link; });
    if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10) current = targets.at(-1)?.link || current;
    navLinks.forEach(link => { if (link === current) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  }
  window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateNavigation); }, { passive: true });
  window.addEventListener('resize', updateNavigation, { passive: true });
  window.addEventListener('pageshow', updateNavigation);
  updateNavigation();

  // Keyboard-accessible result and process tabs. No client video players are re-created.
  document.querySelectorAll('[data-vp-tablist]').forEach(list => {
    const tabs = [...list.querySelectorAll('[data-vp-tab]')];
    function selectTab(next, moveFocus = false) {
      tabs.forEach(tab => {
        const chosen = tab === next;
        tab.setAttribute('aria-selected', String(chosen));
        tab.tabIndex = chosen ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) panel.hidden = !chosen;
      });
      if (moveFocus) next.focus();
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', event => {
        const vertical = list.getAttribute('aria-orientation') === 'vertical';
        const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
        const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';
        let nextIndex = null;
        if (event.key === nextKey) nextIndex = (index + 1) % tabs.length;
        else if (event.key === prevKey) nextIndex = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex !== null) { event.preventDefault(); selectTab(tabs[nextIndex], true); }
      });
    });
  });

  // Reveal only elements initially below the viewport; no blank first screen.
  const revealElements = [...document.querySelectorAll('[data-vp-reveal]')];
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible'); observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 35px 0px' });
    revealElements.forEach(element => {
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      element.classList.add('vp-reveal-ready'); observer.observe(element);
    });
    reduceMotion.addEventListener('change', () => {
      if (reduceMotion.matches) { revealElements.forEach(el => el.classList.add('is-visible')); observer.disconnect(); }
    });
  }

  // Real production images. Natural page scroll controls the desktop sticky stage.
  const story = document.querySelector('[data-vp-story]');
  const steps = story ? [...story.querySelectorAll('[data-vp-story-step]')] : [];
  const storyButtons = story ? [...story.querySelectorAll('[data-vp-story-select]')] : [];
  const storyPanels = story ? [...story.querySelectorAll('[data-vp-story-panel]')] : [];
  const storyProgress = story ? [...story.querySelectorAll('.vp-story-progress i')] : [];
  const storyDesktop = window.matchMedia('(min-width: 1000px)');
  let activeStep = '', storyClickUntil = 0, storyFrame = 0;
  function activateStep(id) {
    if (!id || activeStep === id) return;
    activeStep = id;
    steps.forEach(step => step.classList.toggle('is-active',step.dataset.vpStoryStep === id));
    storyButtons.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.vpStorySelect === id)));
    storyPanels.forEach(panel => { panel.hidden = panel.dataset.vpStoryPanel !== id; });
    storyProgress.forEach((item,index) => item.classList.toggle('is-active',String(index+1) === id));
  }
  function updateStory() {
    storyFrame = 0;
    if (!story || !storyDesktop.matches || reduceMotion.matches || performance.now() < storyClickUntil) return;
    const r=story.getBoundingClientRect();
    if (r.top > window.innerHeight*.7 || r.bottom < window.innerHeight*.25) return;
    const line=window.innerHeight*.5;
    let nearest=null,distance=Infinity;
    steps.forEach(step => {const box=step.getBoundingClientRect(),d=Math.abs(box.top+box.height*.5-line);if(d<distance){nearest=step;distance=d;}});
    if(nearest)activateStep(nearest.dataset.vpStoryStep);
  }
  function selectStep(button) {
    activateStep(button.dataset.vpStorySelect);
    if(storyDesktop.matches && !reduceMotion.matches){
      storyClickUntil=performance.now()+900;
      steps.find(step=>step.dataset.vpStoryStep===button.dataset.vpStorySelect)?.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(updateStory,950);
    }
  }
  storyButtons.forEach((button,index)=>{
    button.addEventListener('click',()=>selectStep(button));
    button.addEventListener('keydown',event=>{
      let next=null;
      if(event.key==='ArrowDown')next=(index+1)%storyButtons.length;
      if(event.key==='ArrowUp')next=(index+storyButtons.length-1)%storyButtons.length;
      if(next!==null){event.preventDefault();storyButtons[next].focus({preventScroll:true});selectStep(storyButtons[next]);}
    });
  });
  const scheduleStory=()=>{if(!storyFrame)storyFrame=requestAnimationFrame(updateStory);};
  window.addEventListener('scroll',scheduleStory,{passive:true});
  window.addEventListener('resize',scheduleStory,{passive:true});
  window.addEventListener('pageshow',scheduleStory);
  reduceMotion.addEventListener('change',scheduleStory);
  activateStep('1');updateStory();

  // Two background players, independently paused outside the viewport.
  // No selectors or listeners here modify the eight original .video-card players.
  document.querySelectorAll('[data-vp-bg-video]').forEach(video=>{
    const toggle=document.getElementById(video.dataset.control);
    if(!toggle)return;
    let userPaused=false,visible=false,manuallyStarted=false,loaded=false,failed=false,playPending=false;
    const saveData=Boolean(navigator.connection?.saveData);
    const label=toggle.querySelector('span');
    const target=video.closest('.vp-contact-panel')||video.closest('section');
    function displayState(){
      const playing=!video.paused&&!video.ended;
      const text=failed?'Background video unavailable':playing?'Pause background video':'Play background video';
      if(label)label.textContent=text;
      toggle.setAttribute('aria-label',text);toggle.title=text;
      toggle.setAttribute('aria-pressed',String(playing));toggle.disabled=failed;
      const icon=toggle.querySelector('svg');
      if(icon)icon.innerHTML=playing?'<path d="M8 5v14M16 5v14"/>':'<path d="m9 5 11 7-11 7z"/>';
    }
    function loadSource(){
      if(loaded)return true;
      const src=window.innerWidth<=720?video.dataset.mobileSrc:video.dataset.desktopSrc;
      if(!src)return false;
      video.muted=true;video.defaultMuted=true;video.src=src;video.preload='auto';video.load();loaded=true;return true;
    }
    async function playVideo(manual=false){
      if(failed||playPending||!visible||document.hidden||userPaused)return;
      if(!manual&&!manuallyStarted&&(reduceMotion.matches||saveData))return;
      if(!loadSource())return;
      playPending=true;
      try{await video.play();if(document.hidden||!visible||userPaused)video.pause();}
      catch(_){/* Autoplay blocked: retain poster and allow a manual retry. */}
      finally{playPending=false;displayState();}
    }
    toggle.addEventListener('click',()=>{
      if(!video.paused){userPaused=true;video.pause();}
      else{userPaused=false;manuallyStarted=true;playVideo(true);}
    });
    video.addEventListener('playing',()=>{video.classList.add('is-playing');displayState();});
    video.addEventListener('pause',displayState);
    video.addEventListener('error',()=>{failed=true;video.classList.remove('is-playing');displayState();});
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)playVideo();else video.pause();},{threshold:.02});
      observer.observe(target);
    }else{visible=true;playVideo();}
    document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else playVideo();});
    reduceMotion.addEventListener('change',()=>{if(reduceMotion.matches){manuallyStarted=false;video.pause();}else playVideo();});
    displayState();
  });
  // VEN_FEATURED_VISIBILITY_V3: reliable muted loop; no hover/native controls.
  // The previous 35%-ratio observer could miss tall videos until tab visibility changed.
  const featured = document.getElementById('vp-featured-video');
  if (featured) {
    featured.controls = false;
    featured.removeAttribute('controls');
    featured.loop = true;
    featured.muted = true;
    featured.defaultMuted = true;
    featured.playsInline = true;
    featured.disablePictureInPicture = true;
    featured.setAttribute('disablepictureinpicture', '');
    featured.setAttribute('disableremoteplayback', '');
    featured.preload = 'metadata';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const saveData = Boolean(navigator.connection?.saveData);
    let queued = false;
    let pending = false;
    let denied = false;
    function enoughVisible() {
      const r = featured.getBoundingClientRect();
      const headerBottom = Math.max(0, document.getElementById('vp-header')?.getBoundingClientRect().bottom || 0);
      const visiblePixels = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, headerBottom));
      return visiblePixels >= Math.min(110, r.height * 0.16);
    }
    async function syncPlayback() {
      const visible = !document.hidden && enoughVisible();
      const shouldPlay = visible && !reduce.matches && !saveData;
      if (!shouldPlay) {
        if (!featured.paused) featured.pause();
        return;
      }
      if (pending || denied || !featured.paused || featured.error) return;
      pending = true;
      try {
        await featured.play();
      } catch (error) {
        if (error?.name === 'NotAllowedError') denied = true;
        // AbortError may happen while the browser is seeking/loading: canplay retries.
      } finally {
        pending = false;
        if (document.hidden || !enoughVisible()) {
          if (!featured.paused) featured.pause();
        }
      }
    }
    function queueSync() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; syncPlayback(); });
    }
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(queueSync, { threshold: [0, 0.01, 0.1, 0.2, 0.4, 0.6, 1] });
      observer.observe(featured);
    }
    window.addEventListener('scroll', queueSync, { passive: true });
    window.addEventListener('resize', queueSync, { passive: true });
    document.addEventListener('visibilitychange', queueSync);
    window.addEventListener('pageshow', queueSync);
    window.addEventListener('pagehide', () => { if (!featured.paused) featured.pause(); });
    featured.addEventListener('loadeddata', queueSync);
    featured.addEventListener('canplay', queueSync);
    reduce.addEventListener('change', queueSync);
    // Starts on initial load AND on scroll, without needing an alt-tab.
    queueSync();
  }
})();
