/* Execution snapshots are captured once; playback never reruns student code. */
(() => {
  'use strict';
  if (window.PythonCodeTrace) return;
  const script = document.currentScript;
  const workerURL = new URL('code-trace-worker.js', script.src);
  workerURL.search = new URL(script.src).search;
  const dialog = document.createElement('dialog');
  dialog.className = 'ct-dialog';
  dialog.setAttribute('aria-labelledby', 'ct-title');
  dialog.innerHTML = `
    <header class="ct-header"><div><p class="ct-eyebrow">PYTHON · STEP BY STEP</p><h2 id="ct-title">See your code run</h2></div><button type="button" data-ct-close>Return to slide</button></header>
    <div class="ct-toolbar"><button type="button" data-ct-first title="First step">⏮ First</button><button type="button" data-ct-prev>← Back</button><button type="button" data-ct-play>▶ Play</button><button type="button" data-ct-next>Next →</button><button type="button" data-ct-last title="Last step">Last ⏭</button><label class="ct-speed">Speed <select data-ct-speed><option value="1400">Slow</option><option value="800" selected>Normal</option><option value="350">Fast</option></select></label><button type="button" data-ct-stop hidden>Stop run</button><button type="button" data-ct-retry hidden>Try again</button><span data-ct-count></span><input type="range" data-ct-position min="0" max="0" value="0" aria-label="Execution step"></div>
    <p class="ct-status" data-ct-status role="status">Preparing your code…</p>
    <div class="ct-layout"><section class="ct-source"><h3>Your code <span>Snapshot of the slide editor</span></h3><div class="ct-code" data-ct-code tabindex="0" aria-label="Python source with execution line"></div><div class="ct-output"><h3>Printed output <span>At this step</span></h3><pre data-ct-output aria-label="Printed output"></pre></div></section><section class="ct-memory"><div class="ct-memory-head"><h3>Variables &amp; function calls</h3><span class="ct-change-key">● changed since previous step</span></div><div data-ct-frames></div><h3 class="ct-heap-heading">Objects <span>Matching arrows share the same object</span></h3><div class="ct-heap" data-ct-heap></div></section></div>
    <footer class="ct-footer">“Line is next” means the highlighted line has not run yet. Press Next to see its effect. Back replays recorded values.<br><span>Short programs work best. Library internals and charts are not animated; use Run for charts. Replace input() with a value.</span></footer>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const controls = ['first', 'prev', 'play', 'next', 'last', 'position'];
  let worker = null, timer = null, playTimer = null, opener = null, source = '', packages = [], steps = [], at = 0, serial = 0, closeCallback = null;
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  function pause() { clearTimeout(playTimer); playTimer = null; $('[data-ct-play]').textContent = '▶ Play'; }
  function stopWorker() { serial++; clearTimeout(timer); timer = null; if (worker) worker.terminate(); worker = null; $('[data-ct-stop]').hidden = true; }
  function close() { pause(); stopWorker(); if (dialog.open) dialog.close(); if (opener?.isConnected) opener.focus(); const callback = closeCallback; closeCallback = null; callback?.(); }
  function valueNode(value) {
    if (value?.kind === 'ref') {
      const button = el('button', 'ct-ref', '→ ' + value.id);
      button.type = 'button'; button.dataset.ctRef = value.id;
      button.setAttribute('aria-label', 'Inspect object ' + value.id);
      return button;
    }
    const node = el('code', 'ct-value', value?.text ?? '—');
    if (value?.type) node.title = value.type;
    return node;
  }
  function bindings(rows, previous = []) {
    const table = el('table', 'ct-bindings');
    const tbody = el('tbody'); table.append(tbody);
    for (const row of rows || []) {
      const tr = el('tr');
      const old = previous.find(item => item.name === row.name);
      if (at > 0 && JSON.stringify(row.value) !== JSON.stringify(old?.value)) tr.className = 'ct-changed';
      const name = el('th', '', row.name); name.scope = 'row';
      if (tr.classList.contains('ct-changed')) name.append(el('span', 'ct-changed-label', 'changed'));
      const value = el('td'); value.append(valueNode(row.value)); tr.append(name, value); tbody.append(tr);
    }
    if (!rows?.length) { const tr = el('tr'); const td = el('td', 'ct-empty', 'No variables yet'); td.colSpan = 2; tr.append(td); tbody.append(tr); }
    return table;
  }
  function frame(name, rows, previous, active) {
    const box = el('article', 'ct-frame' + (active ? ' ct-active-frame' : ''));
    box.append(el('h4', '', name), bindings(rows, previous));
    return box;
  }
  function drawMemory(step) {
    const previous = steps[at - 1];
    const frames = $('[data-ct-frames]'); frames.replaceChildren();
    frames.append(frame('Global variables', step.globals, previous?.globals, !step.frames?.length));
    for (const [i, item] of (step.frames || []).entries()) {
      const box = frame(item.name + ' · call ' + item.id + (i === step.frames.length - 1 ? ' · active' : ''), item.locals, previous?.frames?.find(f => f.id === item.id)?.locals, i === step.frames.length - 1);
      if (i === step.frames.length - 1 && (step.returnValue || step.yieldValue)) { const ret = el('div', 'ct-return', step.yieldValue ? 'Yields ' : 'Returns '); ret.append(valueNode(step.yieldValue || step.returnValue)); box.append(ret); }
      frames.append(box);
    }
    const heap = $('[data-ct-heap]'); heap.replaceChildren();
    for (const object of step.heap || []) {
      const old = previous?.heap?.find(item => item.id === object.id);
      const card = el('article', 'ct-object' + (at > 0 && JSON.stringify(old) !== JSON.stringify(object) ? ' ct-changed' : ''));
      card.id = 'ct-object-' + object.id; card.tabIndex = -1;
      const heading = el('h4', '', object.id + ' · ' + object.type);
      if (card.classList.contains('ct-changed')) heading.append(el('span', 'ct-changed-label', 'changed'));
      card.append(heading);
      if (object.items) {
        const cells = el('div', 'ct-cells');
        object.items.forEach((value, i) => { const cell = el('div', 'ct-cell'); cell.append(el('small', '', ['set', 'frozenset'].includes(object.type) ? 'item' : String(i)), valueNode(value)); cells.append(cell); });
        if (!object.items.length) cells.append(el('span', 'ct-empty', 'Empty ' + object.type));
        card.append(cells);
      }
      if (object.entries) {
        const pairs = el('div', 'ct-pairs');
        for (const [key, value] of object.entries) { const pair = el('div', 'ct-pair'); pair.append(valueNode(key), el('span', '', ':'), valueNode(value)); pairs.append(pair); }
        if (!object.entries.length) pairs.append(el('span', 'ct-empty', 'Empty dictionary'));
        card.append(pairs);
      }
      if (object.attributes) card.append(bindings(object.attributes, old?.attributes));
      if (object.truncated) card.append(el('p', 'ct-empty', 'Preview shortened'));
      heap.append(card);
    }
    if (!step.heap?.length) heap.append(el('p', 'ct-empty', 'Lists, dictionaries and other objects appear here as they are created.'));
  }
  function describe(step) {
    const line = step.line ? 'Line ' + step.line : 'Program';
    switch (step.event) {
      case 'line': return line + ' is next. Variables show the state before this line runs.';
      case 'call': return line + ' · Entering ' + (step.frames?.at(-1)?.name || 'your program') + '.';
      case 'return': return line + ' · Returning from ' + (step.frames?.at(-1)?.name || 'your program') + '.';
      case 'unwind': return line + ' · Leaving this call because of an exception. ' + (step.message || '');
      case 'yield': return line + ' · Yielding a value; this generator can resume later.';
      case 'resume': return line + ' · Resuming ' + (step.frames?.at(-1)?.name || 'this generator') + '.';
      case 'done': return 'Program finished. These are the final values and output.';
      case 'exception': return line + ' · Exception raised (your code may catch it). ' + (step.message || '');
      default: return step.message || 'Execution stopped.';
    }
  }
  function render() {
    const step = steps[at];
    controls.forEach(name => $('[data-ct-' + name + ']').disabled = !step);
    if (!step) return;
    for (const name of ['first', 'prev']) $('[data-ct-' + name + ']').disabled = at === 0;
    for (const name of ['last', 'next']) $('[data-ct-' + name + ']').disabled = at === steps.length - 1;
    $('[data-ct-play]').disabled = steps.length < 2;
    $('[data-ct-count]').textContent = 'Step ' + (at + 1) + ' / ' + steps.length;
    $('[data-ct-position]').max = steps.length - 1; $('[data-ct-position]').value = at;
    $('[data-ct-status]').textContent = describe(step) + (step.truncated ? ' Some large values or deep calls are omitted from this preview.' : '');
    $('[data-ct-status]').classList.toggle('ct-error', ['error', 'limit', 'exception', 'unwind'].includes(step.event));
    const highlight = ['done'].includes(step.event) ? null : step.line;
    dialog.querySelectorAll('.ct-code-line').forEach((row, i) => {
      const active = i + 1 === highlight;
      row.classList.toggle('ct-line-current', active);
      if (active) row.setAttribute('aria-current', 'step'); else row.removeAttribute('aria-current');
    });
    const row = $('.ct-line-current'), code = $('[data-ct-code]');
    if (row && (row.offsetTop < code.scrollTop || row.offsetTop + row.offsetHeight > code.scrollTop + code.clientHeight)) code.scrollTop = Math.max(0, row.offsetTop - code.clientHeight / 3);
    $('[data-ct-output]').textContent = step.stdout || (step.event === 'done' ? '(no printed output)' : '(nothing printed yet)');
    drawMemory(step);
  }
  function move(next) { pause(); at = Math.max(0, Math.min(steps.length - 1, next)); render(); }
  function play() {
    if (playTimer) { pause(); return; }
    if (at >= steps.length - 1) at = 0;
    $('[data-ct-play]').textContent = 'Ⅱ Pause'; render();
    const tick = () => { at++; render(); if (at >= steps.length - 1) pause(); else playTimer = setTimeout(tick, Number($('[data-ct-speed]').value)); };
    playTimer = setTimeout(tick, Number($('[data-ct-speed]').value));
  }
  function fail(text) {
    stopWorker(); $('[data-ct-status]').textContent = text; $('[data-ct-status]').classList.add('ct-error'); $('[data-ct-retry]').hidden = false;
  }
  function trace() {
    pause(); stopWorker(); steps = []; at = 0; render();
    $('[data-ct-retry]').hidden = true; $('[data-ct-stop]').hidden = false;
    $('[data-ct-status]').textContent = 'Loading Python and recording your code…'; $('[data-ct-status]').classList.remove('ct-error');
    const token = serial;
    try {
      worker = new Worker(workerURL);
      timer = setTimeout(() => fail('Run stopped after the time limit. Try a shorter program, or try again if Python was still loading.'), packages.length ? 120000 : 45000);
      worker.onmessage = ({ data }) => {
        if (token !== serial || !dialog.open) return;
        if (data.type === 'status') $('[data-ct-status]').textContent = data.text;
        else if (data.type === 'result') {
          stopWorker(); steps = data.result.steps || [];
          if (!steps.length) { fail(data.result.error?.message || 'No execution steps were recorded.'); return; }
          render();
          if (data.result.status !== 'complete') {
            // Keep the partial trace, and make its stopping reason visible immediately.
            const notice = data.result.error?.message || steps.at(-1).message || 'Execution stopped early.';
            $('[data-ct-status]').textContent = notice + ' Use Next to inspect the recorded steps.';
            $('[data-ct-status]').classList.add('ct-error');
          }
        } else if (data.type === 'error') fail(data.error || 'Python could not start. Try again.');
      };
      worker.onerror = event => { event.preventDefault(); if (token === serial) fail('Python could not start. Check your connection and try again.'); };
      worker.postMessage({ type: 'trace', code: source, packages });
    } catch (error) { fail('Python could not start. ' + error.message); }
  }
  function open(button) {
    // Ending an audio walkthrough restores any saved student edits first.
    if (typeof stopAudio === 'function') stopAudio();
    window.TrialLesson?.stopAudio();
    if (document.querySelector('[data-cancel]:not([hidden]), #preparePython:disabled')) window.TrialLesson?.terminatePython('Run stopped to visualize code.');
    const lab = button.closest('.lab, .tl-lab');
    openCode({code: lab.querySelector('textarea.code').value, packages: (lab.dataset.packages || '').split(',').map(s => s.trim()).filter(Boolean), opener: button});
  }
  function openCode(options = {}) {
    if (dialog.open) close();
    source = String(options.code || '').slice(0, 20000);
    packages = Array.isArray(options.packages) ? options.packages : [];
    opener = options.opener || document.activeElement;
    closeCallback = typeof options.onClose === 'function' ? options.onClose : null;
    const code = $('[data-ct-code]'); code.replaceChildren();
    source.split('\n').forEach((line, i) => { const row = el('div', 'ct-code-line'); row.append(el('span', 'ct-line-number', String(i + 1)), el('code', '', line || ' ')); code.append(row); });
    $('[data-ct-frames]').replaceChildren(); $('[data-ct-heap]').replaceChildren(); $('[data-ct-output]').textContent = ''; $('[data-ct-count]').textContent = '';
    $('[data-ct-position]').value = 0; $('[data-ct-position]').max = 0;
    dialog.showModal(); $('[data-ct-close]').focus(); trace();
  }
  window.PythonCodeTrace = {openCode, close, getSnapshot: () => dialog.open ? {code: source, output: steps[at]?.stdout || '', status: worker ? 'running' : steps.at(-1)?.event === 'error' ? 'error' : 'idle', step: at + 1, line: steps[at]?.line || null} : null};
  for (const lab of document.querySelectorAll('.lab, .tl-lab')) {
    const bar = lab.querySelector('.lab-bar, .tl-lab-actions');
    if (!bar || !lab.querySelector('textarea.code')) continue;
    const button = el('button', 'ct-open', '▸ Visualize'); button.type = 'button';
    button.title = 'Step through this code and inspect variables, objects and function calls';
    bar.querySelector('.run, [data-run]')?.after(button);
    button.addEventListener('click', () => open(button));
  }
  $('[data-ct-close]').onclick = close;
  $('[data-ct-stop]').onclick = () => fail('Run stopped. Return to the slide to edit your code, or try again.');
  $('[data-ct-retry]').onclick = trace;
  $('[data-ct-first]').onclick = () => move(0);
  $('[data-ct-prev]').onclick = () => move(at - 1);
  $('[data-ct-next]').onclick = () => move(at + 1);
  $('[data-ct-last]').onclick = () => move(steps.length - 1);
  $('[data-ct-play]').onclick = play;
  $('[data-ct-position]').oninput = event => move(Number(event.target.value));
  dialog.addEventListener('click', event => {
    const ref = event.target.closest('[data-ct-ref]');
    if (ref) { const target = document.getElementById('ct-object-' + ref.dataset.ctRef); if (target) { target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); target.focus({ preventScroll: true }); } }
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => { pause(); stopWorker(); });
  dialog.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.target.matches('input, select')) return;
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) && steps.length) {
      event.preventDefault(); move(event.key === 'Home' ? 0 : event.key === 'End' ? steps.length - 1 : at + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  if (window.Reveal) Reveal.on('slidechanged', () => { if (dialog.open) close(); });
  window.addEventListener('trial:slidechange', () => { if (dialog.open) close(); });
  window.addEventListener('pagehide', close);
})();
