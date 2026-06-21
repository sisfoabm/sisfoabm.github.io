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
                    <button onclick="window.cetakRaportPDF('${d.id}', 'Umum')" class="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white px-3 py-1.5 rounded-lg transition font-bold text-xs shadow-sm mr-1"><i class="fa-solid fa-print"></i> Cetak PDF</button>
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
// RAPORT TAHFIDZ & KEPENGASUHAN
// ==========================================
import { getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; // Memastikan modul penarikan query tersedia

window.renderRaportTahfidz = function(optSemester, optAnak) {
    const area = document.getElementById('raport-content-area');
    
    area.innerHTML = `
        <div class="bg-teal-50 p-6 md:p-8 rounded-2xl shadow-sm mb-6 border-t-4 border-teal-500 relative overflow-hidden">
            <h2 class="text-xl font-black text-teal-900 mb-6 border-b border-teal-200 pb-4"><i class="fa-solid fa-book-quran mr-2 text-teal-500"></i> Pengisian Raport Tahfidz & Kepengasuhan</h2>
            <form id="form-raport-tahfidz" onsubmit="window.simpanRaportTahfidz(event)">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label class="text-xs font-black text-slate-500 uppercase block mb-1">Tahun Ajaran / Semester</label>
                        <select id="raport-t-semester" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-teal-900 focus:outline-teal-500 cursor-pointer" required>
                            <option value="">-- Pilih Semester --</option>${optSemester}
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-black text-slate-500 uppercase block mb-1">Pilih Siswa / Santri</label>
                        <select id="raport-t-siswa" onchange="window.tarikDataAutoSantri(this.value)" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-teal-900 focus:outline-teal-500 cursor-pointer" required>
                            <option value="">-- Pilih Siswa --</option>${optAnak}
                        </select>
                        <p class="text-[9px] text-teal-600 font-bold mt-1"><i class="fa-solid fa-bolt mr-1 text-yellow-500"></i> Memilih siswa akan otomatis menarik rata-rata nilai Tahfidz & Poin Asrama.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <!-- Blok Tahfidz -->
                    <div class="bg-white/60 border border-white p-4 rounded-xl shadow-sm">
                        <h3 class="font-black text-slate-700 text-sm mb-3 border-b border-slate-200 pb-2"><i class="fa-solid fa-book-open-reader mr-1 text-teal-600"></i> Capaian Tahfidz</h3>
                        <div class="space-y-3">
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Capaian Hafalan Terakhir (Cth: Juz 30, An-Naba)</label><input type="text" id="raport-t-capaian" placeholder="Juz ..., Surah ..." class="w-full border-2 p-2.5 rounded-lg text-sm font-bold focus:outline-teal-500 bg-white border-slate-200" required></div>
                            <div class="grid grid-cols-2 gap-3">
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Rata-rata Ziyadah</label><input type="number" step="0.1" id="raport-t-ziyadah" value="0" class="w-full border-2 border-teal-200 p-2 rounded-lg text-sm font-black text-center text-teal-700 bg-teal-50 focus:outline-teal-500"></div>
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Rata-rata Muraja'ah</label><input type="number" step="0.1" id="raport-t-murajaah" value="0" class="w-full border-2 border-amber-200 p-2 rounded-lg text-sm font-black text-center text-amber-700 bg-amber-50 focus:outline-amber-500"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Blok Kepengasuhan -->
                    <div class="bg-white/60 border border-white p-4 rounded-xl shadow-sm">
                        <h3 class="font-black text-slate-700 text-sm mb-3 border-b border-slate-200 pb-2"><i class="fa-solid fa-bed mr-1 text-teal-600"></i> Kepengasuhan & Akhlaq</h3>
                        <div class="space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Total Poin Pelanggaran</label><input type="number" id="raport-t-pelanggaran" value="0" class="w-full border-2 border-rose-200 p-2 rounded-lg text-sm font-black text-center text-rose-600 bg-rose-50 focus:outline-rose-500"></div>
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Total Poin Prestasi</label><input type="number" id="raport-t-prestasi" value="0" class="w-full border-2 border-emerald-200 p-2 rounded-lg text-sm font-black text-center text-emerald-600 bg-emerald-50 focus:outline-emerald-500"></div>
                            </div>
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Predikat Akhlaq / Adab</label>
                                <select id="raport-t-akhlaq" class="w-full border-2 border-slate-200 p-2.5 rounded-lg text-sm font-bold focus:outline-teal-500 bg-white cursor-pointer" required>
                                    <option value="A (Sangat Baik)">A (Sangat Baik)</option>
                                    <option value="B (Baik)" selected>B (Baik)</option>
                                    <option value="C (Cukup)">C (Cukup)</option>
                                    <option value="D (Kurang)">D (Kurang)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white/60 border border-white p-4 rounded-xl shadow-sm mb-6">
                    <h3 class="font-black text-slate-700 text-sm mb-3 border-b border-slate-200 pb-2"><i class="fa-solid fa-comment-dots mr-1 text-teal-600"></i> Catatan Musyrif / Pengasuh</h3>
                    <textarea id="raport-t-catatan" rows="3" placeholder="Tuliskan catatan perkembangan hafalan dan adab santri di asrama..." class="w-full border-2 border-slate-200 p-3 rounded-xl text-xs font-medium focus:outline-teal-500 bg-white" required></textarea>
                </div>

                <button type="submit" id="btn-simpan-raport-t" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-black px-8 py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 text-lg"><i class="fa-solid fa-save mr-2"></i> Simpan Raport Tahfidz & Asrama</button>
            </form>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div class="p-5 bg-slate-50 border-b border-slate-200 font-black text-slate-700 flex justify-between items-center">
                <span><i class="fa-solid fa-table-list mr-2"></i> Arsip Raport Tahfidz & Asrama</span>
                <button onclick="window.loadDataRaportTahfidz()" class="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-100 transition"><i class="fa-solid fa-sync mr-1"></i> Refresh</button>
            </div>
            <div class="overflow-x-auto p-4 custom-scrollbar">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-slate-100 text-slate-600 border-b-2 border-slate-200">
                        <tr><th class="p-3">Semester</th><th class="p-3">Nama Santri</th><th class="p-3">Capaian Hafalan</th><th class="p-3 text-center">Akhlaq</th><th class="p-3">Musyrif</th><th class="p-3 text-center">Aksi Dokumen</th></tr>
                    </thead>
                    <tbody id="tbody-raport-tahfidz"><tr><td colspan="6" class="text-center p-8 text-slate-400 font-bold"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
    window.loadDataRaportTahfidz();
};

window.tarikDataAutoSantri = async function(val) {
    if(!val) return;
    const [idSiswa, namaSiswa] = val.split('|');
    
    try {
        // 1. Kalkulasi Tahfidz (Rata-rata Ziyadah & Murajaah)
        const qT = query(collection(db, "Tahfidz"), where("idSiswa", "==", idSiswa));
        const snapT = await getDocs(qT);
        let totalZ = 0, countZ = 0, totalM = 0, countM = 0;
        
        snapT.forEach(d => {
            const item = d.data();
            if(item.ziyadah && item.ziyadah.poin) { totalZ += Number(item.ziyadah.poin); countZ++; }
            if(item.murajaah && item.murajaah.poin) { totalM += Number(item.murajaah.poin); countM++; }
        });
        
        document.getElementById('raport-t-ziyadah').value = countZ > 0 ? (totalZ/countZ).toFixed(1) : 0;
        document.getElementById('raport-t-murajaah').value = countM > 0 ? (totalM/countM).toFixed(1) : 0;

        // 2. Kalkulasi Kepengasuhan (Total Poin)
        const qA = query(collection(db, "Kepengasuhan"), where("idSiswa", "==", idSiswa));
        const snapA = await getDocs(qA);
        let poinPelanggaran = 0, poinPrestasi = 0;
        
        snapA.forEach(d => {
            const item = d.data();
            if(item.kategori === 'Pelanggaran') poinPelanggaran += Number(item.poin || 0);
            if(item.kategori === 'Prestasi') poinPrestasi += Number(item.poin || 0);
        });
        
        document.getElementById('raport-t-pelanggaran').value = poinPelanggaran;
        document.getElementById('raport-t-prestasi').value = poinPrestasi;
        
    } catch(e) {
        console.error("Gagal menarik data otomatis:", e);
    }
};

window.simpanRaportTahfidz = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan-raport-t');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; btn.disabled = true;

    const semester = document.getElementById('raport-t-semester').value;
    const siswaVal = document.getElementById('raport-t-siswa').value.split('|');
    const idSiswa = siswaVal[0];
    const namaSiswa = siswaVal[1];

    const dataRaport = {
        jenis: 'Tahfidz',
        semester: semester,
        idSiswa: idSiswa,
        namaSiswa: namaSiswa,
        kelas: (window.appState.anak.find(a=>a.id===idSiswa)||{}).kelas || '-',
        capaian: document.getElementById('raport-t-capaian').value,
        rataZiyadah: Number(document.getElementById('raport-t-ziyadah').value),
        rataMurajaah: Number(document.getElementById('raport-t-murajaah').value),
        pelanggaran: Number(document.getElementById('raport-t-pelanggaran').value),
        prestasi: Number(document.getElementById('raport-t-prestasi').value),
        akhlaq: document.getElementById('raport-t-akhlaq').value,
        catatan: document.getElementById('raport-t-catatan').value,
        musyrif: window.currentUser.nama,
        updatedAt: new Date().toISOString()
    };

    try {
        // Menggunakan Composite ID (R_T_IdSiswa_Semester) mencegah duplikat
        const docId = `RTahfidz_${idSiswa}_${semester.replace(/\s+/g, '')}`;
        await setDoc(doc(db, "Raport", docId), dataRaport);
        
        alert("Raport Tahfidz & Asrama Berhasil Disimpan!");
        document.getElementById('form-raport-tahfidz').reset();
        window.loadDataRaportTahfidz();
    } catch(err) { alert("Gagal menyimpan raport: " + err.message); }
    
    btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Raport Tahfidz & Asrama'; btn.disabled = false;
};

window.loadDataRaportTahfidz = async function() {
    const tbody = document.getElementById('tbody-raport-tahfidz');
    if(!tbody) return;

    try {
        const q = query(collection(db, "Raport"), orderBy("updatedAt", "desc"));
        const snap = await getDocs(q);
        let html = '';
        snap.forEach(d => {
            const item = d.data();
            if(item.jenis !== 'Tahfidz') return;

            let badgeAkhlaq = 'bg-slate-100 text-slate-700';
            if(item.akhlaq.includes('A')) badgeAkhlaq = 'bg-emerald-100 text-emerald-700';
            else if(item.akhlaq.includes('B')) badgeAkhlaq = 'bg-blue-100 text-blue-700';
            else if(item.akhlaq.includes('C')) badgeAkhlaq = 'bg-amber-100 text-amber-700';
            else if(item.akhlaq.includes('D')) badgeAkhlaq = 'bg-rose-100 text-rose-700';

            html += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-500">${item.semester}</td>
                <td class="p-3 font-black text-slate-800">${item.namaSiswa} <span class="text-[9px] bg-slate-200 text-slate-600 px-1.5 rounded ml-1">Kls ${item.kelas}</span></td>
                <td class="p-3 font-bold text-teal-700">${item.capaian}</td>
                <td class="p-3 text-center"><span class="font-black px-2.5 py-1 rounded-lg border shadow-sm ${badgeAkhlaq}">${item.akhlaq.split(' ')[0]}</span></td>
                <td class="p-3 text-xs font-bold text-slate-500">${item.musyrif}</td>
                <td class="p-3 text-center">
                    <button onclick="window.cetakRaportPDF('${d.id}', 'Tahfidz')" class="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white px-3 py-1.5 rounded-lg transition font-bold text-xs shadow-sm mr-1"><i class="fa-solid fa-print"></i> Cetak PDF</button>
                    <button onclick="window.hapusRaport('${d.id}')" class="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-2 py-1.5 rounded-lg transition font-bold text-xs shadow-sm"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="6" class="text-center p-8 text-slate-400 font-medium">Belum ada arsip raport Tahfidz.</td></tr>';
    } catch(e) { tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-red-500 font-bold">Gagal memuat data.</td></tr>'; }
};

// ==========================================
// MESIN CETAK PDF RAPORT (OTOMATISASI KOP & DESAIN)
// ==========================================
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.cetakRaportPDF = async function(idRaport, jenis) {
    if (typeof window.showGlobalLoading === "function") window.showGlobalLoading('Menyiapkan Dokumen PDF...');
    
    try {
        const docRef = doc(db, "Raport", idRaport);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            if (typeof window.hideGlobalLoading === "function") window.hideGlobalLoading();
            return alert("Dokumen Raport tidak ditemukan!");
        }

        const data = docSnap.data();
        const lembaga = window.appState.lembaga[0] || {};
        const logoUrl = lembaga.logo || '';
        
        let headerHtml = `
            <div style="display:flex; align-items:center; justify-content:center; border-bottom:4px solid #1e3a8a; padding-bottom:15px; margin-bottom:20px;">
                ${logoUrl ? `<img src="${logoUrl}" style="height:80px; width:auto; margin-right:20px;">` : ''}
                <div style="text-align:center;">
                    <h1 style="margin:0; color:#1e3a8a; font-size:24px; font-weight:900; text-transform:uppercase;">${lembaga.namaLembaga || 'YAYASAN PENDIDIKAN'}</h1>
                    <p style="margin:5px 0 0 0; font-size:12px; font-weight:bold; color:#475569;">${lembaga.alamatLembaga || 'Alamat Belum Diatur'}</p>
                    <p style="margin:2px 0 0 0; font-size:12px; font-weight:bold; color:#475569;">Telp: ${lembaga.kontak || '-'} | Email: ${lembaga.email || '-'}</p>
                </div>
            </div>
            
            <div style="text-align:center; margin-bottom:20px;">
                <h2 style="margin:0; font-size:18px; font-weight:900; text-transform:uppercase;">LAPORAN HASIL BELAJAR (RAPORT ${jenis.toUpperCase()})</h2>
            </div>

            <table style="width:100%; margin-bottom:20px; font-size:14px; font-weight:bold; line-height:1.5;">
                <tr><td style="width:120px;">Nama Santri</td><td>: ${data.namaSiswa}</td><td style="width:120px;">Tahun Ajaran</td><td>: ${data.semester}</td></tr>
                <tr><td>Kelas/Halaqah</td><td>: ${data.kelas || '-'}</td><td>Wali/Musyrif</td><td>: ${jenis === 'Umum' ? data.waliKelas : data.musyrif}</td></tr>
            </table>
        `;

        let contentHtml = '';

        if (jenis === 'Umum') {
            const trMapel = data.nilaiMapel.map((m, i) => `
                <tr>
                    <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${i+1}</td>
                    <td style="border:1px solid #cbd5e1; padding:8px;">${m.nama}</td>
                    <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${m.kkm}</td>
                    <td style="border:1px solid #cbd5e1; padding:8px; text-align:center; font-weight:bold;">${m.nilai}</td>
                    <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${m.predikat.split(' ')[0]}</td>
                </tr>
            `).join('');

            contentHtml = `
                <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px;">
                    <thead style="background-color:#e2e8f0; font-weight:bold; text-align:center;">
                        <tr>
                            <td style="border:1px solid #cbd5e1; padding:10px; width:40px;">No</td>
                            <td style="border:1px solid #cbd5e1; padding:10px;">Mata Pelajaran</td>
                            <td style="border:1px solid #cbd5e1; padding:10px; width:60px;">KKM</td>
                            <td style="border:1px solid #cbd5e1; padding:10px; width:60px;">Nilai</td>
                            <td style="border:1px solid #cbd5e1; padding:10px; width:80px;">Predikat</td>
                        </tr>
                    </thead>
                    <tbody>
                        ${trMapel}
                        <tr style="background-color:#f8fafc; font-weight:bold;">
                            <td colspan="3" style="border:1px solid #cbd5e1; padding:8px; text-align:right;">RATA-RATA NILAI :</td>
                            <td colspan="2" style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${data.rataRata}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="display:flex; gap:20px; margin-bottom:20px;">
                    <div style="flex:1;">
                        <h4 style="margin:0 0 5px 0; font-size:14px; font-weight:bold; border-bottom:2px solid #cbd5e1; padding-bottom:5px;">Kehadiran</h4>
                        <table style="width:100%; border-collapse:collapse; font-size:13px; border:1px solid #cbd5e1;">
                            <tr><td style="padding:6px 10px; border-bottom:1px solid #e2e8f0;">Sakit</td><td style="padding:6px 10px; border-bottom:1px solid #e2e8f0; text-align:center;">${data.kehadiran.sakit} Hari</td></tr>
                            <tr><td style="padding:6px 10px; border-bottom:1px solid #e2e8f0;">Izin</td><td style="padding:6px 10px; border-bottom:1px solid #e2e8f0; text-align:center;">${data.kehadiran.izin} Hari</td></tr>
                            <tr><td style="padding:6px 10px;">Tanpa Keterangan</td><td style="padding:6px 10px; text-align:center;">${data.kehadiran.alpa} Hari</td></tr>
                        </table>
                    </div>
                    <div style="flex:2;">
                        <h4 style="margin:0 0 5px 0; font-size:14px; font-weight:bold; border-bottom:2px solid #cbd5e1; padding-bottom:5px;">Catatan Wali Kelas</h4>
                        <div style="border:1px solid #cbd5e1; padding:10px; min-height:85px; font-size:13px; border-radius:4px; font-style:italic;">
                            "${data.catatan}"
                        </div>
                    </div>
                </div>
            `;
        } else {
            contentHtml = `
                <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px;">
                    <tr style="background-color:#e2e8f0; font-weight:bold;">
                        <td colspan="2" style="border:1px solid #cbd5e1; padding:10px; text-align:center;">CAPAIAN TAHFIDZ AL-QUR'AN</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; width:40%; font-weight:bold;">Capaian Terakhir</td>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:900; color:#0f766e;">${data.capaian}</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:bold;">Rata-Rata Nilai Ziyadah (Hafalan Baru)</td>
                        <td style="border:1px solid #cbd5e1; padding:10px;">${data.rataZiyadah}</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:bold;">Rata-Rata Nilai Muraja'ah (Pengulangan)</td>
                        <td style="border:1px solid #cbd5e1; padding:10px;">${data.rataMurajaah}</td>
                    </tr>
                </table>

                <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px;">
                    <tr style="background-color:#e2e8f0; font-weight:bold;">
                        <td colspan="2" style="border:1px solid #cbd5e1; padding:10px; text-align:center;">KEPENGASUHAN & ASRAMA</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; width:40%; font-weight:bold;">Total Poin Pelanggaran Kedisiplinan</td>
                        <td style="border:1px solid #cbd5e1; padding:10px; color:#be123c;">${data.pelanggaran} Poin</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:bold;">Total Poin Prestasi & Kebaikan</td>
                        <td style="border:1px solid #cbd5e1; padding:10px; color:#047857;">${data.prestasi} Poin</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:bold;">Predikat Adab & Akhlaq</td>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:900;">${data.akhlaq}</td>
                    </tr>
                </table>

                <div style="margin-bottom:30px;">
                    <h4 style="margin:0 0 5px 0; font-size:14px; font-weight:bold; border-bottom:2px solid #cbd5e1; padding-bottom:5px;">Catatan Musyrif / Pembina Asrama</h4>
                    <div style="border:1px solid #cbd5e1; padding:15px; min-height:80px; font-size:13px; border-radius:4px; font-style:italic;">
                        "${data.catatan}"
                    </div>
                </div>
            `;
        }

        let footerHtml = `
            <table style="width:100%; font-size:14px; text-align:center; margin-top:50px;">
                <tr>
                    <td style="width:33%; padding-bottom:80px;">Mengetahui,<br>Orang Tua / Wali</td>
                    <td style="width:33%; padding-bottom:80px;"></td>
                    <td style="width:33%; padding-bottom:80px;">Diberikan di: Tangerang<br>Tanggal: ${new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})}<br><br>${jenis === 'Umum' ? 'Wali Kelas' : 'Musyrif / Pembina'}</td>
                </tr>
                <tr>
                    <td style="font-weight:bold;">( ......................................... )</td>
                    <td style="font-weight:bold;">Mengetahui,<br>Kepala Sekolah / Mudir<br><br><br><br><br>( ......................................... )</td>
                    <td style="font-weight:bold;">( ${jenis === 'Umum' ? data.waliKelas : data.musyrif} )</td>
                </tr>
            </table>
        `;

        const finalHtml = `<div style="padding:40px; font-family:'Times New Roman', Times, serif; color:#0f172a; width:800px; background:#fff;">${headerHtml}${contentHtml}${footerHtml}</div>`;
        
        let containerPrint = document.getElementById('raport-pdf-container');
        if (!containerPrint) {
            containerPrint = document.createElement('div');
            containerPrint.id = 'raport-pdf-container';
            containerPrint.className = 'hidden absolute top-[-9999px] bg-white';
            document.body.appendChild(containerPrint);
        }
        containerPrint.innerHTML = finalHtml;

        const opt = {
            margin:       [0.5, 0.5, 0.5, 0.5],
            filename:     `Raport_${jenis}_${data.namaSiswa.replace(/\s+/g, '_')}_${data.semester.replace(/\s+/g, '')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        if (typeof window.hideGlobalLoading === "function") window.hideGlobalLoading();
        window.html2pdf().set(opt).from(containerPrint).save();

    } catch (error) {
        if (typeof window.hideGlobalLoading === "function") window.hideGlobalLoading();
        alert("Gagal merender PDF: " + error.message);
    }
};
