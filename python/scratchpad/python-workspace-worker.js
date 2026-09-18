/* A fresh, terminable interpreter for each scratchpad run. */
'use strict';
const runtime = new URL('../trial-lesson/runtime/pyodide-0.26.2/', self.location.href).href;
const allowed = new Set(['numpy', 'matplotlib']);
let running = false;
const program = String.raw`
import ast as _pad_ast, builtins as _pad_builtins, contextlib as _pad_context
import io as _pad_io, json as _pad_json, traceback as _pad_traceback

class _PadOutputLimit(RuntimeError):
    pass

class _PadOutput(_pad_io.TextIOBase):
    def __init__(self):
        self.text = ''
    def writable(self):
        return True
    def write(self, text):
        available = 20000 - len(self.text)
        self.text += text[:available]
        if len(text) > available:
            raise _PadOutputLimit('Output stopped at 20,000 characters. Print fewer values and try again.')
        return len(text)

def _pad_imports(source):
    tree = _pad_ast.parse(source, filename='<python-pad>')
    names = set()
    for node in _pad_ast.walk(tree):
        if isinstance(node, _pad_ast.Import):
            names.update(item.name.split('.')[0] for item in node.names)
        elif isinstance(node, _pad_ast.ImportFrom) and node.module:
            names.add(node.module.split('.')[0])
    return _pad_json.dumps(sorted(names))

def _pad_input(*args, **kwargs):
    raise RuntimeError('input() is not available here. Assign a sample value, then run again.')

def _pad_run(source, plots):
    output = _PadOutput()
    namespace = {'__name__': '__main__', '__builtins__': dict(vars(_pad_builtins), input=_pad_input)}
    error = None
    figures = []
    with _pad_context.redirect_stdout(output), _pad_context.redirect_stderr(output):
        try:
            exec(compile(source, '<python-pad>', 'exec'), namespace, namespace)
        except BaseException as exc:
            error = ''.join(_pad_traceback.format_exception(type(exc), exc, exc.__traceback__, limit=8))[-12000:]
    if plots:
        import matplotlib.pyplot as plt
        import base64
        try:
            for number in plt.get_fignums()[:3]:
                buffer = _pad_io.BytesIO()
                plt.figure(number).savefig(buffer, format='png', bbox_inches='tight', dpi=100)
                encoded = base64.b64encode(buffer.getvalue()).decode('ascii')
                if len(encoded) <= 2000000:
                    figures.append(encoded)
        finally:
            plt.close('all')
    return _pad_json.dumps({'ok': error is None, 'output': output.text, 'error': error, 'figures': figures})
`;
self.onmessage = async ({ data }) => {
  if (data?.type !== 'run' || running) return;
  running = true;
  let imports, run;
  try {
    if (typeof data.code !== 'string' || data.code.length > 20000) throw new Error('Keep a snippet under 20,000 characters.');
    self.postMessage({ type: 'status', status: 'loading', message: 'Loading Python…' });
    importScripts(runtime + 'pyodide.js');
    const py = await loadPyodide({ indexURL: runtime, stdout: () => {}, stderr: () => {}, stdin: () => null });
    await py.runPythonAsync(program);
    imports = py.globals.get('_pad_imports');
    const requested = new Set((Array.isArray(data.packages) ? data.packages : []).filter(name => allowed.has(name)));
    try { for (const name of JSON.parse(imports(data.code))) if (allowed.has(name)) requested.add(name); }
    catch (_) { /* The execution wrapper reports syntax errors against the student's source. */ }
    const packages = [...requested];
    if (packages.length) {
      self.postMessage({ type: 'status', status: 'loading', message: 'Loading ' + packages.join(' and ') + '…' });
      await py.loadPackage(packages);
    }
    if (requested.has('matplotlib')) {
      await py.runPythonAsync('import matplotlib\nmatplotlib.use("Agg")\nimport matplotlib.pyplot as plt\nplt.close("all")\nplt.show = lambda *args, **kwargs: None');
    }
    self.postMessage({ type: 'status', status: 'running', message: 'Running Python…', packages });
    run = py.globals.get('_pad_run');
    self.postMessage({ type: 'result', result: JSON.parse(run(data.code, requested.has('matplotlib'))), packages });
  } catch (error) {
    self.postMessage({ type: 'result', result: { ok: false, output: '', error: String(error.message || error).slice(-12000), figures: [] } });
  } finally {
    imports?.destroy(); run?.destroy(); self.close();
  }
};
