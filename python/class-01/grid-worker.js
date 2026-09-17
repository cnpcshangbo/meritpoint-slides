/* Run real Python in a disposable Web Worker. The host owns the wall timeout. */
const PYODIDE_BASE = new URL('./runtime/pyodide-0.26.2/', self.location.href).href;
let ready;
let running = false;

function post(id, type, details) {
  self.postMessage({ id, type, ...details });
}

async function interpreter(id) {
  if (!ready) {
    ready = (async () => {
      post(id, 'status', { message: 'Loading Python. The first run needs to download the interpreter…' });
      importScripts(`${PYODIDE_BASE}pyodide.js`);
      const pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });
      const workerURL = new URL(self.location.href);
      const engineURL = new URL('./grid-engine.py', workerURL);
      if (workerURL.searchParams.has('v')) {
        engineURL.searchParams.set('v', workerURL.searchParams.get('v'));
      }
      const response = await fetch(engineURL);
      if (!response.ok) throw new Error(`Python engine download failed (${response.status}).`);
      const source = await response.text();
      await pyodide.runPythonAsync(source);
      return pyodide;
    })().catch(error => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}

self.onmessage = async ({ data }) => {
  const { id, code, config } = data || {};
  if (running) {
    post(id, 'error', { message: 'Python is already running. Wait for it to finish or stop it before trying again.' });
    return;
  }
  running = true;
  let run;
  try {
    const pyodide = await interpreter(id);
    post(id, 'status', { message: 'Running Python and recording each step…' });
    run = pyodide.globals.get('run_student_json');
    const result = JSON.parse(run(JSON.stringify({ code, config: config || {} })));
    post(id, 'result', { result });
  } catch (error) {
    post(id, 'error', { message: error instanceof Error ? error.message : String(error) });
  } finally {
    if (run && typeof run.destroy === 'function') run.destroy();
    running = false;
  }
};
