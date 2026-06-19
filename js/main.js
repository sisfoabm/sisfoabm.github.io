import { db } from './firebase-init.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { cekAksesSistem } from './auth.js';
import { renderLayout } from './router.js';

window.appState = { lembaga: [], pegawai: [], anak: [] }; // Diubah menjadi anak
let isLayoutRendered = false;

function initRealtimeListeners() {
    onSnapshot(collection(db, "Lembaga"), (snapshot) => {
        window.appState.lembaga = [];
        snapshot.forEach((doc) => window.appState.lembaga.push({ id: doc.id, ...doc.data() }));
        
        // --- PEMICU TEMA WEBSITE ---
        if (window.appState.lembaga.length > 0 && window.appState.lembaga[0].temaWebsite) {
            document.body.className = window.appState.lembaga[0].temaWebsite;
        } else {
            document.body.className = 'tema-1'; // Default
        }
        
        cekDanRenderUI();
    });

    onSnapshot(collection(db, "Pegawai"), (snapshot) => {
        window.appState.pegawai = [];
        snapshot.forEach((doc) => window.appState.pegawai.push({ id: doc.id, ...doc.data() }));
        if (isLayoutRendered && window.currentPage === 'pegawai') window.navigate('pegawai');
        if (isLayoutRendered && window.currentPage === 'dashboard') window.navigate('dashboard');
    });

    // Pantau Data Anak
    onSnapshot(collection(db, "Anak"), (snapshot) => {
        window.appState.anak = [];
        snapshot.forEach((doc) => window.appState.anak.push({ id: doc.id, ...doc.data() }));
        if (isLayoutRendered && window.currentPage === 'anak') window.navigate('anak');
        if (isLayoutRendered && window.currentPage === 'dashboard') window.navigate('dashboard');
    });

    // Pantau Data Jadwal Akademik
    onSnapshot(collection(db, "Jadwal"), (snapshot) => {
        window.appState.jadwal = [];
        snapshot.forEach((doc) => window.appState.jadwal.push({ id: doc.id, ...doc.data() }));
        if (isLayoutRendered && window.currentPage === 'akademik') window.navigate('akademik');
    });
}

function cekDanRenderUI() {
    document.getElementById('global-loader').classList.add('hidden');
    document.getElementById('app-root').classList.remove('hidden');
    
    if (cekAksesSistem()) {
        if (!isLayoutRendered) {
            renderLayout();
            window.navigate('dashboard');
            isLayoutRendered = true;
        } else if (window.currentPage === 'lembaga') {
            window.navigate('lembaga');
        }
    }
}

window.addEventListener('DOMContentLoaded', () => initRealtimeListeners());