/* Teacher-owned live view. Shared student code and model text are never executed. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { authorized: false, sessionId: '', session: null, students: [], selectedId: '', generation: 0, polling: false, busy: false };
  const node = (tag, content, className) => {
    const element = document.createElement(tag);
    if (content !== undefined) element.textContent = content;
    if (className) element.className = className;
    return element;
  };
  const time = value => value == null ? '—' : new Date(Number(value)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const age = value => { if (value == null) return '尚未收到'; const seconds = Math.max(0, Math.floor((Date.now() - Number(value)) / 1000)); return seconds < 60 ? `${seconds} 秒前` : `${Math.floor(seconds / 60)} 分钟前`; };
  const runLabel = value => ({ idle: '就绪', editing: '编辑中', running: '运行中', success: '运行完成', error: '运行报错', stopped: '已停止' })[value] || '暂无运行记录';
  function notice(message, kind = '') { $('teacherNotice').textContent = message; $('teacherNotice').dataset.kind = kind; }
  function clearDetail(message = '选择参与的标签页以查看内容。') {
    $('teacherDetail').replaceChildren(node('p', message, 'empty'));
    $('teacherDetailActions').hidden = true; $('teacherAnalyze').disabled = true; $('teacherRevoke').disabled = true;
  }
  function clearSession() {
    state.generation++; state.sessionId = ''; state.session = null; state.students = []; state.selectedId = '';
    $('teacherSession').hidden = true; $('teacherJoinCode').textContent = '';
    $('teacherRoster').replaceChildren(node('p', '等待学生自愿加入共享。', 'empty'));
    $('teacherRosterCount').textContent = '0'; $('teacherExisting').value = ''; clearDetail();
    $('teacherQuizDetails').open = false; $('teacherQuiz').textContent = '展开后加载今日答题统计。';
  }
  function loseAccess(status) {
    state.authorized = false; clearSession();
    $('teacherExisting').replaceChildren(node('option', '需要教师权限'));
    $('teacherExisting').disabled = true; $('teacherStartButton').disabled = true; $('teacherRefresh').disabled = true;
    $('teacherSignIn').hidden = false;
    notice(status === 401 ? '请使用教师账号登录，创建或查看实时课堂。' : '此页面需要有效的教师账号。', 'error');
  }
  async function api(path, body) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
    let response;
    try { response = await fetch('/api/live-classroom' + path, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }); }
    finally { clearTimeout(timeout); }
    let data; try { data = await response.json(); } catch (_) { data = {}; }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) loseAccess(response.status);
      const error = new Error(data.error || '暂时无法连接实时课堂，请重试。'); error.status = response.status; throw error;
    }
    return data;
  }
  function tag(content, tone = '') { const element = node('span', content, 'tag'); if (tone) element.dataset.tone = tone; return element; }
  function renderSession(session, fillForm = false) {
    state.session = session; $('teacherSession').hidden = false;
    $('teacherSessionTitle').textContent = session.title;
    $('teacherSessionMeta').textContent = `${session.deck} · 目标页：${session.targetSlide || '未设置'} · ${time(session.expiresAt)} 结束`;
    $('teacherJoinCode').textContent = session.joinCode || '';
    const parts = String(session.deck || '').split('/').filter(part => /^[a-zA-Z0-9_-]+$/.test(part));
    $('teacherCourseLink').href = '/' + parts.map(encodeURIComponent).join('/') + '/';
    const ai = session.ai || {};
    $('teacherBudget').textContent = session.aiEnabled
      ? session.aiAvailable ? `AI 提醒已开启（仅限同意的标签页） · 剩余 ${ai.callsRemaining ?? 0} 次分析 · 预算剩余 ${Number(ai.tokenBudgetRemaining || 0).toLocaleString()} tokens`
        : 'AI 提醒已开启，但模型当前不可用；共享内容和运行事实仍可查看。'
      : 'AI 提醒已关闭；您可以查看学生共享内容和运行事实。';
    if (fillForm) { $('teacherSessionTarget').value = session.targetSlide || ''; $('teacherSessionObjective').value = session.objective || ''; $('teacherSessionAi').checked = session.aiEnabled === true; }
  }
  function renderRoster() {
    const fragment = document.createDocumentFragment(); $('teacherRosterCount').textContent = String(state.students.length);
    if (!state.students.length) fragment.append(node('p', '等待学生自愿加入共享。', 'empty'));
    for (const student of state.students) {
      const button = node('button', undefined, 'roster-item'); button.type = 'button'; button.dataset.participationId = student.id;
      button.setAttribute('aria-pressed', String(student.id === state.selectedId)); button.append(node('strong', student.name || student.email || '学生'));
      const snapshot = student.snapshot;
      button.append(node('span', `${student.connected ? '已连接' : '连接暂静'} · ${snapshot?.source === 'scratchpad' ? 'Python 练习板' : '课件'}${snapshot?.slide ? ' · 第 ' + snapshot.slide + ' 页' : ''}`, 'roster-meta'));
      const tags = node('span', undefined, 'tags');
      if (snapshot?.helpRequested) tags.append(tag('请求帮助', 'help'));
      if (state.session?.targetSlide && snapshot?.slide) tags.append(tag(snapshot.slide === state.session.targetSlide ? '目标页' : '其他页面（可能在复习）'));
      tags.append(tag(runLabel(snapshot?.runStatus), snapshot?.runStatus === 'error' ? 'error' : snapshot?.runStatus === 'success' ? 'success' : ''));
      tags.append(tag(student.aiConsent ? '已同意 AI' : '未同意 AI'));
      if (student.analysis?.status === 'ready') tags.append(tag('有 AI 建议'));
      button.append(tags); button.addEventListener('click', () => { state.selectedId = student.id; renderRoster(); renderDetail(); }); fragment.append(button);
    }
    $('teacherRoster').replaceChildren(fragment);
  }
  function block(title, content, extraClass = '') {
    const section = node('section', undefined, 'detail-block'); section.append(node('h3', title), node('pre', content || '暂无共享内容 / Nothing shared yet.', 'code-output ' + extraClass)); return section;
  }
  function renderDetail(preserveSelection = false) {
    const student = state.students.find(item => item.id === state.selectedId);
    if (!student) { state.selectedId = ''; clearDetail(); return; }
    const selection = window.getSelection();
    if (preserveSelection && selection && !selection.isCollapsed && $('teacherDetail').contains(selection.anchorNode)) return;
    const fragment = document.createDocumentFragment(), heading = node('div', undefined, 'student-heading'), identity = node('div');
    identity.append(node('h2', student.name || '学生'), node('p', student.email || '', 'student-email'));
    heading.append(identity, tag(student.connected ? '已连接' : '连接暂静')); fragment.append(heading);
    fragment.append(node('p', `${time(student.joinedAt)} 加入 · 心跳 ${age(student.lastSeen)} · 内容更新 ${age(student.snapshotAt)}`, 'muted'));
    const snapshot = student.snapshot;
    if (snapshot) {
      fragment.append(node('p', `${snapshot.source === 'scratchpad' ? 'Python 练习板' : '代码幻灯片'}${snapshot.slide ? ' · 第 ' + snapshot.slide + ' 页' : ''}${snapshot.slideTitle ? ' · ' + snapshot.slideTitle : ''} · ${runLabel(snapshot.runStatus)} · 标签页${snapshot.visibility === 'hidden' ? '隐藏' : '可见'}`, 'muted'));
      if (state.session?.targetSlide && snapshot.slide) fragment.append(node('p', snapshot.slide === state.session.targetSlide ? '当前位于课堂目标页。' : '当前位于其他页面（可能在复习）。', 'muted'));
      if (snapshot.helpRequested) { const help = node('div', undefined, 'advisory'); help.append(node('h3', '学生请求帮助'), node('p', snapshot.helpMessage || '学生希望教师查看当前练习。')); fragment.append(help); }
      const factsSection = node('section', undefined, 'detail-block'), facts = node('ul', undefined, 'facts'); factsSection.append(node('h3', '运行事实 · Reported facts'));
      for (const fact of student.facts || []) facts.append(node('li', fact));
      if (!facts.childElementCount) facts.append(node('li', '尚未收到已完成的运行记录。'));
      factsSection.append(facts); fragment.append(factsSection, block('共享代码 · Code', snapshot.code, 'code'), block('运行输出 · Output', snapshot.output));
      if (snapshot.error) fragment.append(block('运行错误 · Error', snapshot.error, 'error'));
      if (snapshot.truncated) fragment.append(node('p', '较长的代码或输出已截短，仅展示部分内容。', 'muted'));
    } else fragment.append(node('p', '此标签页已同意共享，尚未收到第一份课件内容。', 'empty'));
    const advice = node('section', undefined, 'detail-block advisory'); advice.append(node('h3', 'AI 教学建议 · Advisory'));
    const analysis = student.analysis;
    if (!student.aiConsent) advice.append(node('p', '学生未同意 AI 分析，请依据共享内容和运行事实提供指导。'));
    else if (!state.session?.aiEnabled) advice.append(node('p', '本课堂的 AI 提醒已关闭。'));
    else if (!state.session?.aiAvailable) advice.append(node('p', '模型暂不可用，您仍可查看共享内容与运行事实。'));
    else if (analysis?.status === 'ready') {
      advice.append(node('p', analysis.summary || '暂无分析摘要。'));
      if (Array.isArray(analysis.reasons) && analysis.reasons.length) { const reasons = node('ul'); for (const reason of analysis.reasons) reasons.append(node('li', reason)); advice.append(reasons); }
      if (analysis.suggestedAction) advice.append(node('p', analysis.suggestedAction));
      if (analysis.contentTruncated) advice.append(node('p', 'AI 仅收到截短的代码或输出；建议可能缺少上下文。', 'muted'));
      advice.append(node('p', `仅供教学参考，不作评分 · 依据第 ${analysis.snapshotSequence ?? '—'} 次共享（${time(analysis.snapshotAt)}） · ${time(analysis.generatedAt)} 生成`, 'muted'));
    } else if (['queued', 'running'].includes(analysis?.status)) advice.append(node('p', analysis.status === 'running' ? '正在分析最新同意共享的代码和输出…' : '此标签页的分析已排队…'));
    else if (analysis?.message) advice.append(node('p', analysis.message));
    else advice.append(node('p', '运行报错或学生求助后，会自动生成参考提醒；您也可以主动请求分析。'));
    fragment.append(advice); $('teacherDetail').replaceChildren(fragment); $('teacherDetailActions').hidden = false;
    $('teacherAnalyze').disabled = state.busy || !snapshot || !student.aiConsent || !state.session?.aiEnabled || !state.session?.aiAvailable || ['queued', 'running'].includes(analysis?.status) || state.session?.ai?.callsRemaining === 0;
    $('teacherRevoke').disabled = state.busy;
  }
  async function loadSession(fillForm = false) {
    if (!state.sessionId || !state.authorized) return;
    const id = state.sessionId, generation = state.generation;
    try {
      const data = await api('/sessions/' + encodeURIComponent(id));
      if (generation !== state.generation || id !== state.sessionId || !state.authorized) return;
      renderSession(data.session, fillForm); state.students = Array.isArray(data.students) ? data.students : [];
      if (!state.students.some(item => item.id === state.selectedId)) { state.selectedId = ''; clearDetail(); }
      renderRoster(); renderDetail(true);
    } catch (error) {
      if (generation !== state.generation || id !== state.sessionId) return;
      state.students = []; state.selectedId = ''; renderRoster(); clearDetail('实时连接不可用，已清除本页面显示的共享内容。');
      if (error.status === 404) { clearSession(); await refreshSessions(false); }
      notice(error.message, 'error');
    }
  }
  async function selectSession(id) { clearSession(); state.sessionId = id; $('teacherExisting').value = id; if (id) { $('teacherStartDetails').open = false; await loadSession(true); } }
  async function refreshSessions(autoSelect = true) {
    const generation = state.generation;
    try {
      const data = await api('/sessions'); if (generation !== state.generation) return;
      state.authorized = true; $('teacherSignIn').hidden = true; $('teacherRefresh').disabled = false;
      $('teacherStartButton').disabled = !$('teacherDeck').value || state.busy;
      const sessions = Array.isArray(data.sessions) ? data.sessions : [], fragment = document.createDocumentFragment();
      const empty = node('option', sessions.length ? '选择课堂' : '暂无进行中的课堂'); empty.value = ''; fragment.append(empty);
      for (const session of sessions) { const option = node('option', `${session.title} · ${session.deck}`); option.value = session.id; fragment.append(option); }
      $('teacherExisting').replaceChildren(fragment); $('teacherExisting').disabled = !sessions.length;
      if (state.sessionId && !sessions.some(item => item.id === state.sessionId)) clearSession();
      $('teacherExisting').value = state.sessionId;
      if (autoSelect && !state.sessionId && sessions.length) await selectSession(sessions[0].id);
      if (!state.sessionId) $('teacherStartDetails').open = true;
      notice(state.sessionId ? '课堂已就绪，下方仅显示自愿参与共享的学生。' : '可以创建课堂了，学生自主选择是否参与共享。');
    } catch (error) { if (state.authorized) notice(error.message, 'error'); }
  }
  async function loadDecks() {
    try {
      const response = await fetch('/catalog.json', { cache: 'no-store' }); if (!response.ok) throw new Error('Catalog unavailable');
      const catalog = await response.json();
      // Static research guides do not mount the courseware sharing controls.
      const decks = (catalog.courses || []).filter(course => ['python','ai-toolbox','patterns'].includes(course.id)).flatMap(course => (course.decks || []).filter(deck => deck.status === 'ready')
        .map(deck => ({ id: `${course.id}/${deck.id}`, title: `${course.title || course.id} · ${deck.title || deck.id}` })))
        .filter(deck => /^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,99}$/.test(deck.id));
      if (!decks.some(deck => deck.id === 'python/scratchpad')) decks.push({ id: 'python/scratchpad', title: 'Python 自由练习板 · Standalone scratchpad' });
      const fragment = document.createDocumentFragment();
      for (const deck of decks) { const option = node('option', deck.title); option.value = deck.id; fragment.append(option); }
      if (!decks.length) { const option = node('option', '暂无可用课件'); option.value = ''; fragment.append(option); }
      $('teacherDeck').replaceChildren(fragment);
      const python = decks.find(deck => deck.id === 'python/class-01') || decks.find(deck => deck.id.startsWith('python/'));
      if (python) $('teacherDeck').value = python.id;
      $('teacherDeck').disabled = !decks.length; $('teacherStartButton').disabled = !state.authorized || !decks.length;
    } catch (_) { const option = node('option', '无法加载课程目录'); option.value = ''; $('teacherDeck').replaceChildren(option); $('teacherDeck').disabled = true; }
  }
  async function mutation(action) {
    if (state.busy || !state.authorized) return;
    state.busy = true; $('teacherStartButton').disabled = true; renderDetail();
    try { await action(); } catch (error) { if (state.authorized) notice(error.message, 'error'); }
    finally { state.busy = false; $('teacherStartButton').disabled = !state.authorized || !$('teacherDeck').value; renderDetail(); }
  }
  async function loadQuiz() {
    if (!$('teacherQuizDetails').open || !state.authorized || !state.session?.deck) return;
    const id = state.sessionId, generation = state.generation;
    $('teacherQuiz').textContent = '正在加载今日汇总…';
    try {
      const response = await fetch('/api/quiz/deck-stats?deck=' + encodeURIComponent(state.session.deck), { credentials: 'same-origin', cache: 'no-store' });
      if (response.status === 401 || response.status === 403) { loseAccess(response.status); return; }
      if (!response.ok) throw new Error('Quiz unavailable');
      const data = await response.json(); if (id !== state.sessionId || generation !== state.generation) return;
      const fragment = document.createDocumentFragment(), today = data.today || {};
      const slides = Object.entries(today);
      for (const [slide, counts] of slides) {
        const section = node('section', undefined, 'quiz-slide'); section.append(node('h3', '页面 ' + slide));
        const choices = node('div', undefined, 'tags');
        for (const [choice, count] of Object.entries(counts || {})) {
          const number = Number(choice), label = Number.isInteger(number) && number >= 0 && number < 26 ? String.fromCharCode(65 + number) : choice;
          choices.append(tag(`${label}：${Number(count) || 0} 次`));
        }
        section.append(choices); fragment.append(section);
      }
      if (!slides.length) fragment.append(node('p', '此课件今天暂无答题记录。', 'muted'));
      $('teacherQuiz').replaceChildren(fragment);
    } catch (_) { if (id === state.sessionId && generation === state.generation) $('teacherQuiz').textContent = '暂时无法加载今日答题汇总。'; }
  }
  $('teacherStart').addEventListener('submit', event => { event.preventDefault(); void mutation(async () => {
    const data = await api('/sessions', { deck: $('teacherDeck').value, title: $('teacherTitle').value, targetSlide: $('teacherTarget').value, objective: $('teacherObjective').value, aiEnabled: $('teacherAi').checked });
    await selectSession(data.session.id); await refreshSessions(false); notice('课堂已创建，请向学生提供加入码并打开相应课件。');
  }); });
  $('teacherExisting').addEventListener('change', () => { void selectSession($('teacherExisting').value).then(loadQuiz); });
  $('teacherRefresh').addEventListener('click', () => { void refreshSessions().then(() => loadSession()); });
  $('teacherTargetForm').addEventListener('submit', event => { event.preventDefault(); void mutation(async () => {
    const id = state.sessionId;
    const data = await api(`/sessions/${encodeURIComponent(id)}/target`, { targetSlide: $('teacherSessionTarget').value, objective: $('teacherSessionObjective').value, aiEnabled: $('teacherSessionAi').checked });
    if (id !== state.sessionId) return; renderSession(data.session, true); await loadSession(); notice('课堂目标已更新，学生的练习进度保持不变。');
  }); });
  $('teacherAnalyze').addEventListener('click', () => { void mutation(async () => {
    const id = state.sessionId, participantId = state.selectedId;
    const data = await api(`/sessions/${encodeURIComponent(id)}/analyze`, { participationId: participantId });
    if (id !== state.sessionId) return; await loadSession(); notice(data.queued ? '已为该同意 AI 的标签页请求分析。' : data.analysis?.message || '分析暂不可用，仍可查看共享内容与运行事实。');
  }); });
  $('teacherRevoke').addEventListener('click', () => { void mutation(async () => {
    const id = state.sessionId, participantId = state.selectedId;
    await api(`/sessions/${encodeURIComponent(id)}/revoke`, { participationId: participantId });
    if (id !== state.sessionId) return;
    state.generation++; state.selectedId = ''; state.students = state.students.filter(item => item.id !== participantId); clearDetail(); renderRoster();
    await loadSession(); notice('已停止该标签页的共享，并清除其临时内容和 AI 建议。');
  }); });
  $('teacherEnd').addEventListener('click', () => { void mutation(async () => {
    const id = state.sessionId; await api(`/sessions/${encodeURIComponent(id)}/end`, {});
    if (id !== state.sessionId) return; clearSession(); await refreshSessions(false); notice('课堂已结束，临时共享内容和 AI 建议已清除。');
  }); });
  $('teacherCopyCode').addEventListener('click', async () => { try { await navigator.clipboard.writeText(state.session?.joinCode || ''); notice('加入码已复制，请仅向本课堂学生分享。'); } catch (_) { notice('请手动选择并复制上方的加入码。'); } });
  $('teacherDeck').addEventListener('change', () => { $('teacherStartButton').disabled = !state.authorized || !$('teacherDeck').value || state.busy; });
  $('teacherQuizDetails').addEventListener('toggle', () => { void loadQuiz(); });
  void Promise.allSettled([loadDecks(), refreshSessions()]);
  const poll = setInterval(async () => { if (!state.authorized || !state.sessionId || state.polling || state.busy) return; state.polling = true; try { await loadSession(); } finally { state.polling = false; } }, 3000);
  window.addEventListener('pagehide', () => { clearInterval(poll); clearSession(); });
})();
