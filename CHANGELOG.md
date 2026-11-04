# Riwayat versi

Aturan: setiap update menaikkan versi di `lib/version.ts` dan `package.json`, lalu dicatat di sini.

## 0.8.2
- Dihapus: menu dan halaman **Compensation Master**. Isian gaji per karyawan (gaji pokok, medical, makan, PTKP, asuransi, biaya lain, dan nominal komponen tambahan) dipindah ke halaman **Payroll → Gaji karyawan (input manual)**; fungsinya sama, tidak ada data yang hilang.

## 0.8.1
- Dihapus: **Posisi Master Payroll** di Employee Master (kolom, isian saat tambah karyawan, dan penghitung "terisi X/N"). Master Payroll kini berdiri sendiri sebagai model biaya per posisi (sinkron dengan Hotel Budget); gaji tiap karyawan hanya dari Compensation Master. Kaitan posisi lama pada data karyawan diabaikan.

## 0.8.0
- **Jadwal bulanan jadi patokan absen.** Setelah login di halaman absen, jadwal hari itu langsung tampil (shift + jam). Absen masuk **ditolak** bila: belum dijadwalkan, jadwal Libur, HRD sudah mencatat Sakit/Izin/Cuti/Alpa hari itu, shift belum dibuka (default 60 menit sebelum mulai), atau shift sudah berakhir. Pemeriksaan dilakukan di server; kamera/GPS baru dinyalakan bila boleh absen. Absen pulang tidak dibatasi. Shift malam melewati tengah malam tetap dikenali.
- Pengaturan baru: **Absen wajib sesuai jadwal** (Ya/Tidak; Tidak = shift otomatis dari jam absen seperti 0.6.1) dan **Absen masuk dibuka (menit sebelum shift)**.
- **Alpa tidak lagi otomatis.** Hari terjadwal tanpa scan hanya diberi penanda (cincin kuning di Daftar Bulanan, "tanpa scan" di Rekap/Payroll); Alpa hanya dari input HRD. Tombol baru **Tandai tanpa scan → Alpa** (dengan konfirmasi) untuk menandai sekaligus secara manual.

## 0.7.1
- Daftar Bulanan: **tombol 🧹 Hapus tidak berfungsi** (pengisian berhenti bila kuas kosong) — diperbaiki.
- Kuas awal kini shift pertama yang ada (sebelumnya dikunci "Pagi", sehingga klik tidak berefek bila shift itu tidak ada). Tampilan "Aktif: …" dan penanda tombol terpilih.
- Sakit/Izin/Cuti/Alpa langsung tampil di sel saat diklik (sebelumnya menunggu server), ada indikator "Menyimpan…", dan data dikembalikan bila server menolak.

## 0.7.0
- **Daftar Bulanan dirombak:** input memakai "kuas" (pilih Pagi / Siang / Malam / Libur / Sakit / Izin / Cuti / Alpa / Hapus, lalu klik atau geser tanggal), tombol Isi satu bulan per karyawan, dan Libur tiap Minggu. Tab departemen dengan jumlah karyawan; departemen kosong tidak lagi jadi pilihan awal.
- **Sinkron dengan absensi:** sel menampilkan hasil scan (titik hijau tepat waktu, kuning telat, biru belum pulang, merah lupa pulang), alpa otomatis (merah bergaris), dan hadir tanpa jadwal (Hdr). Kolom H/T/S/I/C/A di kanan memakai perhitungan yang sama dengan Rekap & Payroll. Hari ini dan akhir pekan diberi warna.
- API baru untuk mengisi banyak tanggal sekaligus (PUT /api/att) sehingga mengisi satu bulan tidak lambat.

## 0.6.1
- **Absen sinkron dengan Pengaturan → Shift Kerja.** Dulu karyawan tanpa jadwal selalu dihitung dari jam masuk default hotel (08:00), tidak peduli shift Pagi/Siang/Malam. Sekarang: ada jadwal → pakai jadwal; tanpa jadwal → shift otomatis = shift yang jam mulainya paling dekat dengan jam absen (tertulis "(otomatis)"); belum ada shift sama sekali → jam default hotel. Telat dan lembur dihitung dari shift itu.
- Shift malam yang melewati tengah malam: absen setelah 00:00 dicatat ke tanggal kerja shift tersebut (telat dihitung dari 23:00 hari sebelumnya).
- Shift yang dipakai tersimpan di setiap catatan absensi (kolom Jadwal masuk di Harian). Kolom baru `shift`, `shift_start` dibuat otomatis di database; tombol Buat/perbarui database juga membuatnya.
- Absen ganda pada hari/shift yang sama kini ditolak dengan pesan jelas (sebelumnya diam-diam tidak tersimpan).

## 0.6.0
- **ID karyawan = kode departemen + urutan** di departemen itu (FO-0001, FO-0002, HK-0001, …). Kode standar mengikuti Master Payroll (FO, HK, FB, MOD, AG, FN, HR, SEC, ENG, POMEC, SM); departemen lain memakai singkatan nama; kode bisa diubah di Pengaturan → Penomoran ID Karyawan. Ada tombol opsional **Nomori ulang semua ID sesuai departemen** (ID yang sudah ada tidak berubah otomatis).
- **Keterlambatan ditampilkan dalam jam dan menit** (683 menit → "11 jam 23 mnt") di Absensi (Harian, Rekap, CSV), Payroll, slip, dan halaman absen karyawan.
- Absensi → Harian: kolom **Jadwal masuk** (shift atau jam default hotel) agar terlihat dasar perhitungan telat.

## 0.5.0
- Payroll: bagian **Rekap absensi → Payroll** (otomatis dari absensi periode berjalan): hadir, telat, sakit/izin/cuti, alpa, jam kerja, lembur (Rp masuk ke Pembayaran), saran potongan, potongan terisi. Tombol **Pakai saran** per karyawan dan **Isi saran potongan (yang kosong)**; potongan tetap dikonfirmasi HRD. Peringatan untuk absen belum pulang dan alpa dari jadwal tanpa scan.
- Payroll: **Preview Laporan Salary** per departemen (subtotal + grand total, filter hotel, kolom tanda tangan) dengan **Cetak / Simpan PDF** (A4 landscape lewat dialog cetak browser).
- Perbaikan: tombol cetak slip gaji sebelumnya mencetak halaman kosong; kini mencetak slip saja.
- Master Payroll Hotel Budget (file terbaru) identik dengan versi sebelumnya: tidak ada perubahan format.

## 0.4.1
- Payroll: tombol **Kosongkan isi Payroll** (konfirmasi ketik KOSONGKAN). Menghapus Master Payroll, gaji per karyawan, potongan manual, koreksi, komponen tambahan, serta status approval/kunci dan snapshot semua periode. Data karyawan, PIN, dan absensi tidak dihapus.

## 0.4.0
- **Master Payroll** mengikuti menu Master Payroll di Hotel Budget: satu baris = satu posisi × jumlah staf (kolom "No. staf" = jumlah staf, tombol ▲▼ menambah/mengurangi), kode departemen sama (FO, HK, FB, MOD, AG, FN, HR, SEC, ENG, POMEC, SM), rumus identik (PKP dibulatkan ke bawah ribuan, biaya jabatan maks Rp 6 juta/tahun), GRAND TOTAL, filter hotel.
- **Sinkronisasi dari Hotel Budget** (Pengaturan → Integrasi · Sync): impor file Draft (.json, lengkap dengan PTKP) atau Excel (.xlsx, sheet "Payroll & Expenses"). Ada pratinjau (Baru / Diperbarui / Sama), impor ulang tidak menggandakan baris, baris yang tidak ada di file tidak dihapus.
- Employee Master: karyawan dikaitkan ke posisi Master Payroll (terisi X/N staf); gaji kosong = mengikuti posisi, isi hanya bila berbeda. Compensation Master menampilkan angka posisi sebagai acuan.
- Memerlukan paket `xlsx` (jalankan `npm install` sekali).

## 0.3.1
- Potongan absensi (alpa/telat) tidak lagi otomatis: HRD mengisinya **manual** per karyawan per bulan di Payroll. Rekap absensi hanya memberi saran (dibatasi maks. gaji pokok). Memperbaiki potongan melebihi gaji (31 hari alpa dari jadwal tanpa scan).

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
