# CoreStay People — HR, Absensi & Payroll

Satu aplikasi Next.js + satu database Postgres dari **Vercel → Storage** (Neon). Tanpa akun lain, tanpa menyalin kunci.

## Pasang (sekali saja)
1. Unggah proyek ke GitHub, impor di Vercel, Deploy.
2. Vercel → proyek → **Storage → Create Database** (Postgres) → **Connect** ke proyek ini. Variabel `DATABASE_URL` terisi otomatis.
3. **Deployments → Redeploy**.
4. Buka alamat aplikasi → **Setup awal**: buat password HRD → klik **Buat database & masuk**.
5. **Pengaturan → Daftar Hotel Awal**: isi nama + lokasi hotel → **Daftarkan hotel & buat QR** → **Cetak poster** → tempel di pos security.
6. **Employee Master**: tambah karyawan, atur **PIN absen** (4–8 digit) di tabel karyawan.

Lupa password? Neon Console (Storage → Open in Neon) → SQL: `delete from hr_auth;` lalu buka aplikasi, buat password baru.
Pengembangan lokal: `vercel link && vercel env pull .env.local && npm install && npm run dev`.

## Alur absensi
Karyawan scan QR di pos security → `/absen` → ID + PIN → **Absen Masuk / Pulang** (satu tombol).
- Server menolak bila: QR salah/diganti, QR hotel lain, PIN salah (terkunci 15 menit setelah 5×), akurasi GPS > batas (default 100 m), di luar radius hotel, atau tidak ada selfie dari kamera.
- **Selfie & lokasi hanya untuk validasi. Foto tidak disimpan** (hanya jam, jarak, dan akurasi GPS yang tercatat).
- Hasil langsung masuk **Absensi → Rekap** (hadir, telat, sakit/izin/cuti, alpa, lembur). Tidak ada validasi/persetujuan/closing absensi.
- **Payroll** membaca rekap otomatis: potongan alpa (gaji pokok ÷ 26 per hari), potongan telat (Rp/menit, **Pengaturan**, default 0), dan lembur.
- Sakit/izin/cuti/koreksi: input manual di Absensi → Harian. Jadwal shift bersifat opsional (dipakai untuk shift, lembur, dan alpa otomatis).

## Backup
**Pengaturan → Database & Backup**: Buat/perbarui database, **Download backup**, **Restore backup** (mengganti seluruh data; menerima juga file backup lama dari versi yang menyimpan data di browser).

## Keamanan
Seluruh data HRD dilindungi password HRD (cookie sesi 12 jam). Satu-satunya endpoint tanpa login adalah `/api/absen` (khusus absen karyawan, perlu QR + ID + PIN). Payroll belum menghitung PPh 21; tarif BPJS default — verifikasi sebelum dipakai nyata.
