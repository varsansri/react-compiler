// React Compiler - the editor on this page. It types out the React source in
// src/, one word every 5 seconds, even while the tab is hidden or minimised.
// After the last word it clears the files and types them again, round after
// round, until Finish is pressed.

const FILES = [
  'src/main.jsx',
  'src/App.jsx',
  'src/lib/files.js',
  'src/lib/highlight.js',
  'src/hooks/useWorkerClock.js',
  'src/hooks/useWakeLock.js',
  'src/hooks/useTypewriter.js',
  'src/components/TitleBar.jsx',
  'src/components/Explorer.jsx',
  'src/components/Tabs.jsx',
  'src/components/Editor.jsx',
  'src/components/Autocomplete.jsx',
  'src/components/Minimap.jsx',
  'src/components/Terminal.jsx',
  'src/components/StatusBar.jsx',
];
const SPW = Number(new URLSearchParams(location.search).get('spw')) || 5;   // seconds per word
const STATE_KEY = 'react-compiler-state', TEXT_KEY = 'react-compiler-texts';

const $ = id => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

let state = { running: false, startedAt: 0, typed: 0, round: 1 };
try { Object.assign(state, JSON.parse(store.get(STATE_KEY)) || {}); } catch (e) {}
let texts = [];
try { texts = JSON.parse(store.get(TEXT_KEY)) || []; } catch (e) {}
FILES.forEach((_, i) => { texts[i] = texts[i] || ''; });

let tokens = [];        // { file, sep, w } for every word of every file
let GOAL = 0;
let names = [];         // every identifier in the sources, for the suggestion box
let queue = [];         // keystrokes still to type for the current word
let nextKeyAt = 0;
let typing = null;      // the word being typed right now
let viewing = null;     // a tab the reader picked; null follows the typing
let wakeLock = null;

const currentFile = () => tokens.length ? tokens[Math.min(state.typed, GOAL - 1)].file : 0;

function save() {
  state.savedAt = Date.now();
  store.set(STATE_KEY, JSON.stringify(state));
  store.set(TEXT_KEY, JSON.stringify(texts));
}

// --- highlighting --------------------------------------------------------------

const KEYWORDS = new Set(['import', 'export', 'default', 'from', 'const', 'let', 'function', 'return',
  'if', 'else', 'for', 'of', 'new', 'async', 'await', 'switch', 'case', 'true', 'false', 'null',
  'undefined', 'try', 'catch']);
const PATTERN = /(\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|(<\/?)([A-Za-z][\w.]*)|([A-Za-z_$][\w$]*)(?=\()|([A-Za-z_$][\w$]*)/g;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = (k, s) => '<span class="' + k + '">' + esc(s) + '</span>';

function highlight(src) {
  let html = '', last = 0;
  for (const m of src.matchAll(PATTERN)) {
    const [t, comment, string, number, bracket, tag, call, word] = m;
    html += esc(src.slice(last, m.index));
    if (comment) html += wrap('c', t);
    else if (string) html += wrap('s', t);
    else if (number) html += wrap('n', t);
    else if (tag) html += esc(bracket) + wrap(/^[A-Z]/.test(tag) ? 'x' : 't', tag);
    else if (call) html += wrap('f', call);
    else if (KEYWORDS.has(word)) html += wrap('k', word);
    else if (/^[A-Z]/.test(word)) html += wrap('x', word);
    else html += esc(t);
    last = m.index + t.length;
  }
  return html + esc(src.slice(last));
}

// --- the terminal --------------------------------------------------------------

const term = $('term');
function log(text, kind) {
  const line = document.createElement('div');
  if (kind) line.className = kind;
  line.textContent = text;
  term.appendChild(line);
  while (term.childElementCount > 200) term.firstChild.remove();
  term.scrollTop = term.scrollHeight;
}
const pick = list => list[Math.floor(Math.random() * list.length)];
const NOISE = [
  f => ['[vite] hmr update /' + f, 'dim'],
  f => ['[vite] css update /' + f.replace(/\.jsx?$/, '.css'), 'dim'],
  () => ['[react-compiler] memoized ' + (2 + Math.floor(Math.random() * 9)) + ' components', 'ok'],
  () => ['[eslint] 0 problems', 'dim'],
  () => ['[tsc] watching for file changes...', 'dim'],
  f => ['[react-compiler] ' + f + ': auto-memo ' + (1 + Math.floor(Math.random() * 4)) + ' hooks, bailout 0', 'ok'],
  () => ['[vite] warning: chunk size ' + (380 + Math.floor(Math.random() * 200)) + ' kB, consider code-splitting', 'warn'],
];
function boot() {
  term.textContent = '';
  log('$ npm run dev', 'cmd');
  log('');
  log('  VITE v5.4.2  ready in ' + (300 + Math.floor(Math.random() * 300)) + ' ms', 'ok');
  log('  > Local:   http://localhost:5173/', 'link');
  log('  > press h + enter to show help', 'dim');
  log('');
}

// --- loading the sources -------------------------------------------------------

Promise.all(FILES.map(p => fetch(p).then(r => { if (!r.ok) throw r; return r.text(); }))).then(sources => {
  sources.forEach((src, file) => {
    [...src.matchAll(/(\s*)(\S+)/g)].forEach((m, i) => tokens.push({ file, sep: i === 0 ? '' : m[1], w: m[2] }));
  });
  GOAL = tokens.length;
  names = [...new Set(sources.join('\n').match(/[A-Za-z_$][\w$]{3,}/g))];
  buildTree();
  boot();
  // Reopened mid-run (a reload, or Chrome put the tab to sleep): keep the
  // clock and catch up. After a long gap, carry on from where it stopped.
  if (state.running) {
    if (Date.now() - (state.savedAt || 0) > 30 * 60 * 1000) resume();
    else { holdScreen(); log('[react-compiler] resumed at word ' + state.typed, 'ok'); }
  }
  draw();
}).catch(() => { $('status-state').textContent = 'could not load sources - reload'; });

// --- typing like a person ------------------------------------------------------

const rand = (a, b) => a + Math.random() * (b - a);
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function queueWord(i) {
  const { file, sep, w } = tokens[i];
  for (const ch of sep) queue.push({ k: ch, f: file, wait: ch === '\n' ? rand(120, 320) : rand(5, 30) });
  const pace = Math.min(1, 25 / w.length);                 // long words go faster, so each fits its 5 seconds
  const slip = w.length > 3 && Math.random() < 0.04 ? 1 + Math.floor(Math.random() * (w.length - 1)) : -1;
  [...w].forEach((ch, c) => {
    if (c === slip) {
      queue.push({ k: LETTERS[Math.floor(Math.random() * 26)], f: file, wait: rand(200, 450) });
      queue.push({ k: '\b', f: file, wait: rand(90, 200) });
    }
    queue.push({ k: ch, f: file, wait: rand(60, 210) * pace });
  });
  typing = w;
}

function press(key) {
  texts[key.f] = key.k === '\b' ? texts[key.f].slice(0, -1) : texts[key.f] + key.k;
  nextKeyAt = Date.now() + key.wait;
  draw();
}

function wordDone() {
  const before = tokens[state.typed].file;
  state.typed++;
  typing = null;
  afterWord(before);
  save();
  draw();
  if (state.typed >= GOAL) nextRound();
}

// Whole source typed: say so, wipe the files and go again from the first word.
function nextRound() {
  log('');
  log('✓ ' + GOAL + ' words, ' + FILES.length + ' files compiled. Build complete.', 'ok');
  state.round = (state.round || 1) + 1;
  state.typed = 0;
  state.startedAt += GOAL * SPW * 1000;
  texts = texts.map(() => '');
  viewing = null;
  log('[react-compiler] file change detected, rebuilding (round ' + state.round + ')', 'dim');
  save(); draw();
}

function afterWord(before) {
  const now = currentFile();
  if (state.typed >= GOAL || now !== before) {
    log('  ✓ ' + FILES[before] + ' compiled in ' + (80 + Math.floor(Math.random() * 400)) + ' ms', 'ok');
    viewing = null;
  }
  if (state.typed % 7 === 0) { const [t, k] = pick(NOISE)(FILES[now]); log(t, k); }
}

// Runs 20 times a second from a worker clock, which keeps ticking while the
// tab is hidden. Words are due by the wall clock, so if the browser pauses
// the page, it catches up to the right count when it wakes.
function tick() {
  if (!state.running || !GOAL) return;
  const now = Date.now();
  if (queue.length) {
    if (document.hidden) { while (queue.length) press(queue.shift()); }
    else if (now >= nextKeyAt) press(queue.shift());
    if (!queue.length) wordDone();
    return;
  }
  const due = Math.min(GOAL, Math.floor((now - state.startedAt) / (SPW * 1000)) + 1);
  if (state.typed >= due) return;
  if (due - state.typed > 1) {
    while (state.typed < due - 1) {
      const t = tokens[state.typed];
      texts[t.file] += t.sep + t.w;
      state.typed++;
      afterWord(t.file);
    }
    save(); draw();
  }
  queueWord(state.typed);
  nextKeyAt = now;
}

const clock = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 50)'], { type: 'text/javascript' })));
clock.onmessage = tick;

// --- drawing -------------------------------------------------------------------

const pane = $('pane'), code = $('code'), gutter = $('gutter'), mini = $('mini'), miniCode = $('mini-code'),
      miniView = $('mini-view'), suggest = $('suggest'), lineHl = $('line-hl');
let drawQueued = false, lastMini = 0;

function draw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(paint);              // waits while the tab is hidden, then catches up once
}

function paint() {
  drawQueued = false;
  if (!GOAL) return;
  const cur = currentFile();
  const open = viewing ?? cur;
  const live = state.running && open === cur;
  const src = texts[open];

  // editor
  code.innerHTML = highlight(src) + (live ? '<span class="caret" id="caret"></span>' : '');
  const lines = src.split('\n');
  if (gutter.childElementCount !== lines.length) {
    gutter.innerHTML = lines.map((_, i) => '<div>' + (i + 1) + '</div>').join('');
  }
  const active = gutter.querySelector('.active');
  if (active) active.classList.remove('active');
  gutter.children[lines.length - 1]?.classList.add('active');
  lineHl.style.top = 10 + (lines.length - 1) * 20 + 'px';
  if (live || viewing === null) pane.scrollTop = pane.scrollHeight;

  // minimap, a few times a second
  const now = Date.now();
  if (now - lastMini > 300 || !live) { miniCode.innerHTML = highlight(src); lastMini = now; }
  const scale = 0.2;
  const range = Math.max(0, miniCode.offsetHeight * scale - mini.clientHeight);
  const frac = pane.scrollHeight > pane.clientHeight ? pane.scrollTop / (pane.scrollHeight - pane.clientHeight) : 0;
  const shift = range * frac;
  miniCode.style.transform = 'translateY(' + (-shift) + 'px) scale(' + scale + ')';
  miniView.style.top = (pane.scrollTop * scale - shift) + 'px';
  miniView.style.height = pane.clientHeight * scale + 'px';

  // suggestion box
  const partial = (lines[lines.length - 1].match(/[A-Za-z_$][\w$]*$/) || [''])[0];
  const name = live && typing && partial.length >= 2
    ? (typing.match(/[A-Za-z_$][\w$]*/g) || []).find(p => p.startsWith(partial) && p.length > 3) : null;
  const caret = $('caret');
  if (name && caret) {
    const others = names.filter(n => n !== name && n[0].toLowerCase() === partial[0].toLowerCase());
    const options = [name, ...others.sort(() => Math.random() - 0.5).slice(0, 3)];
    const kinds = ['abc', 'fn', 'var', 'ref'];
    suggest.innerHTML = options.map((o, i) =>
      '<li' + (i === 0 ? ' class="picked"' : '') + '><span class="kind k' + i + '">' + kinds[i] + '</span><span><b>' +
      esc(o.slice(0, partial.length)) + '</b>' + esc(o.slice(partial.length)) + '</span></li>').join('');
    const pr = pane.getBoundingClientRect(), cr = caret.getBoundingClientRect();
    suggest.style.left = Math.max(0, Math.min(cr.left - pr.left, pane.clientWidth - 250)) + pane.scrollLeft + 'px';
    suggest.style.top = (cr.bottom - pr.top + pane.scrollTop + 4) + 'px';
    suggest.hidden = false;
  } else suggest.hidden = true;

  // tabs and tree
  let tabs = '';
  for (let i = 0; i <= cur; i++) {
    tabs += '<button class="tab' + (i === open ? ' active' : '') + '" data-file="' + i + '"><span class="icon ' +
      ext(i) + '">' + icon(i) + '</span>' + base(i) + (i === cur && state.running ? '<span class="dot"></span>' : '<span class="close">×</span>') + '</button>';
  }
  $('tabs').innerHTML = tabs;
  $('tabs').querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  document.querySelectorAll('#tree .file').forEach(el => {
    const i = +el.dataset.file;
    el.className = 'file ' + (i < cur || state.typed >= GOAL ? 'done' : i === cur ? 'live' : 'todo') + (i === open ? ' open' : '');
    el.disabled = i > cur;
  });
  $('crumbs').innerHTML = FILES[open].split('/').map(esc).join('<i>›</i>');
  document.title = base(open) + ' - React Compiler';

  // title + status bar
  const done = state.typed >= GOAL;
  const run = $('run');
  run.innerHTML = state.running ? '<i class="sq"></i>Finish' : '<i class="tri"></i>' + (done ? 'Start over' : state.typed ? 'Resume' : 'Start');
  run.classList.toggle('on', state.running);
  document.body.classList.toggle('running', state.running);
  $('status-state').textContent = state.running ? 'compiling' : done ? 'done' : state.typed ? 'paused' : 'ready';
  $('status-words').textContent = 'round ' + (state.round || 1) + ' · ' + state.typed + ' / ' + GOAL + ' words';
  $('status-left').textContent = state.running ? 'runs until Finish' : done ? 'all files compiled' : 'stopped';
  $('status-pos').textContent = 'Ln ' + lines.length + ', Col ' + (lines[lines.length - 1].length + 1);
  $('status-lang').textContent = ext(open) === 'jsx' ? 'JavaScript JSX' : 'JavaScript';
  $('progress').style.width = (GOAL ? state.typed / GOAL * 100 : 0) + '%';
}

const base = i => FILES[i].split('/').pop();
const ext = i => FILES[i].split('.').pop();
const icon = i => ext(i) === 'jsx' ? '⚛' : 'JS';

function buildTree() {
  const root = {};
  FILES.forEach((p, i) => {
    let node = root;
    const parts = p.split('/');
    parts.forEach((part, d) => { node = node[part] ??= d === parts.length - 1 ? i : {}; });
  });
  const walk = (node, depth) => Object.entries(node).map(([name, v]) => typeof v === 'number'
    ? '<button class="file todo" data-file="' + v + '" style="padding-left:' + (14 + depth * 12) + 'px"><span class="icon ' +
      ext(v) + '">' + icon(v) + '</span>' + esc(name) + '<span class="dot"></span></button>'
    : '<div class="folder" style="padding-left:' + (6 + depth * 12) + 'px"><i class="chev"></i>' + esc(name) + '</div>' + walk(v, depth + 1)
  ).join('');
  $('tree').innerHTML = '<div class="folder root"><i class="chev"></i>REACT-COMPILER</div>' + walk(root, 0);
}

function openFile(e) {
  const b = e.target.closest('[data-file]');
  if (!b || b.disabled) return;
  const i = +b.dataset.file;
  viewing = i === currentFile() ? null : i;
  draw();
}
$('tree').addEventListener('click', openFile);
$('tabs').addEventListener('click', openFile);
pane.addEventListener('scroll', () => { if (!state.running) draw(); });
window.addEventListener('resize', draw);

// --- start and stop ------------------------------------------------------------

// reactcompiler:// opens the small keep-awake helper installed by setup.bat.
function helper(cmd) {
  const a = document.createElement('a');
  a.href = 'reactcompiler://' + cmd;
  a.click();
}

async function holdScreen() {
  try {
    if (state.running && !document.hidden && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => { holdScreen(); draw(); });

function resume() {
  state.startedAt = Date.now() - state.typed * SPW * 1000;
  state.running = true;
  save(); draw(); holdScreen();
}

$('run').addEventListener('click', () => {
  if (!GOAL) return;
  if (state.running) {
    if (queue.length) { while (queue.length) press(queue.shift()); wordDone(); }
    state.running = false;
    save(); draw();
    if (wakeLock) wakeLock.release().catch(() => {});
    helper('stop');
    log('^C', 'cmd'); log('[react-compiler] finished at word ' + state.typed + ', round ' + (state.round || 1), 'warn');
    return;
  }
  if (state.typed >= GOAL) { state.typed = 0; state.round = 1; texts = texts.map(() => ''); viewing = null; boot(); }
  resume();
  log('[react-compiler] compiling ' + FILES.length + ' files, watching for changes', 'ok');
  helper('start/forever');
});

// --- extras --------------------------------------------------------------------

$('download').addEventListener('click', () => {
  const open = viewing ?? currentFile();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texts[open]], { type: 'text/javascript' }));
  a.download = base(open);
  a.click();
});

// Clear needs two clicks and no pop-up.
const clear = $('clear');
let armed = null;
clear.addEventListener('click', () => {
  if (armed) {
    clearTimeout(armed); armed = null; clear.classList.remove('armed'); clear.textContent = 'Clear';
    if (state.running) helper('stop');
    queue = []; typing = null; viewing = null;
    state.typed = 0; state.round = 1; state.running = false; texts = texts.map(() => '');
    save(); boot(); draw();
  } else {
    clear.classList.add('armed'); clear.textContent = 'Sure?';
    armed = setTimeout(() => { armed = null; clear.classList.remove('armed'); clear.textContent = 'Clear'; }, 3000);
  }
});

draw();
