/* ============================================================================
   kas.js — model saldo kas masjid yang dipakai bersama oleh dashboard dan
   papan TV. Dimuat sebelum app.js/display.html agar keduanya memakai aturan
   format yang sama.

   Uang disimpan sebagai angka rupiah bulat. Tampilan selalu "Rp 12.500.000".
   ========================================================================= */
(function (global) {
  'use strict';

  /* Dana bawaan masjid. Urutan ini menentukan urutan tampil. */
  var FUNDS = [
    { key: 'umum', label: 'Kas Umum', short: 'Umum' },
    { key: 'infaq', label: "Infaq & Sedekah Jum'at", short: 'Infaq' },
    { key: 'zakat', label: 'Zakat & Zakat Fitrah', short: 'Zakat' },
    { key: 'pembangunan', label: 'Pembangunan & Renovasi', short: 'Pembangunan' }
  ];

  /* Batas kewarasan: pane setelan memakai <input type="text"> karena
     input[type=number] tidak menerima "1.500.000" atau "Rp 1.500.000", dan
     tombol naik-turunnya tidak berguna untuk nominal kas. */
  var MAX_RUPIAH = 1e15;

  function fundKeys() {
    return FUNDS.map(function (f) { return f.key; });
  }

  function isFund(key) {
    return fundKeys().indexOf(String(key)) !== -1;
  }

  /* "1.500.000", "Rp 1.500.000", "1500000", "1 500 000", "1,500,000" -> 1500000.
     Mengembalikan null bila tidak ada angka, bukan 0: nol yang datang dari
     masukan sampah akan tampak seperti dana yang sengaja dikosongkan.

     Perhatikan bahwa "1.500" diperlakukan sebagai 1500 (pemisah ribuan), bukan
     1,5. Nominal sen memang jarang ditulis, dan format Indonesia memakai titik
     sebagai pemisah ribuan, jadi tebakan ini benar jauh lebih sering. */
  function parseRupiah(input) {
    if (input === null || input === undefined) return null;
    var s = String(input).trim();
    if (!s) return null;

    var negatif = /^\(.*\)$/.test(s) || /^-/.test(s);
    var digit = s.replace(/[^\d]/g, '');
    if (!digit) return null;

    var n = Number(digit);
    if (!Number.isFinite(n)) return null;
    return negatif ? -n : n;
  }

  /* Bulatkan dan jinakkan nilai jadi rupiah yang bisa ditampilkan. */
  function coerceRupiah(input) {
    var n = typeof input === 'number' ? input : parseRupiah(input);
    if (n === null || !Number.isFinite(n)) return 0;
    n = Math.round(n);
    if (n > MAX_RUPIAH) return MAX_RUPIAH;
    if (n < -MAX_RUPIAH) return -MAX_RUPIAH;
    return n;
  }

  /* Pemisah ribuan gaya Indonesia memakai titik. Intl dipakai bila tersedia;
     papan TV bisa memakai peramban tanpa data ICU lengkap, jadi ada cadangan. */
  var punyaIntl = (function () {
    try {
      return typeof Intl !== 'undefined' &&
        new Intl.NumberFormat('id-ID').format(1000) === '1.000';
    } catch (e) { return false; }
  })();

  function grup(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function formatRupiah(n) {
    var v = coerceRupiah(n);
    var abs = grup(Math.abs(v));
    return (v < 0 ? '-Rp ' : 'Rp ') + abs;
  }

  /* Ringkas untuk layar kecil atau saat ruang sempit: Rp 1,5 M / Rp 12,5 jt. */
  function formatCompact(n) {
    var v = coerceRupiah(n);
    var abs = Math.abs(v);
    var tanda = v < 0 ? '-' : '';
    if (abs >= 1e12) return tanda + 'Rp ' + (abs / 1e12).toFixed(1).replace('.', ',') + ' T';
    if (abs >= 1e9) return tanda + 'Rp ' + (abs / 1e9).toFixed(1).replace('.', ',') + ' M';
    if (abs >= 1e6) return tanda + 'Rp ' + (abs / 1e6).toFixed(1).replace('.', ',') + ' jt';
    return formatRupiah(v);
  }

  /* Ambil objek dana apa pun (termasuk yang rusak dari localStorage lama) dan
     kembalikan bentuk utuh. Ini mencegah data setengah jadi membuat panel
     kosong tanpa penjelasan. */
  function normalizeKas(kas) {
    var out = { on: false, asOf: '', note: '', funds: {} };
    if (kas && typeof kas === 'object') {
      out.on = !!kas.on;
      out.asOf = typeof kas.asOf === 'string' ? kas.asOf : '';
      out.note = typeof kas.note === 'string' ? kas.note : '';
      var src = (kas.funds && typeof kas.funds === 'object') ? kas.funds : {};
      FUNDS.forEach(function (f) {
        out.funds[f.key] = coerceRupiah(src[f.key]);
      });
    } else {
      FUNDS.forEach(function (f) { out.funds[f.key] = 0; });
    }
    return out;
  }

  function total(kas) {
    var k = normalizeKas(kas);
    return fundKeys().reduce(function (a, key) { return a + k.funds[key]; }, 0);
  }

  /* Baris siap render untuk panel: label, nilai, dan porsi terhadap total.
     Porsi dipakai untuk bar proporsional; total <= 0 membuat porsi 0 agar
     tidak ada pembagian dengan nol. */
  function rows(kas) {
    var k = normalizeKas(kas);
    var tot = total(k);
    var basis = Math.abs(tot) || 1;
    return FUNDS.map(function (f) {
      var v = k.funds[f.key];
      return {
        key: f.key, label: f.label, short: f.short,
        value: v,
        text: formatRupiah(v),
        compact: formatCompact(v),
        share: Math.max(0, v) / basis
      };
    });
  }

  /* Ringkasan sekali pakai untuk bilah/papan: total terbaca plus waktu data. */
  function summary(kas) {
    var k = normalizeKas(kas);
    var tot = total(k);
    return {
      on: k.on,
      asOf: k.asOf,
      note: k.note,
      total: tot,
      totalText: formatRupiah(tot),
      totalCompact: formatCompact(tot),
      rows: rows(k),
      /* Tanggal Indonesia: 2026-09-25 -> 25 September 2026 */
      asOfText: formatAsOf(k.asOf)
    };
  }

  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
    'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function formatAsOf(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return '';
    var d = Number(m[3]), mo = Number(m[2]), y = Number(m[1]);
    if (mo < 1 || mo > 12) return '';
    if (d < 1 || d > 31) return '';
    return d + ' ' + BULAN[mo - 1] + ' ' + y;
  }

  global.Kas = {
    FUNDS: FUNDS,
    MAX_RUPIAH: MAX_RUPIAH,
    fundKeys: fundKeys,
    isFund: isFund,
    parseRupiah: parseRupiah,
    coerceRupiah: coerceRupiah,
    formatRupiah: formatRupiah,
    formatCompact: formatCompact,
    formatAsOf: formatAsOf,
    normalize: normalizeKas,
    total: total,
    rows: rows,
    summary: summary
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.Kas;
})(typeof window !== 'undefined' ? window : globalThis);
