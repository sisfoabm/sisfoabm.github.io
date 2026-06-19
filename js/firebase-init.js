import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA0lf4KnkbVVlIdgTEKN-QcPjpSKio_xo0",
  authDomain: "sisfo-cda1a.firebaseapp.com",
  databaseURL: "https://sisfo-cda1a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sisfo-cda1a",
  storageBucket: "sisfo-cda1a.firebasestorage.app",
  messagingSenderId: "651098750230",
  appId: "1:651098750230:web:512cd32fb3623c6267e437",
  measurementId: "G-81N8LQRKVR"
};

// Inisialisasi Firebase App
export const app = initializeApp(firebaseConfig);

// Inisialisasi Firestore dengan Mesin Cache Lokal Cerdas (Menghemat 95% Kuota Reads)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
  })
});