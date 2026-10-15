// Shared by the public site and the staff updater.
// Data lives in Firestore in the blaircapital-prod project; hosting stays on taliferro-de66f.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

export const app = initializeApp({
  apiKey: 'AIzaSyBVU5dzbGcpwFBbyPS_Iwq37bIMpCNIpcQ',
  authDomain: 'blaircapital-prod.firebaseapp.com',
  projectId: 'blaircapital-prod',
  storageBucket: 'blaircapital-prod.appspot.com',
  messagingSenderId: '829550889645',
  appId: '1:829550889645:web:2ffe9d7d15b0b860195424'
});
export const db = getFirestore(app);

// Shown until Firestore responds (and if it can't be reached).
export const FALLBACK = [
  { year: 2026, q: 1, bcm: -1.24, dow: -3.61, sp500: -4.6, sp400: 2.54, nasdaq: 4.5 },
  { year: 2026, q: 2, bcm: 13.1, dow: 12.9, sp500: 10.2, sp400: 17.3, nasdaq: 23.1 }
];

export const SERIES = [
  { key: 'bcm', name: 'Blair Capital (BCM)', short: 'BCM', color: '#2a9d4b' },
  { key: 'dow', name: 'Dow 30', short: 'Dow 30', color: '#c3cfdb' },
  { key: 'sp500', name: 'S&P 500', short: 'S&P 500', color: '#86a3bf' },
  { key: 'sp400', name: 'S&P 400', short: 'S&P 400', color: '#3fa9df' },
  { key: 'nasdaq', name: 'Nasdaq', short: 'Nasdaq', color: '#173a5e' }
];

export const r2 = v => Math.round(v * 100) / 100;
export const fmt = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(r2(v)) + '%';
export const label = d => `Q${d.q} ${d.year}`;
export const docId = (year, q) => `${year}-Q${q}`;
export const byDate = (a, b) => a.year - b.year || a.q - b.q;

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
