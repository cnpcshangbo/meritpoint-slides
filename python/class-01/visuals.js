(function () {
  'use strict';
  // Let native controls consume their keys before Reveal's document handler.
  // Do not preventDefault: Space/Enter must still produce a button click.
  document.querySelectorAll('.pyv').forEach(function (root) {
    root.addEventListener('keydown', function (event) {
      if (event.target.matches('input, select, textarea') ||
          (event.target.closest('button') && [' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))) {
        event.stopPropagation();
      }
    });
  });
  var loopNotes = ['Student: choose a question and make a prediction.', 'Student: decide what the numbers mean; record every attempt.', 'AI can help with code. The student runs it and checks the result.', 'Student: compare the result with the prediction. What should we test next?'];
  document.querySelectorAll('[data-pyv-loop]').forEach(function (root) {
    var step = 0, timer = null, play = root.querySelector('[data-pyv-play]');
    function stop() { clearInterval(timer); timer = null; play.textContent = '▶ Play'; play.setAttribute('aria-pressed', 'false'); }
    function show(index) { step = index; root.querySelectorAll('[data-pyv-step]').forEach(function (button, i) { button.classList.toggle('is-current', i === step); button.setAttribute('aria-pressed', String(i === step)); }); root.querySelector('[data-pyv-traveler]').style.left = (step / 3 * 100) + '%'; root.querySelector('[data-pyv-loop-note]').textContent = loopNotes[step]; }
    root.querySelectorAll('[data-pyv-step]').forEach(function (button) { button.addEventListener('click', function () { stop(); show(Number(button.dataset.pyvStep)); }); });
    root.querySelector('[data-pyv-next]').addEventListener('click', function () { stop(); show((step + 1) % 4); });
    play.addEventListener('click', function () { if (timer) return stop(); show(0); play.textContent = 'Ⅱ Pause'; play.setAttribute('aria-pressed', 'true'); timer = setInterval(function () { if (step === 3) return stop(); show(step + 1); }, 2200); });
    if (window.Reveal) Reveal.on('slidechanged', function (event) { if (!event.currentSlide.contains(root)) stop(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  });
  document.querySelectorAll('[data-pyv-shot]').forEach(function (root) {
    var initial = [1, 0, 1, 1, 0], shots = initial.slice(), explored = false, lastPrediction = null;
    var prediction = root.querySelector('[data-pyv-prediction]'), test = root.querySelector('[data-pyv-test]'), feedback = root.querySelector('[data-pyv-feedback]');
    function metrics() { var goals = shots.reduce(function (sum, value) { return sum + value; }, 0); return { goals: goals, attempts: shots.length, rate: goals / shots.length * 100 }; }
    function percent(value) { return Number(value.toFixed(1)) + '%'; }
    function validPrediction() { return prediction.value.trim() !== '' && Number.isFinite(Number(prediction.value)) && Number(prediction.value) >= 0 && Number(prediction.value) <= 100; }
    function refresh() {
      var result = metrics(), attempts = root.querySelector('[data-pyv-attempts]');
      attempts.replaceChildren(); shots.forEach(function (value, i) { var button = document.createElement('button'); button.type = 'button'; button.className = 'pyv-attempt' + (value ? ' is-goal' : ''); button.textContent = value; button.disabled = !explored; button.dataset.pyvAttempt = i; button.setAttribute('aria-label', 'Shot ' + (i + 1) + ': ' + (value ? 'goal' : 'miss') + '. Click to change.'); button.setAttribute('aria-pressed', String(Boolean(value))); button.addEventListener('click', function () { shots[i] = 1 - shots[i]; changed('Changed shot ' + (i + 1) + '.'); var replacement = attempts.querySelector('[data-pyv-attempt="' + i + '"]'); if (replacement) replacement.focus(); }); attempts.appendChild(button); });
      root.querySelector('[data-pyv-goals]').textContent = result.goals; root.querySelector('[data-pyv-attempt-count]').textContent = result.attempts; root.querySelector('[data-pyv-percent]').textContent = percent(result.rate); root.querySelector('[data-pyv-rate-label]').textContent = percent(result.rate); root.querySelector('[data-pyv-rate-bar]').style.width = result.rate + '%'; root.querySelector('[data-pyv-chart]').setAttribute('aria-label', 'Original success rate: 60 percent. Current success rate: ' + percent(result.rate) + '.');
      var delta = result.rate - 60; root.querySelector('[data-pyv-change]').textContent = Math.abs(delta) < 0.0001 ? 'Same rate as the original sample. Are the datasets also the same?' : Number(Math.abs(delta).toFixed(1)) + ' percentage points ' + (delta > 0 ? 'above' : 'below') + ' the original rate.';
      root.querySelector('[data-pyv-explore]').hidden = !explored; root.querySelector('[data-pyv-toggle-help]').textContent = explored ? 'Click a shot to change it. Up to 30 attempts.' : 'After your first test, click a shot to change it.';
      test.disabled = !validPrediction() || shots.length >= 30; root.querySelector('[data-pyv-goal]').disabled = shots.length >= 30; root.querySelector('[data-pyv-miss]').disabled = shots.length >= 30; root.querySelector('[data-pyv-undo]').disabled = shots.length <= 1;
    }
    function changed(message) { prediction.value = ''; feedback.textContent = message + ' Explain the new counts and rate. Predict again before your next test.'; refresh(); }
    prediction.addEventListener('input', function () { test.disabled = !validPrediction() || shots.length >= 30; });
    test.addEventListener('click', function () { if (!validPrediction() || shots.length >= 30) return; var guessed = Number(prediction.value), before = metrics(); shots.push(1); explored = true; var after = metrics(); lastPrediction = { guessed: guessed, beforeGoals: before.goals, beforeAttempts: before.attempts, actual: after.rate }; prediction.value = ''; refresh(); feedback.textContent = 'You predicted ' + percent(guessed) + '. Test: ' + after.goals + ' / ' + after.attempts + ' = ' + percent(after.rate) + '. Both the goal count and attempt count increased by 1.'; });
    root.querySelector('[data-pyv-goal]').addEventListener('click', function () { if (shots.length < 30) { shots.push(1); changed('Added a goal.'); } });
    root.querySelector('[data-pyv-miss]').addEventListener('click', function () { if (shots.length < 30) { shots.push(0); changed('Added a miss.'); } });
    root.querySelector('[data-pyv-undo]').addEventListener('click', function () { if (shots.length > 1) { shots.pop(); changed('Removed the last attempt.'); } });
    root.querySelector('[data-pyv-reset]').addEventListener('click', function () { shots = initial.slice(); explored = false; lastPrediction = null; prediction.value = ''; refresh(); feedback.textContent = 'Predict first. Then test and explain what changed.'; });
    root.querySelector('[data-pyv-download]').addEventListener('click', function () {
      var result = metrics(), data = '[' + shots.join(', ') + ']', note = '# My shot experiment\n\nSynthetic practice data: 1 = goal, 0 = miss.\n\nOriginal sample: 3 goals / 5 attempts = 60%.\nCurrent sample: ' + result.goals + ' goals / ' + result.attempts + ' attempts = ' + percent(result.rate) + '.\n\n';
      if (lastPrediction) note += 'My last prediction for one more goal was ' + percent(lastPrediction.guessed) + '; the test gave ' + percent(lastPrediction.actual) + ' (' + (lastPrediction.beforeGoals + 1) + ' / ' + (lastPrediction.beforeAttempts + 1) + ').\n\n';
      note += 'My explanation: [Write why the result changed.]\n\nAI suggested: [Record one suggestion.]\nMy test and decision: [What did I check, keep, change, or reject?]\n\nLimitation: This tiny synthetic sample does not establish real player skill.';
      var code = '# Synthetic practice data, not a real player study\nshots = ' + data + '\nprint("Goals:", sum(shots))\nprint("Attempts:", len(shots))\nprint("Success rate:", sum(shots) / len(shots) * 100, "%")\n';
      var notebook = { cells: [{ cell_type: 'markdown', metadata: {}, source: note.split(/(?<=\n)/) }, { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: code.split(/(?<=\n)/) }], metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python', version: '3' } }, nbformat: 4, nbformat_minor: 5 };
      notebook.cells.forEach(function (cell, i) { cell.id = 'shot-experiment-' + i; });
      var url = URL.createObjectURL(new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/x-ipynb+json' })), link = document.createElement('a'); link.href = url; link.download = 'my-shot-experiment.ipynb'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      feedback.textContent = 'Notebook downloaded with your current ' + shots.length + ' attempts. Add your explanation and AI decision.';
    });
    refresh();
  });
})();
(() => {
  const dialog=document.createElement('dialog');dialog.className='grid-dialog';dialog.setAttribute('aria-label','Visualize Python code');
  dialog.innerHTML='<div class="grid-dialog-bar"><strong>Python in Motion · your current code</strong><div><button type="button" data-grid-apply>Use edited code in slide</button><button type="button" data-grid-close>Return to slide</button></div></div>';
  document.body.appendChild(dialog);
  let frame=null,sourceLab=null,payload=null,opener=null;
  function pauseFrame(f){try{f.contentWindow.postMessage({type:'grid-lab-pause'},location.origin);}catch(_){}}
  function close(){if(frame){pauseFrame(frame);frame.remove();frame=null;}if(dialog.open)dialog.close();payload=null;sourceLab=null;if(opener)opener.focus();}
  function open(button){
    if(typeof stopAudio==='function')stopAudio();
    opener=button;sourceLab=button.closest('.lab');const section=button.closest('section');
    const code=sourceLab?sourceLab.querySelector('.code').value:'print("3" + "2")';
    payload={type:'grid-lab-load',sid:section.dataset.sid,title:section.querySelector('h2').textContent,code,originalCode:sourceLab?sourceLab.querySelector('.code').defaultValue:code};
    dialog.querySelector('[data-grid-apply]').hidden=!sourceLab;
    frame=document.createElement('iframe');frame.title='Visualize the current Python program';frame.src='grid-lab.html?embed=1&lesson='+encodeURIComponent(button.dataset.gridLesson||'types');dialog.appendChild(frame);dialog.showModal();
  }
  document.addEventListener('click',event=>{const button=event.target.closest('.grid-open');if(button)open(button);});
  dialog.querySelector('[data-grid-close]').addEventListener('click',close);
  dialog.querySelector('[data-grid-apply]').addEventListener('click',()=>{if(frame)frame.contentWindow.postMessage({type:'grid-lab-get-code'},location.origin);});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||!frame||event.source!==frame.contentWindow)return;
    if(event.data?.type==='grid-lab-ready'&&payload)frame.contentWindow.postMessage(payload,location.origin);
    if(event.data?.type==='grid-lab-code'&&sourceLab&&typeof event.data.code==='string'&&event.data.code.length<=16000){const ta=sourceLab.querySelector('.code');ta.value=event.data.code;ta.dispatchEvent(new Event('input',{bubbles:true}));if(typeof gutterSync==='function')gutterSync(sourceLab);close();}
  });
  if(window.Reveal)Reveal.on('slidechanged',event=>{close();document.querySelectorAll('.grid-preview').forEach(f=>{if(!event.currentSlide.contains(f))pauseFrame(f);});});
})();