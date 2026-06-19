import { db } from './firebase-init.js';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// FUNGSI KOMPRESI, CLOUDINARY & PDF (YANG SEBELUMNYA TERHAPUS)
// ==========================================
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/deva5eknr/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "markaz";

window.uploadFotoCloudinary = async function(file, btnLoadingId) {
    const btn = document.getElementById(btnLoadingId);
    const textAsli = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengunggah...';
    btn.disabled = true;

    try {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        
        btn.innerHTML = textAsli;
        btn.disabled = false;
        return data.secure_url;
    } catch (err) {
        console.error("Error upload:", err);
        btn.innerHTML = textAsli;
        btn.disabled = false;
        alert("Gagal mengunggah gambar!");
        return null;
    }
};

window.unduhPDF = function(elementId, namaFile) {
    const element = document.getElementById(elementId);
    html2pdf().set({ margin: 10, filename: namaFile, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save();
};

// ==========================================
// MODUL KONFIGURASI LEMBAGA & OPERASIONAL (SINGLE TENANT)
// ==========================================
window.toggleDisiplinFields = function() {
    const val = document.getElementById('lem-disiplin').value;
    const ftol = document.getElementById('field-toleransi');
    const fjam = document.getElementById('field-jam-kerja');
    const fgps = document.getElementById('field-gps');

    // Sembunyikan semua dulu
    if(ftol) ftol.classList.add('hidden');
    if(fjam) fjam.classList.add('hidden');
    if(fgps) fgps.classList.add('hidden');

    // Tampilkan sesuai aturan
    if(val) ftol.classList.remove('hidden'); // Berlaku untuk semua
    if(val === 'Semi Ketat' || val === 'Super Ketat') fjam.classList.remove('hidden');
    if(val === 'Super Ketat') fgps.classList.remove('hidden');
};

export function renderHalamanLembaga(container) {
    const profil = window.appState.lembaga[0] || {}; 
    
    container.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow mb-6 border-t-4 border-primary">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b pb-2 gap-4">
                <h2 class="text-xl font-bold">Konfigurasi Sistem Utama Lembaga</h2>
                <div class="flex gap-2">
                    <button type="button" onclick="window.eksporDataCSV('lembaga', 'Data_Lembaga')" class="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition shadow-sm flex items-center"><i class="fa-solid fa-download mr-2"></i> Ekspor CSV</button>
                    <label class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition shadow-sm cursor-pointer flex items-center"><i class="fa-solid fa-upload mr-2"></i> Impor CSV <input type="file" accept=".csv" onchange="window.imporDataCSV(event, 'Lembaga')" class="hidden"></label>
                </div>
            </div>
            
            <form id="form-lembaga" onsubmit="window.simpanLembaga(event)">
                <input type="hidden" id="lem-logo-url">
                
                <h3 class="font-semibold text-primary mt-4 mb-2">1. Identitas Dasar, Logo & Jabatan</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input type="text" id="lem-nama" placeholder="Nama Lembaga" class="border p-2 rounded focus:outline-primary" required>
                    <select id="lem-jenis" class="border p-2 rounded focus:outline-primary" required>
                        <option value="">-- Jenis Lembaga --</option>
                        <option value="Sekolah">Sekolah</option><option value="Panti">Panti</option>
                        <option value="Rumah Tahfidz">Rumah Tahfidz</option><option value="Pesantren">Pesantren</option><option value="Lainnya">Lainnya</option>
                    </select>
                    <div class="flex flex-col">
                        <label class="text-xs text-slate-500">Ganti Logo Lembaga</label>
                        <input type="file" id="lem-logo-file" accept="image/*" class="border p-1 rounded text-sm bg-white">
                    </div>
                    <div class="md:col-span-3">
                        <label class="text-xs text-slate-500 font-bold block mb-1">Daftar Jabatan Pegawai (Pisahkan dengan koma)</label>
                        <input type="text" id="lem-jabatan" placeholder="Kepala, Guru, Tata Usaha" class="border p-2 rounded w-full border-blue-400 bg-blue-50 focus:outline-primary" required>
                    </div>
                    <div class="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs text-slate-500 font-bold block mb-1">Daftar Mata Pelajaran (Pisahkan koma)</label>
                            <input type="text" id="lem-mapel" placeholder="Cth: Matematika, Bahasa Indonesia, IPA" class="border p-2 rounded w-full border-green-400 bg-green-50 focus:outline-primary">
                        </div>
                        <div>
                            <label class="text-xs text-slate-500 font-bold block mb-1">Daftar Kelas (Pisahkan koma)</label>
                            <input type="text" id="lem-kelas-list" placeholder="Cth: Kelas 1A, Kelas 1B, Kelas 2A" class="border p-2 rounded w-full border-purple-400 bg-purple-50 focus:outline-primary">
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <select id="lem-bentuk" class="border p-2 rounded focus:outline-primary">
                        <option value="">-- Bentuk Pendidikan --</option>
                        <option value="SD/MI">SD/MI</option><option value="SMP/MTs">SMP/MTs</option>
                        <option value="SMA/MA">SMA/MA</option><option value="Gabungan">Gabungan</option>
                        <option value="Pesantren">Pesantren</option><option value="PKBM/Non-Formal">PKBM/Non-Formal</option>
                    </select>
                    <select id="lem-status" class="border p-2 rounded focus:outline-primary">
                        <option value="">-- Status Lembaga --</option>
                        <option value="Negeri">Negeri</option><option value="Swasta">Swasta</option>
                    </select>
                    <input type="text" id="lem-npsn" placeholder="NPSN" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-nsm" placeholder="NSM" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-akreditasi" placeholder="Akreditasi" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-sk" placeholder="SK Pendirian" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-izin" placeholder="Izin Operasional" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-lks" placeholder="Tanda Daftar LKS (Khusus Panti)" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-npwp" placeholder="NPWP Lembaga" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-rekening" placeholder="Rekening Bank Lembaga" class="border p-2 rounded focus:outline-primary">
                    <input type="number" id="lem-kelas" placeholder="Jumlah Ruang Kelas" class="border p-2 rounded focus:outline-primary">
                    <input type="number" id="lem-asrama" placeholder="Jumlah Asrama" class="border p-2 rounded focus:outline-primary">
                </div>
                <textarea id="lem-alamat" placeholder="Alamat Lengkap Lembaga" class="border p-2 rounded w-full mb-4 focus:outline-primary" rows="2"></textarea>

                <h3 class="font-semibold text-primary mt-4 mb-2">2. Pengaturan Operasional & KBM</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <select id="lem-ops" class="border p-2 rounded focus:outline-primary" required>
                        <option value="">-- Jenis Operasional --</option>
                        <option value="Hanya Pendidikan">Hanya Pendidikan</option><option value="Hanya Pengasuhan">Hanya Pengasuhan</option>
                        <option value="Hanya Santunan">Hanya Santunan</option><option value="Pengasuhan dan Pendidikan">Pengasuhan dan Pendidikan</option>
                    </select>
                    <select id="lem-pend" class="border p-2 rounded focus:outline-primary">
                        <option value="">-- Jenis Pendidikan --</option>
                        <option value="Hanya Pendidikan Umum">Hanya Pendidikan Umum</option>
                        <option value="Hanya Pendidikan Agama/Tahfidz">Hanya Pendidikan Agama/Tahfidz</option>
                        <option value="Pendidikan Umum dan Tahfidz">Pendidikan Umum dan Tahfidz</option>
                    </select>
                    <select id="lem-kurikulum" class="border p-2 rounded focus:outline-primary">
                        <option value="">-- Sistem Kurikulum --</option>
                        <option value="Ikut Pemerintah">Ikut Pemerintah (Kemendikbud/Kemenag)</option>
                        <option value="Sistem Kuliah">Sistem Kuliah (SKS)</option>
                        <option value="Sistem Mandiri">Sistem Mandiri Yayasan</option>
                    </select>
                    <select id="lem-libur" class="border p-2 rounded focus:outline-primary">
                        <option value="">-- Hari Libur (1 Pekan) --</option>
                        <option value="Hanya Ahad">Hanya Ahad</option><option value="Hanya Jumat">Hanya Jum'at</option>
                        <option value="Sabtu-Ahad">Sabtu-Ahad</option><option value="Jumat dan Ahad">Jum'at dan Ahad</option><option value="Jumat dan Sabtu">Jum'at dan Sabtu</option>
                    </select>
                </div>

                <h3 class="font-semibold text-primary mt-4 mb-2">3. Pengaturan Waktu KBM & Presensi</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="border p-3 rounded bg-slate-50">
                        <label class="text-sm font-bold text-slate-600 block mb-2">KBM UMUM</label>
                        <input type="number" id="lem-umum-jp" placeholder="Durasi per JP (Menit)" class="border p-2 rounded w-full mb-2">
                        <div class="flex gap-2 mb-2">
                            <input type="time" id="lem-umum-masuk" class="border p-2 rounded w-full" title="Jam Masuk">
                            <input type="time" id="lem-umum-pulang" class="border p-2 rounded w-full" title="Jam Pulang">
                        </div>
                        <input type="number" id="lem-umum-frek" placeholder="Frekuensi Istirahat" class="border p-2 rounded w-full mb-2">
                        <input type="number" id="lem-umum-waktuist" placeholder="Lama Istirahat (Menit)" class="border p-2 rounded w-full">
                        <label class="text-[10px] uppercase font-bold text-slate-400 mt-2 block mb-1">Waktu Istirahat (Jam Mulai - Jam Selesai)</label>
                        <input type="text" id="lem-umum-istirahat" placeholder="Cth: 10:00-10:15, 12:00-12:30" class="border p-2 rounded w-full">
                    </div>
                    <div class="border p-3 rounded bg-slate-50">
                        <label class="text-sm font-bold text-slate-600 block mb-2">KBM TAHFIDZ</label>
                        <input type="number" id="lem-tahfidz-jp" placeholder="Durasi per JP (Menit)" class="border p-2 rounded w-full mb-2">
                        <div class="flex gap-2 mb-2">
                            <input type="time" id="lem-tahfidz-masuk" class="border p-2 rounded w-full" title="Jam Masuk">
                            <input type="time" id="lem-tahfidz-pulang" class="border p-2 rounded w-full" title="Jam Pulang">
                        </div>
                        <input type="number" id="lem-tahfidz-frek" placeholder="Frekuensi Istirahat" class="border p-2 rounded w-full mb-2">
                        <input type="number" id="lem-tahfidz-waktuist" placeholder="Lama Istirahat (Menit)" class="border p-2 rounded w-full">
                        <label class="text-[10px] uppercase font-bold text-slate-400 mt-2 block mb-1">Waktu Istirahat (Jam Mulai - Jam Selesai)</label>
                        <input type="text" id="lem-tahfidz-istirahat" placeholder="Cth: 10:00-10:15, 12:00-12:30" class="border p-2 rounded w-full">
                    </div>
                    
                    <div class="col-span-1 md:col-span-2 border p-4 rounded bg-orange-50 border-orange-200">
                        <label class="text-sm font-bold text-slate-700 block mb-2">Sistem Kedisiplinan Presensi Pegawai</label>
                        <select id="lem-disiplin" onchange="window.toggleDisiplinFields()" class="border p-2 rounded w-full focus:outline-primary mb-3 font-semibold text-orange-700" required>
                            <option value="">-- Pilih Tingkat Kedisiplinan --</option>
                            <option value="Longgar">1. Longgar (Absen Bebas, Input Telat Mandiri)</option>
                            <option value="Semi Ketat">2. Semi Ketat (Wajib Absen Sesuai Jam, Kalkulasi Telat Otomatis)</option>
                            <option value="Super Ketat">3. Super Ketat (Sesuai Jam + Wajib Sesuai Koordinat GPS)</option>
                        </select>

                        <div id="field-toleransi" class="hidden mb-3">
                            <label class="text-xs font-bold text-slate-500">Toleransi Keterlambatan (Menit)</label>
                            <input type="number" id="lem-toleransi-telat" placeholder="Cth: 15" class="border p-2 rounded w-full focus:outline-primary">
                        </div>

                        <div id="field-jam-kerja" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                                <label class="text-xs font-bold text-slate-500">Jam Masuk Kerja Pegawai</label>
                                <input type="time" id="lem-jam-masuk-kerja" class="border p-2 rounded w-full focus:outline-primary">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-500">Jam Pulang Kerja Pegawai</label>
                                <input type="time" id="lem-jam-pulang-kerja" class="border p-2 rounded w-full focus:outline-primary">
                            </div>
                        </div>

                        <div id="field-gps" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-bold text-slate-500">Koordinat GPS Kantor (Latitude, Longitude)</label>
                                <input type="text" id="lem-gps-kantor" placeholder="Cth: 2.9722, 99.6416 (Asahan)" class="border p-2 rounded w-full focus:outline-primary">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-500">Radius Toleransi Lokasi (Meter)</label>
                                <input type="number" id="lem-radius-gps" placeholder="Cth: 50" class="border p-2 rounded w-full focus:outline-primary">
                            </div>
                        </div>
                    </div>
                </div>

                <h3 class="font-semibold text-primary mt-4 mb-2">4. Pengaturan Tampilan Website</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-blue-50 p-4 rounded border border-blue-200">
                    <div class="col-span-1 md:col-span-2">
                        <label class="text-sm font-bold text-slate-600 block mb-1">Pilih Tema / Layout (Berubah Langsung Saat Dipilih)</label>
                        <select id="lem-tema" onchange="document.body.className = this.value" class="border p-2 rounded w-full focus:outline-primary font-semibold text-primary" required>
                            <option value="tema-1">Template 1: Klasik (Sidebar Kiri)</option>
                            <option value="tema-2">Template 2: Modern (Menu Navigasi Atas)</option>
                            <option value="tema-3">Template 3: Mengambang (Floating UI)</option>
                            <option value="tema-4">Template 4: Aplikasi Mobile (Menu Bawah di HP)</option>
                            <option value="tema-5">Template 5: Terbalik (Sidebar Kanan)</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-col md:flex-row gap-3">
                    <button type="submit" id="btn-simpan-lem" class="bg-primary hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition shadow-lg w-full md:w-auto"><i class="fa-solid fa-save mr-2"></i> Simpan Konfigurasi Lembaga</button>
                    ${profil.id ? `
                    <button type="button" onclick="window.bukaModalWewenang()" class="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold transition shadow-lg w-full md:w-auto"><i class="fa-solid fa-user-shield mr-2"></i> Atur Wewenang</button>
                    
                    ` : ''}
                </div>
            </form>
        </div>

        ${profil.id ? `
        <div class="bg-white p-6 rounded-xl shadow mb-6 border-t-4 border-green-500">
            <div class="flex justify-between items-center mb-4 border-b pb-2">
                <h2 class="text-xl font-bold">Profil Resmi Tersimpan</h2>
                <button onclick="window.unduhPDF('cetak-profil-lembaga', 'Profil_${profil.namaLembaga.replace(/\s+/g, '_')}.pdf')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-bold shadow"><i class="fa-solid fa-file-pdf"></i> Unduh PDF</button>
            </div>
            
            <div id="cetak-profil-lembaga" class="p-8 bg-white text-slate-800">
                <div class="flex items-center space-x-6 border-b-2 border-slate-800 pb-4 mb-6">
                    ${profil.logo ? `<img src="${profil.logo}" class="h-24 w-24 object-contain">` : `<div class="h-24 w-24 bg-slate-200 flex items-center justify-center rounded font-bold text-slate-400">No Logo</div>`}
                    <div>
                        <h1 class="text-3xl font-black uppercase tracking-wide">${profil.namaLembaga}</h1>
                        <p class="text-lg font-semibold text-slate-600">${profil.jenisLembaga} - ${profil.statusLembaga || ''}</p>
                        <p class="text-sm">${profil.alamat || '-'}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    <div><span class="font-bold block text-slate-500 border-b mb-1">Legalitas & Identitas</span>
                        <table class="w-full">
                            <tr><td class="py-1 w-1/3">NPSN / NSM</td><td>: ${profil.npsn || '-'} / ${profil.nsm || '-'}</td></tr>
                            <tr><td class="py-1">Akreditasi</td><td>: ${profil.akreditasi || '-'}</td></tr>
                            <tr><td class="py-1">SK Pendirian</td><td>: ${profil.skPendirian || '-'}</td></tr>
                            <tr><td class="py-1">Izin / LKS</td><td>: ${profil.izinOperasional || '-'} / ${profil.lks || '-'}</td></tr>
                            <tr><td class="py-1">NPWP</td><td>: ${profil.npwp || '-'}</td></tr>
                        </table>
                    </div>
                    <div><span class="font-bold block text-slate-500 border-b mb-1">Operasional & Presensi</span>
                        <table class="w-full">
                            <tr><td class="py-1 w-1/3">Sistem Presensi</td><td>: <span class="font-bold text-orange-600">${profil.kedisiplinan || '-'}</span></td></tr>
                            ${profil.kedisiplinan === 'Semi Ketat' || profil.kedisiplinan === 'Super Ketat' ? `<tr><td class="py-1">Jam Kerja</td><td>: ${profil.jamMasukKerja || '-'} s/d ${profil.jamPulangKerja || '-'}</td></tr>` : ''}
                            <tr><td class="py-1">Bentuk Pend.</td><td>: ${profil.bentukPendidikan || '-'}</td></tr>
                            <tr><td class="py-1">Kurikulum</td><td>: ${profil.kurikulum || '-'}</td></tr>
                            <tr><td class="py-1">Hari Libur</td><td>: ${profil.libur || '-'}</td></tr>
                        </table>
                    </div>
                    <div class="col-span-2 mt-4"><span class="font-bold block text-slate-500 border-b mb-1">Daftar Jabatan Resmi</span>
                        <div class="flex flex-wrap gap-2 mt-2">
                            ${(profil.daftarJabatan || '').split(',').map(j => `<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">${j.trim()}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
    `;

    if (profil.id) {
        setTimeout(() => {
            document.getElementById('lem-logo-url').value = profil.logo || '';
            document.getElementById('lem-nama').value = profil.namaLembaga || ''; document.getElementById('lem-jenis').value = profil.jenisLembaga || '';
            document.getElementById('lem-jabatan').value = profil.daftarJabatan || ''; document.getElementById('lem-bentuk').value = profil.bentukPendidikan || ''; 
            document.getElementById('lem-status').value = profil.statusLembaga || ''; document.getElementById('lem-npsn').value = profil.npsn || ''; 
            document.getElementById('lem-nsm').value = profil.nsm || ''; document.getElementById('lem-akreditasi').value = profil.akreditasi || ''; 
            document.getElementById('lem-sk').value = profil.skPendirian || ''; document.getElementById('lem-izin').value = profil.izinOperasional || ''; 
            document.getElementById('lem-lks').value = profil.lks || ''; document.getElementById('lem-npwp').value = profil.npwp || ''; 
            document.getElementById('lem-rekening').value = profil.rekening || ''; document.getElementById('lem-alamat').value = profil.alamat || ''; 
            document.getElementById('lem-kelas').value = profil.kelas || ''; document.getElementById('lem-asrama').value = profil.asrama || '';
            document.getElementById('lem-ops').value = profil.jenisOperasional || ''; document.getElementById('lem-pend').value = profil.jenisPendidikan || ''; 
            document.getElementById('lem-kurikulum').value = profil.kurikulum || ''; document.getElementById('lem-libur').value = profil.libur || ''; 
            document.getElementById('lem-umum-jp').value = profil.umumJp || ''; document.getElementById('lem-umum-masuk').value = profil.umumMasuk || ''; 
            document.getElementById('lem-umum-frek').value = profil.umumFrek || ''; document.getElementById('lem-umum-waktuist').value = profil.umumWaktu || ''; 
            document.getElementById('lem-tahfidz-jp').value = profil.tahfidzJp || ''; document.getElementById('lem-tahfidz-masuk').value = profil.tahfidzMasuk || ''; 
            document.getElementById('lem-tahfidz-frek').value = profil.tahfidzFrek || ''; document.getElementById('lem-tahfidz-waktuist').value = profil.tahfidzWaktu || ''; 
            document.getElementById('lem-disiplin').value = profil.kedisiplinan || '';
            document.getElementById('lem-tema').value = profil.temaWebsite || 'tema-1';
            document.getElementById('lem-mapel').value = profil.daftarMapel || '';
            document.getElementById('lem-umum-pulang').value = profil.umumPulang || '';
            document.getElementById('lem-tahfidz-pulang').value = profil.tahfidzPulang || '';
            document.getElementById('lem-kelas-list').value = profil.daftarKelas || '';
            document.getElementById('lem-umum-istirahat').value = profil.umumIstirahat || '';
            document.getElementById('lem-tahfidz-istirahat').value = profil.tahfidzIstirahat || '';

            // Isi form dinamis presensi
            document.getElementById('lem-toleransi-telat').value = profil.toleransiTelat || '';
            document.getElementById('lem-jam-masuk-kerja').value = profil.jamMasukKerja || '';
            document.getElementById('lem-jam-pulang-kerja').value = profil.jamPulangKerja || '';
            document.getElementById('lem-gps-kantor').value = profil.gpsKantor || '';
            document.getElementById('lem-radius-gps').value = profil.radiusGps || '';
            
            // Panggil trigger untuk membuka tutup form dinamis
            window.toggleDisiplinFields();
        }, 50);
    }
}

window.tempSkemaGaji = {};
window.bukaModalPenggajian = function() {
    const profil = window.appState.lembaga[0] || {};
    window.tempSkemaGaji = profil.skemaGaji || {};
    
    const daftarJabatan = (profil.daftarJabatan || '').split(',').map(j => j.trim()).filter(j => j);
    if(daftarJabatan.length === 0) return alert("Isi daftar jabatan di Form Lembaga terlebih dahulu!");
    
    let modal = document.getElementById('modal-gaji');
    if(!modal) {
        modal = document.createElement('div'); modal.id = 'modal-gaji';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 hidden';
        document.body.appendChild(modal);
    }
    
    let trs = daftarJabatan.map(j => {
        let skema = window.tempSkemaGaji[j] || { metode: 'Bulanan', nominal: 0, potTelat: 0, potAlpa: 0 };
        return `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-3 font-bold text-slate-700">${j}</td>
            <td class="p-2"><select class="border-2 border-indigo-200 p-2 w-full rounded-lg text-sm font-bold text-indigo-800 bg-indigo-50 skema-metode" data-jab="${j}"><option value="Bulanan" ${skema.metode==='Bulanan'?'selected':''}>Bulanan Tetap</option><option value="Per Kehadiran" ${skema.metode==='Per Kehadiran'?'selected':''}>Per Kehadiran (Sesi)</option><option value="Per JP" ${skema.metode==='Per JP'?'selected':''}>Per Jam Mengajar (JP)</option></select></td>
            <td class="p-2"><input type="number" class="border-2 border-slate-200 p-2 w-full rounded-lg text-sm font-bold skema-nominal" data-jab="${j}" value="${skema.nominal}" placeholder="Rp"></td>
            <td class="p-2"><input type="number" class="border-2 border-rose-200 p-2 w-full rounded-lg text-sm font-bold text-rose-600 bg-rose-50 skema-telat" data-jab="${j}" value="${skema.potTelat}" placeholder="Rp/Menit"></td>
            <td class="p-2"><input type="number" class="border-2 border-red-200 p-2 w-full rounded-lg text-sm font-bold text-red-600 bg-red-50 skema-alpa" data-jab="${j}" value="${skema.potAlpa}" placeholder="Rp/Hari"></td>
        </tr>`;
    }).join('');
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 border-t-4 border-emerald-500 animate-slide-up">
            <h3 class="text-2xl font-black mb-2 text-slate-800"><i class="fa-solid fa-coins text-emerald-500 mr-2"></i> Pengaturan Skema Gaji & Potongan per Jabatan</h3>
            <p class="text-sm font-bold text-slate-500 mb-4 border-b pb-4">Nominal akan dihitung secara otomatis setiap bulan berdasarkan rekam jejak presensi.</p>
            <div class="overflow-x-auto max-h-[60vh] custom-scrollbar border border-slate-200 rounded-xl">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-100 text-slate-600 border-b-2">
                        <tr><th class="p-3">Nama Jabatan</th><th class="p-3">Metode Penggajian</th><th class="p-3">Gaji Pokok / Rate (Rp)</th><th class="p-3">Potongan Telat/Menit (Rp)</th><th class="p-3">Potongan Alpa/Tidak Hadir (Rp)</th></tr>
                    </thead>
                    <tbody>${trs}</tbody>
                </table>
            </div>
            <div class="mt-6 flex gap-3 justify-end pt-4 border-t">
                <button type="button" onclick="document.getElementById('modal-gaji').classList.add('hidden')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold transition">Tutup</button>
                <button type="button" onclick="window.simpanModalPenggajian()" class="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-black shadow-lg transition">Terapkan Skema</button>
            </div>
        </div>`;
    modal.classList.remove('hidden');
};

window.simpanModalPenggajian = function() {
    const metodes = document.querySelectorAll('.skema-metode');
    const nominals = document.querySelectorAll('.skema-nominal');
    const telats = document.querySelectorAll('.skema-telat');
    const alpas = document.querySelectorAll('.skema-alpa');
    
    metodes.forEach((m, i) => {
        window.tempSkemaGaji[m.dataset.jab] = { metode: m.value, nominal: Number(nominals[i].value), potTelat: Number(telats[i].value), potAlpa: Number(alpas[i].value) };
    });
    alert("Skema gaji DITERAPKAN secara visual!\n\n⚠️ PENTING: Jangan lupa klik tombol biru 'Simpan Konfigurasi Lembaga' untuk mempermanenkannya ke Database.");
    document.getElementById('modal-gaji').classList.add('hidden');
};

window.simpanLembaga = async function(e) {
    e.preventDefault();
    const profil = window.appState.lembaga[0] || {}; 
    const id = profil.id; 
    
    let logoUrl = document.getElementById('lem-logo-url').value;
    const fileInput = document.getElementById('lem-logo-file');

    if (fileInput.files.length > 0) {
        const uploadedUrl = await window.uploadFotoCloudinary(fileInput.files[0], 'btn-simpan-lem');
        if (uploadedUrl) logoUrl = uploadedUrl;
    }

    const data = {
        namaLembaga: document.getElementById('lem-nama').value, jenisLembaga: document.getElementById('lem-jenis').value, 
        daftarJabatan: document.getElementById('lem-jabatan').value, logo: logoUrl,
        bentukPendidikan: document.getElementById('lem-bentuk').value, statusLembaga: document.getElementById('lem-status').value, 
        npsn: document.getElementById('lem-npsn').value, nsm: document.getElementById('lem-nsm').value, akreditasi: document.getElementById('lem-akreditasi').value, 
        skPendirian: document.getElementById('lem-sk').value, izinOperasional: document.getElementById('lem-izin').value, lks: document.getElementById('lem-lks').value, 
        npwp: document.getElementById('lem-npwp').value, rekening: document.getElementById('lem-rekening').value, alamat: document.getElementById('lem-alamat').value,
        kelas: document.getElementById('lem-kelas').value, asrama: document.getElementById('lem-asrama').value,
        jenisOperasional: document.getElementById('lem-ops').value, jenisPendidikan: document.getElementById('lem-pend').value, kurikulum: document.getElementById('lem-kurikulum').value, libur: document.getElementById('lem-libur').value,
        umumJp: document.getElementById('lem-umum-jp').value, umumMasuk: document.getElementById('lem-umum-masuk').value, umumFrek: document.getElementById('lem-umum-frek').value, umumWaktu: document.getElementById('lem-umum-waktuist').value,
        tahfidzJp: document.getElementById('lem-tahfidz-jp').value, tahfidzMasuk: document.getElementById('lem-tahfidz-masuk').value, tahfidzFrek: document.getElementById('lem-tahfidz-frek').value, tahfidzWaktu: document.getElementById('lem-tahfidz-waktuist').value,
        kedisiplinan: document.getElementById('lem-disiplin').value, temaWebsite: document.getElementById('lem-tema').value,
        daftarMapel: document.getElementById('lem-mapel').value,
        umumPulang: document.getElementById('lem-umum-pulang').value,
        tahfidzPulang: document.getElementById('lem-tahfidz-pulang').value,
        daftarKelas: document.getElementById('lem-kelas-list').value,
        umumIstirahat: document.getElementById('lem-umum-istirahat').value,
        tahfidzIstirahat: document.getElementById('lem-tahfidz-istirahat').value,
        skemaGaji: window.tempSkemaGaji,
        
        // Data Dinamis Presensi
        toleransiTelat: document.getElementById('lem-toleransi-telat').value,
        jamMasukKerja: document.getElementById('lem-jam-masuk-kerja').value,
        jamPulangKerja: document.getElementById('lem-jam-pulang-kerja').value,
        gpsKantor: document.getElementById('lem-gps-kantor').value,
        radiusGps: document.getElementById('lem-radius-gps').value
    };

    try {
        if (id) await updateDoc(doc(db, "Lembaga", id), data); 
        else await addDoc(collection(db, "Lembaga"), data);
        alert("Berhasil! Konfigurasi Utama telah tersimpan.");
    } catch (err) { alert("Gagal menyimpan data!"); }
};

// ==========================================
// MODUL PEGAWAI & MANAJEMEN AKUN
// ==========================================
window.currentPegawaiPhotos = [];

window.renderFotoGallery = function() {
    const container = document.getElementById('peg-foto-gallery');
    const fileInput = document.getElementById('peg-foto-file');
    if (!container) return;
    
    if (window.currentPegawaiPhotos.length >= 5) {
        fileInput.disabled = true; fileInput.classList.add('bg-slate-200', 'cursor-not-allowed');
    } else {
        fileInput.disabled = false; fileInput.classList.remove('bg-slate-200', 'cursor-not-allowed');
    }

    container.innerHTML = window.currentPegawaiPhotos.map((url, i) => `
        <div class="relative inline-block mr-3 mb-3 rounded-xl shadow-sm bg-white p-1 border-2 ${i === 0 ? 'border-indigo-500' : 'border-slate-200'}">
            <img src="${url}" onclick="window.jadikanFotoUtama(${i})" class="h-20 w-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition" title="${i === 0 ? 'Foto Utama Saat Ini' : 'Klik untuk jadikan Foto Utama'}">
            <button type="button" onclick="window.hapusFotoPegawai(${i})" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700 shadow border-2 border-white"><i class="fa-solid fa-times"></i></button>
            ${i === 0 ? `<span class="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow pointer-events-none">UTAMA</span>` : ''}
        </div>
    `).join('');
};

window.jadikanFotoUtama = function(index) {
    if (index === 0) return; // Sudah utama
    const temp = window.currentPegawaiPhotos[0];
    window.currentPegawaiPhotos[0] = window.currentPegawaiPhotos[index];
    window.currentPegawaiPhotos[index] = temp;
    window.renderFotoGallery();
};

window.hapusFotoPegawai = function(index) {
    window.currentPegawaiPhotos.splice(index, 1); window.renderFotoGallery();
};

window.handleJabatanCheck = function(safeId) {
    const chk = document.getElementById('chk-' + safeId);
    const box = document.getElementById('presensi-opts-' + safeId);
    if(chk.checked) box.classList.remove('hidden'); else box.classList.add('hidden');
};

window.handleTipePresensiChange = function(safeId) {
    const val = document.getElementById('presensi-val-' + safeId).value;
    const cicoOpts = document.getElementById('cico-opts-' + safeId);
    if(cicoOpts) {
        if(val === 'CICO') cicoOpts.classList.remove('hidden');
        else cicoOpts.classList.add('hidden');
    }
};

// Fungsi Cetak PDF
window.cetakProfilPegawai = function(id) {
    const item = window.appState.pegawai.find(x => x.id === id);
    if(!item) return;
    
    const foto = (item.fotoProfil && item.fotoProfil.length > 0) ? item.fotoProfil[0] : `https://ui-avatars.com/api/?name=${item.nama || 'Pegawai'}&background=e2e8f0&color=475569&size=150`;
    const jabatans = (item.detailJabatan || []).map(d => d.namaJabatan).join(', ') || '-';
    
    const html = `
        <div class="p-8 bg-white text-slate-800 font-sans" style="width: 800px;">
            <div class="flex border-b-4 border-primary pb-4 mb-6 items-center">
                <img src="${foto}" style="width: 120px; height: 160px; object-fit: cover;" class="rounded border shadow">
                <div class="ml-6 flex-1">
                    <h1 class="text-3xl font-black uppercase tracking-wide text-primary">${item.nama}</h1>
                    <p class="text-xl font-bold text-slate-600 mt-1">${jabatans}</p>
                    <p class="text-sm mt-3 font-semibold text-slate-500"><i class="fa-solid fa-phone mr-2"></i> ${item.noHp || '-'}</p>
                    <p class="text-sm font-semibold text-slate-500 mt-1"><i class="fa-solid fa-location-dot mr-2"></i> ${item.alamat || '-'}</p>
                </div>
            </div>
            <h3 class="font-bold text-lg border-b-2 border-slate-200 mb-3 text-slate-700 pb-1">Biodata Lengkap & Kepegawaian</h3>
            <table class="w-full text-sm mb-6">
                <tr><td class="py-2 w-1/3 font-semibold text-slate-500">NIK Identitas</td><td>: ${item.nik || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Jenis Kelamin</td><td>: ${item.jk || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Tempat, Tgl Lahir</td><td>: ${item.tempatLahir || '-'}, ${item.tglLahir || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Pendidikan Terakhir</td><td>: ${item.pendidikan || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Tanggal Bergabung</td><td>: ${item.tglGabung || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Hak Akses Sistem</td><td>: <span class="bg-slate-200 px-2 py-1 rounded text-xs font-bold">${item.hakAkses || 'Staf Biasa'}</span></td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Username Akun</td><td>: ${item.username || '-'}</td></tr>
            </table>
        </div>
    `;
    document.getElementById('hidden-pdf-container').innerHTML = html;
    window.unduhPDF('hidden-pdf-container', `Profil_${item.nama.replace(/\s+/g, '_')}.pdf`);
};

export function renderHalamanPegawai(container) {
    window.currentPegawaiPhotos = [];
    const profilLembaga = window.appState.lembaga[0] || {};
    const daftarJabatan = profilLembaga.daftarJabatan ? profilLembaga.daftarJabatan.split(',').map(j => j.trim()) : [];
    
    const currentUser = window.currentUser || {};
    const isPegawaiBiasa = currentUser.hakAkses === 'Pegawai';

    const daftarMapel = profilLembaga.daftarMapel ? profilLembaga.daftarMapel.split(',').map(m => m.trim()) : [];
    
    let checkboxJabatanHTML = daftarJabatan.length > 0 ? daftarJabatan.map(j => {
        const isGuru = j.toLowerCase().includes('guru');
        const safeJ = j.replace(/\s+/g, '-');
        return `
        <div class="mb-3 p-3 border rounded-xl bg-white shadow-sm hover:border-indigo-300 transition">
            <label class="inline-flex items-center cursor-pointer font-bold text-slate-700 hover:text-indigo-600">
                <input type="checkbox" id="chk-${safeJ}" name="peg-jabatan-chk" value="${j}" onchange="window.handleJabatanCheck('${safeJ}')" class="mr-3 h-5 w-5 text-indigo-600 rounded"> ${j}
            </label>
            <div id="presensi-opts-${safeJ}" class="hidden mt-3 ml-8 border-l-4 border-indigo-200 pl-4 py-1">
                <label class="text-[11px] uppercase font-black text-slate-400 block mb-2 tracking-wider">Mode Presensi:</label>
                <select id="presensi-val-${safeJ}" onchange="window.handleTipePresensiChange('${safeJ}')" class="border border-slate-200 p-2.5 rounded-lg text-sm w-full md:w-3/4 focus:outline-indigo-500 bg-slate-50 text-slate-700 font-semibold cursor-pointer">
                    <option value="Kelas">Presensi Sesuai Kelas (Khusus Guru)</option>
                    <option value="CICO">Presensi Cek In & Cek Out (CICO)</option>
                    <option value="1x">Presensi 1 Kali (Harian)</option>
                    <option value="Tanpa Presensi">Tanpa Presensi</option>
                </select>
                
                <div id="cico-opts-${safeJ}" class="hidden mt-3 md:w-3/4 bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                    <label class="text-[11px] uppercase font-black text-emerald-600 block mb-1">Daftar Sesi CICO (Jam Masuk - Jam Keluar):</label>
                    <p class="text-[9px] font-bold text-emerald-500 mb-2">Pisahkan dengan koma jika lebih dari 1 sesi.</p>
                    <input type="text" id="cico-val-${safeJ}" class="border border-emerald-300 p-2 rounded w-full bg-white text-emerald-800 font-bold text-sm" placeholder="Cth: 08:00-12:00, 13:00-17:00">
                </div>
                ${isGuru ? `
                <label class="text-[11px] uppercase font-black text-slate-400 block mb-1 mt-2 text-green-600">Mapel yang Diampu (Bisa lebih dari 1):</label>
                <div class="border border-green-200 p-2 rounded-lg bg-green-50 text-sm max-h-32 overflow-y-auto custom-scrollbar">
                    ${daftarMapel.map(m => `<label class="flex items-center space-x-2 mb-1 cursor-pointer"><input type="checkbox" class="mapel-chk-${safeJ} form-checkbox text-green-600 rounded" value="${m}"> <span class="text-green-700 font-semibold">${m}</span></label>`).join('')}
                </div>
                <label class="text-[11px] uppercase font-black text-slate-400 block mb-1 mt-2 text-blue-600">Kuota Jam Mengajar (JP/Pekan):</label>
                <input type="number" id="kuota-val-${safeJ}" class="border border-blue-200 p-2 rounded-lg text-sm w-full bg-blue-50 text-blue-700 font-bold" placeholder="Cth: 24">
                ` : `<input type="hidden" id="kuota-val-${safeJ}" value="0">`}
            </div>
        </div>`;
    }).join('') : `<div class="bg-red-50 text-red-500 font-bold p-4 rounded-xl col-span-2 border border-red-200"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Harap isi "Daftar Jabatan Pegawai" di Konfigurasi Lembaga terlebih dahulu!</div>`;

    let kartuPegawaiHTML = '';
    if (!isPegawaiBiasa) {
        kartuPegawaiHTML = window.appState.pegawai.map((item) => {
            const foto = (item.fotoProfil && item.fotoProfil.length > 0) ? item.fotoProfil[0] : `https://ui-avatars.com/api/?name=${item.nama || 'Pegawai'}&background=e2e8f0&color=475569`;
            const jabatans = (item.detailJabatan || []).map(d => `<span class="inline-block bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-200">${d.namaJabatan} ${d.mapel && d.mapel.length > 0 ? `<span class="text-green-600">(${Array.isArray(d.mapel) ? d.mapel.join(', ') : d.mapel})</span>` : ''}</span>`).join(' ');
            
            let badgeWarna = item.hakAkses === 'Administrator' ? 'bg-rose-50 text-rose-600 border-rose-200' : (item.hakAkses === 'Operator/TU' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200');

            return `
            <div class="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col relative group transform hover:-translate-y-1">
                <div class="h-24 bg-gradient-to-br from-slate-700 to-slate-900 w-full relative overflow-hidden">
                    <div class="absolute inset-0 bg-white opacity-5 pattern-dots"></div>
                </div>
                <div class="px-6 pb-6 relative flex-1 flex flex-col">
                    <div class="flex justify-between items-end -mt-10 mb-4">
                        <img src="${foto}" class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-white z-10">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black tracking-wide border ${badgeWarna} shadow-sm">${item.hakAkses || 'Pegawai Biasa'}</span>
                    </div>
                    <h3 class="text-lg font-black text-slate-800 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">${item.nama || '-'}</h3>
                    <p class="text-xs font-semibold text-slate-400 mb-4"><i class="fa-solid fa-at mr-1"></i> ${item.username || '-'}</p>
                    
                    <div class="flex-1 mb-5">
                        <div class="flex flex-wrap gap-1.5">${jabatans || '<span class="text-xs text-red-400 font-medium bg-red-50 px-2 py-1 rounded">Belum ditetapkan</span>'}</div>
                    </div>
                    
                    <div class="border-t border-slate-100 pt-4 flex justify-between gap-2 mt-auto">
                        <button onclick="window.cetakProfilPegawai('${item.id}')" class="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center"><i class="fa-solid fa-print mr-1.5"></i> Cetak</button>
                        <button onclick="window.editPegawai('${item.id}')" class="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center"><i class="fa-solid fa-pen mr-1.5"></i> Edit</button>
                        <button onclick="window.hapusPegawai('${item.id}')" class="w-11 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs font-bold transition"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    container.innerHTML = `
        <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm mb-8 border-t-4 border-indigo-500 relative overflow-hidden">
            <div class="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><i class="fa-solid fa-users-gear text-9xl"></i></div>
            
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 pb-4 relative z-10 gap-4">
                <h2 class="text-2xl font-black text-slate-800">${isPegawaiBiasa ? 'Biodata Profil Anda' : 'Formulir Data Pegawai & Akun Sistem'}</h2>
                ${!isPegawaiBiasa ? `
                <div class="flex gap-2">
                    <button type="button" onclick="window.eksporDataCSV('pegawai', 'Data_Pegawai')" class="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition shadow-sm flex items-center"><i class="fa-solid fa-download mr-2"></i> Ekspor CSV</button>
                    <label class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition shadow-sm cursor-pointer flex items-center"><i class="fa-solid fa-upload mr-2"></i> Impor CSV <input type="file" accept=".csv" onchange="window.imporDataCSV(event, 'Pegawai')" class="hidden"></label>
                </div>` : ''}
            </div>
            
            <form id="form-pegawai" onsubmit="window.simpanPegawai(event)" class="relative z-10">
                <input type="hidden" id="peg-id">
                
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div class="xl:col-span-2 space-y-6">
                        <div>
                            <h3 class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3"><i class="fa-solid fa-id-badge mr-2"></i> Identitas Utama</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" id="peg-nama" placeholder="Nama Lengkap (Wajib)" class="border-2 border-slate-200 p-3.5 rounded-xl focus:outline-indigo-500 font-semibold text-slate-700 bg-slate-50" required>
                                <select id="peg-jk" class="border-2 border-slate-200 p-3.5 rounded-xl focus:outline-indigo-500 font-semibold text-slate-700 bg-slate-50">
                                    <option value="">-- Jenis Kelamin --</option><option value="Laki-Laki">Laki-Laki</option><option value="Perempuan">Perempuan</option>
                                </select>
                                <input type="text" id="peg-nik" placeholder="NIK KTP (Opsional)" class="border-2 border-slate-200 p-3.5 rounded-xl focus:outline-indigo-500 font-semibold text-slate-700 bg-slate-50 md:col-span-2">
                            </div>
                        </div>

                        <div>
                            <h3 class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3"><i class="fa-solid fa-address-book mr-2"></i> Biodata Tambahan</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Tempat Lahir</label><input type="text" id="peg-tempat-lahir" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium"></div>
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Tanggal Lahir</label><input type="date" id="peg-tgl-lahir" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium"></div>
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Nomor HP / WA</label><input type="text" id="peg-nohp" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium"></div>
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Pend. Terakhir</label><input type="text" id="peg-pendidikan" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium"></div>
                                <div class="md:col-span-2"><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Mulai Bergabung</label><input type="date" id="peg-tgl-gabung" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium"></div>
                                <div class="md:col-span-3"><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Alamat Domisili</label><textarea id="peg-alamat" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium" rows="2"></textarea></div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                            <h3 class="font-bold text-indigo-400 text-xs uppercase tracking-wider mb-3"><i class="fa-solid fa-key mr-2"></i> Kredensial Akses</h3>
                            <div class="space-y-3">
                                <input type="text" id="peg-user" placeholder="Username (Cth: ahmad123)" class="border-2 border-white p-3 rounded-xl w-full focus:outline-indigo-500 font-bold text-indigo-900 shadow-sm" ${isPegawaiBiasa ? 'readonly title="Hubungi Admin untuk mengganti Username"' : ''}>
                                <input type="password" id="peg-pass" placeholder="${isPegawaiBiasa ? 'Kosongkan bila tak ubah sandi' : 'Password Sistem'}" class="border-2 border-white p-3 rounded-xl w-full focus:outline-indigo-500 font-bold text-indigo-900 shadow-sm">
                                <select id="peg-hak" class="border-2 border-white p-3 rounded-xl w-full focus:outline-indigo-500 font-black text-indigo-600 shadow-sm cursor-pointer ${isPegawaiBiasa ? 'hidden' : ''}">
                                    <option value="">-- Hak Akses Web --</option>
                                    <option value="Administrator">Administrator (Penuh)</option>
                                    <option value="Operator/TU">Operator / TU</option>
                                    <option value="Pegawai">Pegawai Biasa</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <h3 class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-2"><i class="fa-solid fa-camera mr-2"></i> Foto Profil</h3>
                            <input type="file" id="peg-foto-file" accept="image/*" class="border-2 border-slate-200 p-2 bg-white rounded-xl text-sm w-full font-medium text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer">
                            <div id="peg-foto-gallery" class="flex flex-wrap mt-3 gap-2"></div>
                        </div>
                    </div>
                </div>

                <div class="mt-8 border-t border-slate-100 pt-6 ${isPegawaiBiasa ? 'hidden' : ''}">
                    <h3 class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-4"><i class="fa-solid fa-sitemap mr-2"></i> Penempatan Jabatan & Tugas</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${checkboxJabatanHTML}
                    </div>
                </div>

                <div class="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                    <button type="submit" id="btn-simpan-peg" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-xl font-black text-lg transition shadow-xl transform hover:-translate-y-1"><i class="fa-solid fa-save mr-2"></i> Simpan Profil</button>
                    <button type="button" onclick="document.getElementById('form-pegawai').reset(); document.getElementById('btn-batal-peg').classList.add('hidden'); document.getElementById('peg-pass').disabled=false; document.getElementById('peg-hak').disabled=false;" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-8 py-4 rounded-xl hidden font-bold transition" id="btn-batal-peg">Batal Edit</button>
                </div>
            </form>
        </div>

        ${isPegawaiBiasa ? '' : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            ${kartuPegawaiHTML || '<div class="col-span-full text-center p-10 bg-white rounded-3xl text-slate-400 font-bold border border-slate-100 shadow-sm"><i class="fa-solid fa-ghost text-4xl mb-3 block opacity-50"></i> Belum ada data pegawai yang terdaftar</div>'}
        </div>
        `}
        
        <div id="hidden-pdf-container" class="hidden absolute top-[-9999px] left-[-9999px] bg-white"></div>
    `;
    window.renderFotoGallery();

    if (isPegawaiBiasa && currentUser.id) {
        setTimeout(() => {
            window.editPegawai(currentUser.id);
            const btnBatal = document.getElementById('btn-batal-peg');
            if (btnBatal) btnBatal.classList.add('hidden');
        }, 50);
    }
}

window.simpanPegawai = async function(e) {
    e.preventDefault();
    const id = document.getElementById('peg-id').value;
    
    const userAktif = window.currentUser || {};
    const isOperator = userAktif.hakAkses === 'Operator/TU';
    const isPegawaiBiasa = userAktif.hakAkses === 'Pegawai';
    const isSelf = userAktif.id === id;

    if (isPegawaiBiasa && !isSelf && id) return alert("Akses Ditolak!");

    let detailJabatan = [];
    let hakToSave = document.getElementById('peg-hak').value;
    let passToSave = document.getElementById('peg-pass').value;
    let userToSave = document.getElementById('peg-user').value;

    if (id) {
        const originalUser = window.appState.pegawai.find(x => x.id === id);
        
        if (isPegawaiBiasa) {
            detailJabatan = originalUser.detailJabatan || [];
            hakToSave = originalUser.hakAkses;
            userToSave = originalUser.username; 
            if (passToSave.trim() === '') passToSave = originalUser.password;
        } else if (isOperator) {
            hakToSave = originalUser.hakAkses; 
            if (!isSelf && passToSave.trim() === '') passToSave = originalUser.password; 
            document.querySelectorAll('input[name="peg-jabatan-chk"]:checked').forEach(el => {
                const safeJ = el.value.replace(/\s+/g, '-');
                const mapels = Array.from(document.querySelectorAll(`.mapel-chk-${safeJ}:checked`)).map(cb => cb.value);
                const kuota = document.getElementById(`kuota-val-${safeJ}`)?.value || 0;
                const cicoOpts = document.getElementById(`cico-val-${safeJ}`)?.value || '';
                detailJabatan.push({ namaJabatan: el.value, tipePresensi: document.getElementById(`presensi-val-${safeJ}`).value, mapel: mapels, kuota: kuota, cicoOpts: cicoOpts });
            });
        } else {
            document.querySelectorAll('input[name="peg-jabatan-chk"]:checked').forEach(el => {
                const safeJ = el.value.replace(/\s+/g, '-');
                const mapels = Array.from(document.querySelectorAll(`.mapel-chk-${safeJ}:checked`)).map(cb => cb.value);
                const kuota = document.getElementById(`kuota-val-${safeJ}`)?.value || 0;
                const cicoOpts = document.getElementById(`cico-val-${safeJ}`)?.value || '';
                detailJabatan.push({ namaJabatan: el.value, tipePresensi: document.getElementById(`presensi-val-${safeJ}`).value, mapel: mapels, kuota: kuota, cicoOpts: cicoOpts });
            });
        }
    } else {
        document.querySelectorAll('input[name="peg-jabatan-chk"]:checked').forEach(el => {
                const safeJ = el.value.replace(/\s+/g, '-');
                const mapels = Array.from(document.querySelectorAll(`.mapel-chk-${safeJ}:checked`)).map(cb => cb.value);
                const kuota = document.getElementById(`kuota-val-${safeJ}`)?.value || 0;
                const cicoOpts = document.getElementById(`cico-val-${safeJ}`)?.value || '';
                detailJabatan.push({ namaJabatan: el.value, tipePresensi: document.getElementById(`presensi-val-${safeJ}`).value, mapel: mapels, kuota: kuota, cicoOpts: cicoOpts });
            });
    }

    const fileInput = document.getElementById('peg-foto-file');
    if (fileInput.files.length > 0) {
        const uploadedUrl = await window.uploadFotoCloudinary(fileInput.files[0], 'btn-simpan-peg');
        if (uploadedUrl) window.currentPegawaiPhotos.push(uploadedUrl);
    }

    const data = {
        nama: document.getElementById('peg-nama').value, jk: document.getElementById('peg-jk').value, nik: document.getElementById('peg-nik').value,
        tempatLahir: document.getElementById('peg-tempat-lahir').value, tglLahir: document.getElementById('peg-tgl-lahir').value, pendidikan: document.getElementById('peg-pendidikan').value, 
        noHp: document.getElementById('peg-nohp').value, tglGabung: document.getElementById('peg-tgl-gabung').value, alamat: document.getElementById('peg-alamat').value,
        username: userToSave, 
        password: passToSave, 
        hakAkses: hakToSave,
        fotoProfil: window.currentPegawaiPhotos, detailJabatan: detailJabatan
    };

    try {
        if (id) await updateDoc(doc(db, "Pegawai", id), data); else await addDoc(collection(db, "Pegawai"), data);
        
        document.getElementById('form-pegawai').reset(); 
        document.getElementById('btn-batal-peg').classList.add('hidden');
        document.getElementById('peg-pass').disabled = false;
        document.getElementById('peg-hak').disabled = false;
        
        renderHalamanPegawai(document.getElementById('view-container'));
    } catch (err) { alert("Gagal menyimpan profil!"); }
};

window.editPegawai = function(id) {
    const item = window.appState.pegawai.find(x => x.id === id);
    if (item) {
        const userAktif = window.currentUser || {};
        const isOperator = userAktif.hakAkses === 'Operator/TU';
        const isPegawaiBiasa = userAktif.hakAkses === 'Pegawai';
        const isSelf = userAktif.id === id;

        if (isPegawaiBiasa && !isSelf) return alert("Akses Ditolak!");

        document.getElementById('peg-id').value = item.id;
        document.getElementById('peg-nama').value = item.nama || ''; document.getElementById('peg-jk').value = item.jk || ''; document.getElementById('peg-nik').value = item.nik || '';
        document.getElementById('peg-tempat-lahir').value = item.tempatLahir || ''; document.getElementById('peg-tgl-lahir').value = item.tglLahir || ''; document.getElementById('peg-pendidikan').value = item.pendidikan || '';
        document.getElementById('peg-nohp').value = item.noHp || ''; document.getElementById('peg-tgl-gabung').value = item.tglGabung || ''; document.getElementById('peg-alamat').value = item.alamat || '';
        
        const userInput = document.getElementById('peg-user');
        const passInput = document.getElementById('peg-pass');
        const hakInput = document.getElementById('peg-hak');

        if (isPegawaiBiasa) {
            userInput.value = item.username || '';
            userInput.classList.add('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
            passInput.value = ''; 
            passInput.disabled = false;
            hakInput.value = item.hakAkses || 'Pegawai';
            hakInput.disabled = true;
        } else if (isOperator && !isSelf) {
            userInput.value = item.username || '';
            passInput.value = '********';
            passInput.disabled = true;
            passInput.classList.add('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
            hakInput.value = item.hakAkses || 'Pegawai';
            hakInput.disabled = true;
            hakInput.classList.add('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
        } else if (isOperator && isSelf) {
            userInput.value = item.username || '';
            passInput.value = item.password || '';
            passInput.disabled = false;
            passInput.classList.remove('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
            hakInput.value = item.hakAkses || 'Pegawai';
            hakInput.disabled = true;
            hakInput.classList.add('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
        } else {
            userInput.value = item.username || '';
            passInput.value = item.password || '';
            passInput.disabled = false;
            passInput.classList.remove('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
            hakInput.value = item.hakAkses || 'Pegawai';
            hakInput.disabled = false;
            hakInput.classList.remove('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
        }
        
        window.currentPegawaiPhotos = item.fotoProfil ? [...item.fotoProfil] : [];
        window.renderFotoGallery();

        const jabatans = item.detailJabatan || [];
        document.querySelectorAll('input[name="peg-jabatan-chk"]').forEach(el => {
            const safeJ = el.value.replace(/\s+/g, '-');
            const match = jabatans.find(d => d.namaJabatan === el.value);
            if (match) {
                el.checked = true; document.getElementById(`presensi-opts-${safeJ}`).classList.remove('hidden'); document.getElementById(`presensi-val-${safeJ}`).value = match.tipePresensi;
                
                // Tick Checkbox Mapel Multi & Isi Kuota
                if (match.mapel) {
                    if (Array.isArray(match.mapel)) {
                        match.mapel.forEach(m => { const chk = document.querySelector(`.mapel-chk-${safeJ}[value="${m}"]`); if (chk) chk.checked = true; });
                    } else if (typeof match.mapel === 'string') {
                        const chk = document.querySelector(`.mapel-chk-${safeJ}[value="${match.mapel}"]`); if (chk) chk.checked = true;
                    }
                }
                const kuotaInp = document.getElementById(`kuota-val-${safeJ}`); if(kuotaInp) kuotaInp.value = match.kuota || '';
                if(match.tipePresensi === 'CICO') document.getElementById(`cico-opts-${safeJ}`).classList.remove('hidden');
                const cicoInp = document.getElementById(`cico-val-${safeJ}`); if(cicoInp) cicoInp.value = match.cicoOpts || '';

            } else { el.checked = false; document.getElementById(`presensi-opts-${safeJ}`).classList.add('hidden'); }
        });
document.getElementById('btn-batal-peg').classList.remove('hidden'); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};
window.hapusPegawai = async function(id) {
    if (confirm("Yakin ingin menghapus pegawai ini?")) await deleteDoc(doc(db, "Pegawai", id));
};

// ==========================================
// MODUL ABSENSI, CUTI & KBM (SUPER CANGGIH, GPS & REAL-TIME)
// ==========================================

window.getLocalISOString = function() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

window.waktuKeMenit = function(waktuStr) {
    if (!waktuStr) return 0;
    // Otomatis ubah titik menjadi titik dua agar tidak error
    const str = waktuStr.replace('.', ':'); 
    if (!str.includes(':')) return 0;
    const [h, m] = str.split(':').map(Number);
    return (h * 60) + m;
};

// Fungsi Generate Slot Jam berdasarkan Konfigurasi Lembaga
window.generateSlotWaktu = function(lembaga) {
    let slots = [];
    try {
        let curMins = window.waktuKeMenit(lembaga.umumMasuk || "07:00");
        let durasi = Number(lembaga.umumJp || 40);
        let endMins = window.waktuKeMenit(lembaga.umumPulang || "14:00");
        let breaks = (lembaga.umumIstirahat || '').split(',').filter(x => x).map(s => {
            const [bs, be] = s.split('-'); return { start: window.waktuKeMenit(bs), end: window.waktuKeMenit(be) };
        });
        
        let jamKe = 1;
        while (curMins < endMins && jamKe <= 15) {
            let activeBreak = breaks.find(b => curMins >= b.start && curMins < b.end);
            if (activeBreak) { curMins = activeBreak.end; continue; }
            let slotEnd = curMins + durasi;
            let hitBreak = breaks.find(b => slotEnd > b.start && curMins < b.start);
            if (hitBreak) slotEnd = hitBreak.start; 
            slots.push({ jamKe: jamKe, start: curMins, end: slotEnd });
            curMins = slotEnd; if (!hitBreak) jamKe++;
        }
    } catch(e) {}
    return slots;
};

// Fungsi Kalkulasi Keterlambatan Otomatis (Semi Ketat / Super Ketat)
window.hitungKeterlambatan = function(tipe, jamTxt, lembaga) {
    if (lembaga.kedisiplinan === 'Longgar') return Number(document.getElementById('input-keterlambatan-manual')?.value || 0);
    
    const now = new Date();
    const curMins = now.getHours() * 60 + now.getMinutes();
    const toleransi = Number(lembaga.toleransiTelat || 0);
    let targetMins = 0;

    if (tipe === '1x' || tipe === 'CICO') {
        targetMins = window.waktuKeMenit(lembaga.jamMasukKerja || '07:00');
    } else if (tipe === 'Kelas' || tipe === 'Inval') {
        const slots = window.generateSlotWaktu(lembaga);
        const firstJam = Number(jamTxt.split('-')[0].replace('Jam ','').trim());
        const slot = slots.find(s => s.jamKe === firstJam);
        if(slot) targetMins = slot.start; else return 0;
    }

    const diff = curMins - targetMins;
    if (diff > toleransi) return diff - toleransi;
    return 0;
};

// Fungsi Haversine Formula untuk Jarak GPS
window.hitungJarakGPS = function(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180, Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// Validasi GPS untuk Super Ketat
window.validasiGPS = async function(lembaga) {
    if (lembaga.kedisiplinan !== 'Super Ketat') return true;
    if (!lembaga.gpsKantor || !lembaga.radiusGps) { alert("GPS/Radius Kantor belum diatur di menu Lembaga!"); return false; }
    
    const [latK, lonK] = lembaga.gpsKantor.split(',').map(Number);
    const radius = Number(lembaga.radiusGps);

    try {
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }));
        const dist = window.hitungJarakGPS(pos.coords.latitude, pos.coords.longitude, latK, lonK);
        if (dist > radius) {
            alert(`⚠️ AKSES DITOLAK!\n\nSistem Super Ketat mendeteksi Anda di luar area absensi.\nJarak Anda: ${Math.round(dist)} meter.\nBatas Maksimal: ${radius} meter.`);
            return false;
        }
        return true;
    } catch(e) {
        alert("Gagal membaca lokasi GPS. Pastikan Izin Lokasi diaktifkan pada browser/perangkat Anda!");
        return false;
    }
};

window.jalankanJam = function() {
    if(window.timerJam) clearInterval(window.timerJam);
    window.timerJam = setInterval(() => {
        const elJam = document.getElementById('jam-realtime');
        const elTanggal = document.getElementById('tgl-realtime');
        if(elJam && elTanggal) {
            const now = new Date();
            elJam.innerText = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit', second:'2-digit' });
            elTanggal.innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }, 1000);
};

window.gantiUIAbsen = function() {
    const seleksi = document.getElementById('pilih-jabatan-absen');
    if (!seleksi || seleksi.selectedIndex === -1) return;
    
    const tipe = seleksi.options[seleksi.selectedIndex].dataset.tipe;
    ['area-cico', 'area-1x', 'area-kelas', 'area-tanpa'].forEach(id => {
        const el = document.getElementById(id); if(el) el.classList.add('hidden');
    });

    if (tipe === 'CICO') document.getElementById('area-cico').classList.remove('hidden');
    else if (tipe === '1x') document.getElementById('area-1x').classList.remove('hidden'); 
    else if (tipe === 'Kelas') document.getElementById('area-kelas').classList.remove('hidden'); 
    else if (tipe === 'Tanpa Presensi') document.getElementById('area-tanpa').classList.remove('hidden'); 
};

window.bukaModalIzin = function() {
    let modal = document.getElementById('modal-izin');
    if (!modal) {
        modal = document.createElement('div'); modal.id = 'modal-izin';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center backdrop-blur-sm hidden p-4';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-t-4 border-orange-500 animate-slide-up">
            <h3 class="text-xl font-black text-slate-800 mb-2"><i class="fa-solid fa-person-walking-arrow-right text-orange-500 mr-2"></i> Izin Tinggalkan Lokasi</h3>
            <p class="text-xs text-slate-500 mb-4 border-b pb-3">Notifikasi akan dikirimkan ke dashboard Kepala.</p>
            <form onsubmit="window.simpanIzin(event)">
                <label class="text-sm font-bold text-slate-700 block mb-1">Alasan Keluar (Wajib):</label>
                <textarea id="izin-alasan" required rows="3" class="w-full border-2 border-slate-200 rounded-xl p-3 focus:outline-orange-500 mb-4 bg-slate-50"></textarea>
                <div class="flex gap-2">
                    <button type="button" onclick="document.getElementById('modal-izin').classList.add('hidden')" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition">Batal</button>
                    <button type="submit" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl shadow-lg transition">Kirim Izin</button>
                </div>
            </form>
        </div>`;
    modal.classList.remove('hidden');
};

window.simpanIzin = async function(e) {
    e.preventDefault();
    try {
        await addDoc(collection(db, "Cuti"), { pengajuId: window.currentUser.id, pengaju: window.currentUser.nama, jenis: "Izin Keluar Lokasi", alasan: document.getElementById('izin-alasan').value, tanggal: window.getLocalISOString(), status: "Pending", createdAt: new Date().toISOString() });
        alert("Izin diajukan!"); document.getElementById('modal-izin').classList.add('hidden');
    } catch(err) { alert("Gagal!"); }
};

window.bukaModalSusulan = function() {
    let modal = document.getElementById('modal-susulan');
    if (!modal) {
        modal = document.createElement('div'); modal.id = 'modal-susulan';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center backdrop-blur-sm hidden p-4';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-t-4 border-blue-500 animate-slide-up">
            <h3 class="text-xl font-black text-slate-800 mb-2"><i class="fa-solid fa-clock-rotate-left text-blue-500 mr-2"></i> Presensi Susulan</h3>
            <form onsubmit="window.simpanSusulan(event)">
                <label class="text-sm font-bold text-slate-700 block mb-1">Tanggal, Jam & Alasan:</label>
                <textarea id="susulan-alasan" required rows="3" class="w-full border-2 border-slate-200 rounded-xl p-3 focus:outline-blue-500 mb-4 bg-slate-50"></textarea>
                <div class="flex gap-2">
                    <button type="button" onclick="document.getElementById('modal-susulan').classList.add('hidden')" class="flex-1 bg-slate-200 text-slate-700 font-bold py-3 rounded-xl">Batal</button>
                    <button type="submit" class="flex-1 bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg">Kirim Susulan</button>
                </div>
            </form>
        </div>`;
    modal.classList.remove('hidden');
};

window.simpanSusulan = async function(e) {
    e.preventDefault();
    try {
        await addDoc(collection(db, "Cuti"), { pengajuId: window.currentUser.id, pengaju: window.currentUser.nama, jenis: "Presensi Susulan", alasan: document.getElementById('susulan-alasan').value, tanggal: window.getLocalISOString(), status: "Pending", createdAt: new Date().toISOString() });
        alert("Susulan diajukan!"); document.getElementById('modal-susulan').classList.add('hidden');
    } catch(err) { alert("Gagal!"); }
};

window.ajukanCuti = async function(event) {
    event.preventDefault();
    const tglMulai = document.getElementById('cuti-mulai').value;
    const tglSampai = document.getElementById('cuti-sampai').value;
    const alasan = document.getElementById('cuti-alasan').value;
    
    const btn = event.target.querySelector('button[type="submit"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...'; btn.disabled = true;

    try {
        await addDoc(collection(db, "Cuti"), {
            pengajuId: window.currentUser.id, pengaju: window.currentUser.nama, jenis: "Cuti / Izin Harian", alasan: alasan, 
            tanggalMulai: tglMulai, tanggalSampai: tglSampai, tanggal: window.getLocalISOString(), status: "Pending", createdAt: new Date().toISOString()
        });
        alert("Cuti/izin berhasil diajukan!"); event.target.reset(); document.getElementById('form-cuti-container').classList.add('hidden');
    } catch(e) { alert("Gagal."); } finally { btn.innerHTML = oriText; btn.disabled = false; }
};

// ================= FUNGSI SIMPAN NON-KELAS (CICO / 1X) =================
window.simpanAbsenLain = async function(event, tipe, status) {
    const btn = event.currentTarget; const oriHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-3xl mb-3 block"></i><span class="text-xl">MEREKAM...</span>'; btn.disabled = true;

    const lembaga = window.appState.lembaga[0] || {};
    const gpsValid = await window.validasiGPS(lembaga);
    if (!gpsValid) { btn.innerHTML = oriHTML; btn.disabled = false; return; }

    const now = new Date(); const dateStr = window.getLocalISOString(); 
    const curMins = window.waktuKeMenit(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }));
    const sessionUser = window.currentUser;
    const jabatanSel = document.getElementById('pilih-jabatan-absen');
    const jabStr = jabatanSel ? jabatanSel.value : 'Pegawai';
    const detailPegawai = window.appState.pegawai.find(p => p.id === sessionUser.id) || {};
    
    // PERBAIKAN: Gunakan jamPulangKerja, bukan umumPulang
    if (tipe === '1x' && lembaga.kedisiplinan !== 'Longgar') {
        const jamPulangMins = window.waktuKeMenit(lembaga.jamPulangKerja || "15:00");
        if (curMins > jamPulangMins) {
            alert(`⚠️ GAGAL PRESENSI!\n\nSaat ini sudah lewat Jam Pulang Kerja Pegawai (${lembaga.jamPulangKerja}). Anda tidak bisa lagi melakukan presensi harian.`);
            btn.innerHTML = oriHTML; btn.disabled = false; return;
        }
    }

    try {
        const qCek = query(collection(db, "Absensi"), where("idGuru", "==", sessionUser.id), where("tanggal", "==", dateStr));
        const snapCek = await getDocs(qCek); let myTodayAbs = []; snapCek.forEach(d => myTodayAbs.push(d.data()));

        if (tipe === '1x') {
            if (myTodayAbs.some(x => x.tipe === '1x' && x.jabatan === jabStr)) {
                alert("Anda sudah merekam kehadiran harian untuk jabatan ini hari ini!"); btn.innerHTML = oriHTML; btn.disabled = false; return;
            }
            const telatMins = window.hitungKeterlambatan('1x', null, lembaga);
            let msg = `Presensi harian berhasil direkam!`;
            if (telatMins > 0) msg = `Terdeteksi Keterlambatan: ${telatMins} Menit.\n\nPresensi tetap berhasil direkam!`;
            
            await addDoc(collection(db, "Absensi"), {
                idGuru: sessionUser.id, namaGuru: sessionUser.nama, tanggal: dateStr,
                waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }),
                tipe: '1x', status: 'Hadir Harian', kelas: '-', mapel: '-', jamTxt: '-', 
                keterangan: telatMins > 0 ? `Terlambat ${telatMins} Menit` : 'Tepat Waktu', 
                jabatan: jabStr, terlambat: telatMins, createdAt: new Date().toISOString()
            });
            alert(msg); window.navigate('absensi'); return;
        }

        let arrJabatan = jabStr.split(',').map(s => s.trim());
        for (let idx=0; idx < arrJabatan.length; idx++) {
            let jabatan = arrJabatan[idx];
            let telatMins = 0; let activeSesiStr = '';

            let jabConfig = (detailPegawai.detailJabatan || []).find(d => d.namaJabatan === jabatan);
            if(!jabConfig || !jabConfig.cicoOpts) { alert(`Waktu sesi CICO belum diatur untuk jabatan ${jabatan}! Hubungi Admin.`); btn.innerHTML = oriHTML; btn.disabled = false; return; }
            
            let sesiCICO = jabConfig.cicoOpts.split(',').map(s => {
                let p = s.split('-'); return { str: s.trim(), startMins: window.waktuKeMenit(p[0]), endMins: window.waktuKeMenit(p[1]) };
            }).filter(s => s.startMins > 0);

            if (sesiCICO.length === 0) { alert(`Format sesi CICO salah untuk ${jabatan}!`); btn.innerHTML = oriHTML; btn.disabled = false; return; }

            // PERBAIKAN: Cari Sesi Aktif dengan Batasan Bawah (Maks 60 menit sebelum sesi dimulai)
            const toleransiLimit = Number(lembaga.toleransiTelat || 0);
            let activeSesi = null;
            for (let i = 0; i < sesiCICO.length; i++) {
                // Sesi valid HANYA jika waktu sekarang >= (jam mulai - toleransi) DAN waktu sekarang <= (jam akhir + 30 menit)
                if (curMins >= (sesiCICO[i].startMins - toleransiLimit) && curMins <= (sesiCICO[i].endMins + 30)) { 
                    activeSesi = sesiCICO[i]; break; 
                }
            }

            if (!activeSesi) { 
                alert(`⚠️ GAGAL PRESENSI CICO!\n\nAnda melakukan absen di luar rentang waktu sesi yang berlaku untuk jabatan ${jabatan}.\n(Anda hanya bisa absen paling cepat ${toleransiLimit} menit sebelum sesi dimulai).`); 
                btn.innerHTML = oriHTML; btn.disabled = false; return; 
            }
            activeSesiStr = activeSesi.str;

            let myCicoSesiIni = myTodayAbs.filter(x => x.tipe === 'CICO' && x.jabatan === jabatan && x.jamTxt === activeSesiStr);
            let isCekInSesiIni = myCicoSesiIni.some(x => x.status === 'Cek In');
            let isCekOutSesiIni = myCicoSesiIni.some(x => x.status === 'Cek Out');

            if (status === 'Cek In') {
                let myAllIn = myTodayAbs.filter(x => x.tipe === 'CICO' && x.jabatan === jabatan && x.status === 'Cek In').length;
                let myAllOut = myTodayAbs.filter(x => x.tipe === 'CICO' && x.jabatan === jabatan && x.status === 'Cek Out').length;
                
                if (myAllIn > myAllOut) { alert("⚠️ GAGAL CEK IN!\nAnda belum melakukan Cek Out pada sesi CICO sebelumnya!"); btn.innerHTML = oriHTML; btn.disabled = false; return; }
                if (isCekInSesiIni) { alert("Anda sudah melakukan Cek In untuk sesi ini!"); btn.innerHTML = oriHTML; btn.disabled = false; return; }
                
                if(lembaga.kedisiplinan !== 'Longgar') {
                    telatMins = curMins - activeSesi.startMins;
                    if(telatMins > (lembaga.toleransiTelat||0)) telatMins -= (lembaga.toleransiTelat||0); else telatMins = 0;
                } else { telatMins = Number(document.getElementById('input-keterlambatan-manual')?.value || 0); }
            } 
            else if (status === 'Cek Out') {
                if (!isCekInSesiIni) { alert("Harap Cek In terlebih dahulu untuk sesi ini!"); btn.innerHTML = oriHTML; btn.disabled = false; return; }
                if (isCekOutSesiIni) { alert("Anda sudah Cek Out untuk sesi ini!"); btn.innerHTML = oriHTML; btn.disabled = false; return; }
                
                let cinData = myCicoSesiIni.find(x => x.status === 'Cek In');
                let durasi = curMins - window.waktuKeMenit(cinData.waktu);
                alert(`Sesi ${activeSesiStr} Selesai!\nTotal Kehadiran: ${Math.floor(durasi/60)} Jam ${durasi%60} Menit.`);
            }

            await addDoc(collection(db, "Absensi"), {
                idGuru: sessionUser.id, namaGuru: sessionUser.nama, tanggal: dateStr,
                waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }),
                tipe: tipe, status: status, kelas: '-', mapel: '-', jamTxt: activeSesiStr, 
                keterangan: telatMins > 0 ? `Terlambat ${telatMins} Menit` : 'Tepat Waktu', 
                jabatan: jabatan, terlambat: telatMins, createdAt: new Date().toISOString()
            });
        }
        
        window.navigate('absensi'); 
    } catch(e) { alert("Gagal merekam presensi."); btn.innerHTML = oriHTML; btn.disabled = false; }
};

window.simpanPresensiKelas = async function(event, mode) {
    event.preventDefault();
    const isReguler = mode === 'Reguler';
    const selectId = isReguler ? 'presensi-kelas-select' : 'presensi-inval-select';
    const inputKetId = isReguler ? 'presensi-keterangan' : 'presensi-inval-keterangan';
    
    const select = document.getElementById(selectId);
    if(!select || !select.value) return alert("Pilih jadwal kelas pada dropdown terlebih dahulu!");
    
    const lembaga = window.appState.lembaga[0] || {};
    
    // ATURAN BLOKIR JAM PULANG KELAS/LEMBAGA
    const now = new Date(); 
    const curMins = window.waktuKeMenit(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }));
    let jamPulangMins = window.waktuKeMenit(lembaga.umumPulang || "15:00");
    if (curMins > jamPulangMins && lembaga.kedisiplinan !== 'Longgar') {
        return alert(`⚠️ GAGAL PRESENSI KELAS!\n\nSaat ini sudah lewat Jam Pulang Lembaga (${lembaga.umumPulang}). Sesi kehadiran sudah ditutup.`);
    }

    const gpsValid = await window.validasiGPS(lembaga);
    if (!gpsValid) return;

    const btn = event.target.querySelector('button[type="submit"]');
    const oriHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true;

    const [idJadwal, kelas, mapel, jamTxt] = select.value.split('|');
    let keterangan = document.getElementById(inputKetId).value || '';
    const dateStr = window.getLocalISOString();
    const sessionUser = window.currentUser;

    const telatMins = window.hitungKeterlambatan(mode === 'Reguler' ? 'Kelas' : 'Inval', jamTxt, lembaga);
    if (telatMins > 0) {
        alert(`Terdeteksi Keterlambatan: ${telatMins} Menit!\n\nSistem akan melanjutkan ke form absen siswa.`);
        keterangan = `(Telat ${telatMins}M) ` + keterangan;
    }

    const data = {
        idGuru: sessionUser.id, namaGuru: sessionUser.nama, tanggal: dateStr,
        waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }),
        tipe: mode === 'Reguler' ? 'Kelas' : 'Inval', status: mode, kelas: kelas, mapel: mapel, jamTxt: jamTxt, 
        keterangan: keterangan, terlambat: telatMins, jabatan: `Guru (${kelas})`, createdAt: now.toISOString()
    };

    try {
        await addDoc(collection(db, "Absensi"), data);
        window.bukaModalAbsenSiswa(kelas, mapel, jamTxt, dateStr);
    } catch(e) { alert("Gagal menyimpan presensi."); } 
    finally { btn.innerHTML = oriHTML; btn.disabled = false; }
};

// ================= GABUNG JADWAL =================
function mergeJadwal(jadwalArray) {
    if(jadwalArray.length === 0) return [];
    let merged = [];
    let current = { ...jadwalArray[0], jamMulai: jadwalArray[0].jamKe, jamSelesai: jadwalArray[0].jamKe };
    for(let i = 1; i < jadwalArray.length; i++) {
        let next = jadwalArray[i];
        if(next.kelas === current.kelas && next.mapel === current.mapel && next.idGuru === current.idGuru && next.jamKe === current.jamSelesai + 1) {
            current.jamSelesai = next.jamKe;
        } else {
            merged.push(current);
            current = { ...next, jamMulai: next.jamKe, jamSelesai: next.jamKe };
        }
    }
    merged.push(current);
    return merged;
}

// ================= RE-RENDER TABEL HISTORI SAJA (FILTER) =================
window.filterTabelHistori = function() {
    const tglMulai = document.getElementById('filter-hist-start').value;
    const tglSampai = document.getElementById('filter-hist-end').value;
    const bodyTabel = document.getElementById('tbody-histori');
    
    if(!tglMulai || !tglSampai) return alert("Pilih tanggal rentang awal dan akhir!");

    let filtered = window.rawHistoriSaya.filter(h => h.tanggal >= tglMulai && h.tanggal <= tglSampai);
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    let displayRows = [];
    let processedCICO = new Set();

    filtered.forEach(h => {
        if (h.tipe === 'CICO') {
            const key = `${h.tanggal}_${h.jabatan}`;
            if (processedCICO.has(key)) return;
            processedCICO.add(key);
            
            const cicos = filtered.filter(x => x.tipe === 'CICO' && x.tanggal === h.tanggal && x.jabatan === h.jabatan);
            const cin = cicos.find(x => x.status === 'Cek In');
            const cout = cicos.find(x => x.status === 'Cek Out');
            
            displayRows.push({
                tanggal: h.tanggal, jabatan: h.jabatan || 'Pegawai',
                waktu: `<span class="text-emerald-600 font-bold block mb-1">IN: <span class="text-slate-700">${cin ? cin.waktu : '-'}</span></span> <span class="text-rose-600 font-bold block">OUT: <span class="text-slate-700">${cout ? cout.waktu : '-'}</span></span>`,
                keterangan: `<span class="italic text-slate-400">${cin?.keterangan || 'Tidak ada catatan'}</span>`
            });
        } else if (h.tipe === '1x') {
            displayRows.push({
                tanggal: h.tanggal, jabatan: h.jabatan || 'Pegawai',
                waktu: `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded font-black whitespace-nowrap">Pkl ${h.waktu}</span>`,
                keterangan: `<span class="italic text-slate-400">${h.keterangan || 'Hadir Harian'}</span>`
            });
        } else if (h.tipe === 'Kelas' || h.tipe === 'Inval') {
            const as = window.rawHistoriSiswa.find(s => s.tanggal === h.tanggal && s.kelas === h.kelas && s.jamTxt === h.jamTxt);
            let jmlHadirText = `<button type="button" onclick="window.bukaModalAbsenSiswa('${h.kelas}', '${h.mapel}', '${h.jamTxt}', '${h.tanggal}')" class="mt-1 text-white font-bold bg-rose-500 hover:bg-rose-600 px-2 py-1 rounded shadow-sm transition text-[10px] cursor-pointer"><i class="fa-solid fa-hand-pointer mr-1"></i> Klik Absen Siswa</button>`;
            if (as && as.detailSiswa) {
                const jmlHadir = as.detailSiswa.filter(ds => ds.status === 'Hadir').length;
                jmlHadirText = `<button type="button" onclick="window.bukaModalAbsenSiswa('${h.kelas}', '${h.mapel}', '${h.jamTxt}', '${h.tanggal}')" class="mt-1 text-emerald-700 font-black bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded shadow-sm transition cursor-pointer" title="Klik untuk edit"><i class="fa-solid fa-pen-to-square mr-1"></i> ${jmlHadir} Anak Hadir</button>`;
            }
            
            displayRows.push({
                tanggal: h.tanggal,
                jabatan: `<span class="font-bold text-slate-800">Guru (${h.kelas})</span> ${h.status==='Inval'?'<span class="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded ml-1 uppercase font-black">INVAL</span>':''}`,
                waktu: `<span class="font-bold text-slate-700 whitespace-nowrap">Pkl ${h.waktu}</span> <br> <span class="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-1 rounded mt-1 inline-block">${h.jamTxt}</span>`,
                keterangan: `<span class="font-black text-slate-700 block mb-0.5">${h.mapel}</span> <span class="text-xs text-slate-500 italic block mb-1">${h.keterangan || '-'}</span> ${jmlHadirText}`
            });
        }
    });

    bodyTabel.innerHTML = displayRows.map((r, idx) => `
        <tr class="border-b hover:bg-slate-50 text-sm transition">
            <td class="p-3 text-center font-medium">${idx + 1}</td>
            <td class="p-3 font-bold text-slate-700 whitespace-nowrap">${r.tanggal}</td>
            <td class="p-3 leading-tight">${r.jabatan}</td>
            <td class="p-3 leading-tight">${r.waktu}</td>
            <td class="p-3 leading-tight">${r.keterangan}</td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="p-6 text-center text-slate-400 font-medium">Tidak ada histori di rentang tanggal tersebut.</td></tr>';
};

// ================= MODAL ARSIP PRESENSI (TU/ADMIN) =================
window.bukaModalArsip = async function() {
    const btn = document.getElementById('btn-buka-arsip');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat...'; btn.disabled = true; }
    try {
        const snapAbsen = await getDocs(collection(db, "Absensi"));
        let allAbsen = []; snapAbsen.forEach(d => allAbsen.push({id: d.id, ...d.data()}));
        window.rawAllAbsensi = allAbsen.sort((a, b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));

        let modal = document.getElementById('modal-arsip');
        if (!modal) {
            modal = document.createElement('div'); modal.id = 'modal-arsip'; modal.className = 'fixed inset-0 bg-slate-900/90 z-[110] flex items-center justify-center p-4 hidden'; document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col h-[90vh] animate-slide-up">
                <div class="p-6 border-b flex justify-between items-center bg-indigo-600 text-white rounded-t-2xl">
                    <div><h3 class="text-2xl font-black"><i class="fa-solid fa-box-archive mr-2"></i> Arsip Presensi</h3><p class="text-sm font-medium text-indigo-200 mt-1">Gunakan filter pada header tabel untuk mencari data spesifik.</p></div>
                    <button onclick="document.getElementById('modal-arsip').classList.add('hidden')" class="text-white hover:text-red-300 text-3xl font-bold transition"><i class="fa-solid fa-times"></i></button>
                </div>
                <div class="p-6 flex-1 overflow-hidden flex flex-col bg-slate-50">
                    <div class="overflow-x-auto flex-1 border border-slate-300 rounded-xl shadow-sm bg-white custom-scrollbar">
                        <table class="w-full text-left text-sm" id="table-arsip">
                            <thead class="bg-slate-100 text-slate-700 border-b-2 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th class="p-3 w-10 text-center">No</th>
                                    <th class="p-3"><input type="text" placeholder="Filter Tgl..." class="w-full border p-1 rounded text-xs filter-arsip" data-col="tanggal"></th>
                                    <th class="p-3"><input type="text" placeholder="Filter Nama..." class="w-full border p-1 rounded text-xs filter-arsip" data-col="namaGuru"></th>
                                    <th class="p-3"><input type="text" placeholder="Filter Jabatan..." class="w-full border p-1 rounded text-xs filter-arsip" data-col="jabatan"></th>
                                    <th class="p-3"><input type="text" placeholder="Filter Status/Jam..." class="w-full border p-1 rounded text-xs filter-arsip" data-col="status"></th>
                                </tr>
                            </thead>
                            <tbody id="tbody-arsip"></tbody>
                        </table>
                    </div>
                </div>
                <div class="p-6 border-t bg-white rounded-b-2xl flex justify-between items-center">
                    <span class="text-sm font-bold text-slate-500" id="info-arsip-count">Total: ${allAbsen.length} Data</span>
                    <button onclick="window.prosesArsipkanData()" class="bg-red-500 hover:bg-red-600 text-white font-black px-8 py-3 rounded-xl shadow-lg transition"><i class="fa-solid fa-trash-can-arrow-up mr-2"></i> Ekspor CSV & Bersihkan DB</button>
                </div>
            </div>`;
        modal.classList.remove('hidden'); window.renderTabelArsip(window.rawAllAbsensi);

        document.querySelectorAll('.filter-arsip').forEach(inp => {
            inp.addEventListener('keyup', function() {
                const term = this.value.toLowerCase(); const col = this.dataset.col;
                const filtered = window.rawAllAbsensi.filter(x => String(x[col] || '').toLowerCase().includes(term));
                window.renderTabelArsip(filtered);
            });
        });
    } catch(e) { alert("Gagal memuat arsip."); } 
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-box-archive mr-2"></i> Arsip Presensi'; btn.disabled = false; }
};

window.renderTabelArsip = function(dataArray) {
    const tbody = document.getElementById('tbody-arsip'); if(!tbody) return;
    document.getElementById('info-arsip-count').innerText = `Menampilkan: ${dataArray.length} Data`;
    tbody.innerHTML = dataArray.map((x, i) => `<tr class="border-b hover:bg-slate-50 transition"><td class="p-3 text-center">${i+1}</td><td class="p-3 font-bold">${x.tanggal}</td><td class="p-3 font-black text-indigo-700">${x.namaGuru}</td><td class="p-3">${x.jabatan} <span class="text-[10px] bg-slate-200 px-1 rounded ml-1">${x.tipe}</span></td><td class="p-3"><span class="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">${x.status} (${x.waktu}) ${x.jamTxt !== '-' ? x.jamTxt : ''}</span></td></tr>`).join('') || `<tr><td colspan="5" class="p-6 text-center text-slate-400">Data tidak ditemukan.</td></tr>`;
};

window.prosesArsipkanData = async function() {
    if(!confirm("PERINGATAN!\nTindakan ini akan:\n1. Mengunduh data ke .CSV\n2. MENGHAPUS SEMUA DATA PRESENSI PERMANEN dari database.\n\nLanjutkan?")) return;
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Nama Pegawai,Jabatan,Tipe,Status,Waktu,Sesi/Jam,Keterangan\n";
    window.rawAllAbsensi.forEach(r => { csvContent += `"${r.tanggal}","${r.namaGuru}","${r.jabatan}","${r.tipe}","${r.status}","${r.waktu}","${r.jamTxt}","${r.keterangan || '-'}"\r\n`; });
    const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `Arsip_Absensi_${window.getLocalISOString()}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    try {
        const snap = await getDocs(collection(db, "Absensi"));
        snap.forEach(d => deleteDoc(doc(db, "Absensi", d.id))); 
        alert("Pembersihan database selesai!"); document.getElementById('modal-arsip').classList.add('hidden'); window.navigate('absensi');
    } catch(e) { alert("Gagal membersihkan database."); }
};

// ================= RENDER UTAMA ABSENSI =================
export async function renderHalamanAbsensi(container) {
    container.innerHTML = `<div class="text-center p-20"><i class="fa-solid fa-circle-notch fa-spin text-5xl text-indigo-500 mb-4"></i><p class="font-bold text-slate-500 text-lg">Mensinkronisasi Sistem Presensi Real-Time...</p></div>`;

    const lembaga = window.appState.lembaga[0] || {};
    const sessionUser = window.currentUser || {};
    const detailJabs = (window.appState.pegawai.find(p => p.id === sessionUser.id) || sessionUser).detailJabatan || [];
    
    // Logika Penggabungan Jabatan 1x
    const jabatan1x = detailJabs.filter(d => d.tipePresensi === '1x');
    const jabatanLain = detailJabs.filter(d => d.tipePresensi !== '1x');
    let opsiJabatanArray = [];
    if (jabatan1x.length > 0) {
        const listNama = jabatan1x.map(d => d.namaJabatan).join(', ');
        opsiJabatanArray.push(`<option value="${listNama}" data-tipe="1x">📌 Hadir Harian (${listNama})</option>`);
    }
    jabatanLain.forEach(d => {
        opsiJabatanArray.push(`<option value="${d.namaJabatan}" data-tipe="${d.tipePresensi}">📌 ${d.namaJabatan} (${d.tipePresensi})</option>`);
    });
    const opsiJabatan = opsiJabatanArray.join('');

    const hariKerja = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const now = new Date();
    const curMins = now.getHours() * 60 + now.getMinutes();
    const hariIniStr = hariKerja[now.getDay()];
    const todayISO = window.getLocalISOString();

    // CEK HARI LIBUR
    const liburConfig = lembaga.libur || 'Hanya Ahad';
    let liburIndices = [];
    if(liburConfig.toLowerCase().includes('ahad')) liburIndices.push(0);
    if(liburConfig.toLowerCase().includes('jumat') || liburConfig.toLowerCase().includes("jum'at")) liburIndices.push(5);
    if(liburConfig.toLowerCase().includes('sabtu')) liburIndices.push(6);
    if(liburIndices.length === 0) liburIndices.push(0);

    let isLiburPekanan = liburIndices.includes(now.getDay());
    let isTanggalMerah = false;
    let namaLibur = '';
    
    (window.appState.kalender || []).forEach(agenda => {
        if(agenda.tipeAgenda === 'Libur') {
            const start = new Date(agenda.tanggalMulai); start.setHours(0,0,0,0);
            const end = agenda.tanggalSelesai ? new Date(agenda.tanggalSelesai) : new Date(start); end.setHours(23,59,59,999);
            if(now >= start && now <= end) { isTanggalMerah = true; namaLibur = agenda.judulAgenda; }
        }
    });

    let liburMessage = '';
    if(isTanggalMerah) liburMessage = `Sistem presensi ditutup karena bertepatan dengan tanggal merah: ${namaLibur}`;
    else if(isLiburPekanan) liburMessage = `Sistem presensi ditutup karena bertepatan dengan hari libur pekanan lembaga.`;

    let todayAbsensi = []; window.rawHistoriSaya = []; window.rawHistoriSiswa = [];

    try {
        const snapToday = await getDocs(query(collection(db, "Absensi"), where("tanggal", "==", todayISO)));
        snapToday.forEach(doc => { const d = doc.data(); todayAbsensi.push({id: doc.id, ...d}); if(d.idGuru === sessionUser.id) window.rawHistoriSaya.push({id: doc.id, ...d}); });

        const snapHist = await getDocs(query(collection(db, "Absensi"), where("idGuru", "==", sessionUser.id)));
        snapHist.forEach(doc => { const d = doc.data(); if(d.tanggal !== todayISO) window.rawHistoriSaya.push({id: doc.id, ...d}); });

        const snapSiswa = await getDocs(query(collection(db, "AbsensiSiswa"), where("idGuru", "==", sessionUser.id)));
        snapSiswa.forEach(doc => window.rawHistoriSiswa.push(doc.data()));
    } catch(e) { console.error("Gagal sinkron absen", e); }

    const isKelasTerisi = (kelas, mapel, jamTxt) => todayAbsensi.some(a => (a.tipe === "Kelas" || a.tipe === "Inval") && a.kelas === kelas && a.jamTxt === jamTxt);

    const toleransi = Number(lembaga.toleransiTelat || 0);
    const slots = window.generateSlotWaktu(lembaga);
    const isValidTime = (jamMulai, jamSelesai) => {
        if (lembaga.kedisiplinan === 'Longgar') return true;
        const slotMulai = slots.find(s => s.jamKe === jamMulai);
        const slotSelesai = slots.find(s => s.jamKe === jamSelesai);
        if (!slotMulai || !slotSelesai) return false;
        return curMins >= (slotMulai.start - toleransi) && curMins <= (slotSelesai.end + toleransi + 30);
    };

    let jadwalRaw = (window.appState.jadwal || []).filter(j => j.idGuru === sessionUser.id && j.hari === hariIniStr).sort((a,b) => a.jamKe - b.jamKe);
    let dropdownHTML = mergeJadwal(jadwalRaw).filter(j => !isKelasTerisi(j.kelas, j.mapel, `${j.jamMulai}-${j.jamSelesai}`) && isValidTime(j.jamMulai, j.jamSelesai)).map(j => {
        let jamTxt = j.jamMulai === j.jamSelesai ? `Jam ${j.jamMulai}` : `Jam ${j.jamMulai}-${j.jamSelesai}`;
        return `<option value="${j.id}|${j.kelas}|${j.mapel}|${jamTxt}">${jamTxt} - ${j.kelas} (${j.mapel})</option>`;
    }).join('');
    if(!dropdownHTML) dropdownHTML = '<option value="">(Belum ada jadwal yang sesuai jam / Kosong)</option>';

    let jadwalLainRaw = (window.appState.jadwal || []).filter(j => j.idGuru !== sessionUser.id && j.hari === hariIniStr).sort((a,b) => a.jamKe - b.jamKe);
    let dropdownInvalHTML = mergeJadwal(jadwalLainRaw).filter(j => !isKelasTerisi(j.kelas, j.mapel, `${j.jamMulai}-${j.jamSelesai}`) && isValidTime(j.jamMulai, j.jamSelesai)).map(j => {
        let jamTxt = j.jamMulai === j.jamSelesai ? `Jam ${j.jamMulai}` : `Jam ${j.jamMulai}-${j.jamSelesai}`;
        return `<option value="${j.id}|${j.kelas}|${j.mapel}|${jamTxt}">${jamTxt}: ${j.kelas} (${j.mapel}) - Milik ${j.namaGuru}</option>`;
    }).join('');
    if(!dropdownInvalHTML) dropdownInvalHTML = '<option value="">(Tidak ada kelas kosong di jam ini)</option>';

    container.innerHTML = `
        <div class="bg-gradient-to-r from-slate-800 to-slate-900 p-8 rounded-2xl shadow-xl mb-8 text-center border-b-4 border-indigo-500 relative overflow-hidden">
            <div class="absolute top-0 right-0 opacity-10"><i class="fa-solid fa-clock text-9xl -mt-4 -mr-4"></i></div>
            <h2 class="text-indigo-300 font-semibold tracking-wider text-sm mb-2 uppercase">Waktu Presensi Saat Ini</h2>
            <p id="jam-realtime" class="text-5xl md:text-6xl font-black text-white tracking-widest drop-shadow-lg mb-2">00:00:00</p>
            <p id="tgl-realtime" class="text-lg md:text-xl font-medium text-slate-300">Memuat Tanggal...</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2">
                <div class="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100">
                    <div class="flex justify-between items-center mb-6 border-b pb-4">
                        <div class="flex items-center">
                            <div class="bg-blue-100 text-blue-600 p-3 rounded-xl mr-4"><i class="fa-solid fa-clipboard-user text-2xl"></i></div>
                            <h3 class="font-black text-2xl text-slate-800">Panel Presensi Anda</h3>
                        </div>
                        ${sessionUser.hakAkses === 'Operator/TU' || sessionUser.hakAkses === 'Administrator' ? `<button onclick="window.bukaModalArsip()" id="btn-buka-arsip" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition"><i class="fa-solid fa-box-archive mr-2"></i> Buka Arsip Presensi</button>` : ''}
                    </div>
                    
                    ${(isLiburPekanan || isTanggalMerah) ? `
                    <div class="bg-red-50 border border-red-200 p-8 rounded-2xl text-center shadow-inner mb-8">
                        <i class="fa-solid fa-calendar-xmark text-6xl text-red-400 mb-4 block animate-bounce"></i>
                        <h3 class="text-2xl font-black text-red-600 tracking-wide mb-2">PRESENSI DITUTUP</h3>
                        <p class="text-red-500 font-bold">${liburMessage}</p>
                    </div>
                    ` : `
                    ${lembaga.kedisiplinan === 'Longgar' ? `
                    <div class="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl">
                        <label class="font-bold text-xs text-orange-800 block mb-1">Disiplin Longgar: Input Manual Keterlambatan (Menit):</label>
                        <input type="number" id="input-keterlambatan-manual" placeholder="0 (Kosongkan jika tepat waktu)" class="border border-orange-300 p-2 rounded-lg w-full max-w-xs focus:outline-orange-500 font-bold text-orange-900 bg-white">
                    </div>` : ''}

                    ${opsiJabatan ? `
                    <div class="mb-8">
                        <label class="font-bold text-sm text-slate-500 block mb-2"><i class="fa-solid fa-briefcase mr-1"></i> Pilih Tugas/Jabatan Hari Ini:</label>
                        <select id="pilih-jabatan-absen" onchange="window.gantiUIAbsen()" class="border-2 border-indigo-200 p-4 rounded-xl w-full font-bold text-indigo-800 bg-indigo-50 shadow-inner focus:outline-indigo-500 cursor-pointer appearance-none">
                            ${opsiJabatan}
                        </select>
                    </div>
                    ` : `<div class="bg-red-50 text-red-600 p-4 rounded-xl font-bold mb-6 flex items-center"><i class="fa-solid fa-triangle-exclamation text-2xl mr-3"></i> Belum ada jabatan dengan sistem presensi yang terdaftar.</div>`}

                    <div id="area-kelas" class="hidden mb-6">
                        <form onsubmit="window.simpanPresensiKelas(event, 'Reguler')" class="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
                            <p class="text-lg font-black text-blue-800 mb-4"><i class="fa-solid fa-chalkboard-user mr-2 text-blue-600"></i> Absensi Kelas Mengajar Anda:</p>
                            <div class="space-y-4">
                                <div>
                                    <label class="text-xs font-bold text-blue-700 block mb-1">Pilih Jam & Mapel yang Berjalan:</label>
                                    <select id="presensi-kelas-select" class="w-full p-3 border-2 border-blue-200 rounded-xl font-bold text-blue-900 bg-white focus:outline-blue-500 cursor-pointer" required>
                                        <option value="">-- Silakan Pilih --</option>
                                        ${dropdownHTML}
                                    </select>
                                </div>
                                <div>
                                    <label class="text-xs font-bold text-blue-700 block mb-1">Keterangan / Jurnal Singkat (Opsional):</label>
                                    <input type="text" id="presensi-keterangan" placeholder="Contoh: Mengisi materi Bab 2..." class="w-full p-3 border-2 border-blue-200 rounded-xl font-medium text-slate-700 bg-white focus:outline-blue-500">
                                </div>
                                <button type="submit" class="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black py-4 rounded-xl shadow-lg transform hover:-translate-y-1 transition text-lg mt-2">
                                    <i class="fa-solid fa-clipboard-check mr-2"></i> KONFIRMASI HADIR & ABSEN SISWA
                                </button>
                            </div>
                        </form>
                    </div>

                    <div id="area-cico" class="hidden grid grid-cols-2 gap-4 md:gap-6 mb-6">
                        <button onclick="window.simpanAbsenLain(event, 'CICO', 'Cek In')" class="group bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white font-black py-8 rounded-2xl shadow-[0_10px_20px_rgba(16,185,129,0.3)] transform hover:-translate-y-1 transition duration-200">
                            <i class="fa-solid fa-person-walking-arrow-right text-4xl mb-3 block group-hover:scale-110 transition"></i><span class="text-xl">CEK IN</span>
                        </button>
                        <button onclick="window.simpanAbsenLain(event, 'CICO', 'Cek Out')" class="group bg-gradient-to-br from-rose-400 to-rose-600 hover:from-rose-500 hover:to-rose-700 text-white font-black py-8 rounded-2xl shadow-[0_10px_20px_rgba(244,63,94,0.3)] transform hover:-translate-y-1 transition duration-200">
                            <i class="fa-solid fa-person-walking-dashed-line-arrow-right text-4xl mb-3 block group-hover:scale-110 transition"></i><span class="text-xl">CEK OUT</span>
                        </button>
                    </div>
                    
                    <div id="area-1x" class="hidden mb-6">
                        <button onclick="window.simpanAbsenLain(event, '1x', 'Hadir Harian')" class="w-full group bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black py-8 rounded-2xl shadow-[0_10px_20px_rgba(99,102,241,0.4)] transform hover:-translate-y-1 transition duration-200">
                            <i class="fa-solid fa-fingerprint text-5xl mb-3 block group-hover:scale-110 transition"></i><span class="text-2xl tracking-wide">HADIR HARI INI</span>
                        </button>
                    </div>
                    
                    <div id="area-tanpa" class="hidden mb-6 bg-amber-50 p-6 border border-amber-200 rounded-xl text-amber-800 font-bold text-center">
                        <i class="fa-solid fa-mug-hot text-4xl mb-3 block text-amber-400"></i>Jabatan ini tidak mewajibkan rekam presensi harian.
                    </div>
                    `}

                    <div class="mt-8 pt-6 border-t border-slate-200">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <h4 class="font-bold text-sm text-slate-600"><i class="fa-solid fa-clock-rotate-left mr-2 text-indigo-500"></i> Rekam Jejak Kehadiran Anda (Universal):</h4>
                            <div class="flex items-center space-x-2 bg-slate-50 p-2 border border-slate-200 rounded-lg">
                                <input type="date" id="filter-hist-start" value="${todayISO}" class="border border-slate-200 rounded p-1 text-xs focus:outline-indigo-500">
                                <span class="text-xs font-bold text-slate-400">-</span>
                                <input type="date" id="filter-hist-end" value="${todayISO}" class="border border-slate-200 rounded p-1 text-xs focus:outline-indigo-500">
                                <button onclick="window.filterTabelHistori()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-bold transition"><i class="fa-solid fa-filter"></i></button>
                            </div>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl shadow-inner">
                            <table class="w-full text-left">
                                <thead class="bg-slate-50 text-slate-600 border-b">
                                    <tr><th class="p-3 text-center">No</th><th class="p-3">Tanggal</th><th class="p-3">Jabatan</th><th class="p-3">Waktu Terekam</th><th class="p-3">Keterangan</th></tr>
                                </thead>
                                <tbody id="tbody-histori">
                                    </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                ${!(isLiburPekanan || isTanggalMerah) ? `
                <div class="bg-white rounded-2xl shadow-lg border border-slate-100 mt-6 overflow-hidden">
                    <button onclick="document.getElementById('form-inval-container').classList.toggle('hidden')" class="w-full flex justify-between items-center bg-orange-50 hover:bg-orange-100 p-6 transition">
                        <span class="font-black text-xl text-orange-600"><i class="fa-solid fa-people-arrows mr-2"></i> Gantikan Guru Lain (Inval)</span>
                        <i class="fa-solid fa-chevron-down text-orange-600 text-xl"></i>
                    </button>
                    <div id="form-inval-container" class="hidden p-6 pt-2 space-y-4 bg-white">
                        <p class="text-xs font-bold text-slate-500 mb-4 border-b pb-4">Fitur ini dapat digunakan oleh semua jabatan untuk membackup jam kelas yang kosong.</p>
                        <form onsubmit="window.simpanPresensiKelas(event, 'Inval')" class="space-y-4">
                            <div>
                                <label class="text-xs font-bold text-slate-600 block mb-1">Pilih Kelas Kosong Hari Ini:</label>
                                <select id="presensi-inval-select" class="w-full p-3 border-2 border-orange-200 rounded-xl font-bold text-orange-900 bg-orange-50 focus:outline-orange-500 cursor-pointer" required>
                                    <option value="">-- Pilih Kelas & Mapel Guru Lain --</option>
                                    ${dropdownInvalHTML}
                                </select>
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-600 block mb-1">Keterangan Inval (Opsional):</label>
                                <input type="text" id="presensi-inval-keterangan" placeholder="Contoh: Menggantikan karena sakit..." class="w-full p-3 border-2 border-slate-200 rounded-xl font-medium text-slate-700 bg-white focus:outline-orange-500">
                            </div>
                            <button type="submit" class="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-black py-4 rounded-xl shadow-lg transform hover:-translate-y-1 transition text-lg mt-2">
                                <i class="fa-solid fa-handshake-angle mr-2"></i> KONFIRMASI INVAL & ABSEN SISWA
                            </button>
                        </form>
                    </div>
                </div>` : ''}
            </div>

            <div>
                <div class="bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col justify-start overflow-hidden mb-6">
                    <button onclick="document.getElementById('form-cuti-container').classList.toggle('hidden')" class="w-full flex justify-between items-center bg-indigo-50 hover:bg-indigo-100 p-6 transition">
                        <span class="font-black text-xl text-indigo-700"><i class="fa-solid fa-envelope-open-text mr-2"></i> Pengajuan Cuti Harian</span>
                        <i class="fa-solid fa-chevron-down text-indigo-700 text-xl"></i>
                    </button>
                    <div id="form-cuti-container" class="hidden p-6 pt-4 space-y-4">
                        <form onsubmit="window.ajukanCuti(event)" class="space-y-4">
                            <div><label class="text-sm font-bold text-slate-600 mb-1 flex items-center"><i class="fa-regular fa-calendar-check text-indigo-500 w-5"></i> Mulai Tanggal</label><input type="date" id="cuti-mulai" class="border-2 border-slate-200 p-3 rounded-xl w-full bg-slate-50" required></div>
                            <div><label class="text-sm font-bold text-slate-600 mb-1 flex items-center"><i class="fa-regular fa-calendar-xmark text-rose-500 w-5"></i> Sampai Tanggal</label><input type="date" id="cuti-sampai" class="border-2 border-slate-200 p-3 rounded-xl w-full bg-slate-50" required></div>
                            <div><label class="text-sm font-bold text-slate-600 mb-1 flex items-center"><i class="fa-solid fa-pen-clip text-amber-500 w-5"></i> Keterangan Lengkap</label><textarea id="cuti-alasan" class="border-2 border-slate-200 p-3 rounded-xl w-full bg-slate-50 placeholder-slate-400" rows="3" placeholder="Jelaskan alasan cuti Anda..." required></textarea></div>
                            <button type="submit" class="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white py-4 rounded-xl font-black shadow-lg transform hover:-translate-y-1 transition text-lg mt-2">
                                <i class="fa-solid fa-paper-plane mr-2"></i> KIRIM PENGAJUAN
                            </button>
                        </form>
                    </div>
                </div>

                <div class="flex flex-col gap-4">
                    <button onclick="window.bukaModalIzin()" class="bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-600 p-5 rounded-xl font-black transition shadow-lg border border-slate-200 hover:border-orange-200 flex items-center justify-between group">
                        <span class="flex items-center"><i class="fa-solid fa-person-walking-arrow-right text-orange-500 mr-3 text-2xl group-hover:scale-110 transition"></i> Izin Keluar Lokasi</span>
                        <i class="fa-solid fa-arrow-right text-slate-300"></i>
                    </button>
                    <button onclick="window.bukaModalSusulan()" class="bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 p-5 rounded-xl font-black transition shadow-lg border border-slate-200 hover:border-blue-200 flex items-center justify-between group">
                        <span class="flex items-center"><i class="fa-solid fa-clock-rotate-left text-blue-500 mr-3 text-2xl group-hover:scale-110 transition"></i> Ajukan Presensi Susulan</span>
                        <i class="fa-solid fa-arrow-right text-slate-300"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    window.filterTabelHistori(); 
    window.jalankanJam();
    // Buka UI Presensi jika bukan hari libur
    if(opsiJabatan && !(isLiburPekanan || isTanggalMerah)) window.gantiUIAbsen(); 
}

window.bukaModalAbsenSiswa = function(kelas, mapel, jamTxt, dateStr) {
    const siswaKelas = (window.appState.anak || []).filter(a => a.kelas === kelas);
    let modal = document.getElementById('modal-absen-siswa');
    if (!modal) {
        modal = document.createElement('div'); modal.id = 'modal-absen-siswa';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center backdrop-blur-sm hidden p-4';
        document.body.appendChild(modal);
    }

    let tabelSiswa = '';
    if(siswaKelas.length === 0) {
        tabelSiswa = `<div class="p-6 text-center text-red-500 font-bold bg-red-50 rounded-xl">Belum ada siswa yang terdaftar di ${kelas}.</div>`;
    } else {
        tabelSiswa = `
        <table class="w-full text-left text-sm mb-4">
            <thead class="bg-slate-100 text-slate-600 border-b-2">
                <tr><th class="p-3">Nama Siswa</th><th class="p-3 text-center">Hadir</th><th class="p-3 text-center">Izin</th><th class="p-3 text-center">Sakit</th><th class="p-3 text-center">Alpa</th></tr>
            </thead>
            <tbody>
                ${siswaKelas.map(s => {
                    let st = 'Hadir'; // default
                    const as = window.rawHistoriSiswa.find(x => x.tanggal === dateStr && x.kelas === kelas && x.jamTxt === jamTxt);
                    if (as && as.detailSiswa) {
                        const rec = as.detailSiswa.find(x => x.idSiswa === s.id);
                        if (rec) st = rec.status;
                    }
                    return `
                    <tr class="border-b hover:bg-slate-50">
                        <td class="p-3 font-bold text-slate-700">${s.nama}</td>
                        <td class="p-3 text-center"><input type="radio" name="abs-${s.id}" value="Hadir" ${st==='Hadir'?'checked':''} class="w-4 h-4 text-emerald-500 cursor-pointer"></td>
                        <td class="p-3 text-center"><input type="radio" name="abs-${s.id}" value="Izin" ${st==='Izin'?'checked':''} class="w-4 h-4 text-blue-500 cursor-pointer"></td>
                        <td class="p-3 text-center"><input type="radio" name="abs-${s.id}" value="Sakit" ${st==='Sakit'?'checked':''} class="w-4 h-4 text-orange-500 cursor-pointer"></td>
                        <td class="p-3 text-center"><input type="radio" name="abs-${s.id}" value="Alpa" ${st==='Alpa'?'checked':''} class="w-4 h-4 text-red-500 cursor-pointer"></td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    }

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 md:p-8 flex flex-col max-h-[90vh] animate-slide-up border-t-4 border-indigo-500">
            <div class="flex justify-between items-start mb-4 border-b pb-4">
                <div><h3 class="text-2xl font-black text-indigo-800"><i class="fa-solid fa-users-viewfinder mr-2"></i> Presensi Siswa</h3><p class="text-sm font-bold text-slate-500 mt-1">${kelas} | ${mapel} | ${jamTxt}</p></div>
                <button onclick="document.getElementById('modal-absen-siswa').classList.add('hidden'); window.navigate('absensi');" class="text-red-500 hover:text-red-700 text-3xl font-bold bg-red-50 w-10 h-10 rounded-full flex items-center justify-center transition"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">${tabelSiswa}</div>
            <div class="mt-6 border-t pt-4">
                <button onclick="window.simpanAbsenSiswa(event, '${kelas}', '${mapel}', '${jamTxt}', '${dateStr}')" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black shadow-lg transition text-lg transform hover:-translate-y-1"><i class="fa-solid fa-cloud-arrow-up mr-2"></i> Simpan Absen Siswa</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.simpanAbsenSiswa = async function(event, kelas, mapel, jamTxt, dateStr) {
    const btn = event.target;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...'; btn.disabled = true;
    
    const siswaKelas = (window.appState.anak || []).filter(a => a.kelas === kelas);
    let rekapan = [];
    siswaKelas.forEach(s => { 
        const rad = document.querySelector(`input[name="abs-${s.id}"]:checked`); 
        if(rad) rekapan.push({ idSiswa: s.id, namaSiswa: s.nama, status: rad.value }); 
    });
    
    const data = { 
        tanggal: dateStr, kelas: kelas, mapel: mapel, jamTxt: jamTxt, 
        idGuru: window.currentUser.id, namaGuru: window.currentUser.nama, 
        detailSiswa: rekapan, updatedAt: new Date().toISOString() 
    };
    
    try { 
        // Cek apakah data sudah ada sebelumnya
        const qCek = query(collection(db, "AbsensiSiswa"), where("tanggal", "==", dateStr), where("kelas", "==", kelas), where("jamTxt", "==", jamTxt));
        const snap = await getDocs(qCek);
        
        if (!snap.empty) {
            // Jika ada, cukup Update agar tidak dobel
            await updateDoc(doc(db, "AbsensiSiswa", snap.docs[0].id), data);
        } else {
            // Jika belum ada, buat baru
            data.createdAt = new Date().toISOString();
            await addDoc(collection(db, "AbsensiSiswa"), data); 
        }
        
        alert("Presensi siswa Selesai!"); 
        document.getElementById('modal-absen-siswa').classList.add('hidden'); 
        window.navigate('absensi'); 
    } catch(e) { 
        alert("Gagal merekam."); btn.innerHTML = 'Simpan Absen Siswa'; btn.disabled = false; 
    }
};

// ================= FUNGSI WIDGET DASBOR (PERBAIKAN INDEX FIRESTORE) =================
window.loadDashboardKehadiran = async function() {
    const widget = document.getElementById('dashboard-absen-widget');
    if(!widget) return;
    
    if(!window.getLocalISOString) {
        window.getLocalISOString = function() {
            const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };
    }
    const todayISO = window.getLocalISOString();
    
    try {
        const q1 = query(collection(db, "Absensi"), where("tanggal", "==", todayISO));
        const snap1 = await getDocs(q1);
        let absenGuru = []; 
        snap1.forEach(d => {
            const data = d.data();
            if(data.tipe === 'Kelas' || data.tipe === 'Inval') absenGuru.push(data);
        });
        
        const q2 = query(collection(db, "AbsensiSiswa"), where("tanggal", "==", todayISO));
        const snap2 = await getDocs(q2);
        let absenSiswa = []; snap2.forEach(d => absenSiswa.push(d.data()));
        
        const daftarKelas = (window.appState.lembaga[0]?.daftarKelas || '').split(',').map(k => k.trim()).filter(k => k);
        
        let html = `<table class="w-full text-left text-sm"><thead class="bg-indigo-50 text-indigo-800 border-b"><tr><th class="p-4 rounded-tl-xl w-32">Kelas Ruang</th><th class="p-4">Guru yang Mengajar Hari Ini</th><th class="p-4 rounded-tr-xl text-center">Kehadiran Siswa</th></tr></thead><tbody>`;
        
        if(daftarKelas.length === 0) {
            html += `<tr><td colspan="3" class="p-6 text-center text-slate-500 font-medium">Belum ada kelas terdaftar di menu Lembaga.</td></tr>`;
        } else {
            daftarKelas.forEach(k => {
                const guruKelasIni = absenGuru.filter(a => a.kelas === k);
                const listGuru = guruKelasIni.map(g => `<span class="inline-block bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-[10px] m-0.5 font-bold border border-blue-200">${g.namaGuru} ${g.status==='Inval'?'<span class="text-orange-600">(Inval)</span>':''} <span class="opacity-50 mx-1">|</span> ${g.mapel}</span>`).join('');
                
                const rekamSiswa = absenSiswa.filter(a => a.kelas === k);
                let setHadir = new Set(); let setTotal = new Set();
                rekamSiswa.forEach(rekam => {
                    (rekam.detailSiswa || []).forEach(ds => {
                        setTotal.add(ds.idSiswa);
                        if(ds.status === 'Hadir') setHadir.add(ds.idSiswa);
                    });
                });
                
                html += `
                <tr class="border-b hover:bg-slate-50 transition duration-200">
                    <td class="p-4 font-black text-slate-700">${k}</td>
                    <td class="p-4 leading-relaxed">${listGuru || '<span class="text-slate-400 text-xs italic font-medium">Belum ada kelas yang dimulai</span>'}</td>
                    <td class="p-4 text-center font-black ${setHadir.size === setTotal.size && setTotal.size > 0 ? 'text-emerald-600' : 'text-orange-500'}">${setTotal.size > 0 ? `${setHadir.size} dari ${setTotal.size} Anak` : '-'}</td>
                </tr>`;
            });
        }
        html += `</tbody></table>`;
        widget.innerHTML = html;
    } catch(e) {
        widget.innerHTML = '<div class="text-center text-red-500 p-6 font-bold"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Gagal memuat data kehadiran.</div>';
    }
};

// ==========================================
// MESIN EKSPOR & IMPOR CSV MULTI-DATA
// ==========================================
window.eksporDataCSV = function(stateKey, fileName) {
    const data = window.appState[stateKey] || [];
    if (data.length === 0) return alert("Tidak ada data untuk diekspor.");
    const separator = ';';
    
    let headersSet = new Set();
    data.forEach(item => Object.keys(item).forEach(k => headersSet.add(k)));
    const headers = Array.from(headersSet).filter(h => h !== 'id'); 
    
    let csvContent = "\uFEFF" + headers.join(separator) + "\n";
    data.forEach(row => {
        let rowData = headers.map(header => {
            let cell = row[header];
            if (typeof cell === 'object' && cell !== null) cell = JSON.stringify(cell);
            if (cell === undefined || cell === null) cell = "";
            return `"${String(cell).replace(/"/g, '""')}"`;
        });
        csvContent += rowData.join(separator) + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName + ".csv");
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
};

window.imporDataCSV = function(event, collectionName) {
    const file = event.target.files[0];
    if(!file) return;
    const btn = event.target.parentElement;
    const oriHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Proses...';
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
            if (lines.length < 2) {
                alert("File CSV kosong atau format salah.");
                btn.innerHTML = oriHTML; return;
            }
            
            const separator = lines[0].includes(';') ? ';' : ',';
            const headers = lines[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim());
            
            let count = 0;
            for (let i = 1; i < lines.length; i++) {
                let row = []; let insideQuotes = false; let currentCell = '';
                for (let char of lines[i]) {
                    if (char === '"') insideQuotes = !insideQuotes;
                    else if (char === separator && !insideQuotes) { row.push(currentCell.replace(/^"|"$/g, '').replace(/""/g, '"').trim()); currentCell = ''; }
                    else currentCell += char;
                }
                row.push(currentCell.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
                
                let data = {};
                let isValidRow = false;
                headers.forEach((header, index) => {
                    let val = row[index] || "";
                    try { if((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) val = JSON.parse(val); } catch(err){}
                    data[header] = val;
                    if(val !== "") isValidRow = true;
                });
                
                if(isValidRow) {
                    data.updatedAt = new Date().toISOString();
                    await addDoc(collection(db, collectionName), data);
                    count++;
                }
            }
            alert(`Selesai! Berhasil mengimpor ${count} baris data ke ${collectionName}.`);
        } catch (error) { 
            alert('Gagal mengimpor data! Pastikan format CSV valid hasil dari Ekspor sistem ini.'); 
        } finally {
            btn.innerHTML = oriHTML;
            event.target.value = '';
        }
    };
    reader.readAsText(file);
};

// ==========================================
// MODUL ANAK (DATA SISWA / SANTRI LENGKAP)
// ==========================================
export function renderHalamanAnak(container) {
    const profilLembaga = window.appState.lembaga[0] || {};
    const daftarKelas = profilLembaga.daftarKelas ? profilLembaga.daftarKelas.split(',').map(k => k.trim()) : [];
    
    let barisTabel = window.appState.anak.map((item, index) => `
        <tr class="border-b hover:bg-slate-50 transition">
            <td class="p-3 text-center">${index + 1}</td>
            <td class="p-3">
                <div class="font-bold text-slate-800">${item.nama || '-'}</div>
                <div class="text-[10px] text-slate-500">${item.nisn ? 'NISN: '+item.nisn : ''}</div>
            </td>
            <td class="p-3 text-center font-bold text-indigo-600">${item.kelas || '-'}</td>
            <td class="p-3 text-center text-sm">${item.jk || '-'}</td>
            <td class="p-3 text-center">
                <span class="px-2 py-1 rounded text-[10px] font-bold ${item.status === 'Reguler' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}">${item.status || '-'}</span>
            </td>
            <td class="p-3 flex justify-center space-x-2">
                <button onclick="window.editAnak('${item.id}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold transition"><i class="fa-solid fa-pen"></i> Edit</button>
                <button onclick="window.hapusAnak('${item.id}')" class="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold transition"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm mb-6 border-t-4 border-indigo-500">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 gap-4">
                <h2 class="text-xl font-black text-slate-800"><i class="fa-solid fa-user-graduate text-indigo-500 mr-2"></i> Formulir Data Lengkap Anak (Siswa/Santri)</h2>
                <div class="flex gap-2">
                    <button type="button" onclick="window.eksporDataCSV('anak', 'Data_Siswa')" class="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition shadow-sm flex items-center"><i class="fa-solid fa-download mr-2"></i> Ekspor CSV</button>
                    <label class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition shadow-sm cursor-pointer flex items-center"><i class="fa-solid fa-upload mr-2"></i> Impor CSV <input type="file" accept=".csv" onchange="window.imporDataCSV(event, 'Anak')" class="hidden"></label>
                </div>
            </div>
            
            <form id="form-anak" onsubmit="window.simpanAnak(event)">
                <input type="hidden" id="anak-id">
                
                <h3 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">1. Data Pribadi Siswa</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="md:col-span-2">
                        <label class="text-xs font-bold text-slate-600">Nama Lengkap</label>
                        <input type="text" id="anak-nama" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-bold bg-slate-50" required>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600">NISN / NIK</label>
                        <input type="text" id="anak-nisn" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-slate-50">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600">Jenis Kelamin</label>
                        <select id="anak-jk" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-slate-50" required>
                            <option value="">-- Pilih --</option><option value="Laki-Laki">Laki-Laki</option><option value="Perempuan">Perempuan</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600">Tempat Lahir</label>
                        <input type="text" id="anak-tempat-lahir" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-slate-50">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600">Tanggal Lahir</label>
                        <input type="date" id="anak-tgl-lahir" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-slate-50">
                    </div>
                </div>

                <h3 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">2. Status & Akademik</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label class="text-xs font-bold text-slate-600">Kelas Penempatan</label>
                        <select id="anak-kelas" class="border-2 border-indigo-200 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-bold text-indigo-700 bg-indigo-50" required>
                            <option value="">-- Pilih Kelas --</option>
                            ${daftarKelas.map(k => `<option value="${k}">${k}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600">Status Anak</label>
                        <select id="anak-status" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-slate-50" required>
                            <option value="">-- Pilih Status --</option><option value="Reguler">Reguler / Umum</option><option value="Yatim">Yatim</option><option value="Piatu">Piatu</option><option value="Yatim Piatu">Yatim Piatu</option><option value="Dhuafa">Dhuafa</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600">Status Domisili</label>
                        <select id="anak-asrama" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-slate-50" required>
                            <option value="">-- Pilih --</option><option value="Ya">Berasrama</option><option value="Tidak">Pulang Pergi</option>
                        </select>
                    </div>
                </div>

                <h3 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">3. Data Orang Tua / Wali</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="text-xs font-bold text-slate-600">Nama Wali / Orang Tua</label>
                        <input type="text" id="anak-wali" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-slate-50">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600">Nomor HP / WA Wali</label>
                        <input type="text" id="anak-nohp-wali" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-slate-50">
                    </div>
                    <div class="md:col-span-2">
                        <label class="text-xs font-bold text-slate-600">Alamat Lengkap Tempat Tinggal</label>
                        <textarea id="anak-alamat" rows="2" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-slate-50"></textarea>
                    </div>
                </div>

                <div class="flex space-x-3 pt-4 border-t">
                    <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black shadow-lg transition transform hover:-translate-y-0.5"><i class="fa-solid fa-save mr-2"></i> Simpan Data Siswa</button>
                    <button type="button" onclick="document.getElementById('form-anak').reset(); document.getElementById('anak-id').value='';" class="bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hidden hover:bg-slate-300 transition" id="btn-batal-anak">Batal Edit</button>
                </div>
            </form>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-slate-600 border-b-2">
                    <tr><th class="p-4 text-center w-12">No</th><th class="p-4">Nama Siswa & NISN</th><th class="p-4 text-center">Kelas</th><th class="p-4 text-center">L/P</th><th class="p-4 text-center">Status</th><th class="p-4 text-center">Aksi</th></tr>
                </thead>
                <tbody>${barisTabel || '<tr><td colspan="6" class="text-center p-8 text-slate-400 font-medium">Belum ada data siswa terdaftar</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

window.simpanAnak = async function(e) {
    e.preventDefault();
    const id = document.getElementById('anak-id').value;
    const data = {
        nama: document.getElementById('anak-nama').value,
        nisn: document.getElementById('anak-nisn').value,
        jk: document.getElementById('anak-jk').value,
        tempatLahir: document.getElementById('anak-tempat-lahir').value,
        tglLahir: document.getElementById('anak-tgl-lahir').value,
        kelas: document.getElementById('anak-kelas').value,
        status: document.getElementById('anak-status').value,
        asrama: document.getElementById('anak-asrama').value,
        wali: document.getElementById('anak-wali').value,
        noHpWali: document.getElementById('anak-nohp-wali').value,
        alamat: document.getElementById('anak-alamat').value
    };

    try {
        if (id) await updateDoc(doc(db, "Anak", id), data);
        else await addDoc(collection(db, "Anak"), data);
        
        document.getElementById('form-anak').reset();
        document.getElementById('anak-id').value = '';
        document.getElementById('btn-batal-anak').classList.add('hidden');
    } catch (err) { alert("Gagal menyimpan data!"); }
};

window.editAnak = function(id) {
    const item = window.appState.anak.find(x => x.id === id);
    if (item) {
        document.getElementById('anak-id').value = item.id;
        document.getElementById('anak-nama').value = item.nama || '';
        document.getElementById('anak-nisn').value = item.nisn || '';
        document.getElementById('anak-jk').value = item.jk || '';
        document.getElementById('anak-tempat-lahir').value = item.tempatLahir || '';
        document.getElementById('anak-tgl-lahir').value = item.tglLahir || '';
        document.getElementById('anak-kelas').value = item.kelas || '';
        document.getElementById('anak-status').value = item.status || '';
        document.getElementById('anak-asrama').value = item.asrama || '';
        document.getElementById('anak-wali').value = item.wali || '';
        document.getElementById('anak-nohp-wali').value = item.noHpWali || '';
        document.getElementById('anak-alamat').value = item.alamat || '';
        
        document.getElementById('btn-batal-anak').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.hapusAnak = async function(id) {
    if (confirm("Yakin ingin menghapus permanen data siswa ini?")) {
        try { await deleteDoc(doc(db, "Anak", id)); } catch (err) { alert("Gagal!"); }
    }
};

// =================================================================
// MODUL PENGATURAN HAK AKSES & WEWENANG MENU 
// =================================================================
window.tempWewenangMatrix = {};

window.bukaModalWewenang = function() {
    const profilLembaga = window.appState.lembaga[0] || {};
    if (!profilLembaga.id) return alert("Simpan Konfigurasi Lembaga terlebih dahulu sebelum mengatur wewenang!");

    const daftarJabatan = profilLembaga.daftarJabatan ? profilLembaga.daftarJabatan.split(',').map(j => j.trim()).filter(j => j) : [];
    if (daftarJabatan.length === 0) return alert("Daftar Jabatan masih kosong! Harap isi di pengaturan lembaga.");

    // Tarik data Wewenang yang sudah tersimpan (jika ada) ke variabel temporary
    window.tempWewenangMatrix = profilLembaga.wewenangMatrix ? JSON.parse(JSON.stringify(profilLembaga.wewenangMatrix)) : {};
    
    let modal = document.getElementById('modal-wewenang');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-wewenang';
        modal.className = 'fixed inset-0 bg-slate-900 bg-opacity-50 z-[70] flex items-center justify-center backdrop-blur-sm hidden';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 border-t-4 border-indigo-500 transform transition-all relative flex flex-col max-h-[90vh]">
            <div class="flex justify-between items-center mb-4 border-b pb-3">
                <h3 class="text-xl font-black text-slate-800"><i class="fa-solid fa-user-shield text-indigo-500 mr-2"></i> Pengaturan Wewenang Akses Menu</h3>
                <button onclick="document.getElementById('modal-wewenang').classList.add('hidden')" class="text-red-500 hover:text-red-700 text-2xl font-bold"><i class="fa-solid fa-times"></i></button>
            </div>
            
            <div class="flex flex-col md:flex-row flex-1 overflow-hidden gap-4 mt-2">
                <div class="w-full md:w-1/3 flex flex-col border-r pr-2 overflow-y-auto custom-scrollbar">
                    <label class="text-sm font-bold text-slate-500 mb-3 bg-slate-100 p-2 rounded text-center">1. Pilih Jabatan</label>
                    <div class="flex flex-col gap-2" id="wewenang-jabatan-list">
                        ${daftarJabatan.map(j => `<button type="button" onclick="window.pilihJabatanWewenang('${j}')" id="btn-jab-${j.replace(/\s+/g, '-')}" class="text-left px-4 py-3 rounded-lg border font-bold hover:bg-indigo-50 transition wewenang-jab-btn text-slate-700">${j}</button>`).join('')}
                    </div>
                </div>
                <div class="w-full md:w-2/3 flex flex-col overflow-y-auto custom-scrollbar pl-2">
                    <label class="text-sm font-bold text-slate-500 mb-3 bg-slate-100 p-2 rounded text-center" id="label-menu-wewenang">2. Centang Menu yang Bisa Diakses</label>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="wewenang-menu-list">
                        </div>
                </div>
            </div>

            <div class="mt-6 border-t pt-4 flex justify-end">
                <button onclick="window.simpanWewenangMatrix()" id="btn-simpan-wewenang" class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black shadow-lg transition"><i class="fa-solid fa-save mr-2"></i> Simpan Matriks Wewenang</button>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    // Pilih jabatan pertama secara otomatis saat terbuka
    window.pilihJabatanWewenang(daftarJabatan[0]); 
};

window.pilihJabatanWewenang = function(jabatan) {
    // Reset warna tombol sebelah kiri
    const allBtns = document.querySelectorAll('.wewenang-jab-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('bg-indigo-500', 'text-white', 'border-indigo-600');
        btn.classList.add('bg-white', 'text-slate-700');
    });
    
    // Beri warna aktif pada tombol yang diklik
    const activeBtn = document.getElementById('btn-jab-' + jabatan.replace(/\s+/g, '-'));
    if (activeBtn) {
        activeBtn.classList.remove('bg-white', 'text-slate-700');
        activeBtn.classList.add('bg-indigo-500', 'text-white', 'border-indigo-600');
    }

    document.getElementById('label-menu-wewenang').innerHTML = `2. Hak Akses Menu untuk: <span class="text-indigo-600 font-black">${jabatan}</span>`;

    // Buat daftar Checkbox berdasarkan `MENU_ITEMS` dari router.js
    const menus = window.MENU_ITEMS_GLOBAL || [];
    const activeMenus = window.tempWewenangMatrix[jabatan] || [];
    
    const listHTML = menus.map(m => {
        const isChecked = activeMenus.includes(m.id) ? 'checked' : '';
        // Dashboard dikunci mati agar semua orang pasti bisa melihat halaman awal
        const isDashboard = m.id === 'dashboard' ? 'checked disabled title="Dashboard wajib untuk semua jabatan"' : isChecked; 
        
        return `
        <label class="flex items-center p-3 border rounded-xl cursor-pointer hover:bg-indigo-50 transition border-slate-200">
            <input type="checkbox" onchange="window.toggleWewenangMenu('${jabatan}', '${m.id}', this.checked)" class="w-5 h-5 text-indigo-600 mr-3 rounded accent-indigo-600" ${isDashboard}>
            <span class="font-bold text-slate-700"><i class="fa-solid ${m.icon} w-6 text-slate-400"></i> ${m.label}</span>
        </label>
        `;
    }).join('');

    document.getElementById('wewenang-menu-list').innerHTML = listHTML;
};

window.toggleWewenangMenu = function(jabatan, menuId, isChecked) {
    if (!window.tempWewenangMatrix[jabatan]) window.tempWewenangMatrix[jabatan] = [];
    
    if (isChecked) {
        if (!window.tempWewenangMatrix[jabatan].includes(menuId)) window.tempWewenangMatrix[jabatan].push(menuId);
    } else {
        window.tempWewenangMatrix[jabatan] = window.tempWewenangMatrix[jabatan].filter(id => id !== menuId);
    }
};

window.simpanWewenangMatrix = async function() {
    const profilLembaga = window.appState.lembaga[0];
    const btn = document.getElementById('btn-simpan-wewenang');
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...';
    btn.disabled = true;

    try {
        // Simpan Object Matrix ke Firestore Dokumen Lembaga
        await updateDoc(doc(db, "Lembaga", profilLembaga.id), {
            wewenangMatrix: window.tempWewenangMatrix
        });
        alert("Wewenang berhasil disimpan! Halaman akan dimuat ulang agar menu navigasi dapat disesuaikan otomatis.");
        location.reload(); 
    } catch (error) {
        alert("Gagal menyimpan wewenang! Pastikan internet stabil.");
        btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Matriks Wewenang';
        btn.disabled = false;
    }
};