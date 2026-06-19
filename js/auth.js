import { db } from './firebase-init.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Ambil sesi aktif dari memori lokal
window.currentUser = JSON.parse(localStorage.getItem('yayasan_user_v2')) || null;

window.handleLogin = async function(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-login');
    btn.innerHTML = 'Memverifikasi...';
    btn.disabled = true;

    const userVal = document.getElementById('login-user').value;
    const passVal = document.getElementById('login-pass').value;

    try {
        const q = query(collection(db, "Pegawai"), where("username", "==", userVal), where("password", "==", passVal));
        const snap = await getDocs(q);

        if (!snap.empty) {
            window.currentUser = { id: snap.docs[0].id, ...snap.docs[0].data() };
            localStorage.setItem('yayasan_user_v2', JSON.stringify(window.currentUser));
            location.reload(); // Muat ulang agar masuk ke sistem utama
        } else {
            alert('Username atau Password salah!');
        }
    } catch (e) {
        alert('Gagal menghubungi Firestore.');
    } finally {
        btn.innerHTML = 'Login';
        btn.disabled = false;
    }
};

window.handleLogout = function() {
    localStorage.removeItem('yayasan_user_v2');
    location.reload();
};

// Fungsi pengecekan akses (Diekspor ke main.js)
export function cekAksesSistem() {
    if (!window.currentUser) {
        document.getElementById('view-container').innerHTML = `
            <div class="flex flex-col items-center justify-center h-full w-full max-w-sm mx-auto mt-20">
                <form onsubmit="handleLogin(event)" class="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg w-full border border-slate-200 dark:border-slate-700">
                    <div class="text-center mb-6">
                        <i class="fa-solid fa-shield-halved text-4xl text-primary mb-2"></i>
                        <h2 class="text-2xl font-bold">Portal Yayasan</h2>
                    </div>
                    <input type="text" id="login-user" placeholder="Username" class="w-full border p-3 mb-4 rounded focus:outline-primary dark:bg-slate-700 dark:border-slate-600" required>
                    <input type="password" id="login-pass" placeholder="Password" class="w-full border p-3 mb-6 rounded focus:outline-primary dark:bg-slate-700 dark:border-slate-600" required>
                    <button type="submit" id="btn-login" class="w-full bg-primary hover:bg-blue-700 text-white p-3 rounded font-bold transition">Masuk</button>
                </form>
            </div>
        `;
        return false; // Hentikan proses render menu utama
    }
    return true; // Lanjut render menu utama
}