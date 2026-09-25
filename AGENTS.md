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
- **Motif filigri girih sudah dihapus** atas permintaan pengguna. Jangan mengembalikan
  `.atmos__lattice` atau `--lattice-op`; latar hanya foto, aurora, butir, dan vignette.
- **Peredupan latar** dikendalikan atribut `data-dim` pada `<html>` (`soft`/`medium`/`strong`);
  opasitasnya diatur di CSS, bukan lewat JS. Nilainya disetel dari setelan `galleryDim`.
- Bila menambah aturan `grid-column`/`grid-row` di satu breakpoint, batalkan di breakpoint yang
  lebih kecil, jika tidak akan muncul kolom implisit yang menghimpit kolom lain.

## Susunan UI/UX (perombakan menyeluruh)

Titik temu DOM yang dipakai `app.js`:

- Rel waktu: `[data-cards]` berisi `li.stop[data-card="fajr|dhuhr|asr|maghrib|isha"]`, di dalamnya
  `[data-card-name]`, `[data-card-time]`, `[data-card-state]`, `[data-card-ar]`, `[data-card-fill]`.
  Kunci hentian memakai nama `fajr` (bukan `subuh`).
- Panel fokus: `[data-next-name]`, `[data-next-time]`, `[data-next-at]`, `[data-next-ar]`,
  `[data-next-count]`, `[data-next-status]`.
- Jam: `[data-clock]`, `[data-clock-sec]`, `[data-clock-big]`, `[data-clock-ampm]`,
  `[data-clockface-zone]`. Sufiks AM/PM berada di `[data-clock-ampm]`/`[data-clockface-zone]`,
  bukan di dalam `[data-clock-big]`.
- Pengaturan berkunci tab memakai `[data-tab]` + `[data-pane]`; pemilih nuansa `[data-theme-pick]`
  (`role="radio"`, dipilih ditandai `aria-checked="true"`). Daftar `<option>` tema ada di
  `<select data-in="theme">` yang tersembunyi — jangan dikosongkan, kalau tidak tema tersimpan hilang.
- Beberapa breakpoint berbeda sumbu: fokus menjadi satu kolom di bawah 980px, panel samping
  menumpuk di bawah rel pada 1200px. Uji tata letak harus memakai ambang yang sama per properti.

## Kontras dan warna teks

- Pakai `--ink-gold` untuk teks berwarna emas, dan `--gold-1/2/3` hanya untuk gradien/dekorasi.
  Tema fajar butuh `--ink-gold` yang jauh lebih gelap agar lolos 4,5:1.
- Jangan meredupkan kartu lewat `opacity` pada elemen; itu menurunkan kontras teks. Redupkan
  dengan mengganti warna teks ke `--txt-2`/`--txt-3`.
- `--txt-2`/`--txt-3` sudah dinaikkan agar teks kecil lolos 4,5:1 di ketiga tema; menurunkannya
  kembali akan menggagalkan uji kontras.
- Teks bergradien (`background-clip: text`) membuat `color` menjadi transparan, sehingga uji
  kontras berbasis `color` akan membaca nilai palsu. Judul masjid memakai `--ink-title`
  (terang di tema gelap, `#7d5416` di tema fajar) supaya tetap lolos ambang.
- Lencana pengumuman memakai `--ink-emerald` di atas `rgba(16,185,129,.16)`. Saat mengukur
  kontras, lapisan rgba tipis harus dikomposit dengan latar di bawahnya; kalau tidak,
  kontras terukur jauh dari kenyataan (pernah terbaca 1,66 padahal sebenarnya lolos).

## Bahasa visual (dipinjam dari `display.html`)

`index.html` dan `display.html` memakai kosakata visual yang sama, tetapi sistemnya berbeda:
`display.html` memakai Tailwind CDN dan mandiri, sedangkan `index.html` memakai token di
`styles.css` supaya tiga tema tetap hidup.

- Kaca: `--glass-a`/`--glass-b` (gradien 135°) dengan tepi putih transparan `--glass-edge`,
  `backdrop-filter: blur(16px)` — meniru `.glass-panel`/`.glass-card` display.
- Font: `Cinzel` (judul, tebal 700), `Plus Jakarta Sans` (badan), `Space Mono` (angka jam,
  tebal 700). Jangan turunkan bobot angka ke 300 — angka papan display selalu tebal.
- Aksen: emas `#eab308`/`#facc15` + zamrud `#10b981`; pendar `--glow` untuk kartu berjalan.
- Foto latar penuh layar adalah latar utama; `data-dim` bawaan `soft` agar foto terlihat jelas.
  Menaikkan peredupan ke `strong` akan menutupi foto.
- Jangan menaruh `card-surface` pada `.ticker__badge`: bayangan panelnya bentrok dengan lencana.
- Titik berdenyut lencana memakai pseudo-elemen `::before` karena `app.js` menimpa
  `textContent` lencana, sehingga markah tambahan di dalamnya akan terhapus.

## Uji yang dipakai saat perombakan (di luar repo, di `/tmp`)

Tidak ikut masuk repositori, tetapi berguna bila dijalankan lagi di lingkungan yang sama:
`contract_test.py` (40 pemeriksaan kontrak + kontras per tema), `display_test.py` (32),
`display_robust_test.py` (17), ditambah pembantu `cdp.py`. Semuanya memakai Chrome DevTools
Protocol. `contract_test.py` menerima URL dasar sebagai argumen; uji display masih menanam
`http://localhost:12000` di dalam berkasnya.

`contract_test.py` adalah jaring pengaman utama untuk perubahan gaya: ia memeriksa 73 titik temu
DOM, 19 isian pengaturan, isi kartu sholat, kiblat, busur matahari, galeri, modal, tata letak di
lima ukuran layar, dan kontras teks di ketiga tema. Jalankan sebelum dan sesudah mengubah
`styles.css` — semuanya harus tetap 40/40.

## Referensi ketelitian hisab

Hasil sudah dicocokkan dengan `api.aladhan.com` (mis. `?method=20` untuk Kemenag) dan cocok persis
untuk Subuh/Ashar/Maghrib/Isya. Dzuhur berbeda ~2 menit karena ihtiyati Kemenag — itu disengaja.

## Display TV (`display.html`)

- Berbagi mesin yang sama dengan dashboard: `prayer-times.js` dimuat lebih dulu, lalu skrip
  bawaan halaman. **Jangan** menduplikasi daftar kota, pasaran, atau utilitas zona waktu di sini;
  semuanya sudah diekspor dari `PrayerTimes` (`CITIES`, `pasaranFor`, `zoneOffsetAt`,
  `zoneLabelFor`, `formatOffset`). `app.js` pun memakai sumber yang sama, jadi mengubah daftar
  kota cukup di satu tempat.
- Pasaran Jawa memakai acuan 17 Agustus 1945 = Jumat Legi, siklus 5 hari. Sudah dicocokkan
  dengan kalender terbitan (mis. 22 Oktober 2025 = Pahing).
- Label zona ramah ("WIB"/"WITA") hanya dipakai bila zona tidak ber-DST. Untuk kota ber-DST
  (London, New York) label jatuh ke singkatan IANA atau `UTC+n` supaya tidak salah saat musim
  panas. Sebagian peramban tanpa data ICU mengembalikan "GMT+n" untuk semua zona — karena itu
  jalur label ramah tetap dipertahankan.
- Jadwal dihitung untuk kemarin, hari ini, dan besok sekaligus, agar alur Isya tetap benar pada
  dini hari. Jangan mengubah ini menjadi hanya "hari ini", atau rentang yang melewati tengah
  malam akan salah.
- Fungsi `render(now)` harus memakai parameter `now`, bukan `new Date()` langsung. Header dipisah
  menjadi `renderStatic()` (hanya saat setelan berubah, ditandai `state.staticRendered`) dan
  `renderDayInfo(now)` (agenda dan petugas Jum'at). Interval 1 detik memanggil `tick()`, yang
  menghormati `state.nowOverride` — dipakai oleh `window.DisplayTV.setNow()` saat menguji.
- `window.DisplayTV` adalah antarmuka uji: `setNow`/`clearNow`, `apply`, `setMode`, `autoMode`,
  `times`, `resetSettings`. Uji mode otomatis sebaiknya menyuntikkan waktu, bukan menunggu.
- `AudioContext` dibuat sekali dan dipakai ulang. Jangan membuat `AudioContext` baru tiap kali
  adzan berbunyi: pada papan yang menyala berhari-hari, konteks akan menumpuk sampai peramban
  menolak membuat yang baru dan bunyi berhenti.
- Simulator mode disembunyikan lewat `body:not(.sim-on) #remoteBar`. Kelas `sim-on` diberikan
  oleh `?sim=1` atau `Ctrl+Shift+D`. Ini supaya papan yang dipakai jamaah tidak menampilkan
  tombol uji.
- Kelas Tailwind yang tidak ada di skala bawaan akan menghasilkan nilai nol dan diam-diam rusak:
  `h-15`, `backdrop-blur-xs` (dan seterusnya) bukan nama yang sah. Pakai `h-16`/`h-[3.75rem]`
  dan `backdrop-blur-sm`. Uji terhitung di peramban pernah menangkap `h-15` setinggi 0 px.
- Bilah mode memakai `hidden` + `flex`; kelas `screen-view` disertai `flex` ditambah/dihapus
  (`hidden`) oleh `showView()`. Pola ini aman, tetapi jangan menambah `flex` di markup layar
  yang harus tersembunyi.
- Uji terkait ada di luar repo (`/tmp/display_test.py`, `/tmp/display_robust_test.py`) dan
  memakai `cdp.py` dengan server di `http://localhost:8000`.
