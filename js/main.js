import { db } from './firebase-init.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { cekAksesSistem } from './auth.js';
import { renderLayout } from './router.js';

window.appState = { lembaga: [], pegawai: [], anak: [], jadwal: [], keuangan: [], kalender: [], tugas: [] };
let isLayoutRendered = false;

function initRealtimeListeners() {
    onSnapshot(collection(db, "Lembaga"), (snapshot) => {
        window.appState.lembaga = [];
        snapshot.forEach((doc) => window.appState.lembaga.push({ id: doc.id, ...doc.data() }));
        if (window.appState.lembaga.length > 0 && window.appState.lembaga[0].temaWebsite) {
            document.body.className = window.appState.lembaga[0].temaWebsite;
        } else {
            document.body.className = 'tema-1';
        }
        cekDanRenderUI();
    });

    onSnapshot(collection(db, "Pegawai"), (snapshot) => {
        window.appState.pegawai = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.hakAkses !== 'Super Admin') {
                window.appState.pegawai.push({ id: doc.id, ...data });
            }
        });
        if (isLayoutRendered && window.currentPage === 'pegawai') window.navigate('pegawai');
        if (isLayoutRendered && window.currentPage === 'dashboard') window.navigate('dashboard');
        if (isLayoutRendered && window.currentPage === 'tugas') window.navigate('tugas');
    });

    onSnapshot(collection(db, "Anak"), (snapshot) => {
        window.appState.anak = [];
        snapshot.forEach((doc) => window.appState.anak.push({ id: doc.id, ...doc.data() }));
        if (isLayoutRendered && window.currentPage === 'anak') window.navigate('anak');
        if (isLayoutRendered && window.currentPage === 'dashboard') window.navigate('dashboard');
    });

    onSnapshot(collection(db, "Jadwal"), (snapshot) => {
        window.appState.jadwal = [];
        snapshot.forEach((doc) => window.appState.jadwal.push({ id: doc.id, ...doc.data() }));
        if (isLayoutRendered && window.currentPage === 'akademik') window.navigate('akademik');
    });

    // PENDETEKSI DATA TUGAS REALTIME
    onSnapshot(collection(db, "Tugas"), (snapshot) => {
        window.appState.tugas = [];
        snapshot.forEach((doc) => window.appState.tugas.push({ id: doc.id, ...doc.data() }));
        if (isLayoutRendered && window.currentPage === 'tugas') window.navigate('tugas');
        if (isLayoutRendered && window.currentPage === 'dashboard') {
            if(typeof window.loadTugasDasbor === 'function') window.loadTugasDasbor();
        }
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
        }
    }
}

window.onload = initRealtimeListeners;
