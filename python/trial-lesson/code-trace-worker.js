/* Real Python tracing in a disposable worker; the host owns termination/timeouts. */
const PYODIDE_BASE = new URL('./runtime/pyodide-0.26.2/', self.location.href).href;
let running = false;

function post(type, details) {
  self.postMessage({ type, ...details });
}

self.onmessage = async ({ data }) => {
  if (!data || data.type !== 'trace' || running) return;
  running = true;
  let run;
  try {
    if (typeof data.code !== 'string' || data.code.length > 20000) {
      throw new Error('Use a Python snippet under 20,000 characters.');
    }
    post('status', { text: 'Loading Python for the code visualizer…' });
    importScripts(`${PYODIDE_BASE}pyodide.js`);
    const pyodide = await loadPyodide({
      indexURL: PYODIDE_BASE,
      stdout: () => {},
      stderr: () => {},
      stdin: () => null,
    });
    const packages = Array.isArray(data.packages)
      ? data.packages.filter(name => typeof name === 'string' && /^[a-zA-Z0-9_-]+$/.test(name))
      : [];
    if (packages.length) {
      post('status', { text: 'Loading the packages used by this example…' });
      await pyodide.loadPackage([...new Set(packages)]);
      // The browser-document backend is unavailable in a worker. Match the
      // lesson's Run worker, while tracing only the student's source lines.
      if (packages.includes('matplotlib')) {
        await pyodide.runPythonAsync('import matplotlib\nmatplotlib.use("Agg")');
      }
    }
    const workerURL = new URL(self.location.href);
    const engineURL = new URL('./code-trace-engine.py', workerURL);
    if (workerURL.searchParams.has('v')) {
      engineURL.searchParams.set('v', workerURL.searchParams.get('v'));
    }
    const response = await fetch(engineURL);
    if (!response.ok) throw new Error(`Code visualizer download failed (${response.status}).`);
    await pyodide.runPythonAsync(await response.text());
    post('status', { text: 'Running Python and recording each step…' });
    run = pyodide.globals.get('run_code_trace_json');
    post('result', { result: JSON.parse(run(data.code)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    post('result', { result: {
      ok: false,
      status: 'error',
      steps: [],
      error: { type: 'VisualizerError', message, line: null },
    } });
  } finally {
    if (run && typeof run.destroy === 'function') run.destroy();
    self.close();
  }
};
