/* Local lab notebook; sharing and AI use the existing explicit-consent tools. */
(() => {
  'use strict';
  const scriptURL = document.currentScript.src;
  const sections = [...document.querySelectorAll('.pl-stages > section[data-sid]')];
  const $ = selector => document.querySelector(selector);
  const field = (section, selector) => section.querySelector(selector);
  const owner = section => document.getElementById(section.dataset.codeSource) || section;
  const related = section => sections.filter(s=>owner(s) === owner(section));
  const notebook = document.body.dataset.notebook === 'python-trial-games' ? 'python-trial-games' : 'python-trial-lab';
  const keyPrefix = 'mpa-'+notebook+':v1:';
  const backupFormat = 'meritpoint-'+notebook;
  let index = 0, identity = '', ready = false, storageOK = false, state = {}, task = null, pendingImport = null;
  const dirty = new Map();
  const mark = (id, ...fields) => dirty.set(id,new Set([...(dirty.get(id) || []),...fields]));
  const empty = section => ({code:field(section,'.code').defaultValue,prediction:'',reflection:'',done:false,undo:null,lastRun:null});
  const announce = message => { $('[data-save-status]').textContent = message; };
  const emit = () => window.dispatchEvent(new CustomEvent('trial:python-result'));
  function clean(item, section) {
    if (!item || typeof item !== 'object') return empty(section);
    const bounded = (value, max, fallback = '') => typeof value === 'string' ? value.slice(0,max) : fallback;
    const lastRun = item.lastRun && typeof item.lastRun.code === 'string' ? {code:bounded(item.lastRun.code,20000),output:bounded(item.lastRun.output,20000),error:bounded(item.lastRun.error,12000),ok:item.lastRun.ok === true} : null;
    return {code:bounded(item.code,20000,empty(section).code), prediction:bounded(item.prediction,1200),reflection:bounded(item.reflection,1600),done:item.done === true,undo:typeof item.undo === 'string' ? item.undo.slice(0,20000) : null,lastRun};
  }
  function persist() {
    if (!ready) return;
    if (!storageOK) { announce('Session only · download a backup to keep your work.'); return; }
    try {
      // Save only edited rounds, preserving other course tabs' newer rounds.
      if (dirty.size) {
        const previous = JSON.parse(localStorage.getItem(keyPrefix+identity) || 'null');
        const merged = Object.fromEntries(sections.map(s=>[s.id,clean(previous?.version === 1 ? previous.stages?.[s.id] : null,s)]));
        for (const [id, fields] of dirty) for (const name of fields) merged[id][name] = state[id][name];
        localStorage.setItem(keyPrefix+identity,JSON.stringify({version:1,stages:merged})); dirty.clear();
      }
      announce('Saved on this device'+(identity === 'anonymous' ? ' · guest notebook' : ' · current account'));
    }
    catch (_) { storageOK = false; announce('Device storage unavailable · download a backup to keep your work.'); }
  }
  function progress() {
    const count = sections.filter(s => state[s.id]?.done).length;
    $('[data-progress]').textContent = `${count} / ${sections.length}`;
    $('progress').value = count;
    sections.forEach(s => document.querySelector(`[data-go="${s.id}"]`).classList.toggle('is-done',!!state[s.id]?.done));
  }
  function clearResult(section, message = 'Code changed. Run again to see its result.') {
    const lab = field(section,'[data-lab]');
    lab.dataset.liveRunStatus = 'editing'; delete lab.dataset.liveRunCode; delete lab.dataset.lastError;
    field(section,'[data-output]').textContent = ''; field(section,'[data-plots]').replaceChildren();
    field(section,'[data-status]').textContent = message;
    if (section.dataset.engine === 'pygame') window.PythonGameLab?.clear(section);
  }
  function paint() {
    sections.forEach(section => {
      const data = state[section.id] || empty(section);
      const codeData = state[owner(section).id] || data;
      field(section,'.code').value = codeData.code;
      field(section,'[data-prediction]').value = data.prediction;
      field(section,'[data-reflection]').value = data.reflection;
      field(section,'[data-done]').checked = data.done;
      for (const control of section.querySelectorAll('[data-prediction],[data-reflection],[data-done]')) control.disabled = !ready;
      field(section,'[data-undo]').hidden = codeData.undo === null;
      field(section,'.code').disabled = !ready;
      field(section,'[data-run]').disabled = !ready;
      clearResult(section,'Run your code to see what happens.');
      if (codeData.lastRun?.code === codeData.code) renderResult(section,codeData.lastRun,true);
    });
    progress();
  }
  function renderResult(section, result, restored = false) {
    const lab = field(section,'[data-lab]');
    lab.dataset.liveRunCode = result.code; lab.dataset.lastError = result.error || ''; lab.dataset.liveRunStatus = result.ok ? 'success' : 'error';
    field(section,'[data-output]').textContent = (result.output || '') + (result.error ? '\n'+result.error : '');
    field(section,'[data-status]').textContent = restored ? (section.dataset.engine === 'pygame' ? 'Saved text state · Play again to verify and redraw the game.' : 'Saved text result · run again to verify and redraw charts.') : result.ok ? 'Ran successfully. What changed?' : 'Read the last error line. What could you try?';
  }
  function updateCode(section, code, message) {
    state[owner(section).id].code = code;
    mark(owner(section).id,'code');
    related(section).forEach(s=>{
      field(s,'.code').value = code; state[s.id].done = false; field(s,'[data-done]').checked = false;
      mark(s.id,'done');
      clearResult(s,message); field(s,'[data-undo]').hidden = state[owner(section).id].undo === null;
    });
  }
  function syncIdentity() {
    const next = window.PythonWorkspace?.getSnapshot?.().identityKey;
    if (!next || next === identity) return;
    stop('Run stopped because the account changed.');
    window.PythonCodeTrace?.close();
    window.dispatchEvent(new CustomEvent('trial:identitychange'));
    // Resolve identity before exposing any saved account notebook.
    identity = next; ready = true; storageOK = !next.startsWith('session:'); dirty.clear();
    let stored;
    try { stored = storageOK ? JSON.parse(localStorage.getItem(keyPrefix+identity) || 'null') : null; }
    catch (_) { storageOK = false; }
    state = Object.fromEntries(sections.map(section => [section.id,clean(stored?.version === 1 ? stored.stages?.[section.id] : null,section)]));
    pendingImport = null; if ($('.pl-import-dialog').open) $('.pl-import-dialog').close();
    paint(); persist(); emit();
  }
  function stop(message = 'Run stopped. Your code is still here.') {
    window.PythonGameLab?.stop(message);
    if (!task) return;
    const {worker,timer,section} = task; task = null;
    clearTimeout(timer); worker.terminate();
    const lab = field(section,'[data-lab]'); lab.dataset.liveRunStatus = 'stopped'; delete lab.dataset.liveRunCode;
    field(section,'[data-run]').disabled = !ready; field(section,'[data-stop]').hidden = true;
    field(section,'[data-status]').textContent = message; emit();
  }
  function packages(code) {
    const found = new Set();
    for (const line of code.split('\n')) {
      const match = line.match(/^\s*(?:from\s+([\w.]+)\s+import|import\s+(.+))/);
      if (match) for (const item of (match[1] || match[2]).split(',')) {
        const name = item.trim().split(/[.\s]/)[0]; if (['numpy','matplotlib'].includes(name)) found.add(name);
      }
    }
    return [...found];
  }
  function run(section) {
    if (!ready) return;
    stop(); window.PythonCodeTrace?.close();
    const code = field(section,'.code').value, lab = field(section,'[data-lab]');
    if (section.dataset.engine === 'pygame') {
      if (!window.PythonGameLab) { announce('The game player is loading. Try Play again shortly.'); return; }
      window.PythonGameLab.start(section, {code, onFinish: result => {
        if(result.cancelled)return;
        state[owner(section).id].lastRun = {code,ok:result.ok,output:result.output || '',error:result.error || ''};
        mark(owner(section).id,'lastRun'); persist(); emit();
      }});
      return;
    }
    clearResult(section,'Loading Python… First use may take a moment.');
    lab.dataset.liveRunStatus = 'running'; lab.dataset.liveRunId = Date.now().toString();
    field(section,'[data-run]').disabled = true; field(section,'[data-stop]').hidden = false;
    let worker;
    const fail = error => {
      if (worker && task?.worker !== worker) return;
      if (task?.worker === worker) stop();
      lab.dataset.liveRunStatus = 'error'; lab.dataset.liveRunCode = code; lab.dataset.lastError = error;
      field(section,'[data-output]').textContent = error; field(section,'[data-status]').textContent = 'Python could not finish. You can edit and try again.';
      field(section,'[data-run]').disabled = false; field(section,'[data-stop]').hidden = true; emit();
    };
    try { worker = new Worker(new URL('../scratchpad/python-workspace-worker.js',scriptURL)); }
    catch (error) { fail(String(error.message || error)); return; }
    const current = {worker,section,code,timer:null}; task = current;
    const timeout = ms => { clearTimeout(current.timer); current.timer = setTimeout(() => { if (task === current) stop('Run timed out. Try fewer repetitions, or check the connection and run again.'); },ms); };
    timeout(90000);
    worker.onmessage = ({data}) => {
      if (task !== current) return;
      if (data.type === 'status') { field(section,'[data-status]').textContent = data.message; if (data.status === 'running') timeout(25000); return; }
      if (data.type !== 'result') return;
      clearTimeout(current.timer); worker.terminate(); task = null;
      const result = data.result;
      if (field(section,'.code').value !== code) { clearResult(section); return; }
      const record = {code,ok:result.ok,output:result.output || '',error:result.error || ''};
      state[owner(section).id].lastRun = record;
      mark(owner(section).id,'lastRun');
      for (const linked of related(section)) {
        renderResult(linked,record); field(linked,'[data-plots]').replaceChildren();
        for (const png of (result.figures || []).slice(0,3)) {
          const img = document.createElement('img'); img.src = 'data:image/png;base64,'+png; img.alt = 'Chart produced by your Python code. Compare the printed values with the plotted bars.'; field(linked,'[data-plots]').append(img);
        }
      }
      persist();
      field(section,'[data-run]').disabled = false; field(section,'[data-stop]').hidden = true; emit();
    };
    worker.onerror = event => fail(event.message || 'Python could not load. Check the connection and try again.');
    worker.postMessage({type:'run',code,packages:packages(code)}); emit();
  }
  function go(next, updateHash = true, focus = false) {
    if (typeof next === 'string') next = sections.findIndex(s=>s.id === next);
    if (!Number.isInteger(next) || next < 0 || next >= sections.length) return;
    if (next !== index) stop('Run stopped when you changed rounds.');
    index = next;
    sections.forEach((s,i) => { s.hidden = i !== index; s.classList.toggle('is-current',i === index); s.setAttribute('aria-hidden',String(i !== index)); });
    document.querySelectorAll('[data-go]').forEach(button => { if (button.dataset.go === sections[index].id) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
    $('[data-prev]').disabled = !index; $('[data-next]').disabled = index === sections.length-1;
    if (updateHash) history.replaceState(null,'','#/'+sections[index].id);
    if (focus) { field(sections[index],'h2').focus({preventScroll:true}); sections[index].scrollIntoView({block:'start'}); }
    window.dispatchEvent(new CustomEvent('trial:slidechange',{detail:{id:sections[index].id}}));
  }
  function download(name, text, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text],{type})), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  function exportLab() {
    if (!ready) return;
    window.PythonGameLab?.stop('Game stopped to save a matching backup. Play again to restart.');
    let saved = state;
    try { const latest = storageOK && JSON.parse(localStorage.getItem(keyPrefix+identity) || 'null'); if (latest?.version === 1) saved = Object.fromEntries(sections.map(s=>[s.id,clean(latest.stages?.[s.id],s)])); } catch (_) { /* Export the in-memory draft when storage cannot be read. */ }
    const exported = Object.fromEntries(sections.map(s=>{
      const codeData = saved[owner(s).id], lastRun = codeData.lastRun;
      return [s.id,{...saved[s.id],code:codeData.code,lastRun,outputMatchesCode:!!lastRun && lastRun.code === codeData.code}];
    }));
    download('my-'+notebook+'.json',JSON.stringify({format:backupFormat,version:1,savedAt:new Date().toISOString(),stages:exported},null,2));
  }
  for (const section of sections) {
    section.addEventListener('input', event => {
      if (!ready) return;
      const item = state[section.id], target = event.target;
      if (target.matches('.code')) {
        if (task?.section === section || window.PythonGameLab?.isActive(section)) stop('Run stopped because the code changed.');
        updateCode(section,target.value); emit();
      }
      if (target.matches('[data-prediction]')) { item.prediction = target.value; mark(section.id,'prediction'); }
      if (target.matches('[data-reflection]')) { item.reflection = target.value; mark(section.id,'reflection'); }
      if (target.matches('[data-done]')) { item.done = target.checked; mark(section.id,'done'); }
      progress(); persist();
    });
    field(section,'.code').addEventListener('keydown',event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); run(section); }
      if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault(); const editor = event.target; editor.setRangeText('    ',editor.selectionStart,editor.selectionEnd,'end'); editor.dispatchEvent(new Event('input',{bubbles:true}));
      }
    });
    field(section,'[data-run]').onclick = ()=>run(section);
    field(section,'[data-stop]').onclick = ()=>stop();
    field(section,'[data-visualize]').onclick = ()=>{
      if (section.dataset.engine === 'pygame') { window.PythonGameLab?.inspect(section); return; }
      stop('Run stopped to visualize code.');
      const code = field(section,'.code').value;
      if (!window.PythonCodeTrace) { announce('The visualizer is loading. Try again shortly.'); return; }
      window.PythonCodeTrace.openCode({code,packages:packages(code),title:field(section,'h2').textContent,opener:field(section,'[data-visualize]')});
    };
    field(section,'[data-pad]').onclick = async()=>{
      if (!ready) return;
      const expectedIdentity = identity, code = field(section,'.code').value;
      stop('Run stopped to open your Python pad.');
      await window.PythonWorkspace.refreshIdentity(); syncIdentity();
      if (identity !== expectedIdentity) { announce('Account changed. Review this notebook before copying code.'); return; }
      const id = await window.PythonWorkspace.loadSnippet({code,name:'Lab · '+field(section,'h2').textContent,packages:packages(code),origin:{deck:document.body.dataset.sourceDeck || document.body.dataset.deck || 'python/trial-lab',slide:section.id}});
      await window.PythonWorkspace.open();
      if (id) announce('Copied to a new named pad snippet. Your round code is still here.');
      else announce('Could not add a snippet. Check the Python pad message; your round code is still here.');
    };
    field(section,'[data-reset]').onclick = ()=>{
      if (!ready) return;
      const item = state[owner(section).id];
      if (item.code === field(section,'.code').defaultValue) { announce('This is already the starter. Any saved Undo reset is still available.'); return; }
      stop(); item.undo = item.code; mark(owner(section).id,'undo');
      updateCode(section,field(section,'.code').defaultValue,'Starter restored. Undo reset brings back your edits.'); persist(); progress(); emit();
    };
    field(section,'[data-undo]').onclick = ()=>{
      const item = state[owner(section).id]; if (!item || item.undo === null) return; stop();
      const restored = item.undo; item.undo = null; mark(owner(section).id,'undo'); updateCode(section,restored); persist(); progress(); emit();
    };
  }
  document.querySelectorAll('[data-go]').forEach(button => { button.onclick = ()=>go(button.dataset.go,true,true); });
  $('[data-prev]').onclick = ()=>go(index-1,true,true); $('[data-next]').onclick = ()=>go(index+1,true,true);
  $('[data-export]').onclick = exportLab;
  $('[data-download]').onclick = ()=>{
    const section = sections[index], code = field(section,'.code').value;
    download('lab-'+section.id+'.py',section.dataset.engine === 'pygame' && window.PythonGameLab ? window.PythonGameLab.toDesktop(code) : code,'text/x-python');
  };
  $('[data-import]').onclick = ()=>{ if (ready) $('[data-import-file]').click(); };
  $('[data-import-file]').onchange = async event=>{
    const file = event.target.files?.[0], expectedIdentity = identity; event.target.value = ''; if (!file || !ready) return;
    try {
      if (file.size > 5000000) throw new Error('Choose a lab backup smaller than 5 MB.');
      const data = JSON.parse(await file.text());
      if (data.format !== backupFormat || data.version !== 1 || !data.stages || sections.some(s=>typeof data.stages[s.id]?.code !== 'string' || data.stages[s.id].code.length>20000)) throw new Error('Choose a complete backup for this notebook. Core lab and game challenge backups are separate.');
      if (identity !== expectedIdentity) throw new Error('Account changed. Choose your backup again.');
      pendingImport = Object.fromEntries(sections.map(s=>[s.id,clean(data.stages[s.id],s)])); $('.pl-import-dialog').showModal();
    } catch (error) { announce(String(error.message || error)); }
  };
  $('[data-import-confirm]').onclick = ()=>{ if (!pendingImport) return; exportLab(); stop(); state = pendingImport; pendingImport = null; for (const s of sections) mark(s.id,...Object.keys(state[s.id])); paint(); persist(); $('.pl-import-dialog').close(); emit(); };
  $('[data-import-cancel]').onclick = ()=>{ pendingImport = null; $('.pl-import-dialog').close(); };
  const hashRound = ()=>{ let id; try { id = decodeURIComponent(location.hash.replace(/^#\/?/,'')); } catch (_) { id = ''; } go(sections.some(s=>s.id===id) ? id : 0,false); };
  window.addEventListener('hashchange',hashRound);
  window.addEventListener('pagehide',()=>{ persist(); stop(); });
  window.addEventListener('python-workspace:change',syncIdentity);
  window.addEventListener('python-workspace:run-result',syncIdentity);
  window.TrialLesson = {getCurrent:()=>sections[index].id,navigate:next=>go(next,true,true),stopAudio:()=>{},terminatePython:stop};
  window.TrialLab = {getCurrent:()=>sections[index].id,go,stop,getState:()=>JSON.parse(JSON.stringify(state)),isReady:()=>ready};
  for (const control of document.querySelectorAll('[data-prediction],[data-reflection],[data-done]')) control.disabled = true;
  const placeAccount = () => { const account = document.getElementById('mpAuth'); if (account && account.parentElement !== $('.pl-header')) $('.pl-header').append(account); };
  new MutationObserver(placeAccount).observe(document.body,{childList:true}); placeAccount();
  hashRound();
  document.addEventListener('DOMContentLoaded',async()=>{
    try { await window.PythonWorkspace.ready; syncIdentity(); }
    catch (_) { announce('Notebook could not initialize. Reload to try again, or download the starter code.'); }
  });
})();
