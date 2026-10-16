// Firebase app + Firestore. Loaded lazily by the public site so the page never depends on it.
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
