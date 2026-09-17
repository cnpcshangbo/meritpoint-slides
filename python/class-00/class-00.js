(function client(move) {
  const root=document.querySelector('.c0-robot'); if(!root)return;
  let wall=[1,1],state;
  function render(){
    root.querySelectorAll('[data-cell]').forEach(cell=>{
      const [x,y]=cell.dataset.cell.split(',').map(Number),current=x===state.x&&y===state.y,isWall=x===wall[0]&&y===wall[1];
      cell.classList.toggle('wall',isWall);cell.classList.toggle('current',current);
      cell.querySelector('b').textContent=current?'● HERE':isWall?'WALL':x===2&&y===2?'GOAL':x===0&&y===0?'START':'';
    });
    root.querySelector('.c0-board').setAttribute('aria-label',`Three by three grid. Position ${'ABC'[state.x]}${state.y+1}, goal C3, wall ${'ABC'[wall[0]]}${wall[1]+1}.`);
    root.querySelector('.c0-grid-status').textContent=(state.commands.length?'Commands: '+state.commands.join(' ')+' · ':'')+state.message;
    root.querySelectorAll('[data-move]').forEach(button=>button.disabled=state.stopped||state.finished);
    root.querySelector('[data-grid-wall]').textContent=wall[0]===1?'Move wall to C2':'Restore wall to B2';
  }
  function reset(){state={x:0,y:0,wall,commands:[],stopped:false,finished:false,message:'At A1. Write a route before moving.'};render();}
  root.querySelectorAll('[data-move]').forEach(button=>button.addEventListener('click',()=>{state=move(state,button.dataset.move);render();}));
  root.querySelector('[data-grid-reset]').addEventListener('click',reset);
  root.querySelector('[data-grid-wall]').addEventListener('click',()=>{wall=wall[0]===1?[2,1]:[1,1];reset();});
  reset();
})(function move(state, command) {
  if (state.stopped || state.finished) return state;
  const next = { ...state, commands: [...state.commands, command] };
  const x = state.x + (command === 'E' ? 1 : 0), y = state.y + (command === 'N' ? 1 : 0);
  if (!['E','N'].includes(command) || x > 2 || y > 2 || (x === state.wall[0] && y === state.wall[1])) {
    next.stopped = true; next.message = 'Stopped: blocked move. Keep this result, then reset and revise.'; return next;
  }
  next.x=x; next.y=y; next.finished=x===2&&y===2;
  next.message = next.finished ? 'Goal reached. Now change the wall and test your original route.' : `At ${'ABC'[x]}${y+1}. What comes next?`;
  return next;
});
(function client(lampOn,routeTrace) {
  document.querySelectorAll('[data-lamp-sim]').forEach(root=>{
    const slider=root.querySelector('[data-brightness]'),rule=root.querySelector('[data-rule]');
    let hasTest=false;
    function render(){
      const n=Number(slider.value),inclusive=rule?.value==='draft',on=lampOn(n,inclusive),expected=lampOn(n),matches=on===expected;
      root.querySelector('[data-brightness-label]').textContent=n;
      root.querySelector('[data-input]').textContent=n;
      root.querySelector('[data-condition]').textContent=`${n} ${inclusive?'≤':'<'} 30: ${on?'true':'false'}`;
      root.querySelector('[data-lamp-output]').textContent='Lamp '+(on?'ON':'OFF');
      root.querySelector('[data-daylight]').setAttribute('opacity',String(.04+n*.006));
      root.querySelector('[data-sky]').setAttribute('opacity',String(.08+n*.009));
      root.querySelector('[data-sun]').setAttribute('opacity',String(n*.01));
      root.querySelector('[data-beam]').setAttribute('opacity',on?'1':'0');
      root.querySelector('[data-bulb]').setAttribute('fill',on?'#ffe99b':'#68858d');
      root.classList.toggle('lamp-on',on);root.classList.toggle('mismatch',!matches);
      root.querySelector('[data-lamp-verdict]').textContent=rule
        ? `${matches?'Matches':'Mismatch'}: at ${n}, the requirement says ${expected?'ON':'OFF'}; this rule gives ${on?'ON':'OFF'}.`
        : on ? 'It is below 30. The lamp turns on.' : 'It is 30 or above. The lamp turns off.';
      root.querySelector('.c0-room title').textContent=`Simulated room at brightness ${n}. Lamp ${on?'on':'off'}.`;
      if(hasTest)showTests();
    }
    function showTests(){
      hasTest=true;const inclusive=rule.value==='draft',rows=[10,50,30,0,100].map(n=>({n,actual:lampOn(n,inclusive),expected:lampOn(n)}));
      const passed=rows.filter(r=>r.actual===r.expected).length;
      root.querySelector('[data-light-results]').innerHTML=`<strong>${passed}/5 match the requirement</strong><div class="c0-test-cases">${rows.map(r=>`<div class="${r.actual===r.expected?'pass':'fail'}"><b>${r.n}</b><span>Expected ${r.expected?'ON':'OFF'}</span><span>Actual ${r.actual?'ON':'OFF'} ${r.actual===r.expected?'✓':'✕'}</span></div>`).join('')}</div>`;
    }
    slider.addEventListener('input',render);rule?.addEventListener('change',render);
    root.querySelectorAll('[data-light-preset]').forEach(b=>b.addEventListener('click',()=>{slider.value=b.dataset.lightPreset;render();}));
    root.querySelector('[data-lamp-test]')?.addEventListener('click',showTests);
    render();
  });
  document.querySelectorAll('[data-route-sim]').forEach(root=>{
    const input=root.querySelector('[data-route]');let commands=[],traces=[],step=0,timer=null;
    const stop=()=>{if(timer!==null)clearInterval(timer);timer=null;root.querySelector('[data-route-run]').textContent='Run both maps';};
    function reset(){
      stop();step=0;const value=input.value.toUpperCase().replace(/[\s,→]/g,'');
      if(!/^[EN]{1,12}$/.test(value)){commands=[];traces=[];render();root.querySelector('[data-route-status]').textContent='Use 1–12 E or N commands. E = east; N = north.';return false;}
      commands=[...value];traces=[routeTrace(commands,[1,1]),routeTrace(commands,[2,1])];render();return true;
    }
    function render(){
      root.querySelector('[data-route-commands]').replaceChildren(...commands.map((command,i)=>{const b=document.createElement('span');b.textContent=`${i+1} · ${command==='E'?'East':'North'}`;b.className=i===step-1?'active':i<step?'done':'';return b;}));
      root.querySelectorAll('[data-map]').forEach((map,i)=>{
        const frame=traces[i]?.[Math.min(step,traces[i].length-1)]||{x:0,y:0,status:'ready'};
        const history=traces[i]?.slice(0,step+1)||[];
        map.querySelectorAll('[data-position]').forEach(cell=>{
          const [x,y]=cell.dataset.position.split(',').map(Number),here=x===frame.x&&y===frame.y;
          cell.classList.toggle('here',here);cell.classList.toggle('visited',history.some(s=>s.x===x&&s.y===y));
          const wall=cell.classList.contains('wall');cell.querySelector('b').textContent=wall?'WALL':here?'● HERE':x===2&&y===2?'GOAL':x===0&&y===0?'START':'';
        });
        const position='ABC'[frame.x]+(frame.y+1),finished=step>0&&frame.status==='goal',blocked=step>0&&frame.status==='blocked';
        const message=finished?'✓ Reached C3':blocked?`✕ Stopped at ${position} · command ${traces[i].length-1}`:step===0?'Ready at A1':`At ${position}${step>=commands.length?' · route unfinished':''}`;
        map.querySelector('[data-map-result]').textContent=message;map.dataset.result=finished?'goal':blocked?'blocked':step===0?'ready':'moving';
        map.querySelector('[role="img"]').setAttribute('aria-label',`${i===0?'Original':'Changed'} map. ${message}.`);
      });
      const max=traces.length?Math.max(...traces.map(t=>t.length-1)):0,done=step>=max&&step>0;
      root.querySelector('[data-route-step]').disabled=!commands.length||done;
      root.querySelector('[data-route-run]').disabled=!commands.length;
      root.querySelector('[data-route-status]').textContent=done?'Test complete. Keep the same maps, change your program, and compare.':step?`Executing command ${step} of ${commands.length}.`:'Same program, two maps. Predict which will reach C3.';
    }
    function advance(){if(!commands.length)return;step=Math.min(step+1,Math.max(...traces.map(t=>t.length-1)));render();if(step>=Math.max(...traces.map(t=>t.length-1)))stop();}
    root.querySelector('[data-route-step]').addEventListener('click',()=>{stop();advance();});
    root.querySelector('[data-route-reset]').addEventListener('click',reset);
    root.querySelector('[data-route-run]').addEventListener('click',()=>{
      if(timer!==null){stop();return;}if(!reset())return;
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){step=Math.max(...traces.map(t=>t.length-1));render();return;}
      advance();if(step<Math.max(...traces.map(t=>t.length-1))){timer=setInterval(advance,600);root.querySelector('[data-route-run]').textContent='Pause';}
    });
    root.querySelectorAll('[data-route-preset]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.routePreset;reset();}));
    input.addEventListener('input',reset);
    if(window.Reveal)Reveal.on('slidechanged',()=>{if(!root.closest('section')?.classList.contains('present'))stop();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});reset();
  });
})(function lampOn(brightness, inclusive=false) {
  return inclusive ? brightness <= 30 : brightness < 30;
},function routeTrace(commands, wall) {
  let x=0,y=0; const frames=[{x,y,status:'ready',command:null}];
  for(const command of commands){
    const nx=x+(command==='E'?1:0),ny=y+(command==='N'?1:0);
    if(!['E','N'].includes(command))throw new Error('Use E and N commands only.');
    if(nx>2||ny>2||(nx===wall[0]&&ny===wall[1])){
      frames.push({x,y,status:'blocked',command});return frames;
    }
    x=nx;y=ny;frames.push({x,y,status:x===2&&y===2?'goal':'moving',command});
    if(x===2&&y===2)return frames;
  }
  if(frames.at(-1).status!=='goal')frames.at(-1).status='unfinished';
  return frames;
});
(function client(tasks,stories){
  const map=document.querySelector('[data-language-map]');if(map)map.querySelectorAll('[data-lm-task]').forEach(b=>b.addEventListener('click',()=>{const t=tasks.find(x=>x.id===b.dataset.lmTask);map.querySelectorAll('[data-lm-task]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));map.querySelectorAll('[data-lm-language]').forEach(x=>x.classList.toggle('selected',t.tools.includes(x.dataset.lmLanguage)));map.querySelector('[data-lm-title]').textContent=t.title;map.querySelector('[data-lm-text]').textContent=t.text;const flow=map.querySelector('[data-lm-flow]');flow.replaceChildren();t.flow.forEach((x,i)=>{if(i){const arrow=document.createElement('span');arrow.textContent='↓';flow.append(arrow);}const step=document.createElement('b');step.textContent=x;flow.append(step);});}));
  const history=document.querySelector('[data-language-history]');if(history)history.querySelectorAll('[data-history]').forEach(b=>b.addEventListener('click',()=>{const s=stories.find(x=>x.id===b.dataset.history);history.querySelectorAll('[data-history]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));for(const key of ['title','text','prompt'])history.querySelector('[data-history-'+key+']').textContent=s[key];history.querySelector('[data-history-source]').href=s.source;history.querySelector('[data-history-art]').innerHTML='<svg viewBox="0 0 420 265" role="img" aria-label="'+s.name+' teaching illustration">'+s.art+'</svg>';}));
})([{"id":"data","label":"Investigate data","tools":["Python","SQL","R"],"title":"Turn records into an answer","text":"SQL selects records. Python or R can analyze them, build models and draw charts.","flow":["Database","Table","Model + chart","Evidence"]},{"id":"web","label":"Build a website","tools":["JavaScript / TypeScript","Python","SQL"],"title":"One website, several languages","text":"JavaScript runs browser interactions. A Python service can do calculations; SQL can query stored records.","flow":["Browser","Service","Database","Response"]},{"id":"robot","label":"Control a robot","tools":["C / C++","Python"],"title":"Connect planning with physical control","text":"Python can explore a plan or analyze sensor logs. C or C++ is common close to embedded hardware.","flow":["Sensor","Controller","Motor","New reading"]},{"id":"app","label":"Create an app","tools":["Java / C#","JavaScript / TypeScript","Python"],"title":"Choose an ecosystem for the application","text":"Java and C# have substantial application ecosystems. Web and Python tools also build many kinds of apps.","flow":["User action","Application","Stored state","Result"]},{"id":"story","label":"Animate a story","tools":["Scratch / Blockly","JavaScript / TypeScript","Python"],"title":"Make a rule visible","text":"Scratch supports creative coding. Blockly helps developers build block editors, like our lamp companion.","flow":["Event","Blocks","Changed scene","Next event"]}],[{"id":"basic","year":"1964","name":"BASIC","title":"Who gets to use a computer?","text":"At Dartmouth, BASIC and time-sharing opened computing to students across campus. Undergraduates helped build the system.","prompt":"Programming could become something more students could try.","source":"https://www.dartmouth.edu/basicfifty/","art":"<path d=\"M145 42h130v85H145zM30 162h105v65H30zM285 162h105v65H285zM210 127v24H83v11M210 151h128v11\"/><text x=\"210\" y=\"92\">COMPUTER</text><text x=\"82\" y=\"201\">STUDENT</text><text x=\"338\" y=\"201\">STUDENT</text>"},{"id":"vb","year":"1991","name":"Visual Basic","title":"A button becomes a starting point.","text":"Visual Basic 1.0 was demonstrated on May 20, 1991. Visual forms and event handlers connected interface design with code.","prompt":"A button is easy to recognize. What rule should run when it is clicked?","source":"https://devblogs.microsoft.com/vbteam/happy-20th-birthday-visual-basic/","art":"<path d=\"M65 35h290v195H65zM65 66h290\"/><rect x=\"140\" y=\"88\" width=\"140\" height=\"50\" rx=\"8\"/><text x=\"210\" y=\"119\">DRAW</text><path d=\"M210 140v32\"/><text x=\"210\" y=\"199\">event → rule → result</text>"},{"id":"python","year":"1989 → 1991","name":"Python","title":"A holiday project with a comedy name.","text":"Guido van Rossum began Python during the 1989 Christmas holidays and shared it publicly in February 1991. Its name came from Monty Python.","prompt":"A useful tool can begin with one person’s practical problem.","source":"https://docs.python.org/3/faq/general.html#why-was-python-created-in-the-first-place","art":"<path d=\"M65 45h290v175H65zM65 85h290\"/><text x=\"210\" y=\"72\">DECEMBER 1989</text><text x=\"210\" y=\"133\">an idea + some time</text><text x=\"210\" y=\"180\">→ a new language</text>"}]);
(function client(examples) {
  document.querySelectorAll('[data-research-map]').forEach(root=>{
    function select(id) {
      const example=examples.find(e=>e.id===id);if(!example)return;
      root.querySelectorAll('[data-rm-example]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.rmExample===id)));
      for(const key of ['method','title','question','evidence','python','limit'])root.querySelector('[data-rm-'+key+']').textContent=example[key];
    }
    function field(id) {
      root.querySelectorAll('[data-rm-field]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.rmField===id)));
      root.querySelectorAll('[data-rm-point-field]').forEach(button=>button.hidden=button.dataset.rmPointField!==id);
      const first=examples.find(e=>e.field===id);if(first)select(first.id);
    }
    root.querySelectorAll('[data-rm-field]').forEach(button=>button.addEventListener('click',()=>field(button.dataset.rmField)));
    root.querySelectorAll('[data-rm-example]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.rmExample)));
  });
  document.querySelectorAll('[data-digital-twin]').forEach(root=>{
    let linked=false,readingIndex=0;const readings=[24,28,22,26];
    const slider=root.querySelector('[data-dt-vent]');
    function render() {
      const reading=readings[readingIndex],opening=Number(slider.value),baseline=linked?reading:24,estimate=baseline+2-.04*opening;
      root.classList.toggle('c0-dt-connected',linked);
      root.querySelectorAll('[data-dt-mode]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.dtMode==='linked')===linked)));
      root.querySelector('[data-dt-reading]').textContent=reading.toFixed(1)+'°C';root.querySelector('[data-dt-sensor]').textContent=reading.toFixed(1)+'°';
      root.querySelector('[data-dt-link-text]').textContent=linked?'Update the model':'No data link';
      root.querySelector('[data-dt-vent-label]').textContent=opening+'%';
      root.querySelector('[data-dt-baseline]').textContent=linked?'Starts from the latest example: '+reading.toFixed(1)+'°C':'Starts from a chosen 24.0°C';
      root.querySelector('[data-dt-prediction]').textContent=estimate.toFixed(1)+'°C';
      root.querySelector('[data-dt-status]').textContent=linked
        ? 'The example reading now updates the model. A real twin also needs a real data connection and validation.'
        : 'A simulation can explore “what if?” without a connection to a real greenhouse.';
    }
    root.querySelectorAll('[data-dt-mode]').forEach(button=>button.addEventListener('click',()=>{linked=button.dataset.dtMode==='linked';render();}));
    root.querySelector('[data-dt-next]').addEventListener('click',()=>{readingIndex=(readingIndex+1)%readings.length;render();});slider.addEventListener('input',render);render();
  });
})([{"id":"bio-data","field":"biology","label":"Gene database","x":24,"y":24,"method":"Existing data","title":"Compare gene-expression groups","question":"Do the recorded groups show different patterns?","evidence":"Existing gene-expression records, such as NCBI GEO.","python":"Read tables, compare groups, plot differences.","limit":"A pattern in existing data does not by itself show a cause."},{"id":"bio-model","field":"biology","label":"Growth model","x":25,"y":76,"method":"Simulation","title":"Explore a population-growth model","question":"What happens if a model’s growth rate changes?","evidence":"A mathematical model, assumptions and computed outcomes.","python":"Change a parameter and plot several possible futures.","limit":"A simulated result needs comparison with real observations."},{"id":"bio-lab","field":"biology","label":"Plant experiment","x":76,"y":70,"method":"Physical experiment","title":"Grow plants under different light","question":"Does changing the light change plant growth?","evidence":"New measurements from plants grown under controlled conditions.","python":"Organize repeated measurements and compare the groups.","limit":"Control other conditions; one small experiment is not a universal result."},{"id":"finance-data","field":"finance","label":"Economic records","x":23,"y":24,"method":"Existing data","title":"Compare inflation and interest rates","question":"How did two economic indicators change together?","evidence":"Existing time series, such as the FRED database.","python":"Align dates, visualize changes and inspect unusual periods.","limit":"Moving together does not prove that one caused the other."},{"id":"finance-model","field":"finance","label":"Portfolio scenario","x":26,"y":75,"method":"Simulation","title":"Stress-test a hypothetical portfolio","question":"What would a chosen price shock do to this portfolio?","evidence":"Chosen holdings, scenario assumptions and a calculation.","python":"Apply several shocks and compare the modeled outcomes.","limit":"A scenario is not a prediction or a guarantee of future returns."},{"id":"finance-lab","field":"finance","label":"Auction experiment","x":76,"y":73,"method":"Participant experiment","title":"Compare auction rules with participants","question":"Do different bidding rules change the selling price?","evidence":"New choices recorded in a controlled economics experiment.","python":"Summarize bids and compare outcomes across the rules.","limit":"Real participants provide data; a classroom game alone is not representative."},{"id":"environment-data","field":"environment","label":"Satellite archive","x":24,"y":23,"method":"Existing data","title":"Inspect changes in vegetation","question":"Where did a recorded landscape change over time?","evidence":"Existing satellite observations, such as NASA Earthdata.","python":"Read images or tables and compare places and dates.","limit":"Check resolution, missing observations and other possible explanations."},{"id":"environment-model","field":"environment","label":"Climate scenario","x":26,"y":75,"method":"Simulation","title":"Compare possible climate scenarios","question":"How do modeled outcomes change with the assumptions?","evidence":"A computational model, inputs and scenario outputs.","python":"Compare model runs and visualize their uncertainty.","limit":"A model scenario is not the same as observing a future event."},{"id":"environment-field","field":"environment","label":"Outdoor sensors","x":76,"y":26,"method":"New observations","title":"Measure temperatures in shade and sun","question":"How do local temperatures vary across these places?","evidence":"New sensor readings with location, time and setup recorded.","python":"Check readings and plot temperature over time.","limit":"An observed difference can have several explanations."},{"id":"robotics-data","field":"robotics","label":"Sensor logs","x":23,"y":24,"method":"Existing data","title":"Look for failures in recorded robot runs","question":"Which conditions appear near a recorded failure?","evidence":"Existing sensor logs and outcomes from earlier runs.","python":"Find unusual readings and compare successful and failed runs.","limit":"Old logs may miss conditions the robot will meet next."},{"id":"robotics-model","field":"robotics","label":"Route simulation","x":26,"y":75,"method":"Simulation","title":"Try a route in a computer model","question":"Will the same commands reach the goal on a changed map?","evidence":"A simplified map, movement rules and computed results.","python":"Run alternative routes and inspect where they stop.","limit":"Our browser robot has no real sensors, motor errors or physical link."},{"id":"robotics-lab","field":"robotics","label":"Real robot test","x":76,"y":73,"method":"Physical experiment","title":"Test a robot with a changed obstacle","question":"Can a physical robot complete the changed route?","evidence":"New measurements from a particular robot and test setup.","python":"Record sensor data, compare trials and revise the controller.","limit":"A simulation passing does not establish that hardware will pass."}]);
(function client() {
  document.querySelectorAll('[data-c0sy-choice]').forEach(root=>{
    const button=root.querySelector('[data-c0sy-check]'), status=root.querySelector('[data-c0sy-status]');
    if(!button||!status)return;
    button.addEventListener('click',()=>{
      const reveal=root.dataset.checks!=='true';root.dataset.checks=String(reveal);
      button.setAttribute('aria-pressed',String(reveal));button.textContent=reveal?'Hide the checks':'Show what we must test';
      status.textContent=reveal?'Select with validation data. Keep the final test for after the method is fixed.':'Why we start here: small examples, visible assumptions, and checkable mistakes.';
    });
  });
})();
document.querySelectorAll('.c0-slide button').forEach(button=>['keydown','keyup'].forEach(type=>button.addEventListener(type,event=>{if(event.key===' '||event.key==='Enter')event.stopPropagation();})));