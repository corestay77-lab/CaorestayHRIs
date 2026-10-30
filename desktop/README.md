# CoreStay People untuk Windows (.exe)

Jalankan di komputer **Windows** (Node.js 20+ terpasang), di folder proyek ini:

```
npm install
npm install -D electron electron-builder esbuild
npm run desktop:dist
```

Hasil di folder `dist-desktop/`:
- `CoreStay People Setup x.y.z.exe` — installer (ada pilihan folder & shortcut)
- `CoreStay People x.y.z.exe` — versi portable (tanpa instal)

Coba tanpa membuat installer: `npm run desktop:dev`.

Catatan
- Kunci Supabase dibaca dari `.env.local` saat build.
- Data (mode lokal) tersimpan di profil aplikasi pada komputer itu.
- Installer belum ditandatangani (code signing), jadi Windows SmartScreen bisa menampilkan peringatan "Windows protected your PC": pilih More info → Run anyway.
- Absen karyawan (selfie + GPS) dirancang untuk HP lewat /absen; versi desktop ditujukan untuk HRD.
