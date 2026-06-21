import { db } from './firebase-init.js';
import { collection, doc, deleteDoc, getDocs, query, orderBy, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.currentRaportTab = 'umum';
window.raportFilters = { semester: '', siswa: '' };

export async function renderHalamanRaport(container) {
    const currentUser = window.currentUser || {};
    
    // Tarik daftar semester dari kalender akademik (Jika ada) atau generate statis
    const d = new Date();
    const currYear = d.getFullYear();
    const optSemester = `
        <option value="Ganjil ${currYear}-${currYear+1}">Ganjil ${currYear}-${currYear+1}</option>
        <option value="Genap ${currYear-1}-${currYear}">Genap ${currYear-1}-${currYear}</option>
    `;

    // Tarik daftar anak (Siswa Aktif)
    const anakList = (window.appState.anak || []).filter(a => a.statusAkademik !== 'Lulus');
    const optAnak = anakList.map(a => `<option value="${a.id}|${a.nama}">${a.nama} (${a.kelas || '-'})</option>`).join('');

    container.innerHTML = `
        <div class="mb-6 flex overflow-x-auto border-b-4 border-slate-200 gap-2 custom-scrollbar pr-4">
            <button onclick="window.switchRaportTab('umum')" class="px-6 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentRaportTab === 'umum' ? 'bg-blue-600 text-white shadow-[0_-5px_15px_rgba(37,99,235,0.3)] border-b-4 border-blue-600 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-file-lines mr-2"></i> Raport Akademik Umum</button>
            <button onclick="window.switchRaportTab('tahfidz')" class="px-6 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentRaportTab === 'tahfidz' ? 'bg-teal-600 text-white shadow-[0_-5px_15px_rgba(13,148,136,0.3)] border-b-4 border-teal-600 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-book-quran mr-2"></i> Raport Tahfidz & Asrama</button>
        </div>
        
        <div id="raport-content-area" class="animate-fade-in"></div>
    `;

    if (window.currentRaportTab === 'umum') window.renderRaportUmum(optSemester, optAnak);
    else window.renderRaportTahfidz(optSemester, optAnak);
}

window.switchRaportTab = function(tab) {
    window.currentRaportTab = tab;
    window.navigate('raport'); // Memanggil ulang render dengan tab yang aktif
};

// ==========================================
// RAPORT UMUM (AKADEMIK)
// ==========================================
window.renderRaportUmum = function(optSemester, optAnak) {
    const area = document.getElementById('raport-content-area');
    
    // Input statis Mata Pelajaran Umum jika belum ada di database
    const mapelDefault = ['Pendidikan Agama Islam', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 'Ilmu Pengetahuan Alam', 'Ilmu Pengetahuan Sosial', 'Bahasa Inggris', 'Pendidikan Jasmani'];
    let mapelHTML = mapelDefault.map((m, i) => `
        <div class="grid grid-cols-12 gap-2 mb-2 items-center bg-white p-2 border border-slate-200 rounded-lg raport-mapel-row shadow-sm">
            <div class="col-span-4 font-bold text-xs text-slate-700 truncate"><input type="text" class="mapel-nama w-full bg-transparent focus:outline-blue-500" value="${m}" required></div>
            <div class="col-span-2"><input type="number" class="mapel-kkm w-full border p-1.5 rounded text-xs text-center font-bold bg-slate-50 focus:bg-white" placeholder="KKM" value="75" required></div>
            <div class="col-span-2"><input type="number" class="mapel-nilai w-full border p-1.5 rounded text-xs text-center font-black text-blue-700 bg-blue-50 focus:bg-white" placeholder="Nilai" oninput="window.calcPredikat(this)" required></div>
            <div class="col-span-3"><input type="text" class="mapel-predikat w-full border p-1.5 rounded text-xs text-center font-black bg-slate-100 cursor-not-allowed uppercase" placeholder="Predikat" readonly></div>
            <div class="col-span-1 text-center"><button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-400 hover:text-red-600"><i class="fa-solid fa-times"></i></button></div>
        </div>
    `).join('');

    area.innerHTML = `
        <div class="bg-blue-50 p-6 md:p-8 rounded-2xl shadow-sm mb-6 border-t-4 border-blue-500 relative overflow-hidden">
            <h2 class="text-xl font-black text-blue-900 mb-6 border-b border-blue-200 pb-4"><i class="fa-solid fa-pen-to-square mr-2 text-blue-500"></i> Pengisian Raport Akademik</h2>
            <form id="form-raport-umum" onsubmit="window.simpanRaportUmum(event)">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label class="text-xs font-black text-slate-500 uppercase block mb-1">Tahun Ajaran / Semester</label>
                        <select id="raport-u-semester" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-blue-900 focus:outline-blue-500 cursor-pointer" required>
                            <option value="">-- Pilih Semester --</option>${optSemester}
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-black text-slate-500 uppercase block mb-1">Pilih Siswa</label>
                        <select id="raport-u-siswa" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-blue-900 focus:outline-blue-500 cursor-pointer" required>
                            <option value="">-- Pilih Siswa --</option>${optAnak}
                        </select>
                    </div>
                </div>

                <div class="bg-white/60 border border-white p-4 rounded-xl mb-6 shadow-sm">
                    <div class="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                        <h3 class="font-black text-slate-700 text-sm"><i class="fa-solid fa-book mr-1"></i> Nilai Mata Pelajaran</h3>
                        <button type="button" onclick="window.tambahMapelRaport()" class="bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"><i class="fa-solid fa-plus mr-1"></i> Tambah Mapel</button>
                    </div>
                    <div class="grid grid-cols-12 gap-2 mb-2 px-2">
                        <div class="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Mata Pelajaran</div>
                        <div class="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">KKM</div>
                        <div class="col-span-2 text-[10px] font-black text-blue-600 uppercase tracking-wider text-center">Nilai Akhir</div>
                        <div class="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Predikat</div>
                        <div class="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Aksi</div>
                    </div>
                    <div id="wadah-mapel-raport" class="max-h-64 overflow-y-auto custom-scrollbar p-1">
                        ${mapelHTML}
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="bg-white/60 border border-white p-4 rounded-xl shadow-sm">
                        <h3 class="font-black text-slate-700 text-sm mb-3 border-b border-slate-200 pb-2"><i class="fa-solid fa-fingerprint mr-1"></i> Kehadiran (Otomatis dari Sistem)</h3>
                        <div class="grid grid-cols-3 gap-3">
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Sakit</label><input type="number" id="raport-u-sakit" value="0" class="w-full border p-2 rounded-lg text-sm font-bold text-center"></div>
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Izin</label><input type="number" id="raport-u-izin" value="0" class="w-full border p-2 rounded-lg text-sm font-bold text-center"></div>
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Alpa</label><input type="number" id="raport-u-alpa" value="0" class="w-full border p-2 rounded-lg text-sm font-bold text-center"></div>
                        </div>
                        <p class="text-[9px] text-slate-500 font-bold mt-2"><i class="fa-solid fa-info-circle mr-1 text-blue-500"></i> Nilai ini bisa diedit manual jika diperlukan.</p>
                    </div>
                    <div class="bg-white/60 border border-white p-4 rounded-xl shadow-sm">
                        <h3 class="font-black text-slate-700 text-sm mb-3 border-b border-slate-200 pb-2"><i class="fa-solid fa-comment-dots mr-1"></i> Catatan Wali Kelas</h3>
                        <textarea id="raport-u-catatan" rows="3" placeholder="Tuliskan catatan perkembangan dan motivasi untuk siswa..." class="w-full border p-3 rounded-xl text-xs font-medium focus:outline-blue-500 bg-white" required></textarea>
                    </div>
                </div>

                <button type="submit" id="btn-simpan-raport-u" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 text-lg"><i class="fa-solid fa-save mr-2"></i> Simpan Raport Akademik</button>
            </form>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div class="p-5 bg-slate-50 border-b border-slate-200 font-black text-slate-700 flex justify-between items-center">
                <span><i class="fa-solid fa-table-list mr-2"></i> Arsip Raport Akademik Umum</span>
                <button onclick="window.loadDataRaportUmum()" class="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-100 transition"><i class="fa-solid fa-sync mr-1"></i> Refresh</button>
            </div>
            <div class="overflow-x-auto p-4 custom-scrollbar">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-slate-100 text-slate-600 border-b-2 border-slate-200">
                        <tr><th class="p-3">Semester</th><th class="p-3">Nama Siswa</th><th class="p-3 text-center">Rata-Rata Nilai</th><th class="p-3">Wali Kelas</th><th class="p-3 text-center">Aksi Dokumen</th></tr>
                    </thead>
                    <tbody id="tbody-raport-umum"><tr><td colspan="5" class="text-center p-8 text-slate-400 font-bold"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;

    window.loadDataRaportUmum();
};

window.calcPredikat = function(inputEl) {
    const val = Number(inputEl.value);
    const row = inputEl.closest('.raport-mapel-row');
    const predEl = row.querySelector('.mapel-predikat');
    
    if (val >= 90) { predEl.value = 'A (Sangat Baik)'; predEl.className = "mapel-predikat w-full border p-1.5 rounded text-xs text-center font-black bg-emerald-100 text-emerald-700 cursor-not-allowed"; }
    else if (val >= 80) { predEl.value = 'B (Baik)'; predEl.className = "mapel-predikat w-full border p-1.5 rounded text-xs text-center font-black bg-blue-100 text-blue-700 cursor-not-allowed"; }
    else if (val >= 70) { predEl.value = 'C (Cukup)'; predEl.className = "mapel-predikat w-full border p-1.5 rounded text-xs text-center font-black bg-amber-100 text-amber-700 cursor-not-allowed"; }
    else { predEl.value = 'D (Kurang)'; predEl.className = "mapel-predikat w-full border p-1.5 rounded text-xs text-center font-black bg-rose-100 text-rose-700 cursor-not-allowed"; }
};

window.tambahMapelRaport = function() {
    const div = document.createElement('div');
    div.className = "grid grid-cols-12 gap-2 mb-2 items-center bg-white p-2 border border-slate-200 rounded-lg raport-mapel-row shadow-sm animate-fade-in";
    div.innerHTML = `
        <div class="col-span-4 font-bold text-xs text-slate-700 truncate"><input type="text" class="mapel-nama w-full bg-slate-50 p-1.5 border rounded focus:outline-blue-500" placeholder="Nama Mapel Baru" required></div>
        <div class="col-span-2"><input type="number" class="mapel-kkm w-full border p-1.5 rounded text-xs text-center font-bold bg-slate-50 focus:bg-white" placeholder="KKM" value="75" required></div>
        <div class="col-span-2"><input type="number" class="mapel-nilai w-full border p-1.5 rounded text-xs text-center font-black text-blue-700 bg-blue-50 focus:bg-white" placeholder="Nilai" oninput="window.calcPredikat(this)" required></div>
        <div class="col-span-3"><input type="text" class="mapel-predikat w-full border p-1.5 rounded text-xs text-center font-black bg-slate-100 cursor-not-allowed uppercase" placeholder="Predikat" readonly></div>
        <div class="col-span-1 text-center"><button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded"><i class="fa-solid fa-trash"></i></button></div>
    `;
    document.getElementById('wadah-mapel-raport').appendChild(div);
};

window.simpanRaportUmum = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan-raport-u');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; btn.disabled = true;

    const semester = document.getElementById('raport-u-semester').value;
    const siswaVal = document.getElementById('raport-u-siswa').value.split('|');
    const idSiswa = siswaVal[0];
    const namaSiswa = siswaVal[1];

    let nilaiMapel = [];
    let totalNilai = 0;
    document.querySelectorAll('.raport-mapel-row').forEach(row => {
        const nama = row.querySelector('.mapel-nama').value;
        const kkm = Number(row.querySelector('.mapel-kkm').value);
        const nilai = Number(row.querySelector('.mapel-nilai').value);
        const predikat = row.querySelector('.mapel-predikat').value;
        if(nama && nilai) {
            nilaiMapel.push({ nama, kkm, nilai, predikat });
            totalNilai += nilai;
        }
    });

    const rataRata = nilaiMapel.length > 0 ? (totalNilai / nilaiMapel.length).toFixed(1) : 0;

    const dataRaport = {
        jenis: 'Umum',
        semester: semester,
        idSiswa: idSiswa,
        namaSiswa: namaSiswa,
        kelas: (window.appState.anak.find(a=>a.id===idSiswa)||{}).kelas || '-',
        nilaiMapel: nilaiMapel,
        rataRata: rataRata,
        kehadiran: {
            sakit: document.getElementById('raport-u-sakit').value,
            izin: document.getElementById('raport-u-izin').value,
            alpa: document.getElementById('raport-u-alpa').value,
        },
        catatan: document.getElementById('raport-u-catatan').value,
        waliKelas: window.currentUser.nama,
        updatedAt: new Date().toISOString()
    };

    try {
        // Menggunakan Composite ID agar Raport tidak ganda di semester yang sama
        const docId = `RUmum_${idSiswa}_${semester.replace(/\s+/g, '')}`;
        await setDoc(doc(db, "Raport", docId), dataRaport);
        
        alert("Raport Akademik Umum Berhasil Disimpan!");
        document.getElementById('form-raport-umum').reset();
        window.loadDataRaportUmum();
    } catch(err) { alert("Gagal menyimpan raport: " + err.message); }
    
    btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Raport Akademik'; btn.disabled = false;
};

window.loadDataRaportUmum = async function() {
    const tbody = document.getElementById('tbody-raport-umum');
    if(!tbody) return;

    try {
        const q = query(collection(db, "Raport"), orderBy("updatedAt", "desc"));
        const snap = await getDocs(q);
        let html = '';
        snap.forEach(d => {
            const item = d.data();
            if(item.jenis !== 'Umum') return;

            let warnaRata = item.rataRata >= 80 ? 'text-emerald-600 bg-emerald-50' : (item.rataRata >= 70 ? 'text-blue-600 bg-blue-50' : 'text-rose-600 bg-rose-50');

            html += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-500">${item.semester}</td>
                <td class="p-3 font-black text-slate-800">${item.namaSiswa} <span class="text-[9px] bg-slate-200 text-slate-600 px-1.5 rounded ml-1">Kls ${item.kelas}</span></td>
                <td class="p-3 text-center"><span class="font-black px-3 py-1 rounded-lg border shadow-sm ${warnaRata}">${item.rataRata}</span></td>
                <td class="p-3 text-xs font-bold text-slate-500">${item.waliKelas}</td>
                <td class="p-3 text-center">
                    <button onclick="alert('Fitur Cetak PDF sedang dibangun pada langkah berikutnya!')" class="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white px-3 py-1.5 rounded-lg transition font-bold text-xs shadow-sm mr-1"><i class="fa-solid fa-print"></i> Cetak PDF</button>
                    <button onclick="window.hapusRaport('${d.id}')" class="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-2 py-1.5 rounded-lg transition font-bold text-xs shadow-sm"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="5" class="text-center p-8 text-slate-400 font-medium">Belum ada arsip raport umum.</td></tr>';
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-red-500 font-bold">Gagal memuat data.</td></tr>'; }
};

window.hapusRaport = async function(id) {
    if(confirm("Yakin ingin menghapus dokumen raport ini secara permanen?")) {
        try { await deleteDoc(doc(db, "Raport", id)); window.loadDataRaportUmum(); } catch(e) { alert("Gagal menghapus!"); }
    }
};

// ==========================================
// MENGATUR TAB TAHFIDZ (Kosong sementara untuk respons ini)
// ==========================================
window.renderRaportTahfidz = function(optSemester, optAnak) {
    const area = document.getElementById('raport-content-area');
    area.innerHTML = `
        <div class="bg-teal-50 p-6 md:p-8 rounded-2xl shadow-sm mb-6 border-t-4 border-teal-500 text-center">
            <i class="fa-solid fa-gears text-5xl text-teal-300 mb-4 block"></i>
            <h2 class="text-xl font-black text-teal-900 mb-2">Raport Tahfidz & Kepengasuhan</h2>
            <p class="text-teal-700 font-bold text-sm">Modul Raport Tahfidz akan saya berikan pada balasan selanjutnya setelah Anda mengonfirmasi pondasi Raport Umum ini berjalan lancar agar tidak melebihi batas 900 baris kode.</p>
        </div>
    `;
};
