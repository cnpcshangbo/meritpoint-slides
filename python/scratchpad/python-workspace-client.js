/* A roaming, on-device Python notebook. No snippet is sent until Ask AI or
 * a separately consented classroom integration handles its local events. */
(() => {
  'use strict';
  if (window.PythonWorkspace) return;
  const script = document.currentScript;
  const workerURL = new URL('python-workspace-worker.js', script.src);
  workerURL.search = new URL(script.src).search;
  const MAX_CODE = 20000, MAX_SNIPPETS = 30, PREFIX = 'mpa-python-workspace:v1:';
  const launcher = document.createElement('button');
  launcher.className = 'pw-launcher'; launcher.type = 'button'; launcher.textContent = '⌘ Python pad · 练习';
  launcher.setAttribute('aria-expanded', 'false'); launcher.setAttribute('aria-controls', 'python-workspace');
  const panel = document.createElement('aside');
  panel.id = 'python-workspace'; panel.className = 'pw-panel'; panel.hidden = true;
  panel.setAttribute('role', 'region'); panel.setAttribute('aria-labelledby', 'pw-title');
  panel.innerHTML = `<header class="pw-header" data-pw-drag tabindex="0" aria-label="Python pad. Drag to move; Alt and arrow keys move the panel."><div><h2 id="pw-title">Python pad · 练习</h2><p data-pw-save-status>Checking your saved snippets…</p></div><div class="pw-header-actions"><button type="button" data-pw-expand aria-pressed="false" title="Expand or restore">Expand</button><button type="button" data-pw-close aria-label="Close Python pad">Close</button></div></header>
  <div class="pw-library"><label class="pw-hidden-label" for="pw-snippets">Saved snippets</label><select id="pw-snippets" data-pw-snippets aria-label="Load a saved snippet"></select><button type="button" data-pw-new>New · 新建</button><button type="button" data-pw-save>Save · 保存</button><button type="button" data-pw-duplicate>Duplicate</button></div>
  <div class="pw-name-row"><label class="pw-hidden-label" for="pw-name">Snippet name</label><input id="pw-name" data-pw-name maxlength="80" value="Untitled" readonly><button type="button" data-pw-rename>Rename</button><button type="button" data-pw-delete>Delete</button><button type="button" data-pw-undo hidden>Undo delete</button></div>
  <div class="pw-tools"><button type="button" data-pw-copy-slide>Copy slide code</button><button type="button" data-pw-use-slide>Use in slide</button><button type="button" data-pw-import>Import · 导入</button><button type="button" data-pw-export>Export .py</button><button type="button" data-pw-export-all>Back up snippets</button><input type="file" class="pw-file" data-pw-file accept=".py,.json,text/x-python,application/json,text/plain"></div>
  <div class="pw-runbar"><button type="button" data-pw-run>▶ Run · 运行</button><button type="button" data-pw-stop hidden>Stop</button><button type="button" data-pw-visualize>▸ Visualize · 可视化</button><label class="pw-libraries">Libraries <select data-pw-packages><option value="">Auto</option><option value="numpy">NumPy</option><option value="matplotlib">Matplotlib</option></select></label></div>
  <div class="pw-editor-wrap"><pre class="pw-gutter" data-pw-gutter aria-hidden="true">1</pre><label class="pw-hidden-label" for="pw-editor">Python scratchpad code</label><textarea id="pw-editor" class="pw-editor" data-pw-editor spellcheck="false" wrap="off" autocapitalize="off" autocomplete="off" maxlength="20000" placeholder="Write some Python, or copy code from this slide."></textarea></div>
  <div class="pw-results"><div class="pw-result-heading"><b>Output</b><span data-pw-output-state>Run your code to see the result.</span></div><pre class="pw-output" data-pw-output aria-live="polite"></pre><div class="pw-plots" data-pw-plots></div></div><p class="pw-status" data-pw-status role="status"></p>
  <details class="pw-ai"><summary>Ask the course AI about this snippet</summary><div class="pw-ai-fields"><label class="pw-hidden-label" for="pw-question">Question for the course AI</label><input id="pw-question" data-pw-question maxlength="600" placeholder="Ask for a hint or explain your error…"><label class="pw-hidden-label" for="pw-tutor">Tutor</label><select id="pw-tutor" data-pw-tutor><option value="mira">Mira</option><option value="bob">Bob</option></select><label class="pw-hidden-label" for="pw-model">AI model</label><select id="pw-model" data-pw-model><option value="haiku">Fast</option><option value="sonnet">Balanced</option><option value="opus">Deep</option></select><button type="button" data-pw-ask>Ask · 提问</button></div><pre class="pw-ai-response" data-pw-ai-response></pre><small>Ask sends this snippet, your question and its error to the course AI. Check any suggestion by running it. 仅提问或课堂授权会发送代码。</small></details>
  <div class="pw-classroom-slot" data-pw-classroom-slot></div><footer class="pw-footer"><span>Stays with you as you change slides. Ctrl/⌘ + Enter runs. Python, NumPy and Matplotlib.</span><div><button type="button" data-pw-prev-slide aria-label="Previous course slide">← Slide</button><button type="button" data-pw-next-slide aria-label="Next course slide">Slide →</button></div></footer>`;
  document.body.append(launcher, panel);
  const $ = selector => panel.querySelector(selector);
  const editor = $('[data-pw-editor]');
  const now = () => new Date().toISOString();
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  let library = { version: 1, snippets: [], activeId: '', trash: null, deleted: {} }, identityKey = '', storageKey = '', storageAvailable = false;
  let identityReady = false, identityTask = null, identityCheckedAt = 0, saveTimer = null, changeTimer = null;
  let lastSaveFailure = '';
  let worker = null, workerTimer = null, runToken = 0, runTask = null, status = 'idle', aiTask = null;
  let dockHome = null;
  const dockObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => positionLauncher()) : null;
  let observedDock = null;
  const figures = new Map();
  const current = () => library.snippets.find(item => item.id === library.activeId);
  function context() {
    const parts = location.pathname.split('/').filter(Boolean), at = parts.indexOf('python');
    const slide = window.Reveal?.getCurrentSlide?.() || document.querySelector('section.is-current[data-sid]');
    return { deck: at >= 0 ? 'python/' + (parts[at + 1] || '') : location.pathname, slide: slide?.dataset.sid || slide?.id || '' };
  }
  function inferredPackages(code = current()?.code || '') {
    const packages = new Set(current()?.packages || []);
    for (const line of code.split('\n')) {
      const match = line.match(/^\s*(?:from\s+([\w.]+)\s+import|import\s+(.+))/);
      if (!match) continue;
      for (const item of (match[1] || match[2]).split(',')) {
        const name = item.trim().split(/[.\s]/)[0];
        if (['numpy', 'matplotlib'].includes(name)) packages.add(name);
      }
    }
    return [...packages];
  }
  function getSnapshot() {
    const item = current();
    return { active: !panel.hidden, code: item?.code || '', output: item?.output || '', error: item?.error || '', status,
      snippetId: item?.id || '', name: item?.name || '', packages: inferredPackages(), updatedAt: item?.updatedAt || '',
      outputMatchesCode: !!item?.hasRun && item.runCode === item.code, runCode: item?.runCode || '', identityKey,
      source: context(), origin: item?.origin || null };
  }
  function notify(immediate = false, type = 'python-workspace:change') {
    clearTimeout(changeTimer);
    const emit = () => window.dispatchEvent(new CustomEvent(type, { detail: getSnapshot() }));
    if (immediate) emit(); else changeTimer = setTimeout(emit, 180);
  }
  function message(text, error = false) { $('[data-pw-status]').textContent = text; $('[data-pw-status]').classList.toggle('is-error', error); }
  function cleanSnippet(item) {
    if (!item || typeof item.code !== 'string' || item.code.length > MAX_CODE) return null;
    return { id: typeof item.id === 'string' && item.id.length < 120 ? item.id : uuid(), name: String(item.name || 'Untitled').slice(0, 80), code: item.code,
      packages: Array.isArray(item.packages) ? item.packages.filter(name => ['numpy', 'matplotlib'].includes(name)) : [],
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : now(), output: String(item.output || '').slice(0, 20000), error: String(item.error || '').slice(-12000),
      runCode: String(item.runCode || '').slice(0, MAX_CODE), hasRun: !!item.hasRun || !!item.runCode, origin: item.origin && typeof item.origin === 'object' ? { deck: String(item.origin.deck || '').slice(0, 120), slide: String(item.origin.slide || '').slice(0, 120) } : null };
  }
  function createSnippet(code = '', name = '', packages = [], origin = null) {
    return cleanSnippet({ id: uuid(), code, name: name || 'Untitled ' + (library.snippets.length + 1), packages, updatedAt: now(), origin });
  }
  function save() {
    clearTimeout(saveTimer);
    lastSaveFailure = '';
    if (!identityReady || !storageKey || !storageAvailable) return false;
    try {
      // Preserve independently edited snippets in other course tabs.
      const existing = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (existing?.version === 1 && Array.isArray(existing.snippets)) {
        const deleted = { ...(existing.deleted || {}), ...library.deleted };
        const merged = new Map();
        for (const item of [...existing.snippets, ...library.snippets]) {
          const clean = cleanSnippet(item); if (!clean || (deleted[clean.id] && deleted[clean.id] >= clean.updatedAt)) continue;
          const prior = merged.get(clean.id);
          if (!prior || clean.updatedAt >= prior.updatedAt) merged.set(clean.id, clean);
        }
        if (merged.size > MAX_SNIPPETS) {
          lastSaveFailure = 'Another tab filled the 30-snippet library. Export this draft, then delete an unneeded snippet before saving.';
          $('[data-pw-save-status]').textContent = 'Library full · export this draft';
          return false;
        }
        library.snippets = [...merged.values()]; library.deleted = deleted;
      }
      localStorage.setItem(storageKey, JSON.stringify(library));
      $('[data-pw-save-status]').textContent = 'Saved on this device · 保存在本设备' + (identityKey === 'anonymous' ? ' · guest snippets' : '');
      return true;
    } catch (_) { lastSaveFailure = 'Device storage is unavailable. Export your snippet to keep it.'; $('[data-pw-save-status]').textContent = 'Device storage unavailable · export your work'; return false; }
  }
  function scheduleSave() {
    $('[data-pw-save-status]').textContent = storageAvailable ? 'Saving on this device…' : 'Session only · export to keep your work';
    clearTimeout(saveTimer); saveTimer = setTimeout(save, 250);
  }
  function syncGutter() {
    $('[data-pw-gutter]').textContent = Array.from({ length: editor.value.split('\n').length }, (_, i) => i + 1).join('\n');
    $('[data-pw-gutter]').scrollTop = editor.scrollTop;
  }
  function renderLibrary() {
    const select = $('[data-pw-snippets]'); select.replaceChildren();
    for (const item of library.snippets) { const option = document.createElement('option'); option.value = item.id; option.textContent = item.name; select.append(option); }
    select.value = library.activeId; $('[data-pw-undo]').hidden = !library.trash;
  }
  function renderOutput() {
    const item = current(), out = $('[data-pw-output]');
    out.textContent = [item?.output, item?.error].filter(Boolean).join('\n'); out.classList.toggle('is-error', !!item?.error);
    $('[data-pw-output-state]').textContent = item?.hasRun ? (item.runCode === item.code ? 'For the code shown above' : 'From an earlier version · run again') : 'Run your code to see the result.';
    const plots = $('[data-pw-plots]'); plots.replaceChildren();
    for (const data of figures.get(item?.id) || []) { const img = document.createElement('img'); img.src = 'data:image/png;base64,' + data; img.alt = 'Chart generated by this Python snippet'; plots.append(img); }
  }
  function renderCurrent() {
    const item = current(); if (!item) return;
    editor.value = item.code; $('[data-pw-name]').value = item.name; $('[data-pw-name]').readOnly = true;
    $('[data-pw-packages]').value = item.packages.includes('matplotlib') ? 'matplotlib' : item.packages.includes('numpy') ? 'numpy' : '';
    syncGutter(); renderLibrary(); renderOutput(); updateSlideButtons();
  }
  function cancelRun(text = 'Run stopped.') {
    runToken++; clearTimeout(workerTimer); if (worker) worker.terminate(); worker = null;
    const wasRunning = !!runTask; runTask = null; $('[data-pw-run]').disabled = !identityReady; $('[data-pw-stop]').hidden = true;
    if (wasRunning) { status = 'stopped'; message(text); notify(true, 'python-workspace:run-result'); }
  }
  function cancelAI(text = '') { const task = aiTask; aiTask = null; task?.abort(); $('[data-pw-ask]').disabled = false; $('[data-pw-ai-response]').textContent = text; }
  function switchSnippet(id) {
    save(); cancelRun(); library.activeId = id; const item = current();
    status = item?.hasRun && item?.runCode === item?.code ? (item?.error ? 'error' : 'success') : item?.hasRun ? 'editing' : 'idle';
    cancelAI(); renderCurrent(); save(); message('Loaded ' + (item?.name || 'snippet') + '.'); notify(true);
  }
  function addSnippet(info = {}) {
    if (!identityReady) return false;
    save();
    if (library.snippets.length >= MAX_SNIPPETS) { message('Your library has 30 snippets. Back up or delete one before adding another.', true); return false; }
    if (String(info.code || '').length > MAX_CODE) { message('Keep a Python snippet under 20,000 characters.', true); return false; }
    const item = createSnippet(String(info.code || ''), info.name, info.packages, info.origin);
    library.snippets.push(item); switchSnippet(item.id); return item.id;
  }
  async function resolveIdentity(force = false) {
    if (identityTask) return identityTask;
    if (!force && Date.now() - identityCheckedAt < 5000) return;
    identityTask = (async () => {
      let key, available = true;
      const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 6000);
      try {
        const response = await fetch('/api/whoami', { credentials: 'same-origin', cache: 'no-store', signal: abort.signal });
        if (response.status === 404) key = 'anonymous'; // Static course mirrors have no sign-in service.
        else {
          if (!response.ok) throw new Error('Identity unavailable');
          const result = await response.json();
          if (!Object.prototype.hasOwnProperty.call(result, 'user')) throw new Error('Identity unavailable');
          const email = result.user?.email;
          if (email) {
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(email).trim().toLowerCase()));
            key = 'user:' + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
          } else key = 'anonymous';
        }
      } catch (_) { key = identityKey && !identityKey.startsWith('user:') ? identityKey : 'session:' + uuid(); available = false; }
      finally { clearTimeout(timer); }
      identityCheckedAt = Date.now();
      if (key !== identityKey) {
        if (identityReady) save(); cancelRun(); cancelAI(); $('[data-pw-question]').value = '';
        identityKey = key; storageKey = PREFIX + key; storageAvailable = available;
        library = { version: 1, snippets: [], activeId: '', trash: null, deleted: {} }; figures.clear();
        if (available) try {
          const raw = localStorage.getItem(storageKey);
          if (raw && raw.length <= 2500000) {
            const stored = JSON.parse(raw);
            if (stored.version === 1 && Array.isArray(stored.snippets)) {
              library.snippets = stored.snippets.slice(0, MAX_SNIPPETS).map(cleanSnippet).filter(Boolean);
              library.activeId = typeof stored.activeId === 'string' ? stored.activeId : '';
              library.trash = stored.trash ? cleanSnippet(stored.trash) : null;
              library.deleted = stored.deleted && typeof stored.deleted === 'object' ? stored.deleted : {};
            }
          }
        } catch (_) { storageAvailable = false; }
        if (!library.snippets.length) library.snippets.push(createSnippet());
        if (!current()) library.activeId = library.snippets[0].id;
        identityReady = true; status = current().hasRun ? (current().runCode === current().code ? (current().error ? 'error' : 'success') : 'editing') : 'idle';
        renderCurrent(); $('[data-pw-ai-response]').textContent = ''; notify(true);
      }
      identityReady = true; editor.disabled = false; $('[data-pw-run]').disabled = false;
      if (storageAvailable) save(); else $('[data-pw-save-status]').textContent = 'Session only · export to keep your work';
    })().finally(() => { identityTask = null; });
    return identityTask;
  }
  function pauseAudio() { if (typeof stopAudio === 'function') stopAudio(); window.TrialLesson?.stopAudio(); }
  function positionLauncher() {
    const dock = document.getElementById('liveClassDock');
    if (dock && dock !== observedDock) { dockObserver?.disconnect(); dockObserver?.observe(dock); observedDock = dock; }
    if (!panel.hidden || innerWidth > 720 || !dock || dock.closest('.pw-panel')) { launcher.style.bottom = ''; return; }
    const rect = dock.getBoundingClientRect();
    launcher.style.bottom = Math.max(68, innerHeight - rect.top + 8) + 'px';
  }
  function placeClassroomDock() {
    const dock = document.getElementById('liveClassDock'), slot = $('[data-pw-classroom-slot]');
    if (!dock) return;
    if (!panel.hidden && dock.parentNode !== slot) {
      dockHome = document.createComment('Live classroom dock position');
      dock.before(dockHome); slot.append(dock);
    } else if (panel.hidden && dock.parentNode === slot) {
      if (dockHome?.isConnected) dockHome.replaceWith(dock); else document.body.append(dock);
      dockHome = null;
    }
    positionLauncher();
  }
  async function open() {
    panel.hidden = false; launcher.setAttribute('aria-expanded', 'true'); placeClassroomDock(); updateSlideButtons(); notify(true);
    await resolveIdentity(); if (!panel.hidden) editor.focus({ preventScroll: true });
  }
  function close() { save(); panel.hidden = true; launcher.setAttribute('aria-expanded', 'false'); placeClassroomDock(); launcher.focus(); notify(true); }
  async function run() {
    await resolveIdentity(); if (!current() || runTask) return;
    pauseAudio(); save();
    const item = current(), code = item.code, id = item.id, token = ++runToken;
    status = 'loading'; runTask = { id, code, token }; $('[data-pw-run]').disabled = true; $('[data-pw-stop]').hidden = false;
    item.output = ''; item.error = ''; item.runCode = code; item.hasRun = true; figures.delete(id); renderOutput(); message('Loading Python…'); notify(true);
    const finish = (result, packages) => {
      if (token !== runToken || !runTask) return;
      clearTimeout(workerTimer); worker?.terminate(); worker = null; runTask = null;
      const target = library.snippets.find(entry => entry.id === id);
      if (target) { target.output = String(result.output || '').slice(0, 20000); target.error = String(result.error || '').slice(-12000); target.runCode = code; target.updatedAt = now(); figures.set(id, result.figures || []); }
      status = current()?.code !== code ? 'editing' : result.ok ? 'success' : 'error';
      $('[data-pw-run]').disabled = false; $('[data-pw-stop]').hidden = true;
      renderOutput(); save(); message(result.ok ? 'Finished. Check the result against your prediction.' : 'Read the error, edit your code, and run again.', !result.ok);
      notify(true, 'python-workspace:run-result'); notify();
    };
    try {
      worker = new Worker(workerURL);
      workerTimer = setTimeout(() => { finish({ ok: false, error: 'Python loading timed out. Check your connection and try again.' }); }, 90000);
      worker.onmessage = ({ data }) => {
        if (token !== runToken) return;
        if (data.type === 'status') {
          status = data.status; message(data.message); notify();
          if (data.status === 'running') { clearTimeout(workerTimer); workerTimer = setTimeout(() => finish({ ok: false, error: 'Run stopped after 25 seconds. Check the loop or try a smaller example.' }), 25000); }
        } else if (data.type === 'result') finish(data.result, data.packages);
      };
      worker.onerror = event => { event.preventDefault(); finish({ ok: false, error: 'Python could not start. Check your connection and try again.' }); };
      worker.postMessage({ type: 'run', code, packages: inferredPackages(code) });
    } catch (error) { finish({ ok: false, error: String(error.message || error) }); }
  }
  function slideEditor() {
    const section = window.Reveal?.getCurrentSlide?.() || document.querySelector('section.is-current[data-sid]');
    return section?.querySelector('.lab textarea.code, .tl-lab textarea.code') || null;
  }
  function updateSlideButtons() {
    const hasEditor = !!slideEditor(); $('[data-pw-copy-slide]').disabled = !hasEditor; $('[data-pw-use-slide]').disabled = !hasEditor;
    const canNavigate = !!window.Reveal || !!window.TrialLesson;
    $('[data-pw-prev-slide]').disabled = !canNavigate; $('[data-pw-next-slide]').disabled = !canNavigate;
  }
  function navigate(direction) {
    if (window.Reveal) direction > 0 ? Reveal.next() : Reveal.prev();
    else if (window.TrialLesson) { const sections = [...document.querySelectorAll('section[data-sid]')]; TrialLesson.navigate(sections.findIndex(section => section.id === TrialLesson.getCurrent()) + direction); }
  }
  function download(name, data, type) {
    const url = URL.createObjectURL(new Blob([data], { type })), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  const safeName = name => String(name || 'snippet').replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 80) || 'snippet';
  async function ask() {
    const item = current(), question = $('[data-pw-question]').value.trim().slice(0, 600); if (!item || !question || aiTask) return;
    if (item.code.length > 8000) { $('[data-pw-ai-response]').textContent = 'The course AI accepts snippets up to 8,000 characters. Duplicate this snippet and shorten the copy before asking. 请复制并缩短代码后再提问。'; return; }
    save(); const abort = new AbortController(), id = item.id; aiTask = abort; $('[data-pw-ask]').disabled = true;
    $('[data-pw-ai-response]').textContent = 'Thinking…'; const timeout = setTimeout(() => abort.abort(), 90000);
    try {
      const response = await fetch('/api/assistant', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
        body: JSON.stringify({ action: 'ask', code: item.code, question, error: item.hasRun && item.runCode === item.code ? item.error.slice(-2000) : '', model: $('[data-pw-model]').value, tutor: $('[data-pw-tutor]').value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.text || result.error || 'The course AI is unavailable. Try again shortly.');
      if (current()?.id === id && aiTask === abort) $('[data-pw-ai-response]').textContent = String(result.text || 'No answer was returned. Try asking a more specific question.').slice(0, 30000);
    } catch (error) { if (current()?.id === id && aiTask === abort) $('[data-pw-ai-response]').textContent = error.name === 'AbortError' ? 'The request stopped. Try again when you are ready.' : String(error.message || error); }
    finally { clearTimeout(timeout); if (aiTask === abort) { aiTask = null; $('[data-pw-ask]').disabled = false; } }
  }
  launcher.onclick = () => panel.hidden ? open() : close(); $('[data-pw-close]').onclick = close;
  $('[data-pw-new]').onclick = () => addSnippet(); $('[data-pw-snippets]').onchange = event => switchSnippet(event.target.value);
  $('[data-pw-save]').onclick = () => { if (current()) { current().name = $('[data-pw-name]').value.trim() || 'Untitled'; current().updatedAt = now(); $('[data-pw-name]').readOnly = true; renderLibrary(); const saved = save(); message(saved ? 'Saved ' + current().name + ' on this device.' : lastSaveFailure || 'Device storage is unavailable. Export your snippet to keep it.', !saved); notify(true); } };
  $('[data-pw-rename]').onclick = () => { $('[data-pw-name]').readOnly = false; $('[data-pw-name]').focus(); $('[data-pw-name]').select(); };
  $('[data-pw-name]').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); $('[data-pw-save]').click(); } });
  $('[data-pw-duplicate]').onclick = () => { const item = current(); if (item) addSnippet({ code: item.code, name: item.name + ' copy', packages: item.packages, origin: item.origin }); };
  $('[data-pw-delete]').onclick = () => { const item = current(); if (!item) return; cancelRun(); library.trash = { ...item }; library.deleted[item.id] = now(); library.snippets = library.snippets.filter(entry => entry.id !== item.id); if (!library.snippets.length) library.snippets.push(createSnippet()); switchSnippet(library.snippets[0].id); message('Deleted ' + item.name + '. Undo delete restores it.'); };
  $('[data-pw-undo]').onclick = () => { if (!library.trash || library.snippets.length >= MAX_SNIPPETS) return; const item = library.trash; item.updatedAt = now(); library.trash = null; library.snippets.push(item); switchSnippet(item.id); message('Snippet restored.'); };
  editor.addEventListener('input', () => { const item = current(); if (!item) return; if (aiTask || $('[data-pw-ai-response]').textContent) cancelAI('Code changed. Ask again about this version.'); item.code = editor.value.slice(0, MAX_CODE); if (editor.value !== item.code) { editor.value = item.code; message('Keep a Python snippet under 20,000 characters.', true); } item.updatedAt = now(); if (!runTask) status = 'editing'; syncGutter(); renderOutput(); scheduleSave(); notify(); });
  editor.addEventListener('scroll', syncGutter);
  editor.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); run(); }
    else if (event.key === 'Tab') { event.preventDefault(); const start = editor.selectionStart, end = editor.selectionEnd; editor.setRangeText('    ', start, end, 'end'); editor.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  $('[data-pw-packages]').onchange = event => { if (current()) { current().packages = event.target.value ? [event.target.value] : []; current().updatedAt = now(); scheduleSave(); notify(); } };
  $('[data-pw-run]').onclick = run; $('[data-pw-stop]').onclick = () => cancelRun();
  $('[data-pw-visualize]').onclick = async () => {
    await resolveIdentity(); save(); pauseAudio();
    if (!window.PythonCodeTrace?.openCode) { message('The visualizer is still loading. Try again in a moment.', true); return; }
    window.PythonCodeTrace.openCode({ code: current().code, packages: inferredPackages(), title: current().name, onClose: () => { if (!panel.hidden) editor.focus({ preventScroll: true }); } });
  };
  $('[data-pw-copy-slide]').onclick = () => { pauseAudio(); const target = slideEditor(); if (target) addSnippet({ code: target.value, name: 'Slide · ' + (context().slide || 'code'), origin: context() }); };
  $('[data-pw-use-slide]').onclick = () => {
    pauseAudio(); const target = slideEditor(), item = current(); if (!target || !item) return;
    save();
    if (target.value !== target.defaultValue && target.value !== item.code) {
      if (library.snippets.length >= MAX_SNIPPETS) { message('Back up or delete a snippet first so the existing slide edits can be saved.', true); return; }
      library.snippets.push(createSnippet(target.value, 'Slide backup · ' + context().slide, [], context())); renderLibrary(); save();
    }
    target.value = item.code; target.dispatchEvent(new Event('input', { bubbles: true })); message('Copied into this slide. Your saved snippet stays in the pad.');
  };
  $('[data-pw-import]').onclick = () => $('[data-pw-file]').click();
  $('[data-pw-file]').onchange = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      if (file.size > 2500000) throw new Error('Choose a Python file under 20,000 characters or a snippet backup under 2.5 MB.');
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.json')) {
        const data = JSON.parse(text), incoming = (Array.isArray(data.snippets) ? data.snippets : [data]).map(cleanSnippet).filter(Boolean);
        if (!incoming.length) throw new Error('This file contains no Python snippets.');
        save(); if (library.snippets.length + incoming.length > MAX_SNIPPETS) throw new Error('Import would exceed 30 snippets. Back up or delete a few first.');
        for (const item of incoming) library.snippets.push({ ...item, id: uuid(), updatedAt: now() });
        switchSnippet(library.snippets.at(-1).id); message('Imported ' + incoming.length + ' snippets.');
      } else { if (text.length > MAX_CODE) throw new Error('Keep a Python snippet under 20,000 characters.'); addSnippet({ code: text, name: file.name.replace(/\.py$/i, '') }); }
    } catch (error) { message(String(error.message || error), true); }
  };
  $('[data-pw-export]').onclick = () => { const item = current(); if (item) download(safeName(item.name) + '.py', item.code, 'text/x-python'); };
  $('[data-pw-export-all]').onclick = () => { save(); download('python-snippets.json', JSON.stringify({ version: 1, snippets: library.snippets }, null, 2), 'application/json'); };
  $('[data-pw-ask]').onclick = ask; $('[data-pw-question]').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); ask(); } };
  $('[data-pw-prev-slide]').onclick = () => navigate(-1); $('[data-pw-next-slide]').onclick = () => navigate(1);
  $('[data-pw-expand]').onclick = () => { panel.classList.toggle('pw-expanded'); $('[data-pw-expand]').setAttribute('aria-pressed', String(panel.classList.contains('pw-expanded'))); $('[data-pw-expand]').textContent = panel.classList.contains('pw-expanded') ? 'Restore' : 'Expand'; };
  const handle = $('[data-pw-drag]'); let drag = null;
  handle.addEventListener('pointerdown', event => { if (innerWidth <= 720 || event.target.closest('button') || panel.classList.contains('pw-expanded')) return; const rect = panel.getBoundingClientRect(); drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }; handle.setPointerCapture(event.pointerId); event.preventDefault(); });
  const movePanel = (left, top) => { panel.style.left = Math.max(0, Math.min(innerWidth - panel.offsetWidth, left)) + 'px'; panel.style.top = Math.max(0, Math.min(innerHeight - panel.offsetHeight, top)) + 'px'; panel.style.right = 'auto'; };
  handle.addEventListener('pointermove', event => { if (drag) movePanel(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y); });
  handle.addEventListener('pointerup', () => { drag = null; }); handle.addEventListener('pointercancel', () => { drag = null; });
  handle.addEventListener('keydown', event => { if (event.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); const rect = panel.getBoundingClientRect(); movePanel(rect.left + (event.key === 'ArrowRight' ? 20 : event.key === 'ArrowLeft' ? -20 : 0), rect.top + (event.key === 'ArrowDown' ? 20 : event.key === 'ArrowUp' ? -20 : 0)); } });
  panel.addEventListener('keydown', event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); close(); } });
  const onSlide = () => { updateSlideButtons(); notify(); };
  if (window.Reveal) { Reveal.on('slidechanged', onSlide); Reveal.on('ready', onSlide); }
  window.addEventListener('trial:slidechange', onSlide);
  window.addEventListener('pagehide', () => { save(); cancelRun(); aiTask?.abort(); });
  window.addEventListener('focus', () => { if (identityReady) resolveIdentity(); });
  window.addEventListener('resize', () => { positionLauncher(); if (!panel.hidden && innerWidth > 720 && !panel.classList.contains('pw-expanded') && panel.style.left) { const rect = panel.getBoundingClientRect(); movePanel(rect.left, rect.top); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && identityReady) resolveIdentity(true); });
  // The standalone page can open the pad before the classroom script adds its
  // controls. Moving the existing node preserves all consent/Stop listeners.
  new MutationObserver(() => { if (!panel.hidden) placeClassroomDock(); else positionLauncher(); }).observe(document.body, { childList: true });
  editor.disabled = true; $('[data-pw-run]').disabled = true;
  const ready = resolveIdentity(true);
  window.PythonWorkspace = { open, close, getSnapshot, run, stop: cancelRun, ready,
    loadSnippet: async info => { await ready; return addSnippet(info); },
    refreshIdentity: () => resolveIdentity(true),
    save: () => { $('[data-pw-save]').click(); return getSnapshot(); },
  };
})();
