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

/* ── Smooth nav shrink on scroll ── */
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.style.padding = '1rem 4rem';
  } else {
    nav.style.padding = '1.5rem 4rem';
  }
});

/* ── Active nav link highlight ── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 120;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.style.color = '';
    if (link.getAttribute('href') === `#${current}`) {
      link.style.color = 'var(--accent-dark)';
    }
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

videoCards.forEach(card => {
  const video = card.querySelector('video');
  video.preload = 'auto';
  video.load();
  video.play().catch(() => {
    console.log('Autoplay blocked for video');
  });
});

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
