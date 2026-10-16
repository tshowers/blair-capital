import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { collection, doc, getDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { app, db, SERIES, fmt, label, docId, byDate, esc } from './performance.js';

const auth = getAuth(app);
const $ = sel => document.querySelector(sel);
const NEG = /^[-−]/;

// Default to the quarter that just ended.
const now = new Date();
const lastQ = Math.floor(now.getMonth() / 3);
const state = {
  q: lastQ || 4,
  year: String(lastQ ? now.getFullYear() : now.getFullYear() - 1),
  neg: {},
  quarters: [],
  saving: false,
  saved: ''
};
let unsubscribe = null;

function show(view) {
  for (const v of ['loading', 'signin', 'denied', 'app']) $(`[data-${v}]`).hidden = v !== view;
  $('[data-signout]').hidden = view === 'signin' || view === 'loading';
}

// ---- Auth ----

onAuthStateChanged(auth, async user => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (!user) return show('signin');
  show('loading');
  let isAdmin = false;
  try { isAdmin = (await getDoc(doc(db, 'admins', user.uid))).exists(); } catch (e) { console.warn(e); }
  if (!isAdmin) {
    $('[data-denied-email]').textContent = user.email;
    return show('denied');
  }
  show('app');
  unsubscribe = onSnapshot(collection(db, 'performance'), snap => {
    state.quarters = snap.docs.map(d => d.data());
    renderList();
    renderForm();
  });
});

$('[data-signin-form]').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget, err = $('[data-signin-error]'), btn = form.querySelector('button');
  err.hidden = true;
  btn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
    form.reset();
  } catch (ex) {
    err.textContent = ex.code === 'auth/too-many-requests'
      ? 'Too many attempts. Wait a few minutes and try again.'
      : ex.code === 'auth/network-request-failed'
        ? 'No connection. Check your internet and try again.'
        : 'Email or password is incorrect.';
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

$('[data-signout]').addEventListener('click', () => signOut(auth));

// ---- Form ----

const fieldsEl = $('[data-fields]');
fieldsEl.innerHTML = SERIES.map(s => `
  <div class="stack-6">
    <label class="num-label${s.key === 'bcm' ? ' bcm' : ''}" for="f-${s.key}">${esc(s.name)}</label>
    <div class="num-row">
      <button type="button" class="sign" data-sign="${s.key}" aria-label="${esc(s.name)}: switch between gain and loss">+</button>
      <div class="num-input">
        <input id="f-${s.key}" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" data-input="${s.key}">
        <span aria-hidden="true">%</span>
      </div>
    </div>
  </div>`).join('');

$('[data-q-picker]').innerHTML = [1, 2, 3, 4].map(n => `<button type="button" data-q="${n}">Q${n}</button>`).join('');

const input = key => $(`[data-input="${key}"]`);
const yearInput = $('[data-year]');
yearInput.value = state.year;

function clearMessages() {
  state.saved = '';
  $('[data-error]').hidden = true;
}

function setValues(d) {
  for (const s of SERIES) {
    const v = d ? d[s.key] : null;
    state.neg[s.key] = v != null && v < 0;
    input(s.key).value = v == null ? '' : String(Math.abs(v));
    input(s.key).removeAttribute('aria-invalid');
  }
  yearInput.removeAttribute('aria-invalid');
}

function renderForm() {
  const year = Number(state.year);
  const exists = state.quarters.some(d => d.year === year && d.q === state.q);
  const ql = `Q${state.q} ${state.year}`;

  document.querySelectorAll('[data-q]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.q) === state.q)));
  for (const s of SERIES) {
    const btn = $(`[data-sign="${s.key}"]`), neg = !!state.neg[s.key];
    btn.textContent = neg ? '−' : '+';
    btn.classList.toggle('neg', neg);
  }
  $('[data-form-title]').textContent = exists ? `Edit ${ql}` : 'Publish a quarter';
  const overwrite = $('[data-overwrite]');
  overwrite.textContent = `${ql} is already published. Publishing will replace it.`;
  overwrite.hidden = !exists || !!state.saved;
  $('[data-saved]').hidden = !state.saved;
  $('[data-saved-text]').textContent = state.saved;

  const pub = $('[data-publish]');
  pub.disabled = state.saving;
  pub.innerHTML = state.saving
    ? '<span class="spinner" aria-hidden="true"></span>Publishing…'
    : esc(exists ? `Update ${ql}` : `Publish ${ql}`);
}

$('[data-q-picker]').addEventListener('click', e => {
  const b = e.target.closest('[data-q]');
  if (!b) return;
  state.q = Number(b.dataset.q);
  clearMessages();
  renderForm();
});

yearInput.addEventListener('input', () => {
  yearInput.value = yearInput.value.replace(/\D/g, '').slice(0, 4);
  state.year = yearInput.value;
  clearMessages();
  renderForm();
});

fieldsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-sign]');
  if (!b) return;
  state.neg[b.dataset.sign] = !state.neg[b.dataset.sign];
  clearMessages();
  renderForm();
});

// Typing a leading "-" flips the sign toggle instead of staying in the box.
fieldsEl.addEventListener('input', e => {
  const key = e.target.dataset.input;
  if (!key) return;
  if (NEG.test(e.target.value)) {
    state.neg[key] = true;
    e.target.value = e.target.value.replace(NEG, '');
  }
  e.target.removeAttribute('aria-invalid');
  clearMessages();
  renderForm();
});

$('[data-clear]').addEventListener('click', () => {
  setValues(null);
  clearMessages();
  renderForm();
});

function parse(raw) {
  const t = raw.replace(/[%\s+,]/g, '');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return null;
  return Number(t);
}

$('[data-form]').addEventListener('submit', async e => {
  e.preventDefault();
  if (state.saving) return;
  clearMessages();
  const err = $('[data-error]');
  const year = Number(state.year), q = state.q;
  const vals = {};
  let bad = false;

  for (const s of SERIES) {
    const n = parse(input(s.key).value);
    const ok = n !== null && n <= 100;
    input(s.key).toggleAttribute('aria-invalid', !ok);
    if (ok) vals[s.key] = state.neg[s.key] ? -n : n;
    else bad = true;
  }
  const yearOk = Number.isInteger(year) && year >= 2000 && year <= 2100;
  yearInput.toggleAttribute('aria-invalid', !yearOk);

  if (!yearOk || bad) {
    err.textContent = !yearOk ? 'Enter a valid year.' : 'Enter a number for every field (between -100 and 100).';
    err.hidden = false;
    return renderForm();
  }

  state.saving = true;
  renderForm();
  try {
    await setDoc(doc(db, 'performance', docId(year, q)), {
      year, q, ...vals,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.email || auth.currentUser.uid
    });
    setValues(null);
    state.saved = `Q${q} ${year} is live on the website.`;
  } catch (ex) {
    console.error(ex);
    err.textContent = ex.code === 'permission-denied'
      ? "This account isn't allowed to publish. Ask the site manager for access."
      : "Couldn't publish. Check your connection and try again.";
    err.hidden = false;
  } finally {
    state.saving = false;
    renderForm();
  }
});

// ---- Published list ----

function renderList() {
  const rows = [...state.quarters].sort(byDate).reverse();
  $('[data-list]').innerHTML = rows.length ? rows.map(d => `
    <div class="list-row">
      <div class="info">
        <b>${label(d)}</b>
        <span>BCM <strong>${fmt(d.bcm)}</strong> · S&amp;P 500 ${fmt(d.sp500)}</span>
      </div>
      <button type="button" class="btn-edit" data-edit="${docId(d.year, d.q)}">Edit</button>
      <button type="button" class="btn-delete" data-delete="${docId(d.year, d.q)}">Delete</button>
    </div>`).join('') : '<p class="list-empty">Nothing published yet.</p>';
}

$('[data-list]').addEventListener('click', async e => {
  const edit = e.target.closest('[data-edit]'), del = e.target.closest('[data-delete]');
  const id = (edit || del)?.dataset.edit || (edit || del)?.dataset.delete;
  const d = state.quarters.find(x => docId(x.year, x.q) === id);
  if (!d) return;

  if (edit) {
    state.q = d.q;
    state.year = yearInput.value = String(d.year);
    setValues(d);
    clearMessages();
    renderForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (state.quarters.length <= 1) return alert("The last remaining quarter can't be deleted.");
  if (!confirm(`Delete ${label(d)}? It will disappear from the website.`)) return;
  try {
    await deleteDoc(doc(db, 'performance', id));
  } catch (ex) {
    console.error(ex);
    alert(`Couldn't delete ${label(d)}. Try again.`);
  }
});

renderForm();
