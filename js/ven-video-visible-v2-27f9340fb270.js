/* ============================================
   VMEDIA PORTFOLIO — main.js
   ============================================ */

/* ── Scroll-reveal animation ── */
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

reveals.forEach(el => observer.observe(el));

/* ── Tubelight navbar active animation ── */
const nav = document.querySelector('.site-nav');
const tubeNav = document.querySelector('.tubelight-nav');
const tubeLinks = document.querySelectorAll('[data-tube-nav]');

let isNavClickScrolling = false;
let navClickTimeout;

const moveNavLamp = (activeLink) => {
  if (!tubeNav || !activeLink) return;

  const navRect = tubeNav.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();

  tubeNav.style.setProperty('--lamp-x', `${linkRect.left - navRect.left - 4}px`);
  tubeNav.style.setProperty('--lamp-width', `${linkRect.width}px`);

  tubeLinks.forEach(link => link.classList.remove('is-active'));
  activeLink.classList.add('is-active');
};

const setActiveTubeLink = (hash) => {
  const targetLink = Array.from(tubeLinks).find(link => link.getAttribute('href') === hash);
  if (targetLink) moveNavLamp(targetLink);
};

const getCurrentSectionHash = () => {
  if (!tubeLinks.length) return '#hero';

  const pageBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 12;

  if (pageBottom) {
    return '#contact';
  }

  let currentHash = '#hero';
  const scanPoint = window.scrollY + window.innerHeight * 0.34;

  tubeLinks.forEach(link => {
    const hash = link.getAttribute('href');
    const section = document.querySelector(hash);

    if (!section) return;

    const sectionTop = section.offsetTop;

    if (scanPoint >= sectionTop) {
      currentHash = hash;
    }
  });

  return currentHash;
};

const updateTubeNavOnScroll = () => {
  if (nav) {
    nav.classList.toggle('is-scrolled', window.scrollY > 24);
  }

  if (!tubeLinks.length || isNavClickScrolling) return;

  const currentHash = getCurrentSectionHash();
  setActiveTubeLink(currentHash);
};

tubeLinks.forEach(link => {
  link.addEventListener('click', (event) => {
    const hash = link.getAttribute('href');
    const targetSection = document.querySelector(hash);

    if (!targetSection) return;

    event.preventDefault();

    clearTimeout(navClickTimeout);
    isNavClickScrolling = true;

    moveNavLamp(link);

    targetSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    history.pushState(null, '', hash);

    navClickTimeout = setTimeout(() => {
      isNavClickScrolling = false;
      updateTubeNavOnScroll();
    }, 950);
  });
});

window.addEventListener('load', () => {
  const hashLink = Array.from(tubeLinks).find(link => link.getAttribute('href') === window.location.hash);
  const activeLink = hashLink || document.querySelector('.tube-link.is-active') || tubeLinks[0];

  moveNavLamp(activeLink);
  updateTubeNavOnScroll();
});

window.addEventListener('resize', () => {
  const activeLink = document.querySelector('.tube-link.is-active') || tubeLinks[0];
  moveNavLamp(activeLink);
});

window.addEventListener('scroll', updateTubeNavOnScroll, { passive: true });

/* ── Home about image accordion ── */
const aboutAccordionItems = document.querySelectorAll('[data-about-accordion]');

aboutAccordionItems.forEach(item => {
  item.addEventListener('mouseenter', () => {
    aboutAccordionItems.forEach(card => card.classList.remove('is-active'));
    item.classList.add('is-active');
  });

  item.addEventListener('focusin', () => {
    aboutAccordionItems.forEach(card => card.classList.remove('is-active'));
    item.classList.add('is-active');
  });
});

/* ── Custom local video controls ── */
const videoCards = document.querySelectorAll('.video-card');
const volumeIcons = {
  muted: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 9h4l5-4v14l-5-4H5z"></path>
      <path d="M17 9l4 6"></path>
      <path d="M21 9l-4 6"></path>
    </svg>
  `,
  unmuted: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 9h4l5-4v14l-5-4H5z"></path>
      <path d="M17 9.5a4.5 4.5 0 0 1 0 5"></path>
      <path d="M19.5 7a8 8 0 0 1 0 10"></path>
    </svg>
  `
};

/* ── Smart video loading/playback ── */
/* VEN_VIEWPORT_PLAYBACK_V2: fewer simultaneous decoders, preserve manual controls. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  const small = window.matchMedia('(max-width: 720px)');
  const states = [];
  let queued = false;
  const specialView = video => document.pictureInPictureElement === video ||
    (document.fullscreenElement && document.fullscreenElement.contains(video));
  function pause(state) {
    if (specialView(state.video) || state.video.paused) return;
    state.expectedPause++;
    state.video.pause();
  }
  async function play(state) {
    if (!state.active || document.hidden || state.userPaused || state.pending || state.blocked || state.video.error) return;
    if (!state.manual && (reduce.matches || saveData)) return;
    if (!state.video.paused) return;
    state.pending = true;
    state.video.preload = 'auto';
    try {
      await state.video.play();
      if (!state.active || document.hidden || state.userPaused) pause(state);
    } catch (error) {
      if (error?.name === 'NotAllowedError') state.blocked = true;
    } finally {
      state.pending = false;
    }
  }
  function refresh() {
    queued = false;
    const limit = states.length;
    // Always prioritize a video deliberately started by a visitor.
    const eligible = states.filter(state => state.ratio >= 0.18 && !state.userPaused)
      .sort((a,b) => Number(b.manual) - Number(a.manual) || b.ratio - a.ratio);
    const allowed = new Set(eligible.slice(0, limit));
    // VEN_VISIBLE_START_STAGGER_V1: spread video decoder starts across frames.
    let nextStart = 0;
    states.forEach(state => {
      state.active = !document.hidden && allowed.has(state);
      if (!state.active) {
        if (state.startTimer) { clearTimeout(state.startTimer); state.startTimer = null; }
        pause(state);
      } else if (state.video.paused && !state.pending && !state.startTimer) {
        const delay = Math.min(nextStart++, 6) * 190; // VEN_SMOOTHER_START_V3
        state.startTimer = setTimeout(() => {
          state.startTimer = null;
          if (state.active) play(state);
        }, delay);
      }
    });
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }
  videoCards.forEach(card => {
    const video = card.querySelector('video');
    if (!video) return;
    video.muted = true;
    video.volume = 0;
    video.preload = 'metadata';
    video.autoplay = false;
    const state = { video, card, ratio: 0, active: false, userPaused: false,
      pending: false, expectedPause: 0, blocked: false, manual: false };
    states.push(state);
    video.addEventListener('pause', () => {
      if (state.expectedPause > 0) { state.expectedPause--; return; }
      if (state.ratio >= 0.18 && !document.hidden) state.userPaused = true;
      schedule();
    });
    video.addEventListener('play', () => {
      if (!state.pending) {
        state.userPaused = false;
        state.blocked = false;
        state.manual = true;
        schedule();
      }
      if ((!state.active || document.hidden) && !specialView(video)) pause(state);
    });
    video.addEventListener('enterpictureinpicture', schedule);
    video.addEventListener('leavepictureinpicture', schedule);
  });
  // VEN_CANPLAY_RESUME_V3: retry pending visible starts when a large file is ready.
  states.forEach(state => state.video.addEventListener('canplay', schedule));
  const stateByCard = new Map(states.map(state => [state.card, state]));
  let observer;
  function observe() {
    observer?.disconnect();
    if (!('IntersectionObserver' in window)) {
      // No observer available: retain native manual playback rather than running every video.
      return;
    }
    const headerHeight = document.getElementById('vp-header')?.offsetHeight || 0;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const state = stateByCard.get(entry.target);
        if (!state) return;
        const wasVisible = state.ratio >= 0.18;
        state.ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
        if (wasVisible && state.ratio < 0.04) {
          // Scrolled away: allow automatic playback again on return.
          state.userPaused = false;
          state.manual = false;
          state.blocked = false;
        }
      });
      schedule();
    }, { rootMargin: `-${headerHeight}px 0px 0px 0px`, threshold: [0, .04, .18, .35, .6, .85, 1] });
    states.forEach(state => observer.observe(state.card));
    schedule();
  }
  observe();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(observe, 180);
  }, { passive: true });
  small.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('pagehide', () => states.forEach(pause));
  window.addEventListener('pageshow', () => { observe(); schedule(); });
  reduce.addEventListener('change', () => {
    if (reduce.matches) states.forEach(state => { state.manual = false; pause(state); });
    schedule();
  });
})();


// Set up video controls for each card
videoCards.forEach(card => {
  const video = card.querySelector('video');
  const centerButton = card.querySelector('.video-control--center');
  const muteButton = card.querySelector('.video-control--mute');
  const volumeSlider = card.querySelector('.video-volume');
  const progressBar = card.querySelector('.video-progress');
  const progressFill = card.querySelector('.video-progress-fill');
  const progressContainer = card.querySelector('.video-progress-container');
  const progressCursor = document.createElement('div');
  const progressTooltip = document.createElement('div');
  let isTimelineScrubbing = false;

  progressCursor.className = 'video-progress-cursor';
  progressTooltip.className = 'video-progress-tooltip';
  progressTooltip.textContent = '0.0s';
  progressContainer.append(progressCursor, progressTooltip);

  const updateState = () => {
    const isPaused = video.paused || video.ended;
    centerButton.textContent = isPaused ? '▶' : '❚❚';
    muteButton.innerHTML = video.muted || video.volume === 0 ? volumeIcons.muted : volumeIcons.unmuted;
  };

  const updateVolumeFill = value => {
    volumeSlider.style.setProperty('--volume-percent', `${value * 100}%`);
  };

  const updateProgress = () => {
    if (!video.duration || Number.isNaN(video.duration)) return;
    const percent = (video.currentTime / video.duration) * 100;
    progressBar.value = percent;
    progressFill.style.width = `${percent}%`;
  };

  const formatTimestamp = time => {
    if (!Number.isFinite(time) || time < 0) return '0.0s';

    if (time < 60) {
      return `${time.toFixed(1)}s`;
    }

    const minutes = Math.floor(time / 60);
    const seconds = (time % 60).toFixed(1).padStart(4, '0');
    return `${minutes}:${seconds}`;
  };

  const getTimelineMetrics = clientX => {
    const rect = progressContainer.getBoundingClientRect();
    const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const percent = rect.width ? (relativeX / rect.width) * 100 : 0;
    const time = video.duration ? (percent / 100) * video.duration : 0;

    return { percent, relativeX, time };
  };

  const updateTimelinePreview = clientX => {
    const { percent, relativeX, time } = getTimelineMetrics(clientX);
    const containerWidth = progressContainer.clientWidth;
    progressContainer.classList.add('is-previewing');
    progressCursor.style.left = `${relativeX}px`;
    progressTooltip.textContent = formatTimestamp(time);
    const tooltipHalfWidth = progressTooltip.offsetWidth / 2;
    const clampedTooltipX = Math.min(
      Math.max(relativeX, tooltipHalfWidth),
      Math.max(containerWidth - tooltipHalfWidth, tooltipHalfWidth)
    );
    progressTooltip.style.left = `${clampedTooltipX}px`;

    if (isTimelineScrubbing) {
      seekTo(percent);
    }
  };

  const clearTimelinePreview = () => {
    if (isTimelineScrubbing) return;
    progressContainer.classList.remove('is-previewing');
  };

  const togglePlay = () => {
    if (video.paused || video.ended) {
      video.play();
    } else {
      video.pause();
    }
  };

  const setVolume = value => {
    video.volume = value;
    video.muted = value === 0;
    updateVolumeFill(value);
    updateState();
  };

  const seekTo = percent => {
    if (video.duration) {
      video.currentTime = (percent / 100) * video.duration;
    }
  };

  card.addEventListener('click', event => {
    if (
      event.target.closest('.video-control') ||
      event.target.closest('.video-volume') ||
      event.target.closest('.video-progress-container')
    ) return;
    togglePlay();
  });

  centerButton.addEventListener('click', event => {
    event.stopPropagation();
    togglePlay();
  });

  const volumeWrapper = card.querySelector('.video-volume-wrapper');

  muteButton.addEventListener('click', event => {
    event.stopPropagation();
    volumeWrapper.classList.toggle('volume-open');
    if (video.muted || video.volume === 0) {
      if (video.volume === 0) {
        setVolume(0.5);
        volumeSlider.value = 0.5;
      }
      video.muted = false;
    } else {
      video.muted = true;
    }
    updateState();
  });

  progressBar.addEventListener('input', event => {
    const percent = parseFloat(event.target.value);
    seekTo(percent);
  });

  progressContainer.addEventListener('pointerenter', event => {
    updateTimelinePreview(event.clientX);
  });

  progressContainer.addEventListener('pointermove', event => {
    updateTimelinePreview(event.clientX);
  });

  progressContainer.addEventListener('pointerleave', () => {
    clearTimelinePreview();
  });

  progressContainer.addEventListener('pointerdown', event => {
    event.stopPropagation();
    isTimelineScrubbing = true;
    progressContainer.setPointerCapture(event.pointerId);
    updateTimelinePreview(event.clientX);
  });

  progressContainer.addEventListener('pointerup', event => {
    if (!isTimelineScrubbing) return;
    isTimelineScrubbing = false;
    updateTimelinePreview(event.clientX);
  });

  progressContainer.addEventListener('lostpointercapture', () => {
    isTimelineScrubbing = false;
    clearTimelinePreview();
  });

  ['pointerdown', 'click'].forEach(eventName => {
    progressContainer.addEventListener(eventName, event => {
      event.stopPropagation();
    });
  });

  volumeSlider.addEventListener('input', event => {
    const value = parseFloat(event.target.value);
    setVolume(value);
  });

  video.addEventListener('play', updateState);
  video.addEventListener('pause', updateState);
  video.addEventListener('timeupdate', updateProgress);
  video.addEventListener('loadedmetadata', updateProgress);
  video.addEventListener('ended', () => {
    updateProgress();
    video.play();
  });

  video.addEventListener('loadeddata', () => {
    volumeSlider.value = video.volume;
    updateVolumeFill(video.volume);
    updateState();
  });

  document.addEventListener('click', event => {
    if (!card.contains(event.target)) {
      volumeWrapper.classList.remove('volume-open');
    }
  });

  video.volume = 0;
  setVolume(0);
});
