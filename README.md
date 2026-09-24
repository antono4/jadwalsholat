# Dashboard Jadwal Sholat Masjid

Papan informasi jadwal sholat untuk ditayangkan di masjid — layar TV, monitor lobi, atau proyektor.
Waktu sholat dihitung secara astronomis di peramban, jadi berlaku untuk kota mana pun dan tanggal
berapa pun, tanpa memanggil API pihak ketiga.

## Menjalankan

Cukup buka `index.html`. Tidak ada proses build dan tidak ada dependensi.

Bila ingin disajikan lewat server (disarankan agar `localStorage` dan mode layar penuh berjalan normal):

```bash
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

## Berkas

| Berkas | Isi |
| --- | --- |
| `index.html` | Struktur halaman, ornamen, modal, dan lapisan adzan |
| `styles.css` | Tema, tata letak, animasi, gaya cetak |
| `prayer-times.js` | Mesin hisab waktu sholat dan kalender Hijriah (tanpa dependensi) |
| `app.js` | Logika dashboard: jam, hitung mundur, kartu, busur matahari, kiblat, latar foto, setelan |
| `assets/galeri/` | Foto bawaan untuk latar dan `kredit.json` berisi atribusinya |

## Yang ditampilkan

- **Jam berjalan** dalam format 24 atau 12 jam, dengan label zona waktu.
- **Hitung mundur** menuju waktu sholat berikutnya, lengkap dengan cincin kemajuan.
- **Lima kartu waktu sholat** — kartu waktu yang sedang berlangsung disorot, yang berikutnya
  diberi tanda. Kartu Dzuhur berubah menjadi Jum'at pada hari Jumat.
- **Busur perjalanan matahari** — kurva elevasi matahari sepanjang hari dengan penanda tiap waktu
  sholat, sehingga terlihat posisi matahari sekarang.
- **Imsak, syuruq, panjang siang, tengah malam, dan sepertiga malam terakhir** (waktu tahajud).
- **Arah kiblat** dengan besar sudut, arah mata angin, dan jarak ke Ka'bah.
- **Latar foto masjid** yang menutupi seluruh layar dan berganti sendiri, dengan peredup agar
  jadwal tetap terbaca dan kredit foto tampil di kepala halaman.
- **Teks berjalan** untuk pengumuman masjid.
- **Layar penuh saat masuk waktu**, opsional, dengan bunyi penanda.

## Pintasan papan tulis

| Tombol | Fungsi |
| --- | --- |
| `S` | Buka pengaturan |
| `M` | Buka jadwal sebulan |
| `F` | Mode layar penuh (kiosk) |
| `←` `→` | Ganti foto latar sebelumnya / berikutnya |
| `Spasi` | Jeda atau lanjutkan tayangan latar |
| `Esc` | Tutup modal / lapisan |

## Pengaturan

Semua setelan tersimpan di `localStorage` peramban, jadi bertahan setelah halaman dimuat ulang.

- **Identitas masjid** — nama, alamat, teks berjalan.
- **Lokasi** — pilih dari 37 kota (otomatis mengisi koordinat, offset, dan zona IANA), atau isi
  lintang/bujur sendiri. Zona waktu bisa otomatis mengikuti kota atau diatur manual.
- **Metode hisab** — Kemenag RI, Muslim World League, ISNA, Egyptian, Umm al-Qura, Karachi,
  Tehran, dan Jafari.
- **Mazhab Ashar** — standar (Syafi'i, Maliki, Hambali) atau Hanafi.
- **Penyesuaian ihtiyati** — koreksi menit per waktu agar persis dengan jadwal setempat.
- **Tampilan** — format jam, nuansa warna (Malam mihrab, Fajar, Zamrud), bunyi, dan layar adzan.
- **Galeri foto** — nyalakan/matikan, selang tayang (3–120 detik), tinggi panel (ringkas, sedang,
  tinggi), dan daftar foto sendiri dengan format `keterangan | tempat | kredit | url` per baris.
  Baris kosong dan baris berawalan `#` diabaikan. Bila daftar diisi, foto bawaan tetap dipakai
  lebih dulu dan foto Anda menyusul. Tayangan otomatis berhenti saat pengaturan dibuka, saat
  masuk waktu adzan, dan saat tab tidak aktif.

## Ketelitian hisab

Perhitungan memakai algoritma posisi matahari Jean Meeus sebagaimana dipakai PrayTimes.org:
deklinasi matahari, equation of time, sudut jam, dan iterasi tiga ronde. Selain itu:

- **Koreksi zona waktu** (`offset − bujur/15`) diterapkan, sehingga hasilnya jam sipil setempat.
- **Sudut terbit/terbenam** 0,833° untuk refraksi atmosfer dan jari-jari matahari.
- **Ihtiyati bawaan**: Dzuhur dua menit setelah istiwa, Imsak sepuluh menit sebelum Subuh.
- **Lintang tinggi**: metode tengah malam, berbasis sudut, atau sepertujuh malam. Bila matahari
  tidak terbit/terbenam sama sekali (malam atau siang kutub), lintang dibatasi 48,5° agar hasil
  tetap terdefinisi.
- **Kalender Hijriah** memakai kalender Umm al-Qura dari data ICU peramban (presisi), dengan
  kalender tabular sebagai cadangan.

Hasil telah dicocokkan dengan jadwal terbitan: Jakarta (Subuh 04:24, Maghrib 17:48, Isya 18:57),
Makkah (Dzuhur 12:15), London (Maghrib 21:22), dan New York (Isya 20:05) — selisih maksimal
satu menit.

## Catatan operasional

- Agar bunyi penanda berbunyi, peramban mensyaratkan satu interaksi pengguna lebih dulu
  (kebijakan autoplay). Klik atau sentuh halaman satu kali setelah dibuka.
- Untuk papan masjid, gunakan mode layar penuh (`F`) dan matikan tidur layar pada perangkat.
- Jadwal sebulan bisa langsung dicetak lewat tombol **Cetak**; gaya cetak sudah diatur.
- Hormati preferensi `prefers-reduced-motion` dan `prefers-contrast`; keduanya sudah ditangani.
