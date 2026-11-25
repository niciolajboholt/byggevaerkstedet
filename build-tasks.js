/* Shared deterministic task plans. No DOM, storage or network dependencies. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./assembly-steps.js'));
  else root.BuildTasks = factory(root.AssemblySteps);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (AssemblySteps) {
  'use strict';
  const VERSION = 2;
  function hash(value) {
    let a = 2166136261, b = 5381;
    for (let i = 0; i < value.length; i++) {
      const c = value.charCodeAt(i);
      a = Math.imul(a ^ c, 16777619) >>> 0;
      b = (Math.imul(b, 33) ^ c) >>> 0;
    }
    return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
  }
  function normalize(pattern) {
    if (!Array.isArray(pattern) || !pattern.length || pattern.length > 256 ||
        !pattern.every(row => typeof row === 'string' && row.length <= 256 && /^[A-Za-z.]*$/.test(row))) {
      throw new TypeError('Invalid building pattern');
    }
    const width = Math.max(...pattern.map(row => row.length));
    const rows = pattern.map(row => row.padEnd(width, '.'));
    if (!rows.some(row => /[^.]/.test(row))) throw new TypeError('Empty building pattern');
    return rows;
  }
  function rowTiles(pattern, y) {
    const out = [];
    for (let x = 0; x < pattern[y].length; x++) {
      const c = pattern[y][x];
      if (c !== '.') out.push({x, y, row: y, c, o: (x + y) % 2 ? 'v' : 'h'});
    }
    return out;
  }
  function buildTasks(pattern, builderCount, smallest, cap) {
    const tasks = [], nonempty = pattern.map((r, y) => rowTiles(pattern, y)).filter(r => r.length);
    // A one-row motif can still have more than one turn when there are enough bricks.
    const shortCap = nonempty.length < builderCount
      ? Math.max(1, Math.ceil(nonempty.reduce((n, r) => n + r.length, 0) / builderCount))
      : Infinity;
    for (const row of nonempty) {
      let offset = 0;
      while (offset < row.length) {
        const owner = tasks.length % builderCount;
        const limit = Math.min(shortCap, owner === smallest ? cap : Infinity);
        const tiles = row.slice(offset, offset + limit), counts = {};
        tiles.forEach(tile => { counts[tile.c] = (counts[tile.c] || 0) + 1; });
        const directPlacement = tiles.some((tile, i) => i && tile.x !== tiles[i - 1].x + 1);
        tasks.push({owner, row: tiles[0].row, tiles, counts, n: tiles.length, directPlacement,
          instruction: directPlacement
            ? 'Læg brikkerne på deres viste pladser. De forbindes af de næste rækker.'
            : 'Byg stykket og læg det på den viste plads i modellen.'});
        offset += tiles.length;
      }
    }
    return tasks;
  }
  function connectedTasks(pattern, builderCount, smallest, cap) {
    const total=pattern.join('').replace(/\./g,'').length;
    const rows=pattern.filter(r=>/[^.]/.test(r)).length;
    const shortCap=rows<builderCount?Math.max(1,Math.ceil(total/builderCount)):Infinity;
    return AssemblySteps.create(pattern,{capFor:i=>Math.min(shortCap,i%builderCount===smallest?cap:Infinity)}).steps.map((task,i)=>({
      ...task,owner:i%builderCount,directPlacement:false,
      instruction:task.startsSection?(task.section===1?'Byg det første stykke. Det er starten på modellen.':'Start denne adskilte del for sig. Motivet har dele, der ikke kan forbindes.'):'Byg stykket og sæt det fast på den viste plads i modellen.'
    }));
  }
  function totalsFor(tasks, n) {
    const totals = Array(n).fill(0);
    tasks.forEach(task => { totals[task.owner] += task.n; });
    return totals;
  }
  function createPlan(pattern, options) {
    options = options || {};
    const version=options.version==null?VERSION:options.version;
    if(![1,2].includes(version))throw new TypeError('Unknown task plan version');
    const makeTasks=version===1?buildTasks:connectedTasks;
    const builderCount = options.builderCount == null ? 2 : options.builderCount;
    const smallest = options.smallest == null ? null : options.smallest;
    if (![2, 3].includes(builderCount)) throw new TypeError('Use two or three builders');
    if (smallest !== null && (!Number.isInteger(smallest) || smallest < 0 || smallest >= builderCount)) {
      throw new TypeError('Invalid smaller-task recipient');
    }
    const p = normalize(pattern), nonempty = p.filter(r => /[^.]/.test(r));
    let tasks = makeTasks(p, builderCount, null, Infinity), totals = totalsFor(tasks, builderCount);
    let assignmentNote = '';
    if (smallest !== null) {
      const total = totals.reduce((a, b) => a + b, 0);
      const preferredCap = Math.max(2, Math.ceil(total / nonempty.length * 0.55));
      let best = null;
      // Prefer useful multi-brick pieces; use one-brick turns only when geometry requires it.
      for (let cap = preferredCap; cap >= 1; cap--) {
        const candidate = makeTasks(p, builderCount, smallest, cap);
        const amounts = totalsFor(candidate, builderCount);
        const peers = amounts.filter((_, i) => i !== smallest);
        const score = amounts[smallest] - Math.min(...peers);
        if (!best || score < best.score) best = {tasks: candidate, totals: amounts, score};
        if (amounts.every(n => n > 0) && amounts[smallest] < Math.min(...peers)) {
          best = {tasks: candidate, totals: amounts, score}; break;
        }
      }
      tasks = best.tasks; totals = best.totals;
      if (totals[smallest] >= Math.min(...totals.filter((_, i) => i !== smallest))) {
        assignmentNote = 'Figuren er så lille eller ujævn, at færre brikker til den valgte bygger ikke kan garanteres med faste turskift.';
      }
    }
    if (totals.some(n => n === 0)) assignmentNote = 'Figuren har for få opgaver til, at alle byggere får en tur.';
    const signature = JSON.stringify({v: version, pattern: p, builderCount, smallest});
    const id = 'tasks-v' + version + '-' + hash(signature);
    tasks.forEach((task, i) => {
      task.id = id + '-' + String(i + 1).padStart(3, '0');
      task.index = i;
      task.dependencies = i ? [tasks[i - 1].id] : [];
    });
    return {v: version, id, planId: id, signature, builderCount, smallest, pattern: p,
      tasks, totals, total: totals.reduce((a, b) => a + b, 0), assignmentNote};
  }
  function signature(plan) { return plan.signature; }
  function createSession(plan) {
    return {v: plan.v, planId: plan.id, signature: plan.signature, index: 0, stage: 'building'};
  }
  function restoreSession(plan, saved) {
    if (!saved || saved.v !== plan.v || saved.planId !== plan.id || saved.signature !== plan.signature ||
        !Number.isInteger(saved.index) || saved.index < 0 || saved.index > plan.tasks.length ||
        !['building', 'ready', 'done'].includes(saved.stage) ||
        (saved.index === plan.tasks.length ? saved.stage !== 'done' : saved.stage === 'done')) return null;
    return {v: plan.v, planId: plan.id, signature: plan.signature, index: saved.index, stage: saved.stage};
  }
  function validState(plan, state) {
    const clean = restoreSession(plan, state);
    if (!clean) throw new TypeError('Session does not match the task plan');
    return clean;
  }
  function currentTask(plan, state) {
    const clean = validState(plan, state);
    return clean.stage === 'done' ? null : plan.tasks[clean.index];
  }
  function markReady(plan, state) {
    const clean = validState(plan, state);
    return clean.stage === 'building' ? {...clean, stage: 'ready'} : clean;
  }
  function attach(plan, state) {
    const clean = validState(plan, state);
    if (clean.stage !== 'ready') return clean;
    const index = clean.index + 1;
    return {...clean, index, stage: index === plan.tasks.length ? 'done' : 'building'};
  }
  function undo(plan, state) {
    const clean = validState(plan, state);
    if (clean.stage === 'ready') return {...clean, stage: 'building'};
    if (clean.index > 0) return {...clean, index: clean.index - 1, stage: 'ready'};
    return clean;
  }
  return {VERSION, createPlan, signature, createSession, restoreSession, currentTask, markReady, attach, undo};
});
