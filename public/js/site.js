import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { db, FALLBACK, SERIES, r2, fmt, label, byDate, esc } from './performance.js';

const $ = sel => document.querySelector(sel);

function renderLatest(L) {
  $('[data-ticker]').innerHTML =
    `<span class="ticker-q">${label(L)}</span>` +
    SERIES.map(s => `<span class="ticker-item${s.key === 'bcm' ? ' bcm' : ''}"><span>${esc(s.short)}</span><b>${fmt(L[s.key])}</b></span>`).join('');

  $('[data-latest-label]').textContent = label(L);
  const big = $('[data-latest-bcm]');
  big.textContent = fmt(L.bcm);
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
  const groups = data.map(d => `<div class="group">${SERIES.map(s => {
    const v = d[s.key], neg = v < 0;
    const lbl = s.key === 'bcm' ? `<b style="top:${pct(v)}%">${fmt(v)}</b>` : '';
    return `<div class="bar${neg ? ' neg' : ''}" title="${esc(`${s.short} ${label(d)}: ${fmt(v)}`)}">` +
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

$('[data-legend]').innerHTML = SERIES.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('');
$('[data-year]').textContent = new Date().getFullYear();

document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
  const view = btn.dataset.view;
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  $('[data-chart]').hidden = view !== 'chart';
  $('[data-table]').hidden = view !== 'table';
}));

render(FALLBACK);

getDocs(collection(db, 'performance'))
  .then(snap => render(snap.docs.map(d => d.data())))
  .catch(err => console.warn('Performance data unavailable, showing built-in figures.', err));
