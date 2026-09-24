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
  `recompute()`, `openSettings()`, `openMonthly()`, dan fungsi latar foto. Tidak ada tolok ukur waktu
  sholat di API ini; nilai tampil dibaca dari kartu `[data-card-time]`. Untuk angka mentah pakai
  `window.PrayerTimes.calculate(...)`.
- **Kunci metode hisab huruf kecil**: `kemenag`, `mwl`, `isna`, `egypt`, `makkah` (Umm al-Qura),
  `karachi`, `tehran`, `jafari`. Penulisan lain akan diam-diam jatuh ke `kemenag`.
- **Kunci `localStorage`**: `jadwal-sholat-masjid/v1`.
- **Selektor modal**: `[data-modal-settings]` dan `[data-modal-monthly]`, tombol simpan `[data-save]`.
- **Latar foto bukan panel.** Foto masjid dirender ke `.atmos__slides` sebagai
  `img.atmos__photo` yang menutupi seluruh layar (`position: fixed` lewat `.atmos`), lalu ditutup
  `.atmos__scrim`. `.atmos` memakai `pointer-events: none`, jadi jangan menaruh kontrol di sana —
  kontrol latar (titik + jeda) ada di `.latarbg` dalam `.masthead__meta`.
- **Peredupan latar** dikendalikan atribut `data-dim` pada `<html>` (`soft`/`medium`/`strong`);
  opasitasnya diatur di CSS, bukan lewat JS. Nilainya disetel dari setelan `galleryDim`.
- Bila menambah aturan `grid-column`/`grid-row` di satu breakpoint, batalkan di breakpoint yang
  lebih kecil, jika tidak akan muncul kolom implisit yang menghimpit kolom lain.

## Referensi ketelitian hisab

Hasil sudah dicocokkan dengan `api.aladhan.com` (mis. `?method=20` untuk Kemenag) dan cocok persis
untuk Subuh/Ashar/Maghrib/Isya. Dzuhur berbeda ~2 menit karena ihtiyati Kemenag — itu disengaja.
