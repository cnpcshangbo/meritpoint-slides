/* Optional task narration and read-only starter explanations. Never edits code. */
(() => {
  'use strict';
  const base = new URL('audio/', document.currentScript.src);
  const sections = [...document.querySelectorAll('.pl-stages > section[data-sid]')];
  const audio = new Audio(); audio.preload = 'none';
  let manifest, active = null, token = 0, identity = '';
  const controls = new Map();
  function load() {
    if (!manifest) manifest = Promise.all(['narration.json', 'walkthrough.json'].map(async file => {
      const response = await fetch(new URL(file, base));
      if (!response.ok) throw new Error('Audio is unavailable. You can still read the instructions and run Python.');
      return response.json();
    })).catch(error => { manifest = null; throw error; });
    return manifest;
  }
  function stop() {
    token++; audio.pause(); audio.removeAttribute('src'); audio.load();
    for (const ui of controls.values()) {
      ui.listen.textContent = 'Listen instructions'; ui.listen.setAttribute('aria-pressed','false');
      ui.transport.hidden = true; ui.caption.textContent = '';
      ui.details.querySelectorAll('[aria-current]').forEach(node => node.removeAttribute('aria-current'));
    }
    active = null;
  }
  function displayCaption() {
    if (!active) return;
    const ui = controls.get(active.section);
    if (active.kind === 'line') { ui.caption.textContent = active.text; return; }
    const cues = active.cues || [];
    ui.caption.textContent = cues.find(cue => audio.currentTime >= cue.start && audio.currentTime < cue.end)?.text || '';
  }
  async function play(section, kind, stepIndex = 0) {
    stop();
    const request = token, ui = controls.get(section);
    ui.caption.textContent = 'Loading audio…';
    try {
      const [narrations, walkthroughs] = await load();
      if (request !== token || section.hidden) return;
      const plan = kind === 'line' ? walkthroughs[section.id] : narrations[section.id];
      if (!plan) throw new Error('Audio is unavailable for this round.');
      const step = kind === 'line' ? plan.steps[stepIndex] : null;
      active = { section, kind, index: stepIndex, length: plan.steps?.length || 0, text: step?.text, cues: plan.cues };
      ui.transport.hidden = false; ui.pause.textContent = 'Pause';
      ui.previous.hidden = ui.next.hidden = kind !== 'line';
      ui.previous.disabled = stepIndex === 0; ui.next.disabled = stepIndex >= (plan.steps?.length || 0) - 1;
      if (kind === 'line') {
        ui.details.open = true;
        ui.details.querySelector(`[data-starter-line="${stepIndex}"]`)?.setAttribute('aria-current','true');
      } else { ui.listen.textContent = 'Stop instructions'; ui.listen.setAttribute('aria-pressed','true'); }
      audio.src = new URL(step ? step.file : `${section.id}.mp3`, base).href;
      displayCaption();
      await audio.play();
      if (request !== token) return;
    } catch (error) {
      if (request !== token) return;
      stop(); ui.caption.textContent = error.message || 'Audio could not play. Try Listen again.';
    }
  }
  function unlock() {
    for (const [section, ui] of controls) {
      const status = section.querySelector('[data-lab]').dataset.liveRunStatus;
      // A real run or a restored matching run record counts as an attempt.
      if (['success','error','running'].includes(status)) {
        ui.attempted = true; ui.details.hidden = false; ui.wait.hidden = true;
      }
    }
  }
  for (const section of sections) {
    let listen = section.querySelector('[data-lab-listen]');
    if (!listen) {
      listen = document.createElement('button'); listen.type = 'button'; listen.dataset.labListen = '';
      listen.textContent = 'Listen instructions'; section.querySelector('.pl-goal').after(listen);
    }
    listen.disabled = false;
    listen.setAttribute('aria-pressed','false');
    const wrapper = document.createElement('div'); wrapper.className = 'pl-audio';
    wrapper.innerHTML = '<div class="pl-audio-transport" hidden><button type="button" data-audio-prev>Previous line</button><button type="button" data-audio-pause>Pause</button><button type="button" data-audio-next>Next line</button><button type="button" data-audio-stop>Stop audio</button></div><p class="pl-audio-caption" role="status" aria-live="polite"></p>';
    listen.after(wrapper);
    const wait = document.createElement('p'); wait.className = 'pl-audio-wait';
    wait.textContent = 'Try running first. Then optional starter-line explanations are available.';
    const details = document.createElement('details'); details.className = 'pl-hint pl-audio-lines'; details.hidden = true;
    details.innerHTML = '<summary>Explain starter lines (after trying)</summary><p>This explains the original starter. Your edited code stays in the editor above.</p><ol class="pl-starter-lines"></ol><p data-audio-error role="status"></p>';
    section.querySelector('[data-lab]').after(wait, details);
    const ui = { listen, wrapper, wait, details, attempted:false,
      transport:wrapper.querySelector('.pl-audio-transport'), caption:wrapper.querySelector('.pl-audio-caption'),
      pause:wrapper.querySelector('[data-audio-pause]'), previous:wrapper.querySelector('[data-audio-prev]'), next:wrapper.querySelector('[data-audio-next]') };
    controls.set(section,ui);
    listen.onclick = () => active?.section === section && active.kind === 'instructions' ? stop() : play(section,'instructions');
    wrapper.querySelector('[data-audio-stop]').onclick = stop;
    ui.pause.onclick = async () => {
      if (audio.paused) { try { await audio.play(); ui.pause.textContent = 'Pause'; } catch (_) { stop(); ui.caption.textContent = 'Audio could not resume. Try Listen again.'; } }
      else { audio.pause(); ui.pause.textContent = 'Resume'; }
    };
    ui.previous.onclick = () => { if (active?.kind === 'line' && active.index > 0) play(section,'line',active.index-1); };
    ui.next.onclick = () => { if (active?.kind === 'line' && active.index+1 < active.length) play(section,'line',active.index+1); };
    details.addEventListener('toggle', async () => {
      if (!details.open) { if (active?.section === section && active.kind === 'line') stop(); return; }
      if (details.dataset.loaded) return;
      try {
        const [, walkthroughs] = await load(), plan = walkthroughs[section.id];
        if (!plan) throw new Error('Starter explanations are unavailable.');
        const list = details.querySelector('ol'); list.replaceChildren();
        const lines = section.querySelector('.code').defaultValue.split('\n');
        plan.steps.forEach((step,index) => {
          const item = document.createElement('li'); item.dataset.starterLine = String(index);
          const code = document.createElement('pre'); code.textContent = lines.slice(step.lines[0]-1,step.lines[1]).join('\n');
          const text = document.createElement('p'); text.textContent = step.text;
          const button = document.createElement('button'); button.type = 'button'; button.textContent = `Listen to line ${step.lines[0]}`;
          button.onclick = () => play(section,'line',index);
          item.append(code,text,button); list.append(item);
        });
        details.dataset.loaded = 'true'; details.querySelector('[data-audio-error]').textContent = '';
      } catch (error) { details.querySelector('[data-audio-error]').textContent = error.message; }
    });
  }
  audio.addEventListener('timeupdate',displayCaption);
  audio.addEventListener('ended',() => {
    if (!active) return;
    controls.get(active.section).pause.textContent = 'Replay';
  });
  audio.addEventListener('error',() => { if (active) { const ui = controls.get(active.section); stop(); ui.caption.textContent = 'Audio could not load. Try Listen again.'; } });
  // Capture before run/pad handlers; a canceled pending fetch cannot start audio later.
  document.addEventListener('click',event => {
    if (event.target.closest('[data-run],[data-pad],[data-visualize],[data-reset],[data-import-confirm],.pw-launcher')) stop();
  },true);
  document.addEventListener('keydown',event => { if (event.target.matches('textarea.code') && (event.ctrlKey || event.metaKey) && event.key === 'Enter') stop(); },true);
  document.addEventListener('input',event => { if (event.target.matches('textarea.code')) stop(); },true);
  window.addEventListener('trial:slidechange',stop);
  window.addEventListener('trial:identitychange',stop);
  window.addEventListener('trial:python-result',unlock);
  window.addEventListener('pagehide',stop);
  window.addEventListener('python-workspace:change',() => {
    const snapshot = window.PythonWorkspace?.getSnapshot?.();
    if (!snapshot) return;
    if (snapshot.active || (identity && identity !== snapshot.identityKey)) stop();
    if (identity && identity !== snapshot.identityKey) {
      for (const ui of controls.values()) { ui.attempted = false; ui.details.open = false; ui.details.hidden = true; ui.wait.hidden = false; }
    }
    identity = snapshot.identityKey; unlock();
  });
  if (window.TrialLesson) window.TrialLesson.stopAudio = stop;
  window.TrialLabAudio = { stop, isPlaying:()=>!!active && !audio.paused, getAudio:()=>audio };
  unlock();
})();
