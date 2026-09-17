'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const lessons = JSON.parse($('grid-lessons').textContent);
  const params = new URLSearchParams(location.search);
  if (params.has('embed')) document.body.classList.add('embed');
  const version = new URL(document.currentScript.src).searchParams.get('v') || '1';
  const STORAGE = 'mpa-python-in-motion-v1';
  let stored = { drafts: {}, runs: [] };
  try { const s = JSON.parse(localStorage.getItem(STORAGE) || 'null'); if(s && s.drafts && Array.isArray(s.runs)) stored = s; } catch (_) { $('storage-note').textContent = 'Browser saving is unavailable. Download your run record.'; }
  let active = lessons.find(l => l.id === params.get('lesson')) || lessons[0];
  let customLesson = null;
  let worldConfig, snapshot, previousLocals = {}, selectedLine = 0, editingMap = false;
  let worker = null, request = 0, busy = false, timeout = null, playback = null, events = [], cursor = -1;
  let lastRun = null, dirty = false, audioManifest = {}, audioSteps = [], audioIndex = 0, audioMode = null;
  const audio = $('audio');
  const clone = value => JSON.parse(JSON.stringify(value));
  const samePoint = (a,b) => a[0] === b[0] && a[1] === b[1];
  const directions = ['east →','north ↑','west ←','south ↓'];
  const stopPlayback = () => { clearTimeout(playback); playback = null; $('play').textContent = 'Replay'; };
  function saveDraft() {
    const draft={ code:$('code').value, prediction:$('prediction').value, reflection:$('reflection').value, world:worldConfig };
    try {
      const fresh=JSON.parse(localStorage.getItem(STORAGE)||'null');
      const merged=fresh?.drafts&&Array.isArray(fresh.runs)?fresh:{drafts:{},runs:[]};
      const runKey=r=>r.id||r.time+'|'+r.lesson;
      const runs=new Map(merged.runs.map(r=>[runKey(r),r]));
      for(const r of stored.runs)if(!runs.has(runKey(r)))runs.set(runKey(r),r);
      if(lastRun&&!dirty){lastRun.reflection=$('reflection').value;const r=runs.get(runKey(lastRun));if(r)r.reflection=lastRun.reflection;}
      merged.runs=[...runs.values()].sort((a,b)=>a.time.localeCompare(b.time)).slice(-30);
      merged.drafts[active.id]=draft;stored=merged;localStorage.setItem(STORAGE,JSON.stringify(stored));
    } catch (_) { stored.drafts[active.id]=draft;$('storage-note').textContent='Browser saving is full or unavailable. Download your work.'; }
  }
  function updateHistory() {
    $('history').replaceChildren();
    stored.runs.forEach((r,i) => {
      const tr=document.createElement('tr');
      [i+1,r.title,r.world?.moves??'—',r.outcome,r.prediction].forEach(value=>{const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);});
      $('history').appendChild(tr);
    });
    $('run-count').textContent='('+stored.runs.length+')';$('csv').disabled=!stored.runs.length;
    const completed=new Set(stored.runs.filter(r=>r.outcome==='Goal reached'||r.outcome==='Expected output').map(r=>r.lesson));
    $('progress').textContent=lessons.filter(l=>completed.has(l.id)).length+' / '+lessons.length+' examples checked';
  }
  function highlight(line,error=false) {
    selectedLine=Number(line)||0;
    const mark=$('line-highlight');mark.hidden=!selectedLine;
    if(!selectedLine) return;
    const y=12+(selectedLine-1)*26,ta=$('code');
    if(y < ta.scrollTop || y > ta.scrollTop+ta.clientHeight-42) ta.scrollTop=Math.max(0,y-65);
    mark.style.top=(y-ta.scrollTop)+'px';mark.classList.toggle('error',error);
    $('line-numbers').style.top=(12-ta.scrollTop)+'px';
  }
  function syncEditor() { $('line-numbers').textContent=$('code').value.split('\n').map((_,i)=>i+1).join('\n');highlight(selectedLine); }
  function initialWorld() { return {width:worldConfig.width,height:worldConfig.height,x:worldConfig.start[0],y:worldConfig.start[1],direction:worldConfig.direction||0,goal:worldConfig.goal,walls:worldConfig.walls||[],trail:[worldConfig.start],moves:0,speech:''}; }
  function drawWorld(w) {
    snapshot=w;const grid=$('grid');grid.replaceChildren();grid.style.gridTemplateColumns='repeat('+w.width+',minmax(0,1fr))';
    const walls=new Set(w.walls.map(p=>p.join(','))),trail=new Set((w.trail||[]).map(p=>p.join(',')));
    for(let y=0;y<w.height;y++) for(let x=0;x<w.width;x++) {
      const p=[x,y],key=p.join(','),isDuck=x===w.x&&y===w.y,isGoal=samePoint(p,w.goal);
      const cell=document.createElement('button');cell.type='button';cell.className='cell';
      cell.classList.toggle('wall',walls.has(key));cell.classList.toggle('visited',trail.has(key));cell.classList.toggle('goal',isGoal);cell.classList.toggle('duck',isDuck);
      cell.dataset.edit=String(editingMap);cell.disabled=!editingMap||samePoint(p,worldConfig.start)||isGoal;
      cell.setAttribute('aria-label','Column '+x+', row '+y+': '+(isDuck?'duck, facing '+directions[w.direction]:isGoal?'goal':walls.has(key)?'wall':'path')+(editingMap&&!cell.disabled?'. Toggle wall.':''));
      if(isDuck){const duck=document.createElement('span');duck.className='duck-icon';duck.textContent='🦆';const arrow=document.createElement('span');arrow.className='direction';arrow.textContent=['→','↑','←','↓'][w.direction];cell.append(duck,arrow);}else if(isGoal)cell.textContent='⚑';
      cell.addEventListener('click',()=>{
        if(!editingMap||cell.disabled)return;
        const current=worldConfig.walls.findIndex(q=>samePoint(p,q));if(current>=0)worldConfig.walls.splice(current,1);else worldConfig.walls.push(p);
        invalidate('Map changed. Predict the result, then run again.');drawWorld(initialWorld());saveDraft();
      });grid.appendChild(cell);
    }
    $('position').textContent='Position ('+w.x+', '+w.y+') · '+directions[w.direction];$('moves').textContent=w.moves+' moves';
    $('speech').textContent=String(w.speech||'');$('speech').hidden=!w.speech;
  }
  const format = value => value===null?'None':typeof value==='boolean'?(value?'True':'False'):typeof value==='string'?JSON.stringify(value):Array.isArray(value)?'['+value.map(format).join(', ')+']':JSON.stringify(value) ?? String(value);
  function drawValues(locals) {
    const container=$('values');container.replaceChildren();
    const entries=Object.entries(locals||{});
    if(!entries.length){const p=document.createElement('p');p.className='empty';p.textContent='No user variables in this frame yet.';container.appendChild(p);}
    entries.forEach(([name,record])=>{
      const card=document.createElement('div');card.className='value-card';card.classList.toggle('changed',JSON.stringify(previousLocals[name])!==JSON.stringify(record));
      const n=document.createElement('span');n.className='name';n.textContent=name;
      const type=document.createElement('span');type.className='type';type.textContent=record.type;card.append(n,type);
      const value=record.value;
      if(Array.isArray(value)){
        const list=document.createElement('div');list.className='list-values';
        value.forEach((v,i)=>{const item=document.createElement('span');item.className='list-item';const index=document.createElement('span');index.className='list-index';index.textContent='['+i+']';const box=document.createElement('span');box.className='list-value';box.textContent=format(v);item.append(index,box);list.appendChild(item);});
        if(!value.length)list.textContent='[]';card.appendChild(list);
      }else if(value&&typeof value==='object'){
        const table=document.createElement('div');table.className='dictionary';Object.entries(value).forEach(([k,v])=>{const key=document.createElement('span');key.className='key';key.textContent=JSON.stringify(k);const val=document.createElement('span');val.textContent=format(v);table.append(key,val);});card.appendChild(table);
      }else{const content=document.createElement('div');content.className='value-content'+(record.type==='str'?' string':'');content.textContent=typeof value==='string'&&record.type!=='str'?value:format(value);card.appendChild(content);}
      container.appendChild(card);
    });previousLocals=clone(locals||{});
  }
  function showEvent(index) {
    if(!events.length)return;
    cursor=Math.max(0,Math.min(index,events.length-1));const event=events[cursor];
    highlight(event.line,event.phase==='error');drawWorld(event.world);drawValues(event.locals);
    $('output').textContent=event.output||'(No printed output yet.)';
    $('scope').textContent=event.scope || (event.phase==='return'?'Return':'Current frame');
    $('trace-note').textContent=(event.line?'Line '+event.line+' · ':'')+(event.phase==='before'?'Before execution: ':'')+event.message;
    $('trace-note').classList.toggle('error',event.phase==='error');
    $('step').disabled=cursor>=events.length-1;
    if(cursor===events.length-1){stopPlayback();$('output').textContent=lastRun.output||'(No printed output.)';$('status').textContent=lastRun.outcome+(lastRun.error?': '+lastRun.error.message:'. Compare the result with your prediction.');}
  }
  function replay() {
    if(!events.length)return;
    if(cursor>=events.length-1)cursor=-1;
    const tick=()=>{showEvent(cursor+1);if(cursor<events.length-1){$('play').textContent='Pause replay';playback=setTimeout(tick,400);}};tick();
  }
  function invalidate(message) {
    stopPlayback();stopAudio();events=[];cursor=-1;lastRun=null;dirty=true;highlight(0);previousLocals={};
    $('play').disabled=true;$('step').disabled=true;$('rewind').disabled=true;$('download').disabled=true;$('python').disabled=true;
    $('status').textContent=message;$('status').classList.remove('error');$('trace-note').textContent='Your last visual result is out of date. Run the changed program.';$('trace-note').classList.remove('error');
    $('output').textContent='Run your changed code to update this output.';drawValues({});updateAudioButtons();
  }
  function cancel(message='Python stopped. Your code is still here.') {
    if(worker){worker.terminate();worker=null;}clearTimeout(timeout);request++;busy=false;$('run').disabled=false;$('cancel').hidden=true;$('code').readOnly=false;
    $('lesson').disabled=false;$('restore').disabled=false;$('edit-map').disabled=false;$('prediction').readOnly=false;
    if(message)$('status').textContent=message;
  }
  function outcome(result) {
    if(result.error)return result.error.type||'Python error';
    if(active.success.kind==='output')return result.output.includes(active.success.contains)?'Expected output':'Different output';
    if(active.success.kind==='run')return 'Run complete';
    return result.world.x===worldConfig.goal[0]&&result.world.y===worldConfig.goal[1]?'Goal reached':'Stopped before goal';
  }
  function ensureWorker() {
    if(worker)return;
    worker=new Worker('grid-worker.js?v='+version);
    worker.onerror=()=>cancel('Python could not start. Check your connection, then try Run again.');
  }
  function run() {
    if(busy)return;
    if($('code').value.length>16000){$('status').textContent='This program is too long for the teaching lab (16,000 characters maximum). Shorten it and try again.';$('status').classList.add('error');return;}
    if(!$('prediction').value.trim()){$('status').textContent='Write a short prediction before running.';$('prediction').focus();return;}
    invalidate('Loading Python…');dirty=false;busy=true;editingMap=false;$('edit-map').setAttribute('aria-pressed','false');drawWorld(initialWorld());
    const runCode=$('code').value,runWorld=clone(worldConfig),prediction=$('prediction').value.trim();
    $('run').disabled=true;$('cancel').hidden=false;$('code').readOnly=true;$('prediction').readOnly=true;$('lesson').disabled=true;$('restore').disabled=true;$('edit-map').disabled=true;
    const id=++request;
    try{ensureWorker();}catch(_){cancel('This browser could not start Python. Try a current desktop browser.');return;}
    timeout=setTimeout(()=>cancel('Python took too long and was stopped. Check the loop condition or try again after loading.'),60000);
    worker.onmessage=event=>{
      const data=event.data;if(data.id!==id||id!==request)return;
      if(data.type==='status'){
        $('status').textContent=data.message;
        if(/running/i.test(data.message)){clearTimeout(timeout);timeout=setTimeout(()=>cancel('This run exceeded the time limit. Your code is preserved; check for a loop that never ends.'),12000);}
        return;
      }
      if(data.type==='error'){cancel('Python could not run: '+data.message);return;}
      if(data.type!=='result')return;
      clearTimeout(timeout);busy=false;$('run').disabled=false;$('cancel').hidden=true;$('code').readOnly=false;$('prediction').readOnly=false;$('lesson').disabled=false;$('restore').disabled=false;$('edit-map').disabled=false;
      const result=data.result;
      lastRun={schemaVersion:1,id:crypto.randomUUID(),time:new Date().toISOString(),lesson:active.id,title:active.title,code:runCode,config:runWorld,prediction,reflection:$('reflection').value,world:result.world,output:result.output,error:result.error,outcome:outcome(result),events:result.events};
      events=result.events;cursor=-1;previousLocals={};
      const saved=clone(lastRun);delete saved.events;stored.runs.push(saved);stored.runs=stored.runs.slice(-30);saveDraft();updateHistory();
      $('play').disabled=!events.length;$('step').disabled=!events.length;$('rewind').disabled=!events.length;$('download').disabled=false;$('python').disabled=false;
      $('status').textContent='Python finished. Replaying '+events.length+' recorded steps.';$('status').classList.toggle('error',Boolean(result.error));
      if(events.length){if(matchMedia('(prefers-reduced-motion: reduce)').matches)showEvent(0);else replay();}
      else{$('output').textContent=result.output||'(No printed output.)';$('status').textContent=lastRun.outcome+(result.error?': '+result.error.message:'');if(result.error)highlight(result.error.line,true);}
      updateAudioButtons();
    };
    worker.postMessage({id,code:runCode,config:runWorld});
  }
  function stopAudio() {audio.pause();audio.onended=null;audio.removeAttribute('src');audioMode=null;audioSteps=[];$('audio-pause').hidden=true;$('audio-stop').hidden=true;$('caption').hidden=true;$('audio-pause').textContent='Pause audio';}
  function updateAudioButtons() {
    const entry=audioManifest[active.id];const matches=$('code').value===active.code;
    $('listen').disabled=!entry?.narration;$('explain').disabled=!entry?.steps?.length||!matches;
    $('audio-note').textContent=!matches?'Line audio explains the example. Restore it to listen.':entry?'English narration':'Loading English audio…';
  }
  function playClip(clip) {
    $('caption').hidden=false;$('caption').textContent=clip.text;
    if(clip.line)highlight(clip.line);
    audio.src=clip.file+(clip.hash?'?v='+clip.hash:'');audio.load();
    $('audio-pause').hidden=false;$('audio-stop').hidden=false;$('audio-pause').textContent='Pause audio';
    audio.play().catch(()=>{$('audio-note').textContent='Audio did not play. Press Resume audio to try again.';$('audio-pause').textContent='Resume audio';});
  }
  function startAudio(mode) {
    stopPlayback();stopAudio();const entry=audioManifest[active.id];if(!entry)return;
    audioMode=mode;audioIndex=0;
    audioSteps=mode==='listen'?[entry.narration]:entry.steps;
    if(mode==='explain'&&$('code').value!==active.code)return;
    audio.onended=()=>{if(audioIndex<audioSteps.length-1){audioIndex++;playClip(audioSteps[audioIndex]);}else stopAudio();};
    playClip(audioSteps[0]);
  }
  function choose(lesson,loadedCode) {
    if(busy)cancel(null);stopPlayback();stopAudio();active=lesson;
    const saved=stored.drafts[active.id];worldConfig=clone(saved?.world||active.world);
    $('title').textContent=active.title;$('concept').textContent=active.concept;$('goal').textContent=active.goal;$('description').textContent=active.description;
    $('hint').textContent=active.hint;$('prediction-prompt').textContent=active.prediction;
    $('code').value=loadedCode??saved?.code??active.code;$('prediction').value=saved?.prediction||'';$('reflection').value=saved?.reflection||'';
    document.body.classList.toggle('values-mode',active.view==='values');$('view-title').textContent=active.view==='values'?'Python values':'Grid world';
    editingMap=false;$('edit-map').setAttribute('aria-pressed','false');invalidate('Predict first, then run your code.');dirty=false;drawWorld(initialWorld());syncEditor();
    $('trace-note').textContent='The highlighted line and values follow your actual Python run.';
    $('lesson').value=active.id;updateAudioButtons();
    if(!active.id.startsWith('slide-'))history.replaceState(null,'',location.pathname+location.search+'#'+active.id);
  }
  function download(name,text,mime) {const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  $('lesson').addEventListener('change',()=>{saveDraft();choose(lessons.find(l=>l.id===$('lesson').value)||(customLesson?.id===$('lesson').value?customLesson:active));});
  $('code').addEventListener('input',()=>{invalidate('Code changed. Predict the result and run again.');drawWorld(initialWorld());syncEditor();saveDraft();});
  $('code').addEventListener('scroll',()=>highlight(selectedLine));
  $('code').addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.target.readOnly&&!busy){e.preventDefault();const ta=e.target,start=ta.selectionStart,end=ta.selectionEnd;ta.setRangeText('    ',start,end,'end');ta.dispatchEvent(new Event('input'));}e.stopPropagation();});
  $('prediction').addEventListener('input',saveDraft);$('reflection').addEventListener('input',saveDraft);
  $('run').addEventListener('click',run);$('cancel').addEventListener('click',()=>cancel());
  $('play').addEventListener('click',()=>{stopAudio();if(playback)stopPlayback();else replay();});
  $('step').addEventListener('click',()=>{stopPlayback();stopAudio();showEvent(cursor+1);});
  $('rewind').addEventListener('click',()=>{stopPlayback();stopAudio();cursor=-1;highlight(0);previousLocals={};drawWorld(initialWorld());drawValues({});$('output').textContent='Replay is at the start.';$('step').disabled=!events.length;$('trace-note').textContent='Before the first Python line.';});
  $('restore').addEventListener('click',()=>{delete stored.drafts[active.id];choose(active,active.code);saveDraft();});
  $('edit-map').addEventListener('click',()=>{stopPlayback();editingMap=!editingMap;$('edit-map').setAttribute('aria-pressed',String(editingMap));$('map-note').textContent=editingMap?'Select a tile to add or remove a wall. The start and goal stay fixed.':'The arrow shows the duck’s direction. ⚑ marks the goal.';drawWorld(initialWorld());});
  $('listen').addEventListener('click',()=>startAudio('listen'));$('explain').addEventListener('click',()=>startAudio('explain'));
  $('audio-pause').addEventListener('click',()=>{if(audio.paused){audio.play().catch(()=>{});$('audio-pause').textContent='Pause audio';}else{audio.pause();$('audio-pause').textContent='Resume audio';}});
  $('audio-stop').addEventListener('click',stopAudio);
  $('download').addEventListener('click',()=>{if(!lastRun)return;const record={...lastRun,reflection:$('reflection').value};download('python-'+active.id+'-run.json',JSON.stringify(record,null,2),'application/json');});
  $('python').addEventListener('click',async()=>{
    if(!lastRun)return;
    const record=lastRun;
    try{const response=await fetch('grid-engine.py?v='+version);if(!response.ok)throw new Error('Missing engine');const engine=await response.text();
      const tail='\n\n# My recorded Python experiment\nimport json\nstudent_code = '+JSON.stringify(record.code)+'\nconfig = json.loads('+JSON.stringify(JSON.stringify(record.config))+')\nresult = run_student(student_code, config)\nprint(result["output"])\nprint(json.dumps({"world": result["world"], "error": result["error"]}, indent=2))\n';
      download('python-'+record.lesson+'-experiment.py',engine+tail,'text/x-python');
    }catch(_){$('status').textContent='Could not prepare the Python download. Download the run record or try again.';}
  });
  $('csv').addEventListener('click',()=>{saveDraft();const quote=v=>{const text=String(v??'');return '"'+(/^[=+@\-]/.test(text)?"'":'')+text.replace(/"/g,'""')+'"';};const rows=[['run','time','concept','moves','result','prediction','reflection','map_json','code'],...stored.runs.map((r,i)=>[i+1,r.time,r.title,r.world?.moves??'',r.outcome,r.prediction,r.reflection,JSON.stringify(r.config),r.code])];download('python-run-comparison.csv',rows.map(r=>r.map(quote).join(',')).join('\n'),'text/csv;charset=utf-8');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPlayback();stopAudio();if(busy)cancel('Run stopped while the lab was hidden. Your code is preserved.');}});
  window.addEventListener('message',async event=>{
    if(event.origin!==location.origin||event.source!==parent)return;
    const data=event.data;
    if(data?.type==='grid-lab-get-code'){parent.postMessage({type:'grid-lab-code',code:$('code').value},location.origin);return;}
    if(data?.type==='grid-lab-pause'){stopPlayback();stopAudio();if(busy)cancel('Run stopped after leaving the slide.');return;}
    if(data?.type!=='grid-lab-load'||typeof data.code!=='string'||data.code.length>16000)return;
    saveDraft();
    const custom={...lessons[0],id:'slide-'+data.sid,title:String(data.title||'Visualize this code'),concept:'Your lesson code',description:'Follow your code one line at a time. Each name points to its current Python value.',goal:'Predict the values and printed output. Run, inspect and explain.',prediction:'What do you predict this code will display?',hint:'Compare the highlighted name with the names defined earlier. Lists show an index above each value.',code:data.originalCode||data.code,view:'values',success:{kind:'run'}};
    customLesson=custom;
    let option=$('lesson').querySelector('[data-custom]');if(!option){option=document.createElement('option');option.dataset.custom='true';$('lesson').appendChild(option);}option.value=custom.id;option.textContent='Current slide · '+custom.title;
    choose(custom,data.code);
    try{const [wr,nr]=await Promise.all([fetch('audio/walkthrough.json'),fetch('audio/narration.json')]);const walks=await wr.json(),narrations=await nr.json(),w=walks[data.sid],n=narrations[data.sid];audioManifest[custom.id]={narration:n?{text:n.script,file:'audio/'+data.sid+'.mp3',hash:n.hash}:null,steps:(w?.steps||[]).map(s=>({line:s.lines[0],text:s.text,file:'audio/'+s.file,hash:w.hash}))};if(active.id===custom.id)updateAudioButtons();}catch(_){}
  });
  window.addEventListener('pagehide',()=>{stopPlayback();stopAudio();if(worker)worker.terminate();});
  const hashLesson=lessons.find(l=>l.id===location.hash.slice(1));choose(hashLesson||active);updateHistory();
  fetch('grid-audio/manifest.json?v='+version).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{audioManifest={...audioManifest,...data};updateAudioButtons();}).catch(()=>{$('audio-note').textContent='English audio is unavailable. Read the hint or try reloading.';});
  if(parent!==window)parent.postMessage({type:'grid-lab-ready'},location.origin);
})();
