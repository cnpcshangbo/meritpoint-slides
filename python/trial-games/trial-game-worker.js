/* Fresh pygame interpreter per Start. The host owns pacing and hard deadlines. */
'use strict';
const runtime = new URL('../trial-lesson/runtime/pyodide-0.26.2/', self.location.href).href;
const wheel = new URL('./packages/pygame_ce-2.4.1-cp312-cp312-pyodide_2024_0_wasm32.whl', self.location.href).href;
const engine = new URL('./trial-game-engine.py', self.location.href);
const version = new URL(self.location.href).searchParams.get('v');
if (version) engine.searchParams.set('v', version);
let phase = 'new', py, start, tick, pixels, lastOutput = '';
const allowedKeys = new Set(['left', 'right', 'up', 'down', 'space']);
function release() {
  start?.destroy(); tick?.destroy(); pixels?.destroy();
  start = tick = pixels = null;
}
function fail(error, output = lastOutput) {
  if (phase === 'closed') return;
  phase = 'closed';
  self.postMessage({ type: 'error', error: String(error?.message || error).slice(-6000), output: String(output || '').slice(0,12000) });
  release(); self.close();
}
function checkSnapshot(result) {
  if (result.width !== 480 || result.height !== 320) throw new Error('The game canvas must remain 480 × 320 pixels.');
  lastOutput = result.output;
  if (!result.ok) { fail(result.error, result.output); return false; }
  return true;
}
self.onmessage = async ({ data }) => {
  if (!data || phase === 'closed') return;
  try {
    if (data.type === 'init') {
      if (phase !== 'new') throw new Error('Start a fresh worker to run edited code.');
      if (typeof data.code !== 'string' || data.code.length > 20000) throw new Error('Keep a game under 20,000 characters.');
      if ((data.width !== undefined && data.width !== 480) || (data.height !== undefined && data.height !== 320)) throw new Error('The browser game canvas is 480 × 320 pixels.');
      phase = 'loading';
      self.postMessage({ type: 'status', status: 'loading', message: 'Loading Python and pygame… First use downloads about 12 MB for pygame.' });
      importScripts(runtime + 'pyodide.js');
      py = await loadPyodide({ indexURL: runtime, stdout: () => {}, stderr: () => {}, stdin: () => null });
      await py.loadPackage(wheel);
      py.runPython('import pygame\nassert pygame.version.ver == "2.4.1", "The pinned pygame package did not load."');
      const response = await fetch(engine.href, { cache: 'no-cache' });
      if (!response.ok) throw new Error('The game runner could not load. Refresh and try again.');
      await py.runPythonAsync(await response.text());
      if (phase === 'closed') return;
      start = py.globals.get('game_start_json'); tick = py.globals.get('game_tick_json'); pixels = py.globals.get('game_pixels');
      self.postMessage({ type: 'status', status: 'running', message: 'Starting your game…' });
      const result = JSON.parse(start(data.code));
      if (!checkSnapshot(result)) return;
      phase = 'ready';
      self.postMessage({ type: 'ready', ...result });
    } else if (data.type === 'tick') {
      if (phase !== 'ready') throw new Error('Wait for the game to finish loading before requesting a frame.');
      if (typeof data.dt !== 'number' || !Number.isFinite(data.dt) || data.dt < 0 || data.dt > 0.1) throw new Error('Frame time must be between 0 and 0.1 seconds.');
      if (!Array.isArray(data.keys) || data.keys.length > 5 || data.keys.some(key => typeof key !== 'string' || !allowedKeys.has(key))) throw new Error('Unknown game key.');
      const result = JSON.parse(tick(data.dt, JSON.stringify(data.keys)));
      if (!checkSnapshot(result)) return;
      const value = pixels();
      let rgba;
      try { rgba = value.toJs().slice(); } finally { value.destroy(); }
      if (rgba.length !== 480 * 320 * 4) throw new Error('The game returned an invalid frame.');
      self.postMessage({ type: 'frame', ...result, rgba: rgba.buffer }, [rgba.buffer]);
    }
  } catch (error) { fail(error); }
};
