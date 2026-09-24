# AGENTS.md

Catatan kerja untuk repositori ini.

## Bentuk proyek

Situs statis tanpa build dan tanpa dependensi. Berkas inti:

- `index.html` — struktur halaman
- `styles.css` — tema, tata letak, gaya cetak
- `prayer-times.js` — mesin hisab astronomis (Meeus/PrayTimes) + kalender Hijriah
- `app.js` — logika dashboard, memakai `window.PrayerTimes`

Urutan pemuatan di `index.html`: `prayer-times.js` lalu `app.js`. `app.js` menganggap
`window.PrayerTimes` sudah ada.

## Menjalankan dan menguji

```bash
python3 -m http.server 8000   # lalu buka http://localhost:8000
```

Tidak ada test runner di repositori. Pemeriksaan cepat:

```bash
node --check app.js && node --check prayer-times.js
```

## Hal yang mudah terlewat

- **API publik** ada di `window.JadwalSholat` (`app.js` bagian akhir): `settings()`, `apply(patch)`,
  `recompute()`, `openSettings()`, `openMonthly()`, dan fungsi galeri. Tidak ada tolok ukur waktu
  sholat di API ini; nilai tampil dibaca dari kartu `[data-card-time]`. Untuk angka mentah pakai
  `window.PrayerTimes.calculate(...)`.
- **Kunci metode hisab huruf kecil**: `kemenag`, `mwl`, `isna`, `egypt`, `makkah` (Umm al-Qura),
  `karachi`, `tehran`, `jafari`. Penulisan lain akan diam-diam jatuh ke `kemenag`.
- **Kunci `localStorage`**: `jadwal-sholat-masjid/v1`.
- **Selektor modal**: `[data-modal-settings]` dan `[data-modal-monthly]`, tombol simpan `[data-save]`.
- **Tata letak galeri** menumpang baris `.strip` (jadwal sekunder | galeri | kiblat). Galeri sengaja
  setinggi kartu sekunder agar tidak menambah tinggi halaman — pada TV 1080p sisa ruang hanya
  sekitar 40px. Jangan menaikkan `min-height` bawaan tanpa mengukur ulang.
- Bila menambah aturan `grid-column`/`grid-row` di satu breakpoint, batalkan di breakpoint yang
  lebih kecil, jika tidak akan muncul kolom implisit yang menghimpit kolom lain.

## Referensi ketelitian hisab

Hasil sudah dicocokkan dengan `api.aladhan.com` (mis. `?method=20` untuk Kemenag) dan cocok persis
untuk Subuh/Ashar/Maghrib/Isya. Dzuhur berbeda ~2 menit karena ihtiyati Kemenag — itu disengaja.
