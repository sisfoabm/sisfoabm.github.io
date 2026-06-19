import { db } from './firebase-init.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { renderHalamanLembaga, renderHalamanPegawai, renderHalamanAnak, renderHalamanAbsensi } from './datamaster.js';
import { renderHalamanKalender } from './kalender.js';
import { renderHalamanAkademik } from './akademik.js';
import { renderHalamanKeuangan } from './keuangan.js';

const MENU_ITEMS = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { id: 'lembaga', icon: 'fa-building', label: 'Data Lembaga' },
    { id: 'pegawai', icon: 'fa-users', label: 'Data Pegawai' },
    { id: 'anak', icon: 'fa-child', label: 'Data Anak' },
    { id: 'absensi', icon: 'fa-fingerprint', label: 'Absensi & Cuti' },
    { id: 'kalender', icon: 'fa-calendar-days', label: 'Kalender Pendidikan' },
    { id: 'akademik', icon: 'fa-chalkboard-user', label: 'Akademik' },
    { id: 'keuangan', icon: 'fa-sack-dollar', label: 'Payroll & Keuangan' },
];

window.MENU_ITEMS_GLOBAL = MENU_ITEMS; 

function getFreshUser() {
    let user = window.currentUser || {};
    if (window.appState && window.appState.pegawai && window.appState.pegawai.length > 0) {
        const freshUser = window.appState.pegawai.find(p => p.username === user.username || p.id === user.id);
        if (freshUser) {
            window.currentUser = freshUser;
            localStorage.setItem('yayasan_user_v2', JSON.stringify(freshUser));
            return freshUser;
        }
    }
    return user;
}

export function renderLayout() {
    window.renderSidebarMenu(); 
    
    const currentUser = getFreshUser();
    const header = document.getElementById('app-header');
    header.innerHTML = `
        <div class="font-bold text-xl uppercase" id="header-title">DASHBOARD</div>
        <div class="flex items-center space-x-2 md:space-x-4">
            <div class="flex items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl transition border border-transparent hover:border-slate-200 dark:hover:border-slate-600" onclick="window.navigate('pegawai')">
                <img id="header-foto-profil" src="${(currentUser.fotoProfil && currentUser.fotoProfil.length > 0) ? currentUser.fotoProfil[0] : `https://ui-avatars.com/api/?name=${currentUser.nama || 'User'}&background=e2e8f0`}" class="w-9 h-9 rounded-full object-cover mr-2 md:mr-3 border-2 border-slate-200 shadow-sm">
                <span id="header-nama-profil" class="font-bold text-slate-700 dark:text-slate-200 hidden sm:inline">${currentUser.nama || 'User'}</span>
            </div>
            <button onclick="window.handleLogout()" class="bg-red-500 hover:bg-red-600 text-white px-3 md:px-4 py-2 rounded shadow transition" title="Keluar dari Sistem">
                <i class="fa-solid fa-power-off"></i>
            </button>
        </div>
    `;
}

window.renderSidebarMenu = function() {
    const currentUser = getFreshUser();
    const isSuperAdmin = currentUser.hakAkses === 'Administrator' || currentUser.hakAkses === 'Operator/TU' || currentUser.role === 'admin' || currentUser.username === 'admin';
    const userJabatans = (currentUser.detailJabatan || []).map(j => j.namaJabatan);
    
    const wewenangMatrix = (window.appState && window.appState.lembaga && window.appState.lembaga[0] && window.appState.lembaga[0].wewenangMatrix) ? window.appState.lembaga[0].wewenangMatrix : {};

    let allowedMenuIds = new Set();
    if (isSuperAdmin) {
        MENU_ITEMS.forEach(m => allowedMenuIds.add(m.id));
    } else {
        allowedMenuIds.add('dashboard'); 
        userJabatans.forEach(jabatan => {
            const menus = wewenangMatrix[jabatan] || [];
            menus.forEach(mId => allowedMenuIds.add(mId));
        });
    }

    const filteredMenus = MENU_ITEMS.filter(m => allowedMenuIds.has(m.id));
    const sidebar = document.getElementById('app-sidebar');
    
    if (sidebar) {
        sidebar.innerHTML = `
            <div class="p-4 font-black text-xl border-b text-primary">Portal Yayasan</div>
            <nav class="flex-1 p-3 space-y-2">
                ${filteredMenus.map(m => `
                    <button onclick="window.navigate('${m.id}')" class="w-full flex items-center p-3 hover:bg-blue-50 dark:hover:bg-slate-700 text-left rounded transition ${window.currentPage === m.id ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600'}">
                        <i class="fa-solid ${m.icon} w-8 ${window.currentPage === m.id ? 'text-blue-500' : 'text-slate-400'}"></i> <span class="font-semibold">${m.label}</span>
                    </button>
                `).join('')}
            </nav>
        `;
    }
};

window.listenTokenOtorisasi = function() {
    const tokenDisplay = document.getElementById('dashboard-token-display');
    const statusText = document.getElementById('token-status-text');
    if(!tokenDisplay) return;

    const unsub = onSnapshot(doc(db, "SistemOtorisasi", "token_hapus"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === "Pending" && data.token) {
                tokenDisplay.innerText = data.token;
                statusText.innerHTML = `Dari: <span class="text-white bg-red-800/50 px-2 py-0.5 rounded font-black tracking-wider">${data.requester || 'Bagian Keuangan'}</span><br><span class="text-yellow-300 text-[10px] block mt-1 leading-tight"><i class="fa-solid fa-triangle-exclamation"></i> Detail: ${data.actionDetail || 'Penghapusan Data'}</span>`;
            } else if (data.status === "Used") {
                tokenDisplay.innerText = "------";
                statusText.innerText = "Token sebelumnya telah digunakan. Menunggu permintaan baru...";
            } else {
                tokenDisplay.innerText = "------";
                statusText.innerText = "Menunggu permintaan token dari bendahara...";
            }
        } else {
            tokenDisplay.innerText = "------";
        }
    });
    
    if(window.unsubToken) window.unsubToken();
    window.unsubToken = unsub;
};

window.navigate = function(page) {
    window.currentPage = page;
    window.renderSidebarMenu(); 

    const currentUser = getFreshUser();
    const isSuperAdmin = currentUser.hakAkses === 'Administrator' || currentUser.role === 'admin' || currentUser.username === 'admin';
    
    // Logika Cerdas Pendeteksi Jabatan Kepala / Ketua
    const isHead = isSuperAdmin || (currentUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('kepala') || j.namaJabatan.toLowerCase().includes('ketua'));

    const wewenangMatrix = (window.appState && window.appState.lembaga && window.appState.lembaga[0] && window.appState.lembaga[0].wewenangMatrix) ? window.appState.lembaga[0].wewenangMatrix : {};
    
    let hasAccess = false;
    if (isSuperAdmin || page === 'dashboard') {
        hasAccess = true;
    } else {
        const userJabatans = (currentUser.detailJabatan || []).map(j => j.namaJabatan);
        userJabatans.forEach(jab => {
            if (wewenangMatrix[jab] && wewenangMatrix[jab].includes(page)) hasAccess = true;
        });
    }

    if (!hasAccess) {
        alert("Akses Ditolak: Anda tidak memiliki wewenang untuk membuka halaman ini.");
        window.navigate('dashboard'); 
        return;
    }

    const titleEl = document.getElementById('header-title');
    if (titleEl) titleEl.innerText = page.replace('-', ' ').toUpperCase();
    const container = document.getElementById('view-container');
    
    if (page === 'dashboard') {
        let tokenWidgetHTML = '';
        if (isHead) {
            tokenWidgetHTML = `
            <div class="mt-6 flex justify-start">
                <div class="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl shadow-lg border border-red-500 p-5 text-white relative overflow-hidden w-56 min-h-[14rem] h-auto flex flex-col justify-center items-center text-center transform transition-all duration-300 hover:w-80 hover:scale-105 hover:z-10 group cursor-pointer">
                    <div class="absolute inset-0 flex justify-center items-center opacity-10 pointer-events-none"><i class="fa-solid fa-shield-halved text-8xl group-hover:scale-110 transition-transform"></i></div>
                    <div class="relative z-10 w-full flex flex-col items-center">
                        <div class="bg-white/20 w-10 h-10 rounded-full flex justify-center items-center mb-3 group-hover:scale-110 transition-transform"><i class="fa-solid fa-key text-sm"></i></div>
                        <h3 class="font-black text-xs uppercase tracking-wider mb-2">Token Otorisasi</h3>
                        <div class="bg-white text-red-700 font-black text-2xl tracking-[0.2em] py-2 w-full rounded-xl shadow-inner mb-3" id="dashboard-token-display">------</div>
                        <p class="text-red-200 text-[10px] font-bold leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all duration-300" id="token-status-text">Menunggu permintaan...</p>
                    </div>
                    <div class="absolute bottom-1 right-2 text-[8px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><i class="fa-solid fa-expand"></i></div>
                </div>
            </div>
            `;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white p-6 rounded-xl shadow border-l-4 border-primary">
                    <h3 class="text-slate-500 text-sm font-bold">Total Data Lembaga</h3>
                    <p class="text-3xl font-black">${(window.appState.lembaga || []).length}</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                    <h3 class="text-slate-500 text-sm font-bold">Total Pegawai Terdaftar</h3>
                    <p class="text-3xl font-black">${(window.appState.pegawai || []).length}</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow border-l-4 border-orange-500">
                    <h3 class="text-slate-500 text-sm font-bold">Total Data Anak / Siswa</h3>
                    <p class="text-3xl font-black">${(window.appState.anak || []).length}</p>
                </div>
            </div>

            ${tokenWidgetHTML}

            <div class="mt-6 bg-white rounded-2xl shadow border border-slate-100 p-6 md:p-8">
                <div class="flex items-center mb-4 border-b pb-4">
                    <div class="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg mr-4"><i class="fa-solid fa-chart-line text-xl"></i></div>
                    <h3 class="font-black text-xl text-slate-800">Pantauan Kehadiran Hari Ini</h3>
                </div>
                <div id="dashboard-absen-widget" class="overflow-x-auto custom-scrollbar">
                    <div class="text-center p-8 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-3xl mb-3"></i><br>Memuat data...</div>
                </div>
            </div>
        `;
        
        if (isHead) window.listenTokenOtorisasi();
        if (typeof window.loadDashboardKehadiran === 'function') window.loadDashboardKehadiran();
        
    } else if (page === 'lembaga') { renderHalamanLembaga(container);
    } else if (page === 'pegawai') { renderHalamanPegawai(container);
    } else if (page === 'anak') { renderHalamanAnak(container);
    } else if (page === 'absensi') { renderHalamanAbsensi(container);
    } else if (page === 'kalender') { renderHalamanKalender(container); 
    } else if (page === 'akademik') { renderHalamanAkademik(container); 
    } else if (page === 'keuangan') { renderHalamanKeuangan(container); 
    }
};
