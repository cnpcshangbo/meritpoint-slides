/* Real Python execution lives in a terminable worker, away from the slide UI. */
'use strict';
let py, loading;
const runtime = new URL('runtime/pyodide-0.26.2/', self.location.href).href;
async function ready(){
  if(py)return py;
  if(!loading)loading=(async()=>{
    postMessage({type:'status',text:'Loading Python…'});
    importScripts(runtime+'pyodide.js');
    py=await loadPyodide({indexURL:runtime});
    return py;
  })().catch(e=>{loading=null;throw e;});
  return loading;
}
self.onmessage=async ({data})=>{
  try{
    const python=await ready();
    if(data.type==='prepare'){postMessage({type:'ready'});return;}
    if(data.type!=='run')return;
    let chunks=[],length=0,figures=[];
    const output=text=>{if(length<20000){text=String(text);chunks.push(text);length+=text.length;}};
    python.setStdout({batched:output});python.setStderr({batched:output});
    if(data.plot){
      postMessage({type:'status',id:data.id,text:'Loading the plotting library…'});
      await python.loadPackage('matplotlib');
      await python.runPythonAsync('import matplotlib\nmatplotlib.use("Agg")\nimport matplotlib.pyplot as plt\nplt.close("all")');
    }
    const globals=python.toPy({__name__:'__main__'});
    try{
      await python.runPythonAsync(data.code,{globals});
      if(data.plot){
        const rendered=await python.runPythonAsync('import io, base64\n_trial_images = []\nfor _trial_number in plt.get_fignums():\n    _trial_buffer = io.BytesIO()\n    plt.figure(_trial_number).savefig(_trial_buffer, format="png", bbox_inches="tight", dpi=120)\n    _trial_images.append(base64.b64encode(_trial_buffer.getvalue()).decode("ascii"))\nplt.close("all")\n_trial_images');
        figures=rendered.toJs();rendered.destroy();
      }
      postMessage({type:'result',id:data.id,output:chunks.join('\n'),figures});
    }finally{globals.destroy();}
  }catch(e){postMessage({type:'error',id:data.id,error:String(e.message||e)});}
};
