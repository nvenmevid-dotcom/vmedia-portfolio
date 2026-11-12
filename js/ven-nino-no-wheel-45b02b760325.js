/* VEN_NINO_POLISH_V2. Ven Sarreal: refined hero + consolidated results gallery.
   No framework, new video assets, or changes to the existing custom controls.
   Coverflow geometry adapted from the user-supplied ruixen.ui component. */
(() => {
  'use strict';
  if (window.__venNinoV1) return;
  window.__venNinoV1 = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const hero = document.querySelector('#hero.vn-hero');
  const portrait = hero?.querySelector('[data-vn-portrait]');
  const title = hero?.querySelector('.vn-name');
  const titleSpan = title?.firstElementChild;
  const frameTime = (now, previous) => Math.min(48, Math.max(1, now - (previous || now - 16.667)));

  function fitName() {
    if (!title || !titleSpan) return;
    title.style.removeProperty('font-size');
    titleSpan.style.maxWidth = 'none';
    const available = title.clientWidth;
    const width = titleSpan.getBoundingClientRect().width;
    if (width > available && width > 0) title.style.fontSize = `${parseFloat(getComputedStyle(title).fontSize) * available / width}px`;
    titleSpan.style.removeProperty('max-width');
  }
  fitName();
  document.fonts?.ready.then(fitName);
  if (hero && 'ResizeObserver' in window) new ResizeObserver(fitName).observe(hero);

  // The portrait is slightly tilted at rest, then rotates toward upright on hover.
  // Mouse movement inside the portrait adds a restrained 3D tilt. The frame stops at rest.
  let hx=0,hy=0,tx=0,ty=0,heroVisible=true,tiltRAF=0,tiltLast=0;
  let rz=7,goalZ=7;
  function paintTilt(now){
    tiltRAF=0;
    if(!portrait||!heroVisible||document.hidden||reduce.matches||!fine.matches)return;
    const a=1-Math.pow(.87,frameTime(now,tiltLast)/16.667);tiltLast=now;
    hx+=(tx-hx)*a;hy+=(ty-hy)*a;rz+=(goalZ-rz)*a;
    portrait.style.transform=`perspective(1100px) translate3d(${(hx*3).toFixed(2)}px,${(hy*3).toFixed(2)}px,0) rotateX(${(-hy*2).toFixed(2)}deg) rotateY(${(hx*3).toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
    if(Math.abs(tx-hx)+Math.abs(ty-hy)+Math.abs(goalZ-rz)>.003)tiltRAF=requestAnimationFrame(paintTilt);
  }
  function movePortrait(x,y,z){tx=x;ty=y;goalZ=z;if(!tiltRAF){tiltLast=0;tiltRAF=requestAnimationFrame(paintTilt);}}
  function pointerPosition(event){const r=portrait.getBoundingClientRect();const x=(event.clientX-r.left)/r.width*2-1,y=(event.clientY-r.top)/r.height*2-1;movePortrait(Math.max(-1,Math.min(1,x)),Math.max(-1,Math.min(1,y)),-.5);}
  portrait?.addEventListener('pointerenter',event=>{if(fine.matches&&!reduce.matches)pointerPosition(event);});
  portrait?.addEventListener('pointermove',event=>{if(fine.matches&&!reduce.matches&&event.pointerType!=='touch')pointerPosition(event);},{passive:true});
  portrait?.addEventListener('pointerleave',()=>movePortrait(0,0,7));
  if(hero&&'IntersectionObserver'in window)new IntersectionObserver(entries=>{
    heroVisible=entries[0].isIntersecting;
    if(!heroVisible){cancelAnimationFrame(tiltRAF);tiltRAF=0;}
  }).observe(hero);
  const cursor=document.createElement('div');cursor.className='vn-cursor';cursor.setAttribute('aria-hidden','true');document.body.append(cursor);
  let cx=-100,cy=-100,mx=-100,my=-100,ringRAF=0,ringLast=0,ringScale=1,targetScale=1,ringSeen=false;
  function ringPaint(now){
    ringRAF=0;if(!fine.matches||reduce.matches||document.hidden)return;
    const a=1-Math.pow(.78,frameTime(now,ringLast)/16.667);ringLast=now;
    cx+=(mx-cx)*a;cy+=(my-cy)*a;ringScale+=(targetScale-ringScale)*a;
    cursor.style.transform=`translate3d(${cx-17}px,${cy-17}px,0) scale(${ringScale})`;
    if(Math.abs(mx-cx)+Math.abs(my-cy)+Math.abs(targetScale-ringScale)>.1)ringRAF=requestAnimationFrame(ringPaint);
  }
  document.addEventListener('pointermove',event=>{
    if(!fine.matches||reduce.matches||event.pointerType==='touch')return;
    mx=event.clientX;my=event.clientY;
    if(!ringSeen){cx=mx;cy=my;ringSeen=true;}
    targetScale=event.target.closest('a,button,[role="button"]')?1.35:1;
    cursor.style.opacity=event.target.closest('video,input,textarea,.video-controls,[data-native-scroll]')?'0':'.65';
    if(!ringRAF){ringLast=0;ringRAF=requestAnimationFrame(ringPaint);}
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{cursor.style.opacity='0';ringSeen=false;});
  function stopDecorative(){cancelAnimationFrame(tiltRAF);tiltRAF=0;cancelAnimationFrame(ringRAF);ringRAF=0;cursor.style.opacity='0';ringSeen=false;portrait?.style.removeProperty('transform');}
  reduce.addEventListener('change',stopDecorative);fine.addEventListener('change',stopDecorative);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDecorative();});

  // VEN_SCROLL_PERFORMANCE_V1: the old wheel-hijack and scrollTo RAF loop are retired.
  // Optional Locomotive Scroll v5 is initialized by our separate bridge.
  // The gallery, portrait tilt and pointer cursor are unchanged.

  // Same geometry, loop folding, drag and exponential settling as the supplied coverflow.
  // Only the card aspect and data are changed to keep screenshot view counts uncropped.
  const gallery=document.getElementById('results');
  const frame=gallery?.querySelector('.vn-carousel-frame'),track=gallery?.querySelector('.vn-carousel-track');
  if(!gallery||!frame||!track)return;
  let slides;try{slides=JSON.parse(gallery.querySelector('[data-vn-slides]').textContent);}catch{return;}
  if(!Array.isArray(slides)||!slides.length)return;
  const cards=[...track.querySelectorAll('.vn-cover-card')];if(cards.length!==slides.length)return;
  const count=cards.length,rotate=44,depth=.6,falloff=.56,fade=.10,gap=.05;
  let pos=0,target=0,width=0,raf=0,last=0,selected=0,drag=null,inView=true;
  const idx=p=>((Math.round(p)%count)+count)%count;
  function caption(n,announce=false){
    selected=n;const s=slides[n];
    gallery.querySelector('[data-vn-title]').textContent=s.title;
    gallery.querySelector('[data-vn-subtitle]').textContent=s.subtitle;
    gallery.querySelector('[data-vn-views]').textContent=s.views;
    gallery.querySelector('[data-vn-account]').textContent=s.context;
    gallery.querySelector('[data-vn-count]').textContent=`${String(n+1).padStart(2,'0')} / ${count}`;
    if(announce)gallery.querySelector('[data-vn-status]').textContent=`${n+1} of ${count}. ${s.title}. ${s.views} views shown.`;
  }
  function paint(){
    if(!width)return;
    const pitch=width*(1+gap);
    cards.forEach((card,n)=>{
      let offset=((n-pos)%count+count)%count;if(offset>count/2)offset-=count;
      const distance=Math.abs(offset),ramp=Math.pow(distance,falloff),tilt=Math.min(rotate*ramp,82)*Math.sign(offset);
      card.style.transform=`translateX(calc(-50% + ${offset*pitch}px)) translateZ(${-depth*width*ramp}px) rotateY(${-tilt}deg)`;
      const edge=Math.min(1,Math.max(0,count/2-distance));
      card.style.opacity=String(Math.max(0,1-fade*distance)*edge);
      card.style.zIndex=String(100-Math.round(distance));
      card.style.pointerEvents=distance<5?'auto':'none';
      card.setAttribute('aria-hidden',String(distance>4));
    });
  }
  function settle(next){
    cancelAnimationFrame(raf);raf=0;target=next;caption(idx(next),true);
    if(reduce.matches||!inView||document.hidden){pos=target;paint();return;}
    last=0;
    const step=now=>{raf=0;const remaining=target-pos;if(Math.abs(remaining)<.0004){pos=target;paint();return;}
      pos+=remaining*(1-Math.pow(.84,frameTime(now,last)/16.667));last=now;paint();raf=requestAnimationFrame(step);};
    raf=requestAnimationFrame(step);
  }
  const nudge=by=>settle(Math.round(target)+by);
  const goTo=n=>settle(n+Math.round((target-n)/count)*count);
  function measure(){width=cards[0].offsetWidth;paint();}measure();caption(0);
  if('ResizeObserver'in window)new ResizeObserver(measure).observe(frame);
  gallery.querySelector('[data-vn-prev]').addEventListener('click',()=>nudge(-1));
  gallery.querySelector('[data-vn-next]').addEventListener('click',()=>nudge(1));
  frame.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();nudge(-1);}else if(event.key==='ArrowRight'){event.preventDefault();nudge(1);}
    else if(event.key==='Home'){event.preventDefault();goTo(0);}else if(event.key==='End'){event.preventDefault();goTo(count-1);}
  });
  frame.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;cancelAnimationFrame(raf);raf=0;target=pos;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,pos,t:performance.now(),v:0,moved:false,card:event.target.closest('[data-vn-index]')};
    if(event.pointerType==='mouse'){frame.setPointerCapture(event.pointerId);event.preventDefault();}
  });
  frame.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved){if(Math.abs(dx)<6)return;if(Math.abs(dy)>Math.abs(dx)){drag=null;return;}drag.moved=true;frame.setPointerCapture(event.pointerId);}
    const now=performance.now(),previous=pos;pos=drag.pos-dx/(width*(1+gap));
    drag.v=(pos-previous)/Math.max(now-drag.t,1)*1000;drag.t=now;
    if(idx(pos)!==selected)caption(idx(pos));paint();
  });
  function endDrag(event){
    if(!drag||drag.id!==event.pointerId)return;const old=drag;drag=null;
    if(frame.hasPointerCapture(event.pointerId))frame.releasePointerCapture(event.pointerId);
    if(event.type==='pointercancel'){settle(Math.round(pos));return;}
    if(!old.moved&&old.card){goTo(Number(old.card.dataset.vnIndex));return;}
    const velocity=performance.now()-old.t>100?0:old.v;
    settle(Math.round(pos+Math.max(-2,Math.min(2,velocity*.18))));
  }
  frame.addEventListener('pointerup',endDrag);frame.addEventListener('pointercancel',endDrag);
  frame.addEventListener('lostpointercapture',event=>{if(event.target===frame&&drag&&drag.id===event.pointerId){drag=null;settle(Math.round(pos));}});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(!inView){cancelAnimationFrame(raf);raf=0;pos=target;paint();}}).observe(gallery);
  reduce.addEventListener('change',()=>{if(reduce.matches){cancelAnimationFrame(raf);raf=0;pos=target;paint();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;pos=target;paint();}});
  const dialog=gallery.querySelector('dialog');
  gallery.querySelector('[data-vn-open]').addEventListener('click',()=>{
    cancelScroll();const s=slides[selected],image=dialog.querySelector('img');image.src=s.src;image.alt=s.alt;
    dialog.querySelector('h3').textContent=s.title;
    dialog.querySelector('.vn-dialog-note').textContent=`${s.subtitle} · ${s.views} views shown in the supplied screenshot`;
    if(typeof dialog.showModal==='function')dialog.showModal();else window.open(s.src,'_blank','noopener');
  });
  gallery.querySelector('[data-vn-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
})();
