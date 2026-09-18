/* Slide-to-recording navigation. Metadata only; opening a video is explicit. */
(() => {
  'use strict';
  const script = document.currentScript;
  const link = document.querySelector('[data-recording-link]');
  if (!script?.dataset.map || !link || link.dataset.recordingReady) return;
  link.dataset.recordingReady = 'true';
  let recording = null;
  const clock = value => { const seconds = Math.round(value); return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2,'0'); };
  function currentSid() {
    return window.TrialLesson?.getCurrent?.() || window.Reveal?.getCurrentSlide?.()?.dataset.sid
      || document.querySelector('section.is-current[data-sid]')?.dataset.sid || '';
  }
  function update() {
    const sid = currentSid(), slide = recording?.slides.find(item => item.sid === sid);
    link.hidden = true; link.removeAttribute('href'); delete link.dataset.start;
    link.dataset.sid = sid;
    if (!slide) return;
    const url = new URL(recording.watchUrl);
    url.searchParams.set('t', String(slide.t));
    link.href = url.href; link.target = '_blank'; link.rel = 'noopener';
    link.dataset.start = String(slide.t);
    link.textContent = '本页视频 · Video ' + clock(slide.t) + ' ↗';
    link.title = slide.title + ' · 从 ' + clock(slide.t) + ' 开始观看 / Watch from here';
    link.setAttribute('aria-label', '观看本页视频，从 ' + clock(slide.t) + ' 开始，在新标签页打开。 Watch this part in a new tab.');
    link.hidden = false;
  }
  function pauseNarration(event) {
    if (event.defaultPrevented || (event.type === 'auxclick' && event.button !== 1) || link.hidden) return;
    if (window.TrialLesson?.stopAudio) window.TrialLesson.stopAudio();
    else if (typeof window.stopAudio === 'function') window.stopAudio();
  }
  link.addEventListener('click', pauseNarration);
  link.addEventListener('auxclick', pauseNarration);
  window.addEventListener('trial:slidechange', update);
  window.addEventListener('hashchange', update);
  window.Reveal?.on?.('slidechanged', update);
  window.Reveal?.on?.('ready', update);
  (async () => {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const mapUrl = new URL(script.dataset.map, location.href);
      if (mapUrl.origin !== location.origin) return;
      const response = await fetch(mapUrl, {credentials:'omit', cache:'no-cache', signal:controller.signal});
      if (!response.ok) return;
      const data = await response.json(), watch = new URL(data.watchUrl);
      if (watch.origin !== 'https://academic.hopeembark.org' || watch.pathname !== '/watch'
        || !data.lessonId || watch.searchParams.get('lesson') !== data.lessonId || !Array.isArray(data.slides)) return;
      const slides = data.slides.filter(item => typeof item.sid === 'string' && typeof item.title === 'string'
        && Number.isFinite(item.t) && item.t >= 0 && (!Number.isFinite(data.videoDuration) || item.t < data.videoDuration));
      recording = {watchUrl:watch.href, slides}; update();
    } catch (_) { /* A missing recording never sends students to a guessed time. */ }
    finally { clearTimeout(timeout); }
  })();
})();
