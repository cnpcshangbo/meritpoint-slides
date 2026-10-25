'use strict';
(()=>{
  document.querySelector('#print')?.addEventListener('click',()=>window.print());
  document.querySelectorAll('.quiz').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();
    const selected=new FormData(form).values().next().value;
    const correct=selected===form.dataset.answer;
    form.querySelector('.feedback').textContent=(correct?'Yes. ':'Reconsider. ')+form.dataset.feedback;
  }));
  document.querySelectorAll('.copy-prompt').forEach(button=>button.addEventListener('click',async()=>{
    const details=button.closest('details'),status=details.querySelector('.copy-status');
    try{await navigator.clipboard.writeText([...details.querySelectorAll('.prompt')].map(p=>p.textContent).join('\n\n'));status.textContent='Copied. Add your own question and evidence.';}
    catch{status.textContent='Select the prompt text and copy it manually.';}
  }));
  const form=document.querySelector('#checkpoint-form');if(!form)return;
  const key='meritpoint-python-clinic06-v1',status=document.querySelector('#save-status');
  const fields=[...form.querySelectorAll('textarea')],names=fields.map(x=>x.name);
  const collect=()=>Object.fromEntries(fields.map(x=>[x.name,x.value]));
  const fill=data=>fields.forEach(x=>{x.value=typeof data[x.name]==='string'?data[x.name].slice(0,7000):'';});
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify({version:1,notes:collect()}));status.textContent='Saved in this browser. Download a backup and copy your checkpoint into L06 before leaving.';}catch{status.textContent='Browser storage is unavailable. Download a backup before leaving.';}};
  try{const stored=JSON.parse(localStorage.getItem(key)||'null');if(stored?.version===1&&stored.notes)fill(stored.notes);}catch{status.textContent='Saved notes could not be loaded. Use your downloaded backup if available.';}
  form.addEventListener('input',persist);form.addEventListener('submit',e=>e.preventDefault());
  function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  document.querySelector('#export-notes').addEventListener('click',()=>{const text='# L06 · My research data audit\n\n'+fields.map(x=>'## '+form.querySelector(`label[for="${x.id}"]`).textContent+'\n\n'+(x.value||'[Not recorded yet]')).join('\n\n');download('L06-checkpoint.md',text+'\n','text/markdown');status.textContent='Checkpoint downloaded. Add it to your continuing Python notebook.';});
  document.querySelector('#export-json').addEventListener('click',()=>download('L06-checkpoint-backup.json',JSON.stringify({version:1,notes:collect()},null,2),'application/json'));
  const input=document.querySelector('#backup-file');document.querySelector('#import-notes').addEventListener('click',()=>input.click());
  input.addEventListener('change',async()=>{try{const file=input.files[0];if(!file)return;if(file.size>150000)throw Error('Backup is too large.');const data=JSON.parse(await file.text());if(data.version!==1||!data.notes||typeof data.notes!=='object'||names.some(n=>typeof data.notes[n]!=='string'||data.notes[n].length>7000))throw Error('This is not a valid L06 checkpoint backup.');if(fields.some(f=>f.value.trim())&&!window.confirm('Replace the notes currently shown with this backup? Download your current notes first if needed.'))return;fill(data.notes);persist();status.textContent='Backup restored and saved in this browser.';}catch(error){status.textContent=error.message;}finally{input.value='';}});
})();
