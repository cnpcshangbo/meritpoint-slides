/* Consent applies to this signed-in account and this open courseware tab only. */
(() => {
  'use strict';
  if (window.LiveClassroom || new URLSearchParams(location.search).has('print-pdf')) return;
  const script = document.currentScript;
  const deck = script?.dataset.deck || document.body.dataset.deck || '';
  if (!deck) return;
  const base = new URL('../api/live-classroom/', script.src).pathname;
  const tabId = crypto.randomUUID();
  let actor = null, offers = [], sharing = null, sequence = 0, epoch = 0, sending = false;
  let lastSnapshot = '', helpRequested = false, lastLab = null, timer = null, discoveryTask = null, joinPending = false, consentIdentity = '';
  const dock = document.createElement('div'); dock.id = 'liveClassDock';
  dock.innerHTML = '<button id="liveClassJoin" type="button">Live class · 课堂</button><span id="liveClassState" role="status">Sharing off · 未共享</span><details id="liveClassGoal" hidden><summary>Class goal · 练习目标</summary><p id="liveClassGoalText" style="max-width:min(420px,75vw);max-height:25dvh;overflow:auto;white-space:pre-wrap;margin:6px 0"></p></details><button id="liveClassHelp" type="button" hidden>Request help · 请求帮助</button><button id="liveClassStop" type="button" hidden>Stop sharing · 停止共享</button><a id="liveClassTeacher" href="/live" hidden>Teacher mode · 教师模式 ↗</a>';
  document.body.append(dock);
  const dialog = document.createElement('dialog'); dialog.id = 'liveClassConsent';
  dialog.setAttribute('aria-labelledby', 'liveClassHeading');
  dialog.innerHTML = '<form id="liveClassForm"><div class="lc-heading"><h2 id="liveClassHeading">Join a live class · 加入课堂</h2><button type="button" id="liveClassCancel" aria-label="Close live class · 关闭">×</button></div><p id="liveClassIdentity"></p><label>Teacher’s session · 老师的课堂<select id="liveClassOffers"><option value="">Choose a session or enter its code</option></select></label><label>Class code · 课堂代码<input id="liveClassCode" autocomplete="off" maxlength="12" placeholder="Code from your teacher"></label><p id="liveClassScope">Until you stop, close this tab, or the class ends (up to 2 hours), your teacher can see this courseware tab’s current slide, active Python code and text output, run errors, visible/hidden state, and help requests. Opening the scratchpad shares its current code while it is open. Screenshots, other tabs, camera, and microphone are not collected. Keep private information out of shared code and output.</p><p lang="zh">在你停止共享、关闭此标签页或课堂结束前（最长 2 小时），老师可看到此课件标签页的当前页面、正在使用的 Python 代码和文字输出、运行错误、标签页是否可见，以及你的求助请求。打开 Python 草稿板时，会共享其中当前显示的代码。不会收集屏幕截图、其他标签页、摄像头或麦克风内容。请勿在共享代码和输出中放入私人信息。</p><label class="lc-check"><input id="liveClassConsentCheck" type="checkbox" required> I agree to share this courseware activity with this session’s teacher. 我同意向本课堂老师共享上述课件活动。</label><label class="lc-check"><input id="liveClassAiConsent" type="checkbox"> Also allow the course’s AI service to review my shared code and output for teaching suggestions when the teacher enables it. 另行同意：当老师启用 AI 时，允许课程的 AI 服务查看我的共享代码和输出，以提供教学建议。</label><p class="lc-note">Sharing is optional. You can keep practicing without joining. Live snapshots are temporary and removed when you leave, the teacher ends the class, or your connection expires. AI requests already sent cannot be recalled.</p><p class="lc-note" lang="zh">共享和 AI 授权均为自愿选择。不加入也可以继续练习。实时快照仅临时保留，在你退出、老师结束课堂或连接过期后移除。已发送的 AI 请求无法撤回。</p><p id="liveClassMessage" role="status"></p><button id="liveClassConfirm" type="submit">Join and share · 加入并共享</button></form>';
  document.body.append(dialog);
  const $ = id => document.getElementById(id);
  async function api(path, body, membership = sharing) {
    const r = await fetch(base + path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: { ...(body ? {'Content-Type':'application/json'} : {}), ...(membership ? {'X-Live-Consent':membership.consentToken} : {}) },
      ...(body ? {body:JSON.stringify(body)} : {}) });
    let data; try { data = await r.json(); } catch { throw new Error('Live class is unavailable on this site.'); }
    if (!r.ok) throw Object.assign(new Error(data.error || 'Live class request failed.'), {status:r.status});
    return data;
  }
  function render() {
    const active = !!sharing;
    dock.classList.toggle('is-sharing', active);
    $('liveClassJoin').hidden = active;
    $('liveClassHelp').hidden = $('liveClassStop').hidden = !active;
    $('liveClassState').textContent = active ? 'Sharing with · 正在共享给 ' + sharing.session.teacherName : 'Sharing off · 未共享';
    $('liveClassState').title = active ? 'Ends ' + new Date(sharing.session.expiresAt).toLocaleTimeString() + (sharing.session.targetSlide ? ' · Target slide: ' + sharing.session.targetSlide : '') + (sharing.session.objective ? ' · ' + sharing.session.objective : '') : '';
    $('liveClassGoal').hidden = !active;
    $('liveClassGoalText').textContent = active ? [sharing.session.targetSlide ? 'Target slide · 目标页：' + sharing.session.targetSlide : '', sharing.session.objective || '老师尚未设置练习目标 · No class goal set.'].filter(Boolean).join('\n') : '';
    if (!active) $('liveClassGoal').open = false;
    $('liveClassHelp').textContent = helpRequested ? 'Cancel help request · 取消求助' : 'Request help · 请求帮助';
    $('liveClassTeacher').hidden = !actor || !['teacher','admin'].includes(actor.role);
  }
  function slideElement() { return window.Reveal?.getCurrentSlide?.() || document.querySelector('section.is-current[data-sid], section[aria-hidden="false"][data-sid]') || document.querySelector('section[data-sid]'); }
  function snapshot() {
    const slide = slideElement();
    const pad = window.PythonWorkspace?.getSnapshot?.();
    const usePad = pad && (pad.open || pad.active || pad.isOpen);
    const lab = !usePad && (lastLab && slide?.contains(lastLab) ? lastLab : slide?.querySelector('.lab, [data-lab]'));
    const code = String(usePad ? pad.code : lab?.querySelector('textarea.code')?.value || '');
    const outputMatchesCode = usePad ? pad.outputMatchesCode === true : !!lab && typeof lab.dataset.liveRunCode === 'string' && lab.dataset.liveRunCode === code;
    let runStatus = usePad ? pad.status : lab?.dataset.liveRunStatus || 'idle';
    if (runStatus === 'loading') runStatus = 'running';
    if (runStatus === 'edited' || (!outputMatchesCode && ['success','error'].includes(runStatus))) runStatus = 'editing';
    const current = {
      slide: String(slide?.dataset.sid || window.TrialLesson?.getCurrent?.() || '').slice(0,100),
      slideTitle: (slide?.querySelector('h1,h2,h3')?.textContent || document.title).slice(0,160),
      source: usePad ? 'scratchpad' : 'slide', editorId: String(usePad ? pad.snippetId || '' : lab?.id || lab?.dataset.lab || '').slice(0,100),
      code,
      output: outputMatchesCode ? String(usePad ? pad.output : lab?.querySelector('.out, [data-output]')?.textContent || '') : '',
      error: outputMatchesCode ? String(usePad ? pad.error : lab?.dataset.lastError || '') : '',
      runStatus: ['idle','editing','running','success','error','stopped'].includes(runStatus) ? runStatus : 'idle',
      runId: String(usePad ? pad.runId || pad.updatedAt || '' : lab?.dataset.liveRunId || '').slice(0,100),
      visibility: document.visibilityState === 'hidden' ? 'hidden' : 'visible', helpRequested,
      truncated: false,
    };
    for (const [name, limit] of [['code',12000],['output',6000],['error',2500]]) {
      if (current[name].length > limit) { current[name] = current[name].slice(0,limit); current.truncated = true; }
    }
    // The API has a 32 KiB JSON-body limit. Unicode and escaped strings can
    // exceed it even below the character limits; retain an honest preview.
    const encoder = new TextEncoder();
    while (encoder.encode(JSON.stringify(current)).byteLength > 29000) {
      const name = ['code','output','error'].sort((a,b) => encoder.encode(JSON.stringify(current[b])).byteLength - encoder.encode(JSON.stringify(current[a])).byteLength)[0];
      current[name] = current[name].slice(0, Math.floor(current[name].length * 0.75)); current.truncated = true;
    }
    return current;
  }
  async function publish(force = false) {
    if (!sharing || sending) return;
    const membership = sharing, version = epoch;
    const current = snapshot(), encoded = JSON.stringify(current);
    if (!force && encoded === lastSnapshot) return;
    sending = true;
    try {
      await api('snapshot', {sessionId:membership.session.id,tabId,sequence:++sequence,snapshot:current}, membership);
      if (version === epoch) { lastSnapshot = encoded; render(); }
    } catch (e) {
      if (version !== epoch) return;
      if ([401,403,404].includes(e.status)) stop('Sharing ended. Join again to give new consent.');
      else $('liveClassState').textContent = 'Connection interrupted · stop or retry';
    } finally { sending = false; }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => publish(), 800); }
  function leave(membership) {
    return fetch(base + 'leave', {method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json','X-Live-Consent':membership.consentToken},body:JSON.stringify({sessionId:membership.session.id,tabId})}).catch(() => {});
  }
  function stop(message) {
    const previous = sharing; sharing = null; epoch++; sequence = 0; lastSnapshot = ''; helpRequested = false; clearTimeout(timer);
    render(); if (message) $('liveClassState').textContent = message;
    if (previous) leave(previous);
  }
  function discover() {
    if (discoveryTask) return discoveryTask;
    discoveryTask = (async () => {
    try {
      const response = await fetch(new URL('../api/whoami', script.src), {cache:'no-store'});
      if (!response.ok) throw new Error('Sign-in service unavailable.');
      const data = await response.json(); const next = data.user;
      if (sharing && (!next || next.email !== actor?.email)) stop('Account changed · sharing stopped');
      const changed = (next?.email || '') !== (actor?.email || '');
      actor = next || null;
      if (changed) await window.PythonWorkspace?.refreshIdentity?.();
      render();
      if (!actor) { offers = []; return true; }
      const result = await api('offer?deck=' + encodeURIComponent(deck), null, null);
      offers = result.offers || [];
      if (!sharing) $('liveClassJoin').textContent = offers.length ? 'Join live class · 加入课堂 · ' + offers.length : 'Live class · 课堂';
      return true;
    } catch { if (!sharing) $('liveClassState').textContent = 'Live class unavailable'; return false; }
    })().finally(() => { discoveryTask = null; });
    return discoveryTask;
  }
  $('liveClassJoin').onclick = async () => {
    const ready = await discover(); $('liveClassMessage').textContent = ready ? '' : 'Sign-in could not be checked. Try again when the connection returns.';
    $('liveClassIdentity').textContent = actor ? 'Signed in as ' + (actor.name || actor.email) : 'Sign in with your student account to join. Your work stays available without sharing.';
    if (!actor) {
      const link = document.createElement('a'); link.textContent = ' Sign in';
      link.href = 'https://academic.hopeembark.org/login?next=' + encodeURIComponent(location.href); $('liveClassIdentity').append(link);
    }
    consentIdentity = actor?.email || '';
    $('liveClassConfirm').disabled = !actor || !ready || joinPending;
    $('liveClassConsentCheck').checked = $('liveClassAiConsent').checked = false;
    $('liveClassOffers').replaceChildren(new Option('Choose a session or enter its code',''));
    for (const offer of offers) $('liveClassOffers').add(new Option(offer.teacherName + ' · ' + offer.title, offer.id));
    if (offers.length === 1) $('liveClassOffers').value = offers[0].id;
    $('liveClassCode').value = ''; dialog.showModal();
  };
  $('liveClassCancel').onclick = () => { epoch++; dialog.close(); };
  dialog.addEventListener('cancel', () => { epoch++; });
  $('liveClassForm').onsubmit = async event => {
    event.preventDefault();
    if (!$('liveClassConsentCheck').checked || !actor || sharing || joinPending) return;
    const version = epoch, expectedIdentity = consentIdentity;
    joinPending = true;
    $('liveClassConfirm').disabled = true;
    try {
      if (!(await discover())) throw new Error('Sign-in could not be checked. Try again when the connection returns.');
      if (version !== epoch || !dialog.open) return;
      if (!actor || actor.email !== expectedIdentity) {
        $('liveClassConsentCheck').checked = $('liveClassAiConsent').checked = false;
        throw new Error('The signed-in account changed. Close this dialog and review sharing again.');
      }
      await window.PythonWorkspace?.refreshIdentity?.();
      if (version !== epoch || !dialog.open) return;
      const code = $('liveClassCode').value.trim();
      const joined = await api('join', { ...(code ? {joinCode:code} : {sessionId:$('liveClassOffers').value}), deck, accountEmail:expectedIdentity, tabId, consent:true, aiConsent:$('liveClassAiConsent').checked }, null);
      if (joined.session.deck !== deck) { leave(joined); throw new Error('Open the courseware for that class before joining.'); }
      const identityVerified = await discover();
      if (version !== epoch || !dialog.open || !identityVerified || actor?.email !== expectedIdentity) {
        leave(joined);
        if (dialog.open) throw new Error('Joining stopped because this tab or account changed. Review sharing again.');
        return;
      }
      sharing = joined; epoch++; sequence = 0; lastSnapshot = ''; dialog.close(); render(); publish(true);
    } catch (e) { $('liveClassMessage').textContent = e.message; }
    finally { joinPending = false; $('liveClassConfirm').disabled = !actor; }
  };
  $('liveClassStop').onclick = () => stop('Sharing stopped · 已停止共享；离线快照会在 2 分钟内过期');
  $('liveClassHelp').onclick = () => { helpRequested = !helpRequested; render(); schedule(); };
  document.addEventListener('input', e => {
    if (e.target.matches('textarea.code')) { lastLab = e.target.closest('.lab, [data-lab]'); if (lastLab) lastLab.dataset.liveRunStatus = 'editing'; schedule(); }
  });
  document.addEventListener('focusin', e => { if (e.target.matches('textarea.code')) { lastLab = e.target.closest('.lab, [data-lab]'); schedule(); } });
  ['python-workspace:change','python-workspace:run-result','courseware:python-run','trial:slidechange','trial:python-result','visibilitychange'].forEach(name => window.addEventListener(name,schedule));
  document.addEventListener('visibilitychange',schedule);
  window.Reveal?.on?.('slidechanged',schedule);
  window.addEventListener('pagehide', () => stop());
  document.addEventListener('click', e => { if (e.target.closest('a[href*="/auth/logout"]')) stop(); }, true);
  setInterval(() => publish(), 3000);
  setInterval(async () => {
    if (!sharing) return;
    const membership = sharing, version = epoch;
    try {
      const result = await api('heartbeat',{sessionId:membership.session.id,tabId,visibility:document.visibilityState === 'hidden' ? 'hidden' : 'visible'},membership);
      if (version === epoch && result.session) { sharing.session = result.session; render(); }
    } catch(e) { if (version === epoch && [401,403,404].includes(e.status)) stop('Sharing ended · new consent required'); }
  }, 10000);
  setInterval(discover,20000); discover(); render();
  window.LiveClassroom = {stop, getState:() => ({sharing:!!sharing,deck,session:sharing?.session || null})};
})();
