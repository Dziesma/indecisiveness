/* Spin the Bottle — a tiny, dependency-free decision maker. */

const THEMES = {
  /* Amber glass, oat linen and a carmine accent, to go with the beer bottle. */
  alus: {
    emoji: '🍺',
    slices: [
      '#f2e3b8', '#e0b45e', '#cbd09b', '#a9c39c', '#9dc1bd',
      '#b4c0d3', '#d3c2ab', '#e0a983', '#b9a389', '#bfc7b4'
    ],
    confetti: ['#c07a1e', '#9e3039', '#e0b45e', '#f2e3b8', '#8fa882', '#6f3d13']
  },
  /* Claret, bottle green and limestone, for the Bordeaux bottle. */
  bordeaux: {
    emoji: '🍷',
    slices: [
      '#e8d7d2', '#cfa3a8', '#b7909f', '#a8adb8', '#b3bda6',
      '#d8c3a0', '#c9a678', '#d2a08a', '#bfae9e', '#9db3a6'
    ],
    confetti: ['#8c2f45', '#6b1f33', '#cfa3a8', '#d8c3a0', '#3f4b3a', '#c9a678']
  },
  /* The original bubblegum set. */
  candy: {
    emoji: '🍾',
    slices: [
      '#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff',
      '#a0c4ff', '#bdb2ff', '#ffc6ff', '#ffb5a7', '#b8f2e6',
      '#f6d6ff', '#d4f0a0'
    ],
    confetti: null   // falls back to the slice colours
  }
};

const DEFAULT_SKIN = 'alus';

const MAX_OPTIONS = 24;
const MAX_LEN = 40;
const STORE_KEY = 'spin-the-bottle:options';
const SKIN_KEY = 'spin-the-bottle:skin';
const DEFAULTS = ['Pizza 🍕', 'Sushi 🍣', 'Tacos 🌮', 'Ramen 🍜', 'Burgers 🍔', 'Salad 🥗'];

const CX = 200, CY = 200, R = 170;
const SVG_NS = 'http://www.w3.org/2000/svg';

const $ = (sel) => document.querySelector(sel);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const el = {
  form: $('#add-form'),
  input: $('#option-input'),
  hint: $('#hint'),
  chips: $('#chips'),
  wheel: $('#wheel'),
  bottle: $('#bottle'),
  spin: $('#spin-btn'),
  status: $('#status'),
  modal: $('#modal'),
  winner: $('#winner-label'),
  toast: $('#toast'),
  countNote: $('#count-note'),
  skinEmoji: $('#skin-emoji')
};

let options = [];
let skin = DEFAULT_SKIN;
let rotation = 0;        // accumulated bottle rotation, in degrees
let spinning = false;
let winnerIndex = -1;

/* ---------------- state helpers ---------------- */

const palette = () => THEMES[skin].slices;
const colorFor = (i) => palette()[i % palette().length];

/* Colours for the current option list; nudges the last one if it would meet
   the same colour at the top of the circle. */
function sliceColors(n) {
  const colors = [];
  for (let i = 0; i < n; i++) colors.push(colorFor(i));
  if (n > 2 && colors[n - 1] === colors[0]) colors[n - 1] = palette()[n % palette().length];
  return colors;
}

function loadOptions() {
  const fromHash = readHash().options;
  if (fromHash && fromHash.length) return fromHash;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) return saved.slice(0, MAX_OPTIONS);
  } catch (_) { /* ignore corrupt storage */ }
  return DEFAULTS.slice();
}

function loadSkin() {
  const fromHash = readHash().skin;
  if (fromHash) return fromHash;
  try {
    const saved = localStorage.getItem(SKIN_KEY);
    if (saved && THEMES[saved]) return saved;
  } catch (_) { /* private mode */ }
  return DEFAULT_SKIN;
}

/* Hash format: #o=<options joined by |>&s=<skin>. Both parts are optional,
   so the older #o=… links people may have shared still work. */
function readHash() {
  const raw = location.hash.replace(/^#/, '');
  if (!raw) return {};
  const out = {};
  for (const part of raw.split('&')) {
    const eq = part.indexOf('=');
    const key = eq < 0 ? part : part.slice(0, eq);
    const value = eq < 0 ? '' : part.slice(eq + 1);
    if (key === 'o') {
      try {
        out.options = decodeURIComponent(value)
          .split('|')
          .map((s) => s.trim().slice(0, MAX_LEN))
          .filter(Boolean)
          .slice(0, MAX_OPTIONS);
      } catch (_) { /* malformed escape */ }
    } else if (key === 's' && THEMES[value]) {
      out.skin = value;
    }
  }
  return out;
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(options));
    localStorage.setItem(SKIN_KEY, skin);
  } catch (_) { /* private mode */ }
  const parts = [];
  if (options.length) parts.push('o=' + encodeURIComponent(options.join('|')));
  if (skin !== DEFAULT_SKIN) parts.push('s=' + skin);
  const hash = parts.length ? '#' + parts.join('&') : '';
  try {
    history.replaceState(null, '', location.pathname + location.search + hash);
  } catch (_) { /* some browsers block replaceState on file:// */ }
}

/* ---------------- option editing ---------------- */

function addOptions(raw) {
  if (spinning) return false;
  const parts = raw.split(/[,\n]+/).map((s) => s.trim().slice(0, MAX_LEN)).filter(Boolean);
  if (!parts.length) return false;

  let added = 0, dupes = 0;
  for (const p of parts) {
    if (options.length >= MAX_OPTIONS) { flashHint('That is ' + MAX_OPTIONS + ' options — the circle is full!'); break; }
    if (options.some((o) => o.toLowerCase() === p.toLowerCase())) { dupes++; continue; }
    options.push(p);
    added++;
  }
  if (dupes && !added) flashHint(dupes > 1 ? 'Those are already on the circle 👀' : 'That one is already on the circle 👀');
  if (added) { persist(); render(); }
  return added > 0;
}

function removeOption(i) {
  if (spinning) return;
  options.splice(i, 1);
  persist();
  render();
}

function flashHint(msg) {
  el.hint.textContent = msg;
  el.hint.classList.add('warn');
  el.input.classList.remove('shake');
  void el.input.offsetWidth;
  el.input.classList.add('shake');
  clearTimeout(flashHint.t);
  flashHint.t = setTimeout(() => {
    el.hint.textContent = 'Tip: separate several at once with commas or new lines.';
    el.hint.classList.remove('warn');
  }, 2600);
}

function toast(msg) {
  el.toast.textContent = msg;
  el.toast.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.toast.hidden = true; }, 1800);
}

/* ---------------- rendering ---------------- */

function pointOn(radius, deg) {
  const a = (deg - 90) * Math.PI / 180;   // 0deg = straight up, growing clockwise
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

function slicePath(startDeg, endDeg) {
  const p1 = pointOn(R, startDeg);
  const p2 = pointOn(R, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
         `A ${R} ${R} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`;
}

function make(tag, attrs, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (text != null) node.textContent = text;
  return node;
}

function renderWheel() {
  el.wheel.textContent = '';
  const n = options.length;

  if (n === 0) {
    el.wheel.appendChild(make('circle', { class: 'empty-ring', cx: CX, cy: CY, r: R }));
    el.wheel.appendChild(make('text', { class: 'empty-text', x: CX, y: CY - 24 }, 'Your circle is empty'));
    el.wheel.appendChild(make('text', { class: 'empty-text', x: CX, y: CY + 2 }, 'Add some options →'));
    return;
  }

  const step = 360 / n;
  const size = n <= 5 ? 18 : n <= 8 ? 16 : n <= 12 ? 14 : n <= 18 ? 12 : 10.5;
  const colors = sliceColors(n);

  if (n === 1) {
    el.wheel.appendChild(make('circle', { class: 'slice', 'data-i': 0, cx: CX, cy: CY, r: R, fill: colors[0] }));
  } else {
    for (let i = 0; i < n; i++) {
      el.wheel.appendChild(make('path', {
        class: 'slice', 'data-i': i, d: slicePath(i * step, (i + 1) * step), fill: colors[i]
      }));
    }
  }

  for (let i = 0; i < n; i++) {
    const mid = i * step + step / 2;
    const flip = mid > 180;
    const text = make('text', {
      class: 'slice-label',
      'font-size': size,
      'text-anchor': flip ? 'start' : 'end',
      transform: `translate(${CX},${CY}) rotate(${mid - 90}) translate(${R - 16},0)` + (flip ? ' rotate(180)' : '')
    }, options[i]);
    text.dataset.full = options[i];
    el.wheel.appendChild(text);
  }
  fitLabels(size);

  if (n > 1) {
    for (let i = 0; i < n; i++) {
      const p = pointOn(R - 5, i * step);
      el.wheel.appendChild(make('circle', { class: 'peg', cx: p.x.toFixed(2), cy: p.y.toFixed(2), r: 3.2 }));
    }
  }
  el.wheel.appendChild(make('circle', { class: 'rim', cx: CX, cy: CY, r: R }));
  el.wheel.appendChild(make('circle', { class: 'rim-outer', cx: CX, cy: CY, r: R + 9 }));
}

/* Labels run radially inward from the rim, so keep them from reaching the hub:
   shrink a couple of points first, then truncate with an ellipsis. */
function fitLabels(baseSize) {
  const maxRun = R - 16 - 40;
  el.wheel.querySelectorAll('.slice-label').forEach((text) => {
    const full = text.dataset.full;
    let size = baseSize;
    let width = measure(text);

    while (width > maxRun && size > 9) {
      size -= 1;
      text.setAttribute('font-size', size);
      width = measure(text);
    }
    let str = full;
    while (width > maxRun && str.length > 2) {
      str = str.slice(0, -2);
      text.textContent = str + '…';
      width = measure(text);
    }
    if (!width && full.length > 18) text.textContent = full.slice(0, 17) + '…';  // no measuring available
    text.appendChild(make('title', {}, full));
  });
}

function measure(text) {
  try { return text.getComputedTextLength(); } catch (_) { return 0; }
}

function renderChips() {
  el.chips.textContent = '';
  const colors = sliceColors(options.length);
  options.forEach((opt, i) => {
    const li = document.createElement('li');
    li.className = 'chip';
    li.style.setProperty('--chip-color', colors[i]);

    const dot = document.createElement('span');
    dot.className = 'dot';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = opt;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '×';
    btn.title = 'Remove ' + opt;
    btn.setAttribute('aria-label', 'Remove ' + opt);
    btn.addEventListener('click', () => removeOption(i));

    li.append(dot, label, btn);
    el.chips.appendChild(li);
  });
}

function render() {
  renderChips();
  renderWheel();
  const ready = options.length >= 2;
  el.spin.disabled = !ready || spinning;
  if (!spinning) {
    el.status.textContent = ready
      ? 'Ready when you are — ' + options.length + ' options on the circle.'
      : 'Add at least 2 options to spin.';
  }
  el.countNote.textContent = options.length + ' option' + (options.length === 1 ? '' : 's') + ' loaded';
}

/* ---------------- theme ---------------- */

function applySkin(next) {
  skin = THEMES[next] ? next : DEFAULT_SKIN;
  document.documentElement.setAttribute('data-skin', skin);
  el.skinEmoji.textContent = THEMES[skin].emoji;
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.skin === skin));
  });
  persist();
  render();   // slice and chip colours come from the active theme
}

/* ---------------- spinning ---------------- */

function spin() {
  if (spinning || options.length < 2) return;
  spinning = true;
  el.spin.disabled = true;
  el.modal.hidden = true;
  el.status.textContent = 'Spinning… 🌀';

  const n = options.length;
  const step = 360 / n;
  winnerIndex = Math.floor(Math.random() * n);

  // Land somewhere inside the winning slice, but not always dead centre.
  const jitter = (Math.random() - 0.5) * step * 0.7;
  const target = winnerIndex * step + step / 2 + jitter;

  const current = ((rotation % 360) + 360) % 360;
  const turns = reduceMotion ? 1 : 4 + Math.floor(Math.random() * 3);
  const delta = ((target - current) % 360 + 360) % 360 + 360 * turns;

  const duration = reduceMotion ? 700 : 4200 + Math.random() * 900;
  rotation += delta;

  el.wheel.querySelectorAll('.slice').forEach((s) => s.classList.remove('win', 'dim'));
  el.bottle.style.transitionDuration = duration + 'ms';
  el.bottle.style.transform = 'rotate(' + rotation + 'deg)';

  clearTimeout(spin.t);
  spin.t = setTimeout(finishSpin, duration + 120);
}

function finishSpin() {
  spinning = false;
  const pick = options[winnerIndex];
  if (pick == null) { render(); return; }

  el.wheel.querySelectorAll('.slice').forEach((s) => {
    s.classList.toggle('win', Number(s.dataset.i) === winnerIndex);
    s.classList.toggle('dim', Number(s.dataset.i) !== winnerIndex);
  });

  el.winner.textContent = pick;
  el.modal.hidden = false;
  el.status.textContent = 'The bottle picked: ' + pick;
  el.spin.disabled = options.length < 2;
  $('#again-btn').focus();
  if (!reduceMotion) burstConfetti();
}

/* ---------------- confetti ---------------- */

const canvas = $('#confetti');
const ctx = canvas.getContext('2d');
let pieces = [];
let rafId = 0;

function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function burstConfetti() {
  sizeCanvas();
  const w = window.innerWidth;
  const colors = THEMES[skin].confetti || palette();
  pieces = Array.from({ length: 110 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.5,
    y: window.innerHeight * 0.42 + (Math.random() - 0.5) * 60,
    vx: (Math.random() - 0.5) * 9,
    vy: -6 - Math.random() * 9,
    size: 5 + Math.random() * 7,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.28,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 1
  }));
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(drawConfetti);
}

function drawConfetti() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  let alive = false;
  for (const p of pieces) {
    p.vy += 0.32;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 0.006;
    if (p.life > 0 && p.y < window.innerHeight + 40) {
      alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
  }
  if (alive) rafId = requestAnimationFrame(drawConfetti);
  else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

/* ---------------- wiring ---------------- */

el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (addOptions(el.input.value)) el.input.value = '';
  el.input.focus();
});

el.spin.addEventListener('click', spin);
$('#again-btn').addEventListener('click', spin);
$('#close-btn').addEventListener('click', () => { el.modal.hidden = true; });

$('#remove-btn').addEventListener('click', () => {
  if (winnerIndex >= 0) removeOption(winnerIndex);
  el.modal.hidden = true;
  if (options.length >= 2) spin();
});

document.querySelectorAll('.theme-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.skin !== skin) applySkin(btn.dataset.skin);
  });
});

$('#shuffle-btn').addEventListener('click', () => {
  if (spinning) return;
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  persist();
  render();
  toast('Shuffled! 🔀');
});

$('#clear-btn').addEventListener('click', () => {
  if (spinning || !options.length) return;
  options = [];
  persist();
  render();
  el.input.focus();
});

$('#copy-btn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    toast('Link copied — share your circle! 🔗');
  } catch (_) {
    toast('Copy failed — grab the URL from the address bar.');
  }
});

el.modal.addEventListener('click', (e) => { if (e.target === el.modal) el.modal.hidden = true; });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') el.modal.hidden = true;
  if (e.key === ' ' && document.activeElement === document.body) { e.preventDefault(); spin(); }
});

window.addEventListener('hashchange', () => {
  const fromHash = readHash();
  if (fromHash.options && fromHash.options.length) options = fromHash.options;
  applySkin(fromHash.skin || skin);   // persists and re-renders
});

window.addEventListener('resize', () => { if (pieces.length) sizeCanvas(); });

options = loadOptions();
applySkin(loadSkin());   // persists and renders
sizeCanvas();
