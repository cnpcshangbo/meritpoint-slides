'use strict';
(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const sections=$$('section[data-sid]'),audio=$('#narratorAudio');
const store={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
let index=0,narration={},walkthrough={},mode='slide',activeKey='',guide=null,audioToken=0,cc=store.get('trial-captions')!=='off';
const clock=s=>{s=Math.floor(Number.isFinite(s)?s:0);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const current=()=>sections[index];
const reading=new URLSearchParams(location.search).has('reading');
if(reading)document.body.classList.add('tl-reading');
function stopAudio(){audioToken++;audio.pause();audio.currentTime=0;activeKey='';guide=null;$('#listenText').textContent='Listen';$('#listenBtn').classList.remove('playing');$('#listenBtn').setAttribute('aria-pressed','false');$('#listenBtn').setAttribute('aria-label','Listen to this slide');$('#audioPosition').value=0;$('#audioTime').textContent='English narration';$('#caption').textContent='';$$('.tl-guide-indicator').forEach(e=>e.remove());}
function navigate(next,hash=true){
 stopAudio();index=Math.max(0,Math.min(sections.length-1,next));
 sections.forEach((s,i)=>{s.classList.toggle('is-current',i===index);s.inert=!reading&&i!==index;s.setAttribute('aria-hidden',String(!reading&&i!==index));});
 current().scrollTop=0;$('#pageCount').textContent=(index+1)+' / '+sections.length;$('#prevSlide').disabled=index===0;$('#nextSlide').disabled=index===sections.length-1;$('#lessonProgress').style.width=(index+1)/sections.length*100+'%';
 const title=current().querySelector('h1').textContent;$('#slideAnnouncement').textContent='Slide '+(index+1)+' of '+sections.length+': '+title;document.title=title+' · Python trial lesson';
 if(hash)history.replaceState(null,'','#/'+current().id);
 $('#listenBtn').disabled=!narration[current().id];
 dispatchEvent(new CustomEvent('trial:slidechange',{detail:{id:current().id,index}}));
}
function fromHash(){const id=location.hash.replace(/^#\/?/,'');const at=sections.findIndex(s=>s.id===id);navigate(at<0?0:at,false);}
window.addEventListener('hashchange',fromHash);$('#prevSlide').onclick=()=>navigate(index-1);$('#nextSlide').onclick=()=>navigate(index+1);
document.addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,button,a,[contenteditable],summary'))return;
 if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();navigate(index+1);}
 if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();navigate(index-1);}
 if(e.key==='Home'){e.preventDefault();navigate(0);}if(e.key==='End'){e.preventDefault();navigate(sections.length-1);}
});
$('#tocBtn').onclick=()=>$('#tocDialog').showModal();
$$('[data-go]').forEach(b=>b.onclick=()=>{navigate(Number(b.dataset.go));$('#tocDialog').close();});
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$$('dialog').forEach(d=>d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
$('#notesBtn').onclick=()=>{$('#notesText').textContent=current().querySelector('.notes').textContent;$('#notesDialog').showModal();};
$('#transcriptBtn').onclick=()=>{$('#transcriptText').textContent=narration[current().id]?.script||'Narration is loading. Please try again in a moment.';$('#transcriptDialog').showModal();};
function updateAudio(){
 const running=!audio.paused&&!audio.ended;$('#listenBtn').classList.toggle('playing',running);$('#listenBtn').setAttribute('aria-pressed',String(running));$('#listenText').textContent=running?'Pause':activeKey?'Resume':'Listen';$('#listenBtn').setAttribute('aria-label',running?'Pause audio':activeKey?'Resume audio':'Listen to this slide');
 $('#audioTime').textContent=activeKey?clock(audio.currentTime)+' / '+clock(audio.duration):'English narration';
 if(Number.isFinite(audio.duration)&&audio.duration>0)$('#audioPosition').value=audio.currentTime/audio.duration*100;
 let caption='';
 if(cc&&activeKey){if(mode==='walk')caption=guide?.steps[guide.at]?.text||'';else caption=(narration[current().id]?.cues||[]).find(c=>audio.currentTime>=c.start&&audio.currentTime<c.end)?.text||'';}
 $('#caption').textContent=caption;
}
async function playSource(src,key){
 const token=++audioToken;audio.pause();audio.src=src;activeKey=key;audio.playbackRate=Number($('#audioSpeed').value);$('#listenText').textContent='Loading…';
 try{await audio.play();if(token===audioToken)updateAudio();}catch(e){if(token!==audioToken)return;$('#listenText').textContent='Retry';$('#audioTime').textContent='Audio unavailable · read transcript';$('#listenBtn').classList.remove('playing');}
}
$('#listenBtn').onclick=async()=>{
 if(activeKey&&(mode==='walk'||activeKey===current().id)){if(!audio.paused){audio.pause();updateAudio();}else{try{await audio.play();updateAudio();}catch{ $('#listenText').textContent='Retry';}}return;}
 // Stop resets either mode; the next Listen starts the current slide narration.
 stopAudio();mode='slide';const sid=current().id,entry=narration[sid];if(!entry)return;playSource('audio/'+sid+'.mp3?v='+entry.hash,sid);
};
$('#stopAudioBtn').onclick=stopAudio;$('#audioSpeed').onchange=()=>{audio.playbackRate=Number($('#audioSpeed').value);};
$('#audioPosition').addEventListener('input',()=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number($('#audioPosition').value)/100;updateAudio();});
$('#ccBtn').setAttribute('aria-pressed',String(cc));$('#ccBtn').onclick=()=>{cc=!cc;store.set('trial-captions',cc?'on':'off');$('#ccBtn').setAttribute('aria-pressed',String(cc));updateAudio();};
['timeupdate','loadedmetadata','pause','playing','seeked'].forEach(name=>audio.addEventListener(name,updateAudio));
audio.addEventListener('error',()=>{if(activeKey){$('#listenText').textContent='Retry';$('#audioTime').textContent='Audio unavailable · read transcript';}});
function playGuideStep(){
 if(!guide)return;if(guide.at>=guide.steps.length){stopAudio();return;}
 const step=guide.steps[guide.at],lab=$('[data-lab="'+guide.sid+'"]'),code=lab.querySelector('textarea');
 let indicator=lab.querySelector('.tl-guide-indicator');if(!indicator){indicator=document.createElement('div');indicator.className='tl-guide-indicator';lab.querySelector('.tl-editor').append(indicator);}
 indicator.textContent='Starter explanation · '+(guide.at+1)+' / '+guide.steps.length+' · lines '+step.lines.join('–');
 const lines=code.value.split('\n');let start=0;for(let i=0;i<step.lines[0]-1;i++)start+=lines[i].length+1;let end=start;for(let i=step.lines[0]-1;i<step.lines[1];i++)end+=lines[i].length+1;
 code.focus({preventScroll:true});code.setSelectionRange(start,end-1);code.scrollTop=Math.max(0,(step.lines[0]-2)*22);
 mode='walk';playSource('audio/'+step.file+'?v='+walkthrough[guide.sid].hash,guide.sid+'-walk-'+guide.at);
}
audio.addEventListener('ended',()=>{if(guide){guide.at++;playGuideStep();}else stopAudio();});
$$('[data-walk]').forEach(button=>button.onclick=()=>{
 const sid=button.dataset.walk,plan=walkthrough[sid],lab=button.closest('[data-lab]');
 if(!plan){lab.querySelector('.tl-lab-status').textContent='Code explanation is not available yet.';return;}
 const editor=lab.querySelector('textarea');if(editor.value!==editor.defaultValue){lab.querySelector('.tl-lab-status').textContent='This guide explains the starter. Save your edits, then choose Reset code to hear it.';return;}
 stopAudio();guide={sid,at:0,steps:plan.steps};playGuideStep();
});
Promise.all([fetch('audio/narration.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}),fetch('audio/walkthrough.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{})]).then(([n,w])=>{narration=n;walkthrough=w;$('#listenBtn').disabled=!narration[current().id];}).catch(()=>{$('#audioTime').textContent='Audio unavailable';});

// Python worker: explicitly started by the student, with cancellation and a time limit.
let worker=null,prepareTask=null,runTask=null,loadTimer=null,runTimer=null,seq=0,ready=false;
function updateRuntime(text){$('#pythonReady').textContent=text;}
function finishRun(result){
 if(!runTask)return;clearTimeout(runTimer);const task=runTask;runTask=null;task.resolve(result);
}
function terminate(message){
 if(worker)worker.terminate();worker=null;ready=false;clearTimeout(loadTimer);clearTimeout(runTimer);
 if(prepareTask){prepareTask.reject(new Error(message));prepareTask=null;}
 finishRun({error:message});updateRuntime(message+' You can try again.');
}
function ensureWorker(){
 if(worker)return;worker=new Worker('python-worker.js');
 worker.onerror=()=>terminate('Python could not load. Check the connection and try again.');
 worker.onmessage=({data})=>{
  if(data.type==='status'){updateRuntime(data.text);if(runTask)runTask.lab.querySelector('.tl-lab-status').textContent=data.text;return;}
  if(data.type==='ready'){ready=true;clearTimeout(loadTimer);updateRuntime('Python is ready. Open the next slide to run your first program.');if(prepareTask){prepareTask.resolve();prepareTask=null;}return;}
  if(data.type==='result'&&runTask?.id===data.id)finishRun(data);
  if(data.type==='error'){if(prepareTask&&!runTask)terminate('Python could not start. Check the connection and try again.');else if(runTask?.id===data.id)finishRun({error:data.error});}
 };
}
async function prepare(){
 if(ready)return;if(prepareTask)return prepareTask.promise;ensureWorker();
 let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});prepareTask={resolve,reject,promise};
 loadTimer=setTimeout(()=>terminate('Python loading timed out.'),120000);worker.postMessage({type:'prepare'});return promise;
}
$('#preparePython').onclick=async()=>{const b=$('#preparePython');b.disabled=true;try{await prepare();b.textContent='✓ Python ready';}catch(e){updateRuntime(e.message);}finally{b.disabled=false;}};
$$('[data-run]').forEach(button=>button.onclick=async()=>{
 const lab=button.closest('[data-lab]'),sid=lab.dataset.lab,status=lab.querySelector('.tl-lab-status'),out=lab.querySelector('[data-output]'),plots=lab.querySelector('[data-plots]');
 if(runTask){status.textContent='Another program is running. Stop it or wait for it to finish.';return;}
 stopAudio();button.disabled=true;lab.querySelector('[data-cancel]').hidden=false;out.textContent='';plots.replaceChildren();lab.querySelector('.tl-output').classList.remove('is-error');
 lab.dataset.liveRunStatus='running';lab.dataset.liveRunId=String(Date.now());lab.dataset.lastError='';lab.dataset.liveRunCode=lab.querySelector('textarea').value;
 dispatchEvent(new CustomEvent('courseware:python-run'));
 try{
   status.textContent=ready?'Running your code…':'Loading Python for your first run…';await prepare();
   if(runTask){status.textContent='Another program is running. Please try again when it finishes.';return;}
   const id=++seq;let resolve;const promise=new Promise(r=>{resolve=r;});runTask={id,resolve,lab};
   const plot=lab.dataset.packages==='matplotlib';runTimer=setTimeout(()=>terminate('Run stopped after the time limit.'),plot?120000:30000);
   lab.dataset.liveRunCode=lab.querySelector('textarea').value;
   worker.postMessage({type:'run',id,code:lab.dataset.liveRunCode,plot});const result=await promise;
   lab.dataset.liveRunStatus=result.error ? (/stopped|time limit/i.test(result.error)?'stopped':'error') : 'success';lab.dataset.lastError=result.error || '';
   if(result.error){status.textContent='The program needs a check. Read the final error line, edit, then run again.';out.textContent=result.error;lab.querySelector('.tl-output').classList.add('is-error');}
   else{status.textContent='Python finished. Compare the result with your prediction.';out.textContent=result.output||((result.figures||[]).length?'':'Program finished with no printed output.');(result.figures||[]).forEach(base64=>{const img=document.createElement('img');img.src='data:image/png;base64,'+base64;img.alt='Chart generated by your Python code';plots.append(img);});store.set('trial-python-'+sid,JSON.stringify({code:lab.querySelector('textarea').value,output:result.output,at:new Date().toISOString()}));dispatchEvent(new CustomEvent('trial:python-result',{detail:{sid,output:result.output}}));}
 }catch(e){status.textContent=e.message;lab.dataset.liveRunStatus='error';lab.dataset.lastError=e.message;}finally{button.disabled=false;lab.querySelector('[data-cancel]').hidden=true;dispatchEvent(new CustomEvent('courseware:python-run'));}
});
$$('[data-cancel]').forEach(b=>b.onclick=()=>terminate('Run stopped.'));
$$('[data-reset]').forEach(b=>b.onclick=()=>{const lab=b.closest('[data-lab]'),editor=lab.querySelector('textarea');if(runTask?.lab===lab)terminate('Run stopped.');stopAudio();editor.value=editor.defaultValue;lab.querySelector('[data-output]').textContent='';lab.querySelector('[data-plots]').replaceChildren();lab.querySelector('.tl-lab-status').textContent='Starter restored. Predict, then run again.';lab.querySelector('.tl-output').classList.remove('is-error');});
$$('.code').forEach(editor=>editor.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();editor.closest('[data-lab]').querySelector('[data-run]').click();}}));
window.TrialLesson={navigate,getCurrent:()=>current().id,stopAudio,preparePython:prepare,terminatePython:terminate};
fromHash();
})();

(function client() {
  'use strict';
  function init() {
    if (window.TrialLessonInteractions) return;
    const original = [1, 0, 1, 1, 0];
    const storageKey = 'hopeembark-python-trial-v1';
    const q = (selector) => document.querySelector(selector);
    const qa = (selector) => Array.from(document.querySelectorAll(selector));
    let storageWorks = true;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) { storageWorks = false; }
    if (typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    const state = {
      prediction: ['closer', 'same', 'unsure'].includes(saved.prediction) ? saved.prediction : '',
      challenge: {scenario: 'core', prediction: '', tested: false, values: original.slice(), edited: false},
      notes: {prediction: '', change: '', result: '', limit: ''},
      downloads: [],
    };
    if (saved.notes && typeof saved.notes === 'object') Object.keys(state.notes).forEach((key) => { if (typeof saved.notes[key] === 'string') state.notes[key] = saved.notes[key].slice(0,600); });
    const sc = saved.challenge;
    if (sc && ['core','stretch'].includes(sc.scenario) && Array.isArray(sc.values) && sc.values.length === (sc.scenario === 'core' ? 5 : 6) && sc.values.every((v) => v === 0 || v === 1) && sc.tested === true && Number.isFinite(Number(sc.prediction)) && sc.prediction !== '' && Number(sc.prediction) >= 0 && Number(sc.prediction) <= 100) {
      state.challenge = {scenario:sc.scenario,prediction:String(sc.prediction),tested:true,values:sc.values.slice(),edited:!!sc.edited};
    }
    function text(selector, value) { const el=q(selector); if(el) el.textContent=value; }
    function show(selector, visible) { qa(selector).forEach((el) => { el.hidden=!visible; }); }
    function progress(kind) { document.dispatchEvent(new CustomEvent('trial:progress',{detail:{kind}})); }
    function save() {
      try { localStorage.setItem(storageKey,JSON.stringify(state)); storageWorks=true; } catch (_) { storageWorks=false; }
      text('[data-trial-save-status]', storageWorks ? 'Saved in this browser. No name or account needed.' : 'Kept in this tab only. Download your note to keep it.');
    }
    function rate(values) { return values.reduce((a,b)=>a+b,0) / values.length * 100; }
    function fmt(value) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
    function summary() {
      const c=state.challenge;
      text('[data-trial-note-summary]',c.tested ? 'Notebook uses your current test: ['+c.values.join(', ')+'] → '+c.values.reduce((a,b)=>a+b,0)+' / '+c.values.length+' = '+fmt(rate(c.values))+'%'+(c.edited ? ' (includes your edited outcomes).' : '.') : 'No challenge test yet. The download will use the original data: 3 / 5 = 60%.');
    }
    function renderPrediction() {
      qa('[data-trial-prediction]').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.trialPrediction===state.prediction)));
      if(state.prediction) text('[data-trial-prediction-status]','Prediction saved: '+({closer:'closer shots',same:'about the same',unsure:'not sure yet'}[state.prediction])+'. Look for evidence as you go.');
    }
    qa('[data-trial-prediction]').forEach((button)=>button.addEventListener('click',()=>{state.prediction=button.dataset.trialPrediction;renderPrediction();save();progress('prediction');}));
    renderPrediction();
    const totals=q('[data-trial-totals]');
    if(totals) totals.addEventListener('click',()=>{const open=totals.getAttribute('aria-expanded')!=='true';totals.setAttribute('aria-expanded',String(open));totals.textContent=open?'Hide the totals':'Check my counts';show('[data-trial-total]',open);text('[data-trial-total-status]',open?'3 m: 4 of 5 = 80%. 6 m: 3 of 5 = 60%. 9 m: 2 of 5 = 40%.':'Count the 1s in each group. What stays the same?');if(open)progress('data');});
    const chartState={labels:false,values:false,pattern:false};
    qa('[data-trial-chart-reveal]').forEach((button)=>button.addEventListener('click',()=>{
      const key=button.dataset.trialChartReveal;chartState[key]=!chartState[key];button.setAttribute('aria-expanded',String(chartState[key]));
      show(key==='labels'?'[data-trial-chart-label]':key==='values'?'[data-trial-chart-value]':'[data-trial-chart-pattern]',chartState[key]);
      if(key==='labels')show('[data-trial-chart-placeholder]',!chartState.labels);
      button.textContent=chartState[key]?({labels:'Hide distances',values:'Hide exact rates',pattern:'Hide the pattern'}[key]):({labels:'Reveal distances',values:'Reveal exact rates',pattern:'Describe the pattern'}[key]);
      const chart=q('[data-trial-chart]');
      if(chart)chart.setAttribute('aria-label','Goal rate, full zero to one hundred percent scale. '+[80,60,40].map((n,i)=>(chartState.labels?[3,6,9][i]+' metres':'Group '+(i+1))+': '+(chartState.values?n+' percent':['highest bar','middle bar','lowest bar'][i])).join('. ')+'. Five synthetic shots per group.');
      text('[data-trial-chart-status]',chartState[key]?({labels:'From left to right: 3 metres, 6 metres, 9 metres.',values:'From left to right: 80%, 60%, 40%.',pattern:'The rate decreases as distance increases in this small synthetic dataset. This alone does not show cause.'}[key]):'Chart detail hidden.');if(chartState[key])progress('chart');
    }));
    function renderChallenge(message) {
      const c=state.challenge;
      qa('input[name="trial-scenario"]').forEach((el)=>{el.checked=el.value===c.scenario;});
      const prediction=q('[data-trial-rate-prediction]');if(prediction)prediction.value=c.prediction;
      show('[data-trial-before-test]',!c.tested);show('[data-trial-after-test]',c.tested);
      if(c.tested){
        const goals=c.values.reduce((a,b)=>a+b,0);const current=rate(c.values);
        text('[data-trial-result-rate]',fmt(current)+'%');text('[data-trial-result-formula]',goals+' goals ÷ '+c.values.length+' shots × 100 = '+fmt(current)+'%');
        text('[data-trial-prediction-feedback]',c.edited?'Your first prediction: '+c.prediction+'%. You are now exploring edited outcomes.':Math.abs(Number(c.prediction)-current)<0.11?'Your prediction matches this result. Explain why the denominator is '+c.values.length+'.':'You predicted '+c.prediction+'%. Compare the number of goals and the number of shots.');
        const shots=q('[data-trial-edit-shots]');
        if(shots){shots.replaceChildren();c.values.forEach((value,index)=>{const button=document.createElement('button');button.type='button';button.className='trial-shot '+(value?'trial-shot-goal':'trial-shot-miss');button.textContent=String(value);button.dataset.trialEditShot=String(index);button.setAttribute('aria-label','Shot '+(index+1)+': '+(value?'goal':'miss')+'. Change to '+(value?'miss':'goal')+'.');button.setAttribute('aria-pressed',String(!!value));button.addEventListener('click',()=>{c.values[index]=value?0:1;c.edited=true;renderChallenge('Changed shot '+(index+1)+'. The current rate is '+fmt(rate(c.values))+'%.');const replacement=q('[data-trial-edit-shot="'+index+'"]');if(replacement)replacement.focus({preventScroll:true});save();progress('explore');});shots.append(button);});}
      }
      if(message)text('[data-trial-challenge-status]',message);summary();
    }
    qa('input[name="trial-scenario"]').forEach((input)=>input.addEventListener('change',()=>{if(!input.checked)return;state.challenge={scenario:input.value,prediction:'',tested:false,values:original.slice(),edited:false};renderChallenge('New scenario. Start again from the original five shots and make a new prediction.');save();}));
    const predictionInput=q('[data-trial-rate-prediction]');
    if(predictionInput)predictionInput.addEventListener('input',()=>{predictionInput.setCustomValidity('');});
    const form=q('[data-trial-challenge-form]');
    if(form)form.addEventListener('submit',(event)=>{event.preventDefault();const input=q('[data-trial-rate-prediction]');const prediction=Number(input.value);if(input.value.trim()===''||!Number.isFinite(prediction)||prediction<0||prediction>100){input.setCustomValidity('Enter your prediction from 0 to 100 first.');input.reportValidity();return;}input.setCustomValidity('');const c=state.challenge;c.prediction=input.value;c.values=original.slice();if(c.scenario==='core')c.values[c.values.length-1]=1;else c.values.push(1);c.tested=true;c.edited=false;renderChallenge('Test complete. '+(c.scenario==='core'?'Replacing keeps five shots.':'Appending creates a sixth shot.')+' Try another outcome using the shot buttons.');save();progress('challenge');});
    function resetChallenge(){state.challenge={scenario:'core',prediction:'',tested:false,values:original.slice(),edited:false};if(predictionInput)predictionInput.setCustomValidity('');renderChallenge('Reset to the original five shots. Choose a change and predict again.');save();}
    const reset=q('[data-trial-reset-challenge]');if(reset)reset.addEventListener('click',resetChallenge);
    renderChallenge(state.challenge.tested?'Restored your latest test from this browser.':'Your test will appear here.');
    qa('[data-trial-answer]').forEach((button)=>button.addEventListener('click',()=>{const key=button.dataset.trialAnswer;const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));button.textContent=(open?'Hide ':'Reveal ')+key+' answer';show('[data-trial-answer-detail="'+key+'"]',open);text('[data-trial-answer-status]',open?(key==='core'?'Replace: 4 goals in 5 shots gives 80%.':'Append: 4 goals in 6 shots gives about 66.7%.'):'Each answer starts from the original five shots.');if(open)progress('reveal');}));
    qa('[data-trial-ai-choice]').forEach((button)=>button.addEventListener('click',()=>{qa('[data-trial-ai-choice]').forEach((el)=>el.setAttribute('aria-pressed',String(el===button)));show('[data-trial-ai-evidence]',true);text('[data-trial-ai-status]',button.dataset.trialAiChoice==='check'?'You spotted what needs checking: the number of attempts changes too.':'A useful trap to catch: 80% would be 4 out of 5. Adding a shot makes it 4 out of 6.');progress('ai-check');}));
    qa('[data-trial-note]').forEach((field)=>{const key=field.dataset.trialNote;field.value=state.notes[key]||'';field.addEventListener('input',()=>{state.notes[key]=field.value.slice(0,600);save();});});
    function code(){const c=state.challenge;const lines=['# Synthetic classroom data: 1 = goal, 0 = miss','shots = [1, 0, 1, 1, 0]'];if(c.tested){lines.push(c.scenario==='core'?'shots[-1] = 1':'shots.append(1)');if(c.edited)lines.push('# Outcomes edited after the first classroom test','shots = ['+c.values.join(', ')+']');}lines.push('goals = sum(shots)','attempts = len(shots)','rate = goals / attempts * 100','print(f"{goals} goals / {attempts} shots = {rate:.1f}%")');return lines.join('\n')+'\n';}
    function markdown(){const c=state.challenge;const labels={prediction:'I predicted',change:'I changed',result:'I observed',limit:'My result cannot tell me'};return '# My first Python research note\n\nSynthetic classroom data. 1 = goal; 0 = miss.\n\n'+Object.keys(labels).map((key)=>'## '+labels[key]+'\n\n'+(state.notes[key].trim()||'(Not filled in yet.)')).join('\n\n')+'\n\n## Current experiment\n\nOriginal: `[1, 0, 1, 1, 0]` → 3 / 5 = 60%.\n\n'+(c.tested?'Change: '+(c.scenario==='core'?'replace the last miss with a goal':'append a new goal')+'.\n\nPrediction before test: '+c.prediction+'%.\n\nCurrent data'+(c.edited?' (including edited outcomes)':'')+': `['+c.values.join(', ')+']` → '+c.values.reduce((a,b)=>a+b,0)+' / '+c.values.length+' = '+fmt(rate(c.values))+'%.':'No challenge test has been run. The code uses the original five shots.')+'\n\nThe slide activity is an arithmetic simulation. Run the code below in a Python notebook to reproduce the calculation. This small synthetic sample cannot establish what causes real-world scoring differences.\n\n## Python\n\n```python\n'+code()+'```\n';}
    function notebook(){return{cells:[{cell_type:'markdown',metadata:{},source:markdown().split('## Python\n')[0]},{cell_type:'code',execution_count:null,metadata:{},outputs:[],source:code()}],metadata:{kernelspec:{display_name:'Python 3',language:'python',name:'python3'},language_info:{name:'python',file_extension:'.py',mimetype:'text/x-python'}},nbformat:4,nbformat_minor:4};}
    qa('[data-trial-download]').forEach((button)=>button.addEventListener('click',()=>{const kind=button.dataset.trialDownload;const contents=kind==='md'?markdown():JSON.stringify(notebook(),null,2);const blob=new Blob([contents],{type:kind==='md'?'text/markdown;charset=utf-8':'application/x-ipynb+json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='my-python-research-note.'+kind;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);if(!state.downloads.includes(kind))state.downloads.push(kind);save();text('[data-trial-download-status]',(kind==='md'?'Research note':'Python notebook')+' download started with your current data. Keep it as your first research artifact.');progress('download');}));
    summary();
    text('[data-trial-save-status]',storageWorks?'Your note stays in this browser. No name or account needed.':'Kept in this tab only. Download your note to keep it.');
    window.TrialLessonInteractions={getState:()=>JSON.parse(JSON.stringify(state)),resetChallenge,exportMarkdown:markdown,exportNotebook:notebook};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
(function client() {
  function init() {
    const root=document.getElementById('python-uses');
    if(!root)return;
    const buttons=[...root.querySelectorAll('[data-python-use]')];
    buttons.forEach(button=>button.addEventListener('click',()=>{
      const selected=button.getAttribute('aria-pressed')!=='true';
      buttons.forEach(other=>other.setAttribute('aria-pressed',String(selected&&other===button)));
      root.querySelector('[data-use-interest]').textContent=selected?button.dataset.useQuestion:'Which would you like to explore? Pick a card.';
      root.querySelector('[data-use-interest-zh]').textContent=selected?button.dataset.useQuestionZh:'你最想探索哪一个？点选一张图卡。';
    }));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();