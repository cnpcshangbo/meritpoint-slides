/* A terminable pygame player. Python draws every pixel and owns game rules. */
(() => {
  'use strict';
  const source = new URL(document.currentScript.src);
  const sections = [...document.querySelectorAll('section[data-engine="pygame"]')];
  const field = (s,q)=>s.querySelector(q);
  const WIDTH=480, HEIGHT=320, FPS=30;
  let active=null, last=null;
  const held=new Map();
  const notify=()=>window.dispatchEvent(new CustomEvent('trial:python-result'));
  function key(name,sourceId,down) {
    if (!active || active.paused || active.loading) return;
    if (!held.has(name)) held.set(name,new Set());
    if (down) held.get(name).add(sourceId); else held.get(name).delete(sourceId);
  }
  function clearKeys() { held.clear(); sections.forEach(s=>s.querySelectorAll('[data-game-key]').forEach(b=>b.classList.remove('is-held'))); }
  function message(section,text) { field(section,'[data-status]').textContent=text; }
  function clear(section) {
    if(last?.id===section.id)last=null;
    const canvas=field(section,'[data-game-canvas]'); if(!canvas)return;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#112e39'; ctx.fillRect(0,0,WIDTH,HEIGHT);
    field(section,'[data-game-state]').replaceChildren();
    field(section,'[data-game-overlay]').hidden=false;
    field(section,'[data-game-overlay]').textContent='Press Play to run your code.';
    field(section,'[data-game-frame]').textContent='No frames yet';
  }
  function textResult(run) {
    if(!run.frame)return run.output || 'No game frame completed. Play again to verify this code.';
    const values=Object.entries(run.state || {}).map(([k,v])=>k+': '+String(v));
    return (run.output ? run.output+'\n' : '')+'Frame '+run.frame+'\n'+values.join('\n')+(run.outputTruncated?'\n[Printed output limited to 12,000 characters.]':'')+(run.stateTruncated?'\n[Showing the first 24 scalar variables.]':'');
  }
  function renderState(run) {
    const box=field(run.section,'[data-game-state]'); box.replaceChildren();
    for (const [name,value] of Object.entries(run.state || {})) {
      const cell=document.createElement('div'), label=document.createElement('dt'), text=document.createElement('dd');
      label.textContent=name; text.textContent=typeof value==='number'&&!Number.isInteger(value) ? String(Math.round(value*1000)/1000) : String(value);
      cell.append(label,text); box.append(cell);
    }
    field(run.section,'[data-game-frame]').textContent='Frame '+run.frame+' · '+(run.paused ? 'paused' : 'running');
  }
  function stop(reason='Game stopped. Press Play to start a fresh game.', error='') {
    if (!active) return;
    const run=active; active=null;
    clearTimeout(run.timer); clearTimeout(run.lifetime); cancelAnimationFrame(run.raf); run.worker.terminate(); clearKeys();
    last={id:run.section.id,running:false,paused:false,loading:false,frame:run.frame,state:run.state,code:run.code};
    const lab=field(run.section,'[data-lab]');
    lab.dataset.liveRunStatus=error?'error':'stopped'; lab.dataset.liveRunCode=run.code; lab.dataset.lastError=error;
    field(run.section,'[data-output]').textContent=textResult(run)+(error?'\n'+error:'');
    field(run.section,'[data-run]').disabled=false; field(run.section,'[data-stop]').hidden=true;
    field(run.section,'[data-game-pause]').disabled=true; field(run.section,'[data-game-step]').disabled=true;
    const overlay=field(run.section,'[data-game-overlay]'); overlay.hidden=false; overlay.textContent=error?'Game stopped · check the error below.':'Stopped · Play starts a fresh game.';
    message(run.section,reason); field(run.section,'[data-game-frame]').textContent='Frame '+run.frame+' · stopped';
    run.onFinish?.({ok:!error && run.frame>0,cancelled:!error && !run.frame,output:textResult(run),error}); notify();
  }
  function deadline(run,ms,message) {
    clearTimeout(run.timer);
    run.timer=setTimeout(()=>{if(active===run)stop(message,'Execution timed out. A loop in your code may not be returning. Edit it, then Play again.');},ms);
  }
  function tick(run,dt) {
    if(active!==run||run.loading||run.pending)return;
    run.pending=true; run.lastSent=performance.now();
    deadline(run,2000,'Game stopped because a frame took too long.');
    run.worker.postMessage({type:'tick',dt,keys:[...held].filter(([,sources])=>sources.size).map(([name])=>name)});
  }
  function schedule(run) {
    if(active!==run||run.paused||run.loading)return;
    run.raf=requestAnimationFrame(time=>{
      if(active!==run||run.paused)return;
      if(!run.pending&&time-run.lastSent>=1000/FPS) tick(run,Math.min((time-run.lastSent)/1000,.05));
      schedule(run);
    });
  }
  function pause(section) {
    const run=active; if(!run||run.section!==section||run.loading)return;
    run.paused=!run.paused; clearKeys(); cancelAnimationFrame(run.raf);
    field(section,'[data-game-pause]').textContent=run.paused?'Resume':'Pause';
    field(section,'[data-game-step]').disabled=!run.paused||run.pending;
    field(section,'[data-lab]').dataset.liveRunStatus=run.paused?'stopped':'running';
    message(section,run.paused?'Paused. Inspect values or step one frame.':'Use the arrow keys or the buttons to play.');
    renderState(run); notify();
    if(!run.paused){run.lastSent=performance.now();field(section,'[data-game-canvas]').focus({preventScroll:true});schedule(run);}
  }
  function inspect(section) {
    if(active?.section===section&&!active.loading) {
      if(!active.paused)pause(section);
      field(section,'[data-game-inspector]').open=true;
      field(section,'[data-game-inspector]').scrollIntoView({block:'nearest'});
    } else message(section,'Play the game first, then pause to inspect its real Python values.');
  }
  function start(section,{code,onFinish}) {
    stop(); clear(section); window.TrialLabAudio?.stop(); window.PythonWorkspace?.stop?.();
    const url=new URL('trial-game-worker.js',source);url.search=source.search;
    let worker;
    try{worker=new Worker(url);}catch(error){message(section,'The game worker could not start. Reload and try again.');return;}
    const run={section,worker,code,onFinish,loading:true,paused:false,pending:false,frame:0,state:{},output:'',timer:null,raf:null,lifetime:null,lastSent:0,lastPublish:0};active=run;last=null;
    const lab=field(section,'[data-lab]');lab.dataset.liveRunStatus='running';lab.dataset.liveRunId=Date.now().toString();delete lab.dataset.liveRunCode;delete lab.dataset.lastError;
    field(section,'[data-output]').textContent='';field(section,'[data-run]').disabled=true;field(section,'[data-stop]').hidden=false;
    field(section,'[data-game-pause]').textContent='Pause';field(section,'[data-game-pause]').disabled=true;field(section,'[data-game-step]').disabled=true;
    field(section,'[data-game-overlay]').textContent='Loading Python + pygame…';message(section,'Loading the game tools. First use downloads about 12 MB extra.');
    deadline(run,90000,'Loading timed out. Check the connection and Play again.');
    worker.onmessage=({data})=>{
      if(active!==run)return;
      if(data.type==='status') {message(section,data.message || data.status);if(data.status==='running')deadline(run,10000,'Game setup did not finish.');return;}
      if(data.type==='error') {run.output=String(data.output||'');stop('Python reported an error. Read the last line below.',String(data.error||'Game could not run.'));return;}
      if(data.type==='ready') {
        clearTimeout(run.timer);run.loading=false;run.output=String(data.output||'');run.state=data.state||{};
        field(section,'[data-game-overlay]').hidden=true;field(section,'[data-game-pause]').disabled=false;lab.dataset.liveRunCode=code;
        message(section,'Use the arrow keys or the buttons to play. Pause to inspect your variables.');
        field(section,'[data-game-canvas]').focus({preventScroll:true});
        run.lifetime=setTimeout(()=>{if(active===run)stop('Ten-minute run limit reached. Play again to restart.');},600000);
        tick(run,0);schedule(run);notify();return;
      }
      if(data.type!=='frame')return;
      clearTimeout(run.timer);run.pending=false;
      if(data.width!==WIDTH||data.height!==HEIGHT||!(data.rgba instanceof ArrayBuffer)||data.rgba.byteLength!==WIDTH*HEIGHT*4){stop('The game returned an invalid frame.','Invalid game frame.');return;}
      const canvas=field(section,'[data-game-canvas]');canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data.rgba),WIDTH,HEIGHT),0,0);
      run.frame++;run.state=data.state||{};run.output=String(data.output||'');run.outputTruncated=!!data.outputTruncated;run.stateTruncated=!!data.stateTruncated;renderState(run);
      field(section,'[data-game-step]').disabled=!run.paused;
      if(performance.now()-run.lastPublish>250||run.paused) {
        field(section,'[data-output]').textContent=textResult(run);run.lastPublish=performance.now();notify();
      }
    };
    worker.onerror=event=>{if(active===run)stop('The game worker stopped unexpectedly.',event.message || 'Worker error.');};
    worker.postMessage({type:'init',code});notify();
  }
  function toDesktop(code) {
    return '# Install pygame-ce first: python -m pip install pygame-ce\n# Exported from Merit Point Python Game Lab.\nimport pygame\nWIDTH, HEIGHT = 480, 320\n\n'+code+'\n\n# Desktop runner supplied by the lab.\nif __name__ == "__main__":\n    pygame.init()\n    screen = pygame.display.set_mode((WIDTH, HEIGHT))\n    clock = pygame.time.Clock()\n    running = True\n    while running:\n        dt = min(clock.tick(30) / 1000, 0.05)\n        for event in pygame.event.get():\n            if event.type == pygame.QUIT:\n                running = False\n        pressed = pygame.key.get_pressed()\n        keys = {name for name, codes in {\n            "left": (pygame.K_LEFT, pygame.K_a),\n            "right": (pygame.K_RIGHT, pygame.K_d),\n            "up": (pygame.K_UP, pygame.K_w),\n            "down": (pygame.K_DOWN, pygame.K_s),\n            "space": (pygame.K_SPACE,),\n        }.items() if any(pressed[key] for key in codes)}\n        update(dt, keys)\n        draw(screen)\n        pygame.display.flip()\n    pygame.quit()\n';
  }
  const names={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',' ':'space',a:'left',d:'right',w:'up',s:'down'};
  document.addEventListener('keydown',event=>{
    if(!active||!event.target.matches('canvas[data-game-canvas]'))return;
    const name=names[event.key]||names[event.key.toLowerCase()];if(!name)return;event.preventDefault();key(name,'key:'+event.code,true);
  });
  document.addEventListener('keyup',event=>{const name=names[event.key]||names[event.key.toLowerCase()];if(name)key(name,'key:'+event.code,false);});
  window.addEventListener('blur',()=>{clearKeys();if(active&&!active.loading&&!active.paused)pause(active.section);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('Game stopped while this tab was hidden. Play again when ready.');});
  window.addEventListener('trial:identitychange',()=>{stop('Account changed.');last=null;sections.forEach(clear);});
  for(const section of sections) {
    clear(section);
    field(section,'[data-game-pause]').onclick=()=>pause(section);
    field(section,'[data-game-step]').onclick=()=>{if(active?.section===section&&active.paused&&!active.pending){field(section,'[data-game-step]').disabled=true;tick(active,1/FPS);}};
    for(const button of section.querySelectorAll('[data-game-key]')) {
      button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);button.focus({preventScroll:true});key(button.dataset.gameKey,'pointer:'+event.pointerId,true);button.classList.add('is-held');});
      for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{key(button.dataset.gameKey,'pointer:'+event.pointerId,false);button.classList.remove('is-held');});
      button.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();key(button.dataset.gameKey,'button:'+event.code,true);button.classList.add('is-held');}});
      button.addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();key(button.dataset.gameKey,'button:'+event.code,false);button.classList.remove('is-held');}});
      button.addEventListener('blur',clearKeys);
    }
    field(section,'[data-game-canvas]').addEventListener('blur',clearKeys);
  }
  window.PythonGameLab={start,stop,clear,inspect,toDesktop,isActive:section=>active?.section===section};
  window.TrialGame={getState:()=>active?{id:active.section.id,running:!active.loading&&!active.paused,paused:active.paused,loading:active.loading,frame:active.frame,state:active.state,code:active.code}:last,stop};
})();
