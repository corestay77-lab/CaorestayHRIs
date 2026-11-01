# Riwayat versi

Aturan: setiap update menaikkan versi di `lib/version.ts` dan `package.json`, lalu dicatat di sini.

## 0.3.0
- Payroll mengikuti model tabel "Data karyawan dan perhitungan biaya": No. staf, departemen, jabatan, gaji pokok, medical, makan, THR provisi (gaji ÷ 12), Jamsostek perusahaan 4,89% & staf 2%, gross income, PTKP/tahun, biaya jabatan, PKP, PPh/tahun & /bln (tarif progresif), asuransi perusahaan, biaya lain, TOTAL BIAYA PERUSAHAAN, GRAND TOTAL, tombol + Tambah karyawan / posisi, ▲▼ urutan, Hapus. Angka yang belum diketahui dikosongkan (tidak ada nominal otomatis).
- Bagian "Pembayaran bulan ini": gaji bersih = gaji + medical + makan + lembur + tunjangan lain − Jamsostek staf − PPh 21 − potongan absensi (alpa/telat) − potongan lain ± koreksi.
- Pengaturan: persentase Jamsostek perusahaan/staf. BPJS Kesehatan/JP lama dan kolom Tunjangan, Potongan tetap, THR faktor tidak lagi dipakai di perhitungan.

## 0.2.1
- Jam absensi kini mengikuti **zona waktu lokasi hotel** (WIB / WITA / WIT), bukan Jakarta tetap. Zona diatur per hotel (otomatis terisi dari zona waktu perangkat saat mendaftarkan hotel) dengan default perusahaan di Pengaturan. Jam dihitung oleh server, jadi jam HP karyawan tidak berpengaruh.
- Halaman absen menampilkan jam hotel + zona (mis. 08:03 WITA).

## 0.2.0
Gabungan semua perubahan sejak 0.1.0:
- Absensi disederhanakan: scan QR + ID + PIN → masuk Rekap otomatis → potongan otomatis ke Payroll (tanpa validasi/approval/closing absensi).
- Database pindah ke Vercel Storage (Neon Postgres); Supabase dihapus. Password HRD untuk melindungi data.
- Selfie & lokasi hanya untuk validasi (foto tidak disimpan). QR absen per hotel + poster untuk pos security.
- Pengaturan: Daftar Hotel Awal, Database & Backup (buat database, download, restore), Shift Kerja (3 utama + shift khusus).
- Absensi → Daftar Bulanan per departemen (shift/Libur/Sakit/Izin/Cuti/Alpa per tanggal).
- Perbaikan halaman absen: tombol & kamera, pencarian GPS lebih sabar, petunjuk lokasi presisi, mode validasi lokasi Ketat/Longgar.
- Pengaturan Payroll: parameter lembur & alpa, komponen tunjangan/potongan tambahan (nominal per karyawan di Compensation Master), rincian potongan di Payroll.
