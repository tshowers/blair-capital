import { FALLBACK, SERIES, r2, fmt, label, byDate, esc } from './performance.js';

const $ = sel => document.querySelector(sel);
const motion = document.documentElement.classList.contains('js-motion');
let latest = null;
let counting = false;

// ---- Rendering ----

function tickerItems(L) {
  return `<span class="ticker-q">${label(L)}</span>` +
    SERIES.map(s => `<span class="ticker-item${s.key === 'bcm' ? ' bcm' : ''}"><span>${esc(s.short)}</span><b>${fmt(L[s.key])}</b></span>`).join('');
}

function renderTicker(L) {
  const el = $('[data-ticker]');
  const key = label(L) + SERIES.map(s => L[s.key]).join();
  if (el.dataset.key === key) return; // don't restart the marquee for identical data
  el.dataset.key = key;
  if (!motion) {
    el.innerHTML = tickerItems(L);
    return;
  }
  // Marquee: two identical halves scrolled by -50% loop seamlessly. Each half is wider than the strip.
  const half = tickerItems(L).repeat(3);
  el.closest('.ticker').classList.add('marquee');
  el.innerHTML = `<div class="ticker-track"><div class="ticker-half">${half}</div><div class="ticker-half" aria-hidden="true">${half}</div></div>`;
}

function renderLatest(L) {
  latest = L;
  renderTicker(L);
  $('[data-latest-label]').textContent = label(L);
  const big = $('[data-latest-bcm]');
  if (counting) reserveWidth(big);
  else big.textContent = fmt(L.bcm);
  big.classList.toggle('down', L.bcm < 0);

  $('[data-comparisons]').innerHTML = SERIES.slice(1).map(s => {
    const d = r2(L.bcm - L[s.key]);
    const pill = d === 0 ? 'Even' : `BCM ${d > 0 ? '+' : '−'}${Math.abs(d)} pts`;
    return `<div class="cmp"><span>${esc(s.name)}</span><span class="val">${fmt(L[s.key])}</span>` +
      `<span class="pill${d >= 0 ? ' ahead' : ''}">${pill}</span></div>`;
  }).join('');
}

function renderChart(data) {
  const vals = data.flatMap(d => SERIES.map(s => d[s.key]));
  const step = 5;
  const max = Math.max(step, Math.ceil(Math.max(...vals) / step) * step);
  const min = Math.min(0, Math.floor(Math.min(...vals) / step) * step);
  const span = max - min;
  const pct = v => ((max - v) / span) * 100;
  const tickStep = span > 40 ? 10 : 5;
  const ticks = [];
  for (let t = max; t >= min; t -= tickStep) ticks.push(t);

  $('[data-y-axis]').innerHTML = ticks.map(t => `<span style="top:${pct(t)}%">${t}%</span>`).join('');
  $('[data-plot-inner]').style.minWidth = data.length * 160 + 'px';

  const grid = ticks.map(t => `<div class="gridline${t === 0 ? ' zero' : ''}" style="top:${pct(t)}%"></div>`).join('');
  const groups = data.map((d, gi) => `<div class="group">${SERIES.map((s, si) => {
    const v = d[s.key], neg = v < 0;
    const lbl = s.key === 'bcm' ? `<b style="top:${pct(v)}%">${fmt(v)}</b>` : '';
    return `<div class="bar${neg ? ' neg' : ''}" style="--d:${(gi * SERIES.length + si) * 45}ms" title="${esc(`${s.short} ${label(d)}: ${fmt(v)}`)}">` +
      `<i style="top:${pct(Math.max(v, 0))}%;height:${(Math.abs(v) / span) * 100}%;background:${s.color}"></i>${lbl}</div>`;
  }).join('')}</div>`).join('');
  $('[data-plot]').innerHTML = grid + `<div class="groups">${groups}</div>`;

  $('[data-x-labels]').innerHTML = data.map(d => `<span>${label(d)}</span>`).join('');
}

function renderTable(data) {
  $('[data-tbody]').innerHTML = [...data].reverse().map(d =>
    `<tr><td>${label(d)}</td>${SERIES.map(s => `<td${s.key === 'bcm' ? ' class="bcm"' : ''}>${fmt(d[s.key])}</td>`).join('')}</tr>`
  ).join('');
}

function render(quarters) {
  const data = [...quarters].sort(byDate);
  if (!data.length) return;
  renderLatest(data[data.length - 1]);
  renderChart(data);
  renderTable(data);
}

// ---- Motion ----

// Counts the hero number up from 0. Reads `latest` every frame, so late data lands on the right value.
// Lock the number's width to its final value so the caption beside it doesn't jump while counting.
function reserveWidth(el) {
  const shown = el.textContent;
  el.style.minWidth = '';
  el.textContent = fmt(latest.bcm);
  el.style.minWidth = el.getBoundingClientRect().width + 'px';
  el.textContent = shown;
}

function countUp(el) {
  counting = true;
  const start = performance.now(), dur = 1100;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const frame = now => {
    const t = Math.min(1, (now - start) / dur), target = latest.bcm;
    reserveWidth(el); // every frame: the web font or the target may change mid-count
    const dec = (String(Math.abs(target)).split('.')[1] || '').length;
    const v = target * ease(t);
    el.textContent = t < 1 ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(dec) + '%' : fmt(target);
    if (t < 1) requestAnimationFrame(frame);
    else { counting = false; el.style.minWidth = ''; }
  };
  requestAnimationFrame(frame);
}

function intro() {
  $('[data-card]').classList.add('in');
  countUp($('[data-latest-bcm]'));
  setTimeout(() => $('[data-comparisons]').classList.add('in'), 350);
}

function observeReveals() {
  const groups = [
    '.hero-copy > *', '.history-head', '.panel', '.disclaimer', '.services .section-head', '.service',
    '.positions', '.why-section .section-head', '.why', '.team-copy > *', '.contact .stack > *', '.address'
  ];
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });

  for (const sel of groups) {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--d', `${Math.min(i, 5) * 90}ms`);
      io.observe(el);
    });
  }

  const chart = $('[data-chart]');
  const chartIo = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    chart.classList.add('in');
    chartIo.disconnect();
  }, { threshold: 0.35 });
  chartIo.observe(chart);
}

// ---- Data ----

async function loadQuarters() {
  try {
    const [{ db }, { collection, getDocs }] = await Promise.all([
      import('./firebase.js'),
      import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js')
    ]);
    const snap = await getDocs(collection(db, 'performance'));
    const quarters = snap.docs.map(d => d.data());
    return quarters.length ? quarters : null;
  } catch (err) {
    console.warn('Performance data unavailable, showing built-in figures.', err);
    return null;
  }
}

// ---- Boot ----

$('[data-legend]').innerHTML = SERIES.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('');
$('[data-year]').textContent = new Date().getFullYear();

document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
  const view = btn.dataset.view;
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  $('[data-chart]').hidden = view !== 'chart';
  $('[data-table]').hidden = view !== 'table';
}));

render(FALLBACK);
window.__bcReady = true;
const quarters = loadQuarters();

if (motion) {
  observeReveals();
  // Give Firestore a moment so the count-up lands on the real latest quarter, not the built-in one.
  const first = await Promise.race([quarters, new Promise(r => setTimeout(r, 600, undefined))]);
  if (first) render(first);
  intro();
}
const data = await quarters;
if (data) render(data);
