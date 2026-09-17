/* Class 0 teaching blocks. Generated Python is a preview; this bounded model runs the simulation. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.Class0Blocks = api; api.init(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_STEPS = 60;
  function lampResult(program, brightness) {
    if (!Number.isInteger(brightness) || brightness < 0 || brightness > 100) throw new Error('Brightness must be an integer from 0 to 100.');
    let lamp = false, steps = 0;
    const trace = [];
    function run(nodes, depth) {
      if (depth > 8) throw new Error('Use fewer nested blocks.');
      for (const node of nodes) {
        if (++steps > MAX_STEPS) throw new Error('Keep this program to 60 steps or fewer.');
        trace.push(node.id);
        if (node.kind === 'set') lamp = node.on;
        else if (node.kind === 'if') {
          if (!['LT', 'LTE'].includes(node.op) || !Number.isInteger(node.threshold) || node.threshold < 0 || node.threshold > 100) throw new Error('Check the brightness comparison.');
          const yes = node.op === 'LT' ? brightness < node.threshold : brightness <= node.threshold;
          run(yes ? node.yes : node.no, depth + 1);
        } else throw new Error('Use lamp blocks in this program.');
      }
    }
    run(program, 0);
    return { lamp, trace };
  }
  function routeCommands(program) {
    const commands = [];
    let expanded = 0;
    function visit(nodes, depth) {
      if (depth > 8) throw new Error('Use fewer nested blocks.');
      for (const node of nodes) {
        if (++expanded > 500) throw new Error('Use fewer nested repeats in this route.');
        if (node.kind === 'move' && ['E', 'N'].includes(node.direction)) commands.push({ direction: node.direction, id: node.id });
        else if (node.kind === 'repeat' && Number.isInteger(node.times) && node.times >= 1 && node.times <= 10) {
          for (let i = 0; i < node.times; i++) visit(node.body, depth + 1);
        } else throw new Error('Use move and repeat blocks in this program.');
        if (commands.length > MAX_STEPS) throw new Error('Keep this route to 60 moves or fewer.');
      }
    }
    visit(program, 0);
    if (!commands.length) throw new Error('Connect at least one move to the start block.');
    return commands;
  }
  function routeResult(commands, wall, count) {
    let x = 0, y = 0, stopped = false, message = 'At A1. Ready to run.', attempted = 0;
    const trail = [[0, 0]];
    for (const command of commands.slice(0, count === undefined ? commands.length : count)) {
      if (stopped || (x === 2 && y === 2)) break;
      attempted++;
      const nx = x + (command.direction === 'E' ? 1 : 0), ny = y + (command.direction === 'N' ? 1 : 0);
      if (!['E', 'N'].includes(command.direction)) throw new Error('Only E and N moves are supported.');
      if (nx > 2 || ny > 2 || (nx === wall[0] && ny === wall[1])) {
        stopped = true;
        message = 'Stopped at ' + 'ABC'[x] + (y + 1) + ': ' + (nx > 2 || ny > 2 ? 'next move leaves the board.' : 'wall at ' + 'ABC'[nx] + (ny + 1) + '.');
      } else { x = nx; y = ny; trail.push([x, y]); message = 'At ' + 'ABC'[x] + (y + 1) + '.'; }
    }
    const success = x === 2 && y === 2;
    if (success) message = 'Goal C3 reached in ' + attempted + ' moves.';
    else if (!stopped && attempted === commands.length) message = 'Ended at ' + 'ABC'[x] + (y + 1) + '; goal C3 not reached.';
    return { x, y, stopped, success, message, attempted, trail };
  }
  function pythonPreview(program, mode, brightness) {
    function lines(nodes, indent) {
      if (!nodes.length) return indent + 'pass\n';
      return nodes.map(node => {
        if (node.kind === 'set') return indent + 'lamp = ' + (node.on ? 'True' : 'False') + '\n';
        if (node.kind === 'if') return indent + 'if brightness ' + (node.op === 'LT' ? '<' : '<=') + ' ' + node.threshold + ':\n' + lines(node.yes, indent + '    ') + indent + 'else:\n' + lines(node.no, indent + '    ');
        if (node.kind === 'move') return indent + 'move("' + node.direction + '")\n';
        return indent + 'for _ in range(' + node.times + '):\n' + lines(node.body, indent + '    ');
      }).join('');
    }
    return mode === 'lamp' ? '# Equivalent Python — preview only\nbrightness = ' + brightness + '\nlamp = False\n' + lines(program, '') + 'print("ON" if lamp else "OFF")' : '# Equivalent Python — preview only\n# move() means one grid step; stop at a wall,\n# the board edge, or the goal.\n# A Python grid helper would be required.\n' + lines(program, '');
  }
  function init() {
    const app = document.querySelector('[data-block-app]');
    if (!app) return;
    const $ = selector => app.querySelector(selector);
    const mode = new URLSearchParams(location.search).get('mode') === 'route' ? 'route' : 'lamp';
    app.dataset.mode = mode;
    app.querySelectorAll('[data-mode-panel]').forEach(el => { el.hidden = el.dataset.modePanel !== mode; });
    app.querySelectorAll('[data-mode-link]').forEach(el => el.setAttribute('aria-current', el.dataset.modeLink === mode ? 'page' : 'false'));
    $('[data-back]').href = './#/' + (mode === 'lamp' ? 'what-is-programming' : 'change-the-world');
    $('[data-title]').textContent = mode === 'lamp' ? 'Build a rule. Watch the room.' : 'One program. Two different worlds.';
    $('[data-intro]').textContent = mode === 'lamp' ? 'A sensor gives a number. Your blocks decide what the lamp does. Predict first, then test the boundary.' : 'Connect the robot’s moves, predict its route, then run the same program with two different walls.';
    $('[data-editor-help]').textContent = mode === 'lamp' ? 'Click a category to find blocks. Drag them into the start stack. Click < to try ≤, or click a number to change it.' : 'Click Motion for move blocks. Drag a block out of the stack to detach it; reconnect moves in a new order. Control contains repeat.';
    $('[data-reset]').textContent = mode === 'lamp' ? 'Reset to < 30' : 'Load E E N N';
    $('[data-alternative]').textContent = mode === 'lamp' ? 'Try the ≤ 30 draft' : 'Load N N E E';
    if (!window.Blockly) {
      $('[data-editor-message]').textContent = 'The block editor did not load. Reload this page or use the slide simulator.';
      app.querySelectorAll('button').forEach(el => { el.disabled = true; });
      return;
    }
    const B = window.Blockly;
    B.defineBlocksWithJsonArray([
      { type: 'c0_start', message0: mode === 'lamp' ? 'when brightness changes' : 'when Run is pressed', nextStatement: null, colour: '#0C2D52', tooltip: 'Connect your program below this block.' },
      { type: 'c0_if', message0: 'if brightness %1 %2', args0: [{ type: 'field_dropdown', name: 'OP', options: [['<', 'LT'], ['≤', 'LTE']] }, { type: 'field_number', name: 'LIMIT', value: 30, min: 0, max: 100, precision: 1 }], message1: 'then %1', args1: [{ type: 'input_statement', name: 'YES' }], message2: 'else %1', args2: [{ type: 'input_statement', name: 'NO' }], previousStatement: null, nextStatement: null, colour: '#087F8C', tooltip: 'Read the simulated sensor and choose one branch.' },
      { type: 'c0_set', message0: 'set lamp %1', args0: [{ type: 'field_dropdown', name: 'STATE', options: [['ON', 'ON'], ['OFF', 'OFF']] }], previousStatement: null, nextStatement: null, colour: '#A76719', tooltip: 'Change the lamp output.' },
      { type: 'c0_move', message0: 'move %1 one cell', args0: [{ type: 'field_dropdown', name: 'DIR', options: [['E →', 'E'], ['N ↑', 'N']] }], previousStatement: null, nextStatement: null, colour: '#087F8C', tooltip: 'Move one cell. Stop at a wall, an edge, or the goal.' },
      { type: 'c0_repeat', message0: 'repeat %1 times', args0: [{ type: 'field_number', name: 'TIMES', value: 2, min: 1, max: 10, precision: 1 }], message1: 'do %1', args1: [{ type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: '#88623C', tooltip: 'Repeat the connected moves.' }
    ]);
    const categories = mode === 'lamp' ? [{ kind: 'category', name: 'Decide', colour: '#087F8C', contents: [{ kind: 'block', type: 'c0_if' }] }, { kind: 'category', name: 'Output', colour: '#A76719', contents: [{ kind: 'block', type: 'c0_set' }] }] : [{ kind: 'category', name: 'Motion', colour: '#087F8C', contents: [{ kind: 'block', type: 'c0_move' }] }, { kind: 'category', name: 'Control', colour: '#88623C', contents: [{ kind: 'block', type: 'c0_repeat' }] }];
    const compact = window.matchMedia('(max-width: 600px)').matches;
    const workspace = B.inject($('[data-workspace]'), {
      toolbox: { kind: 'categoryToolbox', contents: categories },
      media: 'vendor/blockly-13.3.0/media/', renderer: 'zelos',
      horizontalLayout: compact, toolboxPosition: 'start',
      trashcan: true, sounds: false, maxBlocks: 50,
      zoom: { controls: true, wheel: false, startScale: compact ? 0.78 : 0.95, minScale: 0.45, maxScale: 1.5, scaleSpeed: 1.15 },
      move: { scrollbars: true, drag: true, wheel: true },
      grid: { spacing: 24, length: 2, colour: '#cfdee5', snap: true }
    });
    let start, loading = false, timer = null, steps = 0, latest = null, testsRun = false;
    function stopAnimation() { clearInterval(timer); timer = null; $('[data-run]').disabled = false; }
    function newBlock(type, fields) {
      const block = workspace.newBlock(type);
      Object.entries(fields || {}).forEach(([name, value]) => block.setFieldValue(String(value), name));
      block.initSvg(); block.render(); return block;
    }
    function attach(parent, child, input) { (input ? parent.getInput(input).connection : parent.nextConnection).connect(child.previousConnection); return child; }
    function loadProgram(alternative) {
      stopAnimation(); loading = true; B.Events.disable();
      try {
        workspace.clear(); start = newBlock('c0_start'); start.setDeletable(false); start.setMovable(false); start.moveBy(24, 28);
        if (mode === 'lamp') {
          const condition = attach(start, newBlock('c0_if', { OP: alternative ? 'LTE' : 'LT', LIMIT: 30 }));
          attach(condition, newBlock('c0_set', { STATE: 'ON' }), 'YES');
          attach(condition, newBlock('c0_set', { STATE: 'OFF' }), 'NO');
        } else {
          let tail = start;
          (alternative ? ['N', 'N', 'E', 'E'] : ['E', 'E', 'N', 'N']).forEach(direction => { tail = attach(tail, newBlock('c0_move', { DIR: direction })); });
        }
      } finally { B.Events.enable(); loading = false; }
      workspace.scrollCenter(); changed();
    }
    function readProgram() {
      if (workspace.getTopBlocks(false).some(block => block !== start)) throw new Error('A block is disconnected. Connect it below the start block or move it to the trash.');
      let total = 0;
      function chain(block, depth) {
        if (depth > 8) throw new Error('Use fewer nested blocks.');
        const result = [];
        while (block) {
          if (++total > 50) throw new Error('Use 50 blocks or fewer.');
          const node = { id: block.id };
          if (block.type === 'c0_if' && mode === 'lamp') Object.assign(node, { kind: 'if', op: block.getFieldValue('OP'), threshold: Number(block.getFieldValue('LIMIT')), yes: chain(block.getInputTargetBlock('YES'), depth + 1), no: chain(block.getInputTargetBlock('NO'), depth + 1) });
          else if (block.type === 'c0_set' && mode === 'lamp') Object.assign(node, { kind: 'set', on: block.getFieldValue('STATE') === 'ON' });
          else if (block.type === 'c0_move' && mode === 'route') Object.assign(node, { kind: 'move', direction: block.getFieldValue('DIR') });
          else if (block.type === 'c0_repeat' && mode === 'route') Object.assign(node, { kind: 'repeat', times: Number(block.getFieldValue('TIMES')), body: chain(block.getInputTargetBlock('DO'), depth + 1) });
          else throw new Error('Use the blocks from this activity’s toolbox.');
          result.push(node); block = block.getNextBlock();
        }
        return result;
      }
      const program = chain(start.getNextBlock(), 0);
      if (!program.length) throw new Error('Connect a program below the start block.');
      return program;
    }
    function showError(error) {
      latest = null; $('[data-editor-message]').textContent = error.message; $('[data-editor-message]').classList.add('error');
      $('[data-python]').textContent = '# Complete the connected block program to see its Python preview.';
      $('[data-run]').disabled = true; $('[data-step]').disabled = true; $('[data-test-lamp]').disabled = true;
      $('[data-lamp-state]').textContent = '—'; $('[data-lamp-explain]').textContent = 'Complete the program to see a result.';
      $('[data-room]').dataset.on = 'false'; workspace.highlightBlock(null);
    }
    function lampScene() {
      const brightness = Number($('[data-brightness]').value);
      $('[data-brightness-value]').textContent = brightness;
      $('[data-room]').style.setProperty('--daylight', brightness / 100);
      if (!latest) return;
      const result = lampResult(latest, brightness);
      $('[data-room]').dataset.on = String(result.lamp);
      $('[data-lamp-state]').textContent = result.lamp ? 'ON' : 'OFF';
      $('[data-lamp-explain]').textContent = 'Sensor: ' + brightness + ' → your blocks → lamp ' + (result.lamp ? 'ON' : 'OFF') + '.';
      workspace.highlightBlock(result.trace[result.trace.length - 1] || start.id);
      $('[data-python]').textContent = pythonPreview(latest, mode, brightness);
    }
    function clearLampTests() {
      testsRun = false;
      $('[data-lamp-summary]').textContent = 'Predict each output. Then run all five inputs.';
      app.querySelectorAll('[data-test-row]').forEach(row => { row.dataset.result = ''; row.querySelector('[data-actual]').textContent = '—'; row.querySelector('[data-verdict]').textContent = 'Not run'; });
    }
    function runLampTests() {
      if (!latest) return;
      let passed = 0;
      app.querySelectorAll('[data-test-row]').forEach(row => {
        const brightness = Number(row.dataset.testRow), expected = brightness < 30, actual = lampResult(latest, brightness).lamp, pass = actual === expected;
        if (pass) passed++;
        row.dataset.result = pass ? 'pass' : 'fail';
        row.querySelector('[data-actual]').textContent = actual ? 'ON' : 'OFF'; row.querySelector('[data-verdict]').textContent = pass ? '✓ Pass' : '✕ Mismatch';
      });
      testsRun = true;
      $('[data-lamp-summary]').textContent = passed + ' / 5 checks pass. ' + (passed === 5 ? 'These five inputs match the requirement. Explain what you changed.' : 'Find the mismatch. Which symbol or output would you change?');
    }
    function boardMarkup(wall) {
      let html = '';
      for (let y = 2; y >= 0; y--) for (let x = 0; x < 3; x++) html += '<div class="block-cell' + (x === wall[0] && y === wall[1] ? ' is-wall' : '') + '" data-cell="' + x + ',' + y + '"><span>' + 'ABC'[x] + (y + 1) + '</span><b>' + (x === wall[0] && y === wall[1] ? 'WALL' : x === 2 && y === 2 ? 'GOAL' : '') + '</b><i aria-hidden="true">●</i></div>';
      return html;
    }
    app.querySelectorAll('[data-board]').forEach(board => { board.innerHTML = boardMarkup(board.dataset.board === 'original' ? [1, 1] : [2, 1]); });
    function renderRoute(count, completed) {
      const commands = latest ? routeCommands(latest) : [];
      app.querySelectorAll('[data-map]').forEach(map => {
        const wall = map.dataset.map === 'original' ? [1, 1] : [2, 1], result = routeResult(commands, wall, count);
        map.querySelectorAll('[data-cell]').forEach(cell => {
          const [x, y] = cell.dataset.cell.split(',').map(Number);
          cell.classList.toggle('is-current', x === result.x && y === result.y);
          cell.classList.toggle('is-trail', result.trail.some(point => point[0] === x && point[1] === y));
        });
        map.querySelector('[data-map-status]').textContent = count === 0 ? 'At A1. Predict, then run.' : result.message;
        map.dataset.result = completed ? result.success ? 'pass' : 'fail' : '';
        map.querySelector('[data-map-verdict]').textContent = completed ? result.success ? '✓ Goal reached' : '✕ Goal not reached' : 'Not finished';
        map.querySelector('[data-board]').setAttribute('aria-label', 'Robot at ' + 'ABC'[result.x] + (result.y + 1) + ', wall ' + 'ABC'[wall[0]] + (wall[1] + 1) + ', goal C3.');
      });
      const path = commands.map(c => c.direction).join(' ');
      $('[data-route-commands]').textContent = path || 'No moves connected';
      $('[data-route-summary]').textContent = completed ? 'Same commands, two results. Use the wall locations to explain why.' : count ? 'Move ' + count + ' of ' + commands.length + ' · ' + commands[count - 1].direction : 'Expected: reach C3. Both maps start at A1.';
      workspace.highlightBlock(count ? commands[Math.min(count, commands.length) - 1]?.id : null);
    }
    function changed() {
      if (loading) return;
      stopAnimation(); steps = 0; workspace.highlightBlock(null); clearLampTests();
      try {
        latest = readProgram(); if (mode === 'route') routeCommands(latest); else lampResult(latest, Number($('[data-brightness]').value));
        $('[data-editor-message]').classList.remove('error'); $('[data-editor-message]').textContent = 'Connected blocks are ready. Changes reset the test results.';
        $('[data-run]').disabled = false; $('[data-step]').disabled = false; $('[data-test-lamp]').disabled = false;
        $('[data-python]').textContent = pythonPreview(latest, mode, Number($('[data-brightness]').value));
        if (mode === 'lamp') lampScene(); else renderRoute(0, false);
      } catch (error) { showError(error); if (mode === 'route') renderRoute(0, false); }
    }
    function stepRoute() {
      if (!latest) return;
      const length = routeCommands(latest).length;
      if (steps >= length) steps = 0;
      steps++; renderRoute(steps, steps === length);
      if (steps === length) stopAnimation();
    }
    $('[data-reset]').addEventListener('click', () => loadProgram(false));
    $('[data-alternative]').addEventListener('click', () => loadProgram(true));
    $('[data-brightness]').addEventListener('input', lampScene);
    app.querySelectorAll('[data-brightness-preset]').forEach(button => button.addEventListener('click', () => { $('[data-brightness]').value = button.dataset.brightnessPreset; lampScene(); }));
    $('[data-test-lamp]').addEventListener('click', runLampTests);
    $('[data-step]').addEventListener('click', () => { stopAnimation(); stepRoute(); });
    $('[data-run]').addEventListener('click', () => {
      if (!latest) return;
      if (mode === 'lamp') { lampScene(); runLampTests(); return; }
      stopAnimation(); steps = 0; renderRoute(0, false);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { steps = routeCommands(latest).length; renderRoute(steps, true); return; }
      $('[data-run]').disabled = true; timer = setInterval(stepRoute, 480);
    });
    workspace.addChangeListener(event => { if (!event.isUiEvent && event.type !== B.Events.FINISHED_LOADING) changed(); });
    window.addEventListener('resize', () => B.svgResize(workspace));
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAnimation(); });
    // Exposed for classroom troubleshooting and integration tests; no arbitrary code execution.
    app.blockEditor = { workspace, getProgram: readProgram, loadProgram, runLampTests, getMode: () => mode, hasTestResults: () => testsRun };
    loadProgram(false);
  }
  return { lampResult, routeCommands, routeResult, pythonPreview, init };
});
