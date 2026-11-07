# CoreStay People — HR, Absensi & Payroll (multi-hotel)

Satu aplikasi Next.js + **satu database** Postgres dari **Vercel → Storage** (Neon). Tanpa akun lain, tanpa menyalin kunci.
Banyak hotel dalam satu database, tetapi **data tiap hotel terpisah** dan tiap hotel punya **login sendiri**; ada satu **admin pusat** yang melihat semua hotel.

## Pasang (sekali saja)
1. Unggah proyek ke GitHub, impor di Vercel, Deploy. Jalankan `npm install` bila memasang manual.
2. Vercel → proyek → **Storage → Create Database** (Postgres) → **Connect** ke proyek ini → **Deployments → Redeploy**.
3. Buka alamat aplikasi → **Setup awal**: buat password admin pusat (username `admin`) → **Buat database & masuk**.
4. **Semua Hotel & Login** → daftarkan hotel (nama, lokasi, zona waktu) beserta username & password login hotel itu.
5. Pilih hotel di bagian atas → **Organisasi & Hotel**: cetak **QR absen** dan tempel di pos security hotel tersebut.
6. **Payroll → Nama karyawan baru** (atau Employee Master): tambah karyawan; atur **PIN absen** di Employee Master; isi jadwal di **Absensi → Daftar Bulanan**.

**Upgrade dari versi satu-dokumen:** buka aplikasi → klik **Perbarui database**. Data lama dipertahankan dan dipecah per hotel; password lama menjadi login admin (username `admin`).
Lupa password admin? Neon Console → SQL: `delete from hr_user; delete from hr_auth;` lalu buka aplikasi dan jalankan **Setup awal** lagi (data hotel tidak terhapus). Login tiap hotel perlu dibuat ulang lewat **Semua Hotel → Reset login** (isi username & password). Lupa password hotel: admin pusat → Semua Hotel → Reset login.

## Multi-hotel
- **Login hotel** hanya melihat dan mengubah hotelnya sendiri (server menolak akses ke hotel lain). **Admin pusat** memilih hotel aktif di bagian atas, melihat ringkasan semua hotel, mendaftarkan hotel baru, mereset login, serta backup/restore.
- Setiap hotel punya: karyawan, jadwal, absensi, PIN, payroll & penguncian periode, Master Payroll, pengaturan, dan **QR absen sendiri**. ID karyawan (mis. FO-0001) hanya unik di dalam hotel.

## Alur absensi
Karyawan scan QR hotel → `/absen` → ID + PIN → jadwal hari itu tampil → **Absen Masuk / Pulang** (satu tombol).
- **Jadwal bulanan jadi patokan:** masuk hanya sesuai shift yang dijadwalkan (Libur / belum dijadwalkan / di luar jam shift ditolak). Bisa dimatikan di Pengaturan.
- Server menolak bila QR salah/diganti, PIN salah (terkunci 15 menit setelah 5×), akurasi GPS buruk, di luar radius hotel (mode Ketat), atau tanpa selfie. **Foto tidak disimpan.**
- Jam mengikuti zona waktu hotel. Hasil langsung masuk **Absensi → Rekap**. Alpa tidak otomatis; HRD menandainya sendiri.
- **Payroll** membaca lembur dari rekap; **potongan absensi diisi manual** (rekap memberi saran).

## Master Payroll & sinkron dengan Hotel Budget
Payroll → tabel karyawan (otomatis dari Employee Master) dan tabel **anggaran posisi** yang disinkronkan dari file Hotel Budget (**Pengaturan → Integrasi · CoreStay Sync**: Draft .json atau Excel .xlsx).

## Backup
Admin pusat: **Pengaturan → Database & Backup**: Buat/perbarui database, **Download backup** (semua hotel), **Restore backup** (mengganti seluruh isi database; menerima backup versi lama).

## Keamanan
Semua data dilindungi login (cookie sesi 12 jam). Satu-satunya endpoint tanpa login adalah `/api/absen` (khusus absen karyawan: QR + ID + PIN). PPh 21 mengikuti perhitungan Master Payroll; tarif Jamsostek dapat diatur di Pengaturan.
