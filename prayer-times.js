/*
 * prayer-times.js
 * Mesin hisab waktu sholat — algoritma astronomi (Jean Meeus, Astronomical Algorithms),
 * mengikuti pendekatan PrayTimes.org. Tidak ada tabel jadwal yang di-hardcode:
 * berlaku untuk koordinat dan tanggal mana pun.
 *
 * Dependensi: tidak ada. Diekspos sebagai window.PrayerTimes.
 */
(function (global) {
  'use strict';

  /* ---------------------------- trigonometri derajat --------------------------- */
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var dsin = function (d) { return Math.sin(d * D2R); };
  var dcos = function (d) { return Math.cos(d * D2R); };
  var dtan = function (d) { return Math.tan(d * D2R); };
  var darcsin = function (x) { return Math.asin(x) * R2D; };
  var darccos = function (x) { return Math.abs(x) > 1 ? NaN : Math.acos(x) * R2D; };
  var darctan2 = function (y, x) { return Math.atan2(y, x) * R2D; };
  var darccot = function (x) { return x === 0 ? (Math.PI / 2) * R2D : Math.atan(1 / x) * R2D; };
  var fixAngle = function (a) { return fix(a, 360); };
  var fixHour = function (a) { return fix(a, 24); };
  function fix(a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }

  /* ------------------------------- metode hisab ------------------------------- */
  var METHODS = {
    kemenag: {
      label: 'Kemenag RI', region: 'Indonesia',
      fajr: 20, isha: 18, imsak: 10, maghrib: 0,
      note: 'Kriteria Kementerian Agama RI. Isya 18°, Imsak 10 menit sebelum Subuh.'
    },
    mwl: {
      label: 'Muslim World League', region: 'Eropa · Timur Jauh · Amerika',
      fajr: 18, isha: 17, imsak: 10, maghrib: 0,
      note: 'Dipakai luas di Eropa dan Amerika Utara.'
    },
    isna: {
      label: 'ISNA', region: 'Amerika Utara',
      fajr: 15, isha: 15, imsak: 10, maghrib: 0,
      note: 'Islamic Society of North America.'
    },
    egypt: {
      label: 'Egyptian General Authority', region: 'Afrika · Timur Tengah',
      fajr: 19.5, isha: 17.5, imsak: 10, maghrib: 0,
      note: 'Egyptian General Authority of Survey.'
    },
    makkah: {
      label: 'Umm al-Qura', region: 'Arab Saudi',
      fajr: 18.5, isha: '90 min', imsak: 10, maghrib: 0,
      note: 'Isya memakai interval tetap 90 menit setelah Maghrib.'
    },
    karachi: {
      label: 'Univ. of Islamic Sciences', region: 'Pakistan · India · Bangladesh',
      fajr: 18, isha: 18, imsak: 10, maghrib: 0,
      note: 'University of Islamic Sciences, Karachi.'
    },
    tehran: {
      label: 'Institute of Geophysics', region: 'Iran',
      fajr: 17.7, isha: 14, imsak: 10, maghrib: 4.5,
      note: 'Institute of Geophysics, University of Tehran. Maghrib saat matahari −4,5°.'
    },
    jafari: {
      label: 'Jafari', region: 'Syiah Ithna Ashari',
      fajr: 16, isha: 14, imsak: 10, maghrib: 4,
      note: 'Maghrib saat matahari turun 4° di bawah ufuk.'
    }
  };

  var HIGH_LAT = {
    none: 'Tanpa penyesuaian',
    nightMiddle: 'Tengah malam',
    angleBased: 'Berbasis sudut',
    oneSeventh: 'Sepertujuh malam'
  };

  var NAMES = ['imsak', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'midnight'];
  var SHOLAT_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  var HIJRI_MONTHS = ['Muharram', 'Safar', "Rabi'ul Awwal", "Rabi'ul Akhir", 'Jumadil Awwal',
    'Jumadil Akhir', 'Rajab', "Sya'ban", 'Ramadhan', 'Syawwal', "Dzulqa'dah", 'Dzulhijjah'];
  var HIJRI_MONTHS_AR = ['مُحَرَّم', 'صَفَر', 'رَبيع الأوّل', 'رَبيع الآخِر', 'جُمادى الأولى',
    'جُمادى الآخِرة', 'رَجَب', 'شَعْبان', 'رَمَضان', 'شَوّال', 'ذو القَعْدة', 'ذو الحِجّة'];
  var GREGORIAN_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
    'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var DAY_NAMES = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
  var DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  /* ------------------------------- posisi matahari ---------------------------- */
  function julianDate(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var a = Math.floor(y / 100), b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
  }

  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = fixHour(darctan2(dcos(e) * dsin(L), dcos(L)) / 15);
    return { declination: darcsin(dsin(e) * dsin(L)), equation: q / 15 - RA };
  }

  function midDay(jd, t) { return fixHour(12 - sunPosition(jd + t).equation); }

  // Waktu saat matahari mencapai `angle` (derajat, negatif = di bawah ufuk).
  function sunAngleTime(ctx, jd, angle, t, direction) {
    var decl = sunPosition(jd + t).declination;
    var noon = midDay(jd, t);
    var t0 = darccos((-dsin(angle) - dsin(decl) * dsin(ctx.lat)) / (dcos(decl) * dcos(ctx.lat))) / 15;
    if (isNaN(t0)) return NaN;
    return noon + (direction === 'ccw' ? -t0 : t0);
  }

  function asrTime(ctx, jd, factor, t) {
    var decl = sunPosition(jd + t).declination;
    var angle = -darccot(factor + dtan(Math.abs(ctx.lat - decl)));
    return sunAngleTime(ctx, jd, angle, t);
  }

  // Sudut terbit/terbenam: 0.833° (refraksi atmosfer + jari-jari matahari).
  var RISE_SET_ANGLE = 0.833;

  function dayPortion(times) {
    var out = {};
    for (var i = 0; i < NAMES.length; i++) out[NAMES[i]] = times[NAMES[i]] / 24;
    out.sunset = times.sunset / 24;
    return out;
  }

  function timeDiff(a, b) { return fixHour(b - a); }

  /* --------------------------------- hisab utama ------------------------------ */
  var POLAR_LAT_LIMIT = 48.5;

  function computeRaw(coords, date, cfg) {
    var ctx = { lat: coords.lat };
    var jd = julianDate(date.year, date.month, date.day) - coords.lat / (15 * 24);
    var times = { imsak: 5, fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, maghrib: 18, isha: 18 };

    for (var iter = 0; iter < 3; iter++) {
      var p = dayPortion(times);
      var next = {};
      next.fajr = sunAngleTime(ctx, jd, cfg.fajrAngle, p.fajr, 'ccw');
      next.sunrise = sunAngleTime(ctx, jd, RISE_SET_ANGLE, p.sunrise, 'ccw');
      next.dhuhr = midDay(jd, p.dhuhr);
      next.asr = asrTime(ctx, jd, cfg.asrFactor, p.asr);
      next.sunset = sunAngleTime(ctx, jd, RISE_SET_ANGLE, p.sunset);
      next.maghrib = cfg.maghribAngle !== null
        ? sunAngleTime(ctx, jd, cfg.maghribAngle, p.maghrib)
        : next.sunset;
      next.isha = cfg.ishaAngle !== null
        ? sunAngleTime(ctx, jd, cfg.ishaAngle, p.isha)
        : next.maghrib + cfg.ishaMinutes / 60;
      next.imsak = cfg.imsakMinutes ? next.fajr - cfg.imsakMinutes / 60 : next.fajr;
      times = next;
    }

    // Lintang tinggi ekstrem: matahari bisa tidak terbit/terbenam sama sekali
    // (malam kutub / siang kutub). Metode "lintang terdekat" memakai lintang
    // yang dibatasi agar hasilnya tetap terdefinisi.
    if (isNaN(times.sunrise) || isNaN(times.sunset)) {
      var clamped = (coords.lat < 0 ? -1 : 1) * Math.min(Math.abs(coords.lat), POLAR_LAT_LIMIT);
      var jd2 = julianDate(date.year, date.month, date.day) - clamped / (15 * 24);
      var ctx2 = { lat: clamped };
      // Perkiraan jam default: perkiraan NaN dari lintang asli tidak bisa dipakai.
      var p2 = { imsak: 5 / 24, fajr: 5 / 24, sunrise: 6 / 24, dhuhr: 12 / 24, asr: 13 / 24, sunset: 18 / 24, maghrib: 18 / 24, isha: 18 / 24 };
      times.sunrise = sunAngleTime(ctx2, jd2, RISE_SET_ANGLE, p2.sunrise, 'ccw');
      times.sunset = sunAngleTime(ctx2, jd2, RISE_SET_ANGLE, p2.sunset);
      times.fajr = sunAngleTime(ctx2, jd2, cfg.fajrAngle, p2.fajr, 'ccw');
      if (cfg.ishaAngle !== null) times.isha = sunAngleTime(ctx2, jd2, cfg.ishaAngle, p2.isha);
      times.maghrib = cfg.maghribAngle !== null
        ? sunAngleTime(ctx2, jd2, cfg.maghribAngle, p2.maghrib)
        : times.sunset;
      if (isNaN(times.isha)) times.isha = times.maghrib + (cfg.ishaMinutes || 90) / 60;
      times.imsak = cfg.imsakMinutes ? times.fajr - cfg.imsakMinutes / 60 : times.fajr;
    }

    applyHighLat(ctx, times, cfg);
    return times;
  }

  function nightPortion(angle, night, mode) {
    var portion = 1 / 2;
    if (mode === 'angleBased' && typeof angle === 'number') portion = (1 / 60) * angle;
    else if (mode === 'oneSeventh') portion = 1 / 7;
    return portion * night;
  }

  function adjustHLTime(time, base, angle, night, mode, direction) {
    var portion = nightPortion(angle, night, mode);
    var diff = direction === 'ccw' ? timeDiff(time, base) : timeDiff(base, time);
    if (isNaN(time) || isNaN(diff) || diff > portion) {
      time = base + (direction === 'ccw' ? -portion : portion);
    }
    return time;
  }

  function applyHighLat(ctx, times, cfg) {
    if (cfg.highLat === 'none') return;
    var night = timeDiff(times.sunset, times.sunrise);
    times.imsak = adjustHLTime(times.imsak, times.sunrise, cfg.fajrAngle, night, cfg.highLat, 'ccw');
    times.fajr = adjustHLTime(times.fajr, times.sunrise, cfg.fajrAngle, night, cfg.highLat, 'ccw');
    times.isha = adjustHLTime(times.isha, times.sunset, cfg.ishaAngle !== null ? cfg.ishaAngle : 18, night, cfg.highLat);
    if (cfg.maghribAngle !== null) {
      times.maghrib = adjustHLTime(times.maghrib, times.sunset, cfg.maghribAngle, night, cfg.highLat);
    }
  }

  /* --------------------------------- kalender --------------------------------- */
  // Kalender Umm al-Qura dari data ICU (presisi, tanpa tabel manual).
  var intlHijri = null;
  try {
    var probe = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC'
    });
    probe.formatToParts(new Date(Date.UTC(2026, 0, 1)));
    intlHijri = probe;
  } catch (e) {
    intlHijri = null;
  }

  // Fallback: kalender Hijriah tabular (aritmetik), akurasi ±2 hari.
  function tabularHijri(jd) {
    var l = jd - 1948440 + 10632;
    var n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    var j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
            Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
        Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    var month = Math.floor((24 * l) / 709);
    var day = l - Math.floor((709 * month) / 24);
    return { year: 30 * n + j - 30, month: month, day: day };
  }

  function gregorianToHijri(gy, gm, gd) {
    if (intlHijri) {
      var parts = intlHijri.formatToParts(new Date(Date.UTC(gy, gm - 1, gd)));
      var map = {};
      for (var i = 0; i < parts.length; i++) map[parts[i].type] = parts[i].value;
      var y = parseInt(map.year, 10);
      if (map.era && /^b/i.test(map.era)) y = 1 - y; // "before Hijra"
      return { year: y, month: parseInt(map.month, 10), day: parseInt(map.day, 10) };
    }
    return tabularHijri(Math.floor(julianDate(gy, gm, gd)));
  }

  /* ----------------------------------- API ------------------------------------ */
  function buildConfig(settings) {
    var s = settings || {};
    var m = METHODS[s.method] || METHODS.kemenag;
    return {
      method: s.method && METHODS[s.method] ? s.method : 'kemenag',
      methodDef: m,
      asrFactor: s.asr === 'hanafi' ? 2 : 1,
      asr: s.asr === 'hanafi' ? 'hanafi' : 'standard',
      highLat: HIGH_LAT[s.highLat] ? s.highLat : 'nightMiddle',
      fajrAngle: typeof m.fajr === 'number' ? m.fajr : 18,
      ishaAngle: typeof m.isha === 'number' ? m.isha : null,
      ishaMinutes: typeof m.isha === 'string' ? parseFloat(m.isha) : 0,
      maghribAngle: typeof m.maghrib === 'number' && m.maghrib !== 0 ? m.maghrib : null,
      imsakMinutes: typeof m.imsak === 'number' ? m.imsak : 0,
      tzOffset: (s.tzOffset === undefined || s.tzOffset === null || isNaN(s.tzOffset)) ? 0 : s.tzOffset,
      tune: normalizeTune(s.tune)
    };
  }

  function normalizeTune(tune) {
    var out = {};
    for (var i = 0; i < NAMES.length; i++) {
      var n = NAMES[i];
      out[n] = (tune && typeof tune[n] === 'number' && !isNaN(tune[n])) ? tune[n] : 0;
    }
    return out;
  }

  /**
   * Hitung waktu sholat.
   * Hasil dinyatakan dalam waktu matahari setempat; koreksi zona waktu
   * (tzOffset − bujur/15) diterapkan sebelum dikembalikan.
   * @param {{lat:number, lng:number}} coords
   * @param {{year:number, month:number, day:number}} date
   * @param {object} [settings] {method, asr, highLat, tzOffset, tune}
   * @returns {object} jam desimal waktu setempat untuk tiap waktu
   */
  function calculate(coords, date, settings) {
    var cfg = buildConfig(settings);
    var t = computeRaw(coords, date, cfg);

    // Koreksi zona waktu: waktu matahari setempat -> waktu sipil setempat.
    var shift = cfg.tzOffset - coords.lng / 15;

    // Dhuhr: tambah jeda ihtiyati 2 menit setelah matahari tepat di puncak.
    t.dhuhr += 2 / 60;

    for (var i = 0; i < NAMES.length; i++) {
      var n = NAMES[i];
      if (typeof t[n] === 'number' && !isNaN(t[n])) t[n] = fixHour(t[n] + shift + cfg.tune[n] / 60);
    }
    if (typeof t.sunset === 'number' && !isNaN(t.sunset)) t.sunset = fixHour(t.sunset + shift);

    // Tengah malam: pertengahan antara terbenam dan terbit.
    var night = timeDiff(t.maghrib, t.sunrise);
    t.midnight = fixHour(t.maghrib + night / 2);
    // Pembagian malam untuk qiyamul lail (sepertiga akhir = waktu tahajud utama).
    t.lastThird = fixHour(t.maghrib + (night * 2) / 3);

    var out = { sunset: t.sunset, lastThird: t.lastThird };
    for (var k = 0; k < NAMES.length; k++) {
      if (typeof t[NAMES[k]] === 'number' && !isNaN(t[NAMES[k]])) out[NAMES[k]] = t[NAMES[k]];
    }
    return out;
  }

  function toDate(baseDate, hours) {
    var d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    d.setMinutes(d.getMinutes() + Math.round(fixHour(hours) * 60));
    return d;
  }

  /**
   * Ketinggian matahari (derajat) pada jam sipil setempat tertentu.
   * Dipakai untuk menggambar busur perjalanan matahari.
   */
  function sunElevation(coords, date, hours, tzOffset) {
    // Waktu matahari setempat, lalu sudut jam dari tengah hari.
    var solarTime = hours - tzOffset + coords.lng / 15;
    var hourAngle = (solarTime - 12) * 15;
    var jd = julianDate(date.year, date.month, date.day) -
             coords.lng / (15 * 24) + solarTime / 24;
    var pos = sunPosition(jd);
    var elev = darcsin(dsin(pos.declination) * dsin(coords.lat) +
                       dcos(pos.declination) * dcos(coords.lat) * dcos(hourAngle));
    return isNaN(elev) ? null : elev;
  }

  /**
   * Daftar kota rujukan: [nama, lintang, bujur, offset rujukan, label zona, zona IANA].
   * Offset hanya rujukan; zona IANA yang menentukan DST.
   */
  var CITIES_RAW = [
    ['Jakarta', -6.2088, 106.8456, 7, 'WIB', 'Asia/Jakarta'],
    ['Bogor', -6.5950, 106.8166, 7, 'WIB', 'Asia/Jakarta'],
    ['Bandung', -6.9175, 107.6191, 7, 'WIB', 'Asia/Jakarta'],
    ['Semarang', -6.9667, 110.4167, 7, 'WIB', 'Asia/Jakarta'],
    ['Yogyakarta', -7.7956, 110.3695, 7, 'WIB', 'Asia/Jakarta'],
    ['Surabaya', -7.2575, 112.7521, 7, 'WIB', 'Asia/Jakarta'],
    ['Medan', 3.5952, 98.6722, 7, 'WIB', 'Asia/Jakarta'],
    ['Palembang', -2.9761, 104.7754, 7, 'WIB', 'Asia/Jakarta'],
    ['Banda Aceh', 5.5483, 95.3238, 7, 'WIB', 'Asia/Jakarta'],
    ['Denpasar', -8.6500, 115.2167, 8, 'WITA', 'Asia/Makassar'],
    ['Mataram', -8.5833, 116.1167, 8, 'WITA', 'Asia/Makassar'],
    ['Makassar', -5.1477, 119.4327, 8, 'WITA', 'Asia/Makassar'],
    ['Balikpapan', -1.2379, 116.8529, 8, 'WITA', 'Asia/Makassar'],
    ['Manado', 1.4748, 124.8421, 8, 'WITA', 'Asia/Makassar'],
    ['Ambon', -3.6954, 128.1814, 9, 'WIT', 'Asia/Jayapura'],
    ['Jayapura', -2.5916, 140.6690, 9, 'WIT', 'Asia/Jayapura'],
    ['Makkah', 21.4225, 39.8262, 3, 'AST', 'Asia/Riyadh'],
    ['Madinah', 24.4686, 39.6142, 3, 'AST', 'Asia/Riyadh'],
    ['Kuala Lumpur', 3.1390, 101.6869, 8, 'MYT', 'Asia/Kuala_Lumpur'],
    ['Singapura', 1.3521, 103.8198, 8, 'SGT', 'Asia/Singapore'],
    ['Bandar Seri Begawan', 4.9031, 114.9398, 8, 'BNT', 'Asia/Brunei'],
    ['Kairo', 30.0444, 31.2357, 2, 'EET', 'Africa/Cairo'],
    ['Istanbul', 41.0082, 28.9784, 3, 'TRT', 'Europe/Istanbul'],
    ['London', 51.5074, -0.1278, 0, 'GMT', 'Europe/London'],
    ['Paris', 48.8566, 2.3522, 1, 'CET', 'Europe/Paris'],
    ['Amsterdam', 52.3676, 4.9041, 1, 'CET', 'Europe/Amsterdam'],
    ['New York', 40.7128, -74.0060, -5, 'EST', 'America/New_York'],
    ['Chicago', 41.8781, -87.6298, -6, 'CST', 'America/Chicago'],
    ['Los Angeles', 34.0522, -118.2437, -8, 'PST', 'America/Los_Angeles'],
    ['Sydney', -33.8688, 151.2093, 10, 'AEST', 'Australia/Sydney'],
    ['Melbourne', -37.8136, 144.9631, 10, 'AEST', 'Australia/Melbourne'],
    ['Tokyo', 35.6762, 139.6503, 9, 'JST', 'Asia/Tokyo'],
    ['Seoul', 37.5665, 126.9780, 9, 'KST', 'Asia/Seoul'],
    ['Delhi', 28.6139, 77.2090, 5.5, 'IST', 'Asia/Kolkata'],
    ['Karachi', 24.8607, 67.0011, 5, 'PKT', 'Asia/Karachi'],
    ['Dubai', 25.2048, 55.2708, 4, 'GST', 'Asia/Dubai'],
    ['Toronto', 43.6532, -79.3832, -5, 'EST', 'America/Toronto']
  ];

  var CITIES = CITIES_RAW.map(function (c) {
    return { name: c[0], lat: c[1], lng: c[2], tz: c[3], zone: c[4], iana: c[5] };
  });

  /* ------------------------------ pasaran Jawa ------------------------------- */
  // Siklus pasaran berulang tiap 5 hari. Acuan 17 Agustus 1945 = Jumat Legi.
  var PASARAN = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];
  var PASARAN_ANCHOR = Date.UTC(1945, 7, 17);

  /**
   * Indeks pasaran (0=Legi .. 4=Kliwon) untuk tanggal Masehi tertentu.
   * @param {number} gy tahun, gm bulan 1-12, gd tanggal
   * @returns {number}
   */
  function pasaranIndex(gy, gm, gd) {
    var days = Math.round((Date.UTC(gy, gm - 1, gd) - PASARAN_ANCHOR) / 86400000);
    return ((days % 5) + 5) % 5;
  }

  /**
   * Nama pasaran Jawa untuk tanggal tertentu.
   * @returns {string} mis. "Pahing"
   */
  function pasaranFor(gy, gm, gd) {
    return PASARAN[pasaranIndex(gy, gm, gd)];
  }

  /* -------------------------------- zona waktu ------------------------------- */
  var DEVICE_ZONE = '';
  try { DEVICE_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { DEVICE_ZONE = ''; }
  var ZONE_SUPPORTED = (function () {
    try { new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' }); return true; }
    catch (e) { return false; }
  })();

  /**
   * Offset UTC (jam) zona IANA pada saat tertentu — memperhitungkan DST.
   * @returns {number|null} null bila zona tidak dikenal
   */
  function zoneOffsetAt(iana, date) {
    if (!ZONE_SUPPORTED || !iana) return null;
    try {
      var dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: iana, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      var map = {};
      dtf.formatToParts(date).forEach(function (p) { map[p.type] = p.value; });
      var hour = parseInt(map.hour, 10) % 24;
      var asUTC = Date.UTC(parseInt(map.year, 10), parseInt(map.month, 10) - 1, parseInt(map.day, 10),
        hour, parseInt(map.minute, 10), parseInt(map.second, 10));
      return (asUTC - Math.floor(date.getTime() / 1000) * 1000) / 3600000;
    } catch (e) { return null; }
  }

  /**
   * Singkatan zona IANA (mis. "WIB", "GMT+1", "BST") pada saat tertentu.
   * @returns {string} kosong bila tidak tersedia
   */
  function zoneLabelFor(iana, date) {
    if (!ZONE_SUPPORTED || !iana) return '';
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'short' })
        .formatToParts(date);
      var tz = parts.filter(function (p) { return p.type === 'timeZoneName'; })[0];
      return tz ? tz.value : '';
    } catch (e) { return ''; }
  }

  /** Offset jam desimal menjadi teks, mis. 5.5 -> "UTC+5:30". */
  function formatOffset(h) {
    var sign = h < 0 ? '-' : '+';
    var abs = Math.abs(h);
    var hh = Math.floor(abs);
    var mm = Math.round((abs - hh) * 60);
    return 'UTC' + sign + hh + (mm ? ':' + String(mm).padStart(2, '0') : '');
  }

  function formatTime(hours, separator) {
    if (typeof hours !== 'number' || isNaN(hours)) return '--:--';
    var total = Math.round(fixHour(hours) * 60);
    return String(Math.floor(total / 60) % 24).padStart(2, '0') + (separator || ':') +
           String(total % 60).padStart(2, '0');
  }

  global.PrayerTimes = {
    METHODS: METHODS, HIGH_LAT: HIGH_LAT, NAMES: NAMES, SHOLAT_NAMES: SHOLAT_NAMES,
    CITIES: CITIES,
    HIJRI_MONTHS: HIJRI_MONTHS, HIJRI_MONTHS_AR: HIJRI_MONTHS_AR,
    GREGORIAN_MONTHS: GREGORIAN_MONTHS, DAY_NAMES: DAY_NAMES, DAY_NAMES_AR: DAY_NAMES_AR,
    PASARAN: PASARAN,
    RISE_SET_ANGLE: RISE_SET_ANGLE,
    calculate: calculate, toDate: toDate, formatTime: formatTime,
    sunElevation: sunElevation,
    gregorianToHijri: gregorianToHijri, julianDate: julianDate,
    pasaranIndex: pasaranIndex, pasaranFor: pasaranFor,
    DEVICE_ZONE: DEVICE_ZONE, ZONE_SUPPORTED: ZONE_SUPPORTED,
    zoneOffsetAt: zoneOffsetAt, zoneLabelFor: zoneLabelFor, formatOffset: formatOffset,
    fixHour: fixHour, buildConfig: buildConfig
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.PrayerTimes;
})(typeof window !== 'undefined' ? window : globalThis);
