/*
 * app.js — logika dashboard jadwal sholat masjid.
 * Bergantung pada window.PrayerTimes (prayer-times.js).
 */
(function () {
  'use strict';

  var PT = window.PrayerTimes;
  var STORE_KEY = 'jadwal-sholat-masjid/v1';
  var KAABA = { lat: 21.4225, lng: 39.8262 };

  /* ------------------------------- daftar kota ------------------------------- */
  // [nama, lintang, bujur, offset rujukan, label zona, zona IANA]
  var CITIES = [
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
  ].map(function (c) {
    return { name: c[0], lat: c[1], lng: c[2], tz: c[3], zone: c[4], iana: c[5] };
  });

  /* --------------------------------- tabel UI -------------------------------- */
  var TIMELINE = [
    { key: 'imsak', label: 'Imsak', ar: 'الإمْساك', abbr: 'Imsak' },
    { key: 'fajr', label: 'Subuh', ar: 'الصُّبْح', abbr: 'Subuh', sholat: true },
    { key: 'sunrise', label: 'Syuruq', ar: 'الشُّرُوق', abbr: 'Syuruq' },
    { key: 'dhuhr', label: 'Dzuhur', ar: 'الظُّهْر', abbr: 'Dzuhur', sholat: true },
    { key: 'asr', label: 'Ashar', ar: 'الْعَصْر', abbr: 'Ashar', sholat: true },
    { key: 'maghrib', label: 'Maghrib', ar: 'الْمَغْرِب', abbr: 'Maghrib', sholat: true },
    { key: 'isha', label: 'Isya', ar: 'الْعِشَاء', abbr: 'Isya', sholat: true }
  ];
  var SHOLAT = TIMELINE.filter(function (t) { return t.sholat; });
  var ARC_MARKS = TIMELINE.slice();

  /* Foto bawaan galeri. Berkasnya ada di assets/galeri/ beserta kredit.json.
     Kredit wajib ditampilkan karena sebagian berlisensi CC BY-SA.
     Ganti dengan foto masjid Anda sendiri, lalu kredit boleh dikosongkan. */
  var DEFAULT_GALLERY = [
    { src: 'assets/galeri/Masjid_Agung_Al-Azhar_Front.jpg', caption: 'Masjid Agung Al-Azhar', place: 'Jakarta Selatan', credit: 'Irvan Cahyo N · CC BY-SA 4.0' },
    { src: 'assets/galeri/Inner_Masjid_Agung.jpg', caption: 'Ruang utama masjid', place: 'Interior', credit: 'Irvan Cahyo N · CC BY-SA 4.0' },
    { src: 'assets/galeri/Mosque_Dome_and_Minaret_in_Medan_Sumatra_Indonesia.jpg', caption: 'Masjid Raya Medan', place: 'Sumatera Utara', credit: 'Pratyeka · CC BY-SA 3.0' },
    { src: 'assets/galeri/Yogyakarta_Indonesia_Masjid-Soko-Tunggal-01.jpg', caption: 'Masjid Soko Tunggal', place: 'Yogyakarta', credit: 'CEphoto, Uwe Aranas · CC BY-SA 3.0' },
    { src: 'assets/galeri/Kuta_Bali_Indonesia_Masjid-Agung-Ibnu-Batutah-02.jpg', caption: 'Masjid Agung Ibnu Batutah', place: 'Kuta, Bali', credit: 'CEphoto, Uwe Aranas · CC BY-SA 3.0' },
    { src: 'assets/galeri/Banten_Masjid_Agung_Banten.jpg', caption: 'Masjid Agung Banten', place: 'Serang, Banten', credit: 'Kementerian Keuangan RI · Domain publik' }
  ];

  var DEFAULTS = {
    name: 'Masjid Al-Ikhlas',
    address: 'Jl. Melati Raya No. 12 · Jakarta Selatan',
    ticker: 'Jagalah sholat lima waktu, sebab ia adalah tiang agama. — Mari hidupkan sholat berjamaah di masjid. ' +
            'Kebersihan sebagian dari iman: rawat fasilitas masjid bersama. ' +
            'Infaq dan sedekah dapat disalurkan melalui kotak amal atau rekening resmi masjid.',
    city: 'Jakarta',
    lat: -6.2088,
    lng: 106.8456,
    tzMode: 'auto',
    tzOffset: 7,
    zoneLabel: 'WIB',
    method: 'kemenag',
    asr: 'standard',
    highLat: 'nightMiddle',
    tune: { imsak: 0, fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    clockFormat: '24',
    theme: 'night',
    adhanSound: false,
    adhanOverlay: true,
    galleryOn: true,
    galleryInterval: 8,
    galleryDim: 'medium',
    galleryList: ''
  };

  var state = {
    settings: null,
    todayKey: null,
    data: null,
    fired: {},
    modalMonth: null,
    tickTimer: null,
    audioCtx: null,
    arcCacheKey: null,
    galleryIndex: 0,
    galleryTimer: null,
    galleryPaused: false,
    galleryItems: []
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ------------------------------- util tanggal ------------------------------ */
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  function dateParts(d) { return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }; }

  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* --------------------------------- zona waktu ------------------------------ */
  var deviceZone = '';
  try { deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { deviceZone = ''; }
  var zoneSupported = (function () {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' });
      return true;
    } catch (e) { return false; }
  })();

  // Offset UTC (jam) di suatu zona IANA pada saat tertentu — memperhitungkan DST.
  function zoneOffsetAt(iana, date) {
    if (!zoneSupported || !iana) return null;
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

  function zoneLabelFor(iana, date) {
    if (!zoneSupported || !iana) return '';
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'short' })
        .formatToParts(date);
      var tz = parts.filter(function (p) { return p.type === 'timeZoneName'; })[0];
      return tz ? tz.value : '';
    } catch (e) { return ''; }
  }

  // Kota terdekat secara jarak lingkaran besar — dipakai hanya bila koordinat
  // bukan berasal dari daftar kota.
  function zoneForCoords(lat, lng) {
    var best = null, bestDist = Infinity;
    for (var i = 0; i < CITIES.length; i++) {
      var c = CITIES[i];
      var d = greatCircle(lat, lng, c.lat, c.lng);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    return best;
  }

  function greatCircle(lat1, lng1, lat2, lng2) {
    var p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    var dp = (lat2 - lat1) * Math.PI / 180, dl = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 6371;
  }

  /**
   * Tentukan offset UTC untuk koordinat tertentu.
   * @returns {{offset:number, label:string, source:string, iana:string, city:object|null}}
   */
  function resolveZone(settings, date) {
    if (settings.tzMode === 'manual') {
      var off = Number(settings.tzOffset) || 0;
      return { offset: off, label: formatOffset(off), source: 'manual', iana: '', city: null };
    }

    var fromCity = CITIES.filter(function (c) { return c.name === settings.city; })[0];
    if (fromCity) {
      var cityOffset = zoneOffsetAt(fromCity.iana, date);
      return zoneInfo(cityOffset === null ? fromCity.tz : cityOffset, fromCity.iana, fromCity.zone,
        fromCity.zone, 'city', fromCity);
    }

    var guessed = zoneForCoords(Number(settings.lat), Number(settings.lng));
    var gOffset = guessed ? zoneOffsetAt(guessed.iana, date) : null;
    if (gOffset !== null) {
      return zoneInfo(gOffset, guessed.iana, guessed.zone, guessed.zone, 'geo', guessed);
    }

    // Tanpa data zona: pakai zona perangkat bila koordinat dekat meridian zona tersebut.
    var deviceOffset = deviceTzOffset(date);
    var lonDiff = Math.abs(Number(settings.lng) - deviceOffset * 15);
    if (deviceZone && lonDiff <= 22.5) {
      return zoneInfo(deviceOffset, deviceZone, '', formatOffset(deviceOffset), 'device', null);
    }

    var fallback = Math.round(Number(settings.lng) / 15);
    return zoneInfo(fallback, '', '', formatOffset(fallback), 'meridian', null);
  }

  function zoneInfo(offset, iana, friendly, fallbackLabel, source, city) {
    return { offset: offset, iana: iana, friendly: friendly, fallbackLabel: fallbackLabel, source: source, city: city };
  }

  // Label zona yang mudah dikenali: "WIB" untuk zona tanpa DST, "BST" bila bermusim.
  function zoneLabel(resolved, date) {
    if (resolved.friendly && isStableZone(resolved.iana, date)) return resolved.friendly;
    var short = zoneLabelFor(resolved.iana, date);
    return short || resolved.fallbackLabel || formatOffset(resolved.offset);
  }

  function isStableZone(iana, date) {
    if (!iana) return false;
    var y = date.getUTCFullYear();
    var jan = zoneOffsetAt(iana, new Date(Date.UTC(y, 0, 15)));
    var jul = zoneOffsetAt(iana, new Date(Date.UTC(y, 6, 15)));
    return jan !== null && jan === jul;
  }

  /**
   * "Sekarang" yang dinyatakan dalam jam dinding zona target.
   * Dipakai agar perbandingan waktu konsisten walau zona perangkat berbeda —
   * misalnya server UTC menampilkan jadwal WIB.
   */
  function zonedNow(date, offset) {
    var devOff = deviceTzOffset(date);
    if (Math.abs(devOff - offset) < 1e-6) return date;
    var wallUtcMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(),
      date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
    var zoneWallMs = wallUtcMs + (offset - devOff) * 3600000;
    return new Date(zoneWallMs - devOff * 3600000);
  }

  function nowForSettings(date) {
    return zonedNow(date, tzOffsetOf(state.settings, date));
  }

  function deviceTzOffset(date) { return -date.getTimezoneOffset() / 60; }

  function tzOffsetOf(settings, date) {
    return resolveZone(settings, date || new Date()).offset;
  }

  function formatOffset(h) {
    var sign = h < 0 ? '-' : '+';
    var abs = Math.abs(h);
    var hh = Math.floor(abs);
    var mm = Math.round((abs - hh) * 60);
    return 'UTC' + sign + hh + (mm ? ':' + String(mm).padStart(2, '0') : '');
  }

  function formatClock(hoursDecimal, use12) {
    if (typeof hoursDecimal !== 'number' || isNaN(hoursDecimal)) return '--:--';
    var total = Math.round(PT.fixHour(hoursDecimal) * 60);
    var h = Math.floor(total / 60) % 24;
    var m = total % 60;
    if (!use12) return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    var suffix = h < 12 ? 'AM' : 'PM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return String(h12).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' ' + suffix;
  }

  function formatDuration(ms) {
    var totalMin = Math.max(0, Math.round(ms / 60000));
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    return (h > 0 ? h + ' jam ' : '') + m + ' menit';
  }

  function formatCountdown(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  /* --------------------------------- setelan -------------------------------- */
  function loadSettings() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { saved = null; }
    var s = deepMerge(clone(DEFAULTS), saved);
    s.tune = deepMerge(clone(DEFAULTS.tune), (saved && saved.tune) || {});
    return s;
  }

  function saveSettings() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.settings)); } catch (e) { /* mode privat */ }
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function deepMerge(base, extra) {
    if (!extra || typeof extra !== 'object') return base;
    Object.keys(extra).forEach(function (k) {
      var v = extra[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') {
        deepMerge(base[k], v);
      } else if (v !== undefined && v !== null) {
        base[k] = v;
      }
    });
    return base;
  }

  /* ------------------------------ hitung jadwal ------------------------------ */
  function timesFor(date, tzOffset) {
    var s = state.settings;
    return PT.calculate(
      { lat: Number(s.lat), lng: Number(s.lng) },
      dateParts(date),
      { method: s.method, asr: s.asr, highLat: s.highLat, tzOffset: tzOffset, tune: s.tune }
    );
  }

  function buildMoments(now, tz) {
    var today = startOfDay(now);
    var yesterday = new Date(today.getTime() - 86400000);
    var tomorrow = new Date(today.getTime() + 86400000);

    var tY = timesFor(yesterday, tz);
    var tT = timesFor(today, tz);
    var tM = timesFor(tomorrow, tz);

    var moments = [];
    moments.push({ key: 'isha', label: 'Isya', ar: 'الْعِشَاء', sholat: true, ts: PT.toDate(yesterday, tY.isha).getTime(), prev: true });
    TIMELINE.forEach(function (item) {
      if (typeof tT[item.key] !== 'number') return;
      moments.push({
        key: item.key, label: item.label, abbr: item.abbr, ar: item.ar,
        sholat: !!item.sholat, ts: PT.toDate(today, tT[item.key]).getTime()
      });
    });
    if (typeof tM.fajr === 'number') {
      moments.push({ key: 'fajr', label: 'Subuh', abbr: 'Subuh', ar: 'الصُّبْح', sholat: true, ts: PT.toDate(tomorrow, tM.fajr).getTime(), next: true });
    }

    return { today: today, todayTimes: tT, tomorrowTimes: tM, yesterdayTimes: tY, moments: moments };
  }

  function locate(moments, now) {
    for (var i = 0; i < moments.length - 1; i++) {
      if (now >= moments[i].ts && now < moments[i + 1].ts) {
        return { index: i, current: moments[i], next: moments[i + 1] };
      }
    }
    // Di luar rentang (seharusnya tidak terjadi): ambil momen berikutnya.
    var nxt = moments.filter(function (m) { return m.ts > now; })[0] || moments[moments.length - 1];
    return { index: moments.indexOf(nxt) - 1, current: moments[Math.max(0, moments.indexOf(nxt) - 1)], next: nxt };
  }

  /* ================================== RENDER ================================== */
  function renderIdentity() {
    var s = state.settings;
    $('[data-mosque-name]').textContent = s.name;
    $('[data-mosque-address]').textContent = s.address;
    $('[data-ticker-text]').textContent = s.ticker;
    $('[data-method-chip]').textContent = (PT.METHODS[s.method] || PT.METHODS.kemenag).label;
    $('[data-ticker-badge]').textContent = 'INFO';
  }

  function renderClock(now, tz) {
    var s = state.settings;
    var use12 = s.clockFormat === '12';
    var h = now.getHours(), m = now.getMinutes(), sec = now.getSeconds();
    var main, suffix = '';
    if (use12) {
      var h12 = h % 12 === 0 ? 12 : h % 12;
      main = String(h12).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      suffix = h < 12 ? 'AM' : 'PM';
    } else {
      main = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }
    $('[data-clock]').firstChild.nodeValue = main;
    $('[data-clock-sec]').textContent = ':' + String(sec).padStart(2, '0');
    var zone = resolveZone(s, new Date());
    var label = zoneLabel(zone, new Date());
    $('[data-clock-ampm]').textContent = suffix ? suffix + ' · ' + label : label;
  }

  function renderDates(now) {
    var h = PT.gregorianToHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
    var monthly = PT.HIJRI_MONTHS[h.month - 1] || '';
    var monthAr = PT.HIJRI_MONTHS_AR[h.month - 1] || '';
    $('[data-hijri-ar]').textContent = monthAr;
    $('[data-hijri]').textContent = h.day + ' ' + monthly + ' ' + h.year + ' H';
    $('[data-hijri-chip]').textContent = h.day + ' ' + monthly + ' ' + h.year + ' H';
    $('[data-greg]').textContent =
      PT.DAY_NAMES[now.getDay()] + ', ' + now.getDate() + ' ' +
      PT.GREGORIAN_MONTHS[now.getMonth()] + ' ' + now.getFullYear();
  }

  function renderCards(now, ctx) {
    var grid = $('[data-cards]');
    var T = ctx.todayTimes;
    var isFriday = now.getDay() === 5;
    var tz = tzOffsetOf(state.settings, now);
    var use12 = state.settings.clockFormat === '12';

    SHOLAT.forEach(function (item) {
      var card = grid.querySelector('[data-card="' + item.key + '"]');
      if (!card) return;

      var name = item.key === 'dhuhr' && isFriday ? "Jum'at" : item.label;
      card.querySelector('[data-card-name]').textContent = name;
      card.querySelector('[data-card-ar]').textContent = item.ar;

      var todayTs = PT.toDate(ctx.today, T[item.key]).getTime();
      var isCurrent = ctx.current && ctx.current.key === item.key && !ctx.current.next && !ctx.current.prev;
      var isNext = ctx.next && ctx.next.key === item.key && !ctx.next.next;
      var isPast = todayTs < now && !isCurrent;

      var timeText = formatClock(T[item.key], use12);
      card.querySelector('[data-card-time]').textContent = timeText;

      card.classList.toggle('card--now', !!isCurrent);
      card.classList.toggle('card--next', !!isNext && !isCurrent);
      card.classList.toggle('card--past', !!isPast && !isCurrent && !isNext);
      card.classList.toggle('card--jumuah', item.key === 'dhuhr' && isFriday);

      var tag = card.querySelector('[data-card-tag]');
      var hint = card.querySelector('[data-card-hint]');
      if (isCurrent) {
        tag.textContent = 'Berlangsung';
        var elapsed = now - todayTs;
        hint.textContent = 'sejak ' + formatClock(T[item.key], use12).replace(/\s?(AM|PM)$/i, '') + ' · ' + formatDuration(elapsed);
      } else {
        tag.textContent = 'Berikutnya';
        hint.textContent = isNext && ctx.next.ts > todayTs ? 'dalam ' + formatDuration(ctx.next.ts - now) : 'hari ini';
      }
    });
  }

  function renderRing(now, ctx) {
    var total = ctx.next.ts - ctx.current.ts;
    var elapsed = now - ctx.current.ts;
    var frac = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 0;
    var C = 2 * Math.PI * 86;
    var ring = $('[data-ring]');
    ring.setAttribute('stroke-dasharray', C.toFixed(2));
    ring.setAttribute('stroke-dashoffset', (C * (1 - frac)).toFixed(2));

    var isTomorrow = !!ctx.next.next;
    var name = ctx.next.key === 'dhuhr' && now.getDay() === 5 ? "Jum'at" : ctx.next.label;
    $('[data-next-name]').textContent = name + (isTomorrow ? ' (besok)' : '');
    $('[data-next-at]').textContent = 'pukul ' + formatClock(
      hourOfTs(ctx.next, ctx, now), state.settings.clockFormat === '12');
    $('[data-countdown]').textContent = formatCountdown(ctx.next.ts - now);
  }

  // Ambil jam desimal dari timestamp untuk penampilan.
  function hourOfTs(moment, ctx, now) {
    var d = new Date(moment.ts);
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  function renderStatus(now, ctx) {
    var s = state.settings;
    var el = $('[data-status]');
    var isNight = !ctx.current.sholat;
    if (ctx.current.key === 'isha' && ctx.current.next) {
      el.textContent = 'Malam · qiyamul lail hingga Subuh';
    } else if (isNight) {
      el.textContent = 'Menuju waktu ' + ctx.next.label;
    } else if (ctx.current.key === 'fajr') {
      el.textContent = 'Waktu Subuh berlangsung';
    } else {
      el.textContent = 'Waktu ' + ctx.current.label + ' berlangsung';
    }
    if (typeof ctx.todayTimes.lastThird === 'number' && isNight) {
      el.textContent += ' · 1/3 malam ' + formatClock(ctx.todayTimes.lastThird, s.clockFormat === '12');
    }
  }

  function renderStrip(now, ctx) {
    var T = ctx.todayTimes;
    var Y = ctx.yesterdayTimes;
    var use12 = state.settings.clockFormat === '12';
    var sunrise = PT.toDate(ctx.today, T.sunrise).getTime();
    var sunset = PT.toDate(ctx.today, T.sunset).getTime();
    var dayLen = sunset - sunrise;

    var items = [
      { label: 'Imsak', time: formatClock(T.imsak, use12), hint: '10 menit sebelum Subuh' },
      { label: 'Syuruq', time: formatClock(T.sunrise, use12), hint: 'Awal waktu dhuha' },
      { label: 'Panjang siang', time: formatDuration(dayLen), hint: 'Terbit ke terbenam' },
      { label: 'Tengah malam', time: formatClock(T.midnight, use12), hint: 'Sepertiga malam ' + formatClock(T.lastThird, use12) }
    ];

    var wrap = $('[data-strip]');
    wrap.innerHTML = items.map(function (it) {
      return '<div class="mini">' +
        '<span class="mini__label">' + esc(it.label) + '</span>' +
        '<span class="mini__time">' + esc(it.time) + '</span>' +
        '<span class="mini__hint">' + esc(it.hint) + '</span>' +
        '</div>';
    }).join('');
  }

  function renderQibla() {
    var s = state.settings;
    var lat = Number(s.lat), lng = Number(s.lng);
    var distance = greatCircle(lat, lng, KAABA.lat, KAABA.lng);
    var atKaaba = distance < 2; // di dalam radius Masjidil Haram, arah tidak bermakna
    var bearing = qiblaBearing(lat, lng);

    if (atKaaba) {
      $('[data-qibla-deg]').textContent = '—';
      $('[data-qibla-dir]').textContent = 'Di Masjidil Haram';
      $('[data-qibla-dist]').textContent = 'arah kiblat tidak bermakna';
    } else {
      $('[data-qibla-deg]').textContent = bearing.toFixed(1) + '°';
      $('[data-qibla-dir]').textContent = compass(bearing) + ' dari Utara';
      $('[data-qibla-dist]').textContent = Math.round(distance).toLocaleString('id-ID') + ' km ke Ka\'bah';
    }

    var dial = $('[data-qibla-needle]');
    dial.style.transform = 'rotate(' + bearing.toFixed(2) + 'deg)';
    dial.style.opacity = atKaaba ? '.25' : '1';

    var ticks = $('[data-qibla-ticks]');
    if (!ticks.childElementCount) {
      var html = '';
      for (var a = 0; a < 360; a += 15) {
        var major = a % 90 === 0;
        html += '<line x1="60" y1="' + (major ? 6 : 9) + '" x2="60" y2="' + (major ? 16 : 13) + '" ' +
                'transform="rotate(' + a + ' 60 60)"/>';
      }
      ticks.innerHTML = html;
    }
  }

  function qiblaBearing(lat, lng) {
    var p1 = lat * Math.PI / 180, p2 = KAABA.lat * Math.PI / 180;
    var dl = (KAABA.lng - lng) * Math.PI / 180;
    var y = Math.sin(dl);
    var x = Math.cos(p1) * Math.tan(p2) - Math.sin(p1) * Math.cos(dl);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function compass(deg) {
    var dirs = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
    return dirs[Math.round(deg / 45) % 8];
  }

  /* -------------------------------- busur matahari ---------------------------- */
  function renderArc(now, ctx) {
    var s = state.settings;
    var tz = tzOffsetOf(s, now);
    var coords = { lat: Number(s.lat), lng: Number(s.lng) };
    var parts = dateParts(ctx.today);

    // Koordinat harus selaras dengan garis ufuk & cincin bantu di index.html.
    var HORIZON = 214, TOP = 40, X0 = 30, X1 = 590, SPAN = X1 - X0;
    var scale = (HORIZON - TOP) / 90;
    var LABEL_ROWS = 3, LABEL_ROW_H = 19, LABEL_MIN_GAP = 44;
    var xOf = function (h) { return X0 + (h / 24) * SPAN; };
    var yOf = function (e) { return HORIZON - (e || 0) * scale; };

    // Kurva elevasi matahari sepanjang hari (sampel 10 menit).
    var samples = [];
    for (var h = 0; h <= 24.0001; h += 1 / 6) {
      var e = PT.sunElevation(coords, parts, h, tz);
      samples.push({ h: h, e: e === null ? -90 : e });
    }

    var linePts = samples.map(function (p) { return [xOf(p.h), yOf(p.e)]; });
    var linePath = smoothPath(linePts);

    // Bidang siang: hanya bagian di atas ufuk.
    var above = samples.filter(function (p) { return p.e >= 0; });
    var areaPath = '';
    if (above.length > 1) {
      var areaPts = above.map(function (p) { return [xOf(p.h), yOf(p.e)]; });
      areaPath = 'M' + xOf(above[0].h).toFixed(1) + ',' + HORIZON +
        ' L' + areaPts.map(function (pt) { return pt[0].toFixed(1) + ',' + pt[1].toFixed(1); }).join(' L') +
        ' L' + xOf(above[above.length - 1].h).toFixed(1) + ',' + HORIZON + ' Z';
    }

    $('[data-arc-line]').setAttribute('d', linePath);
    $('[data-arc-area]').setAttribute('d', areaPath);

    // Penanda waktu.
    var T = ctx.todayTimes;
    var marks = [];
    ARC_MARKS.forEach(function (item) {
      if (typeof T[item.key] !== 'number') return;
      var hour = T[item.key];
      var e = PT.sunElevation(coords, parts, hour, tz);
      marks.push({ item: item, h: hour, e: e === null ? -90 : e, x: xOf(hour), y: yOf(e === null ? -90 : e) });
    });
    marks.sort(function (a, b) { return a.x - b.x; });

    // Label bergantian baris bila berdekatan agar tidak saling tumpang.
    var rows = [];
    marks.forEach(function (m) {
      var row = 0;
      for (var r = 0; r < LABEL_ROWS; r++) {
        if (rows[r] === undefined || m.x - rows[r] >= LABEL_MIN_GAP) { row = r; break; }
        row = r + 1;
      }
      if (row >= LABEL_ROWS) row = LABEL_ROWS - 1;
      m.row = row;
      rows[row] = m.x;
    });

    var markHtml = marks.map(function (m) {
      var dotY = Math.max(HORIZON - 4, Math.min(HORIZON + 38, m.y));
      var labelY = HORIZON + 26 + m.row * LABEL_ROW_H;
      var below = m.e < 0 ? ' arc-mark__dot--below' : '';
      return '<g class="arc-mark">' +
        '<line class="arc-mark__stem" x1="' + m.x.toFixed(1) + '" y1="' + Math.min(HORIZON, dotY).toFixed(1) +
          '" x2="' + m.x.toFixed(1) + '" y2="' + Math.max(HORIZON, dotY).toFixed(1) + '"/>' +
        '<circle class="arc-mark__dot' + below + '" cx="' + m.x.toFixed(1) + '" cy="' + dotY.toFixed(1) + '" r="3.4"/>' +
        '<text class="arc-mark__label" x="' + m.x.toFixed(1) + '" y="' + labelY + '" text-anchor="middle">' +
          esc(m.item.abbr) + '</text>' +
        '<text class="arc-mark__time" x="' + m.x.toFixed(1) + '" y="' + (labelY + 11) + '" text-anchor="middle">' +
          formatClock(m.h, false) + '</text>' +
        '</g>';
    }).join('');

    // Penanda posisi matahari sekarang.
    var nowHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    var nowElev = PT.sunElevation(coords, parts, nowHour, tz);
    if (nowElev !== null) {
      var nx = xOf(nowHour), ny = Math.max(HORIZON - 4, Math.min(252, yOf(nowElev)));
      markHtml += '<circle class="arc__sun-core" cx="' + nx.toFixed(1) + '" cy="' + ny.toFixed(1) + '" r="4" ' +
                  'style="filter:drop-shadow(0 0 8px rgba(232,131,74,.9));fill:var(--live)"/>';
    }
    $('[data-arc-marks]').innerHTML = markHtml;

    // Bola matahari mengikuti posisi sekarang.
    var sunY = Math.max(TOP + 10, Math.min(HORIZON + 40, yOf(nowElev === null ? -90 : nowElev)));
    $('[data-arc-sun]').setAttribute('transform', 'translate(' + xOf(nowHour).toFixed(1) + ',' + sunY.toFixed(1) + ')');
    $('[data-arc-sun]').style.opacity = nowElev !== null && nowElev < -2 ? '.35' : '1';

    // Legenda ringkas.
    var sunriseTs = PT.toDate(ctx.today, T.sunrise).getTime();
    var sunsetTs = PT.toDate(ctx.today, T.sunset).getTime();
    var dayMs = sunsetTs - sunriseTs;
    $('[data-arc-legend]').innerHTML =
      legend('Terbit', formatClock(T.sunrise, state.settings.clockFormat === '12')) +
      legend('Terbenam', formatClock(T.sunset, state.settings.clockFormat === '12')) +
      legend('Panjang siang', formatDuration(dayMs)) +
      legend('Tengah malam', formatClock(T.midnight, state.settings.clockFormat === '12'));
  }

  function legend(k, v) {
    return '<span>' + esc(k) + ' <b>' + esc(v) + '</b></span>';
  }

  function smoothPath(pts) {
    if (!pts.length) return '';
    var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      d += ' L' + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1);
    }
    return d;
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------------------------- latar ---------------------------------- */
  /* Daftar foto: bawaan, atau bawaan + URL tambahan dari pengaturan.
     Baris "keterangan | tempat | kredit | url" didukung untuk kustomisasi. */
  function galleryItems(listOverride) {
    var raw = (typeof listOverride === 'string' ? listOverride : (state.settings.galleryList || '')).split('\n');
    var items = [];
    raw.forEach(function (line) {
      line = line.trim();
      if (!line || line.charAt(0) === '#') return;
      var parts = line.split('|').map(function (s) { return s.trim(); });
      var src = parts[parts.length - 1];
      if (!/^(https?:|\/|\.{0,2}\/|[A-Za-z0-9_-]+\/)/.test(src) && !/\.(jpe?g|png|webp|avif|gif)$/i.test(src)) return;
      items.push({
        src: src,
        caption: parts.length > 1 ? parts[0] : '',
        place: parts.length > 2 ? parts[1] : '',
        credit: parts.length > 3 ? parts[2] : ''
      });
    });
    // Foto bawaan selalu dipakai; daftar pengguna menyusul di belakangnya.
    return DEFAULT_GALLERY.concat(items);
  }

  function renderGallery() {
    var layer = $('[data-gallery-track]');
    if (!layer) return;

    var dim = state.settings.galleryDim || 'medium';
    document.documentElement.setAttribute('data-dim', dim);

    var on = state.settings.galleryOn && galleryItems().length > 0;
    layer.hidden = !on;
    var scrim = $('.atmos__scrim');
    if (scrim) scrim.hidden = !on;
    var bar = $('[data-gallery-bar]');
    if (bar) bar.hidden = !on;
    if (!on) { stopGallery(); return; }

    var items = galleryItems();
    state.galleryItems = items;

    layer.innerHTML = items.map(function (it, i) {
      return '<img class="atmos__photo' + (i === 0 ? ' is-active' : '') + '" data-gallery-slide="' + i + '"' +
        ' src="' + esc(it.src) + '" alt="" aria-hidden="true"' +
        (i === 0 ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"') + '>';
    }).join('');

    $('[data-gallery-dots]').innerHTML = items.map(function (it, i) {
      return '<button class="gal-dot' + (i === 0 ? ' is-active' : '') + '" type="button" role="tab" ' +
        'data-gallery-dot="' + i + '" aria-label="Latar ' + (i + 1) + (it.caption ? ': ' + esc(it.caption) : '') + '"' +
        ' aria-selected="' + (i === 0 ? 'true' : 'false') + '"></button>';
    }).join('');

    if (state.galleryIndex >= items.length) state.galleryIndex = 0;
    showSlide(state.galleryIndex, false);

    updateGalleryNote();
    startGallery();
  }

  function showSlide(i, animate) {
    var items = state.galleryItems;
    if (!items.length) return;
    var n = items.length;
    state.galleryIndex = ((i % n) + n) % n;

    $$('[data-gallery-slide]').forEach(function (el) {
      // Foto latar murni dekoratif: tidak pernah diekspos ke pembaca layar.
      el.classList.toggle('is-active', Number(el.getAttribute('data-gallery-slide')) === state.galleryIndex);
    });
    $$('[data-gallery-dot]').forEach(function (el) {
      var active = Number(el.getAttribute('data-gallery-dot')) === state.galleryIndex;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    var cur = items[state.galleryIndex];
    var creditEl = $('[data-gallery-credit]');
    if (creditEl) {
      // Kredit tampil di masthead: keterangan foto + pemilik hak.
      creditEl.textContent = [cur.caption, cur.credit].filter(Boolean).join(' · ');
      creditEl.hidden = !(cur.caption || cur.credit);
    }

    if (animate !== false) restartGalleryTimer();
  }

  function galleryStep(delta) { showSlide(state.galleryIndex + delta); }

  function galleryPaused() {
    if (state.galleryPaused || document.hidden) return true;
    // Modal atau layar adzan menutup pandangan, jadi tayangan dijeda.
    var overlays = ['[data-modal-settings]', '[data-modal-monthly]', '[data-adhan]'];
    for (var i = 0; i < overlays.length; i++) {
      var el = $(overlays[i]);
      if (el && !el.hidden) return true;
    }
    return false;
  }

  function stopGallery() {
    clearInterval(state.galleryTimer);
    state.galleryTimer = null;
  }

  function startGallery() {
    stopGallery();
    if (!state.settings.galleryOn) return;
    if (galleryPaused()) return;
    var secs = Math.max(3, Math.min(120, Number(state.settings.galleryInterval) || 8));
    state.galleryTimer = setInterval(function () {
      if (!galleryPaused()) galleryStep(1);
    }, secs * 1000);
  }

  function restartGalleryTimer() {
    if (!state.galleryPaused) startGallery();
  }

  function toggleGalleryPause() {
    state.galleryPaused = !state.galleryPaused;
    var btn = $('[data-gallery-toggle]');
    if (btn) {
      btn.setAttribute('aria-pressed', state.galleryPaused ? 'true' : 'false');
      btn.setAttribute('aria-label', state.galleryPaused ? 'Lanjutkan tayangan latar' : 'Jeda tayangan latar');
    }
    startGallery();
  }

  function bindGallery() {
    // Pratinjau jumlah foto saat daftar diubah, sebelum disimpan.
    var listEl = document.querySelector('[data-in="galleryList"]');
    if (listEl) {
      listEl.addEventListener('input', function () { updateGalleryNote(listEl.value); });
    }

    var dotBox = $('[data-gallery-dots]');
    if (dotBox) {
      dotBox.addEventListener('click', function (e) {
        var dot = e.target.closest('[data-gallery-dot]');
        if (dot) showSlide(Number(dot.getAttribute('data-gallery-dot')));
      });
    }

    var toggle = $('[data-gallery-toggle]');
    if (toggle) toggle.addEventListener('click', toggleGalleryPause);

    // Bila tab kembali aktif, timer dijalankan ulang agar tidak menumpuk.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopGallery();
      else startGallery();
    });

    if (window.matchMedia) {
      var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
      var onChange = function () { if (rm.matches) stopGallery(); else startGallery(); };
      if (rm.addEventListener) rm.addEventListener('change', onChange);
      else if (rm.addListener) rm.addListener(onChange);
    }
  }

  /* ---------------------------------- adzan --------------------------------- */
  function checkAdhan(now, ctx) {
    var s = state.settings;
    var key = ctx.current.key;
    if (!ctx.current.sholat) return;
    var id = dateKey(now) + ':' + key;
    if (state.fired[id]) return;

    var since = now - ctx.current.ts;
    if (since > 90000) { state.fired[id] = true; return; } // sudah lewat jauh
    state.fired[id] = true;

    if (s.adhanSound) playChime();
    if (s.adhanOverlay) showAdhan(ctx.current);
  }

  function showAdhan(moment) {
    var layer = $('[data-adhan]');
    $('[data-adhan-name]').textContent = moment.label;
    $('[data-adhan-ar]').textContent = moment.ar || '';
    $('[data-adhan-time]').textContent = formatClock(
      new Date(moment.ts).getHours() + new Date(moment.ts).getMinutes() / 60,
      state.settings.clockFormat === '12');
    layer.hidden = false;
    stopGallery();
    clearTimeout(showAdhan._t);
    showAdhan._t = setTimeout(hideAdhan, 45000);
  }

  function hideAdhan() {
    $('[data-adhan]').hidden = true;
    startGallery();
  }

  function playChime() {
    try {
      if (!state.audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        state.audioCtx = new AC();
      }
      var ctx = state.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      var notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach(function (f, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        var t0 = ctx.currentTime + i * 0.45;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.16, t0 + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.7);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 1.8);
      });
    } catch (e) { /* audio opsional */ }
  }

  /* ---------------------------------- daur ulang ----------------------------- */
  function recompute(realNow) {
    var now = nowForSettings(realNow);
    var tz = tzOffsetOf(state.settings, realNow);
    var ctx = buildMoments(now, tz);
    var loc = locate(ctx.moments, now.getTime());
    ctx.current = loc.current;
    ctx.next = loc.next;
    state.data = ctx;
    state.todayKey = dateKey(now);

    renderIdentity();
    renderDates(now);
    renderClock(now, tz);
    renderCards(now, ctx);
    renderRing(now, ctx);
    renderStatus(now, ctx);
    renderStrip(now, ctx);
    renderQibla();
    renderArc(now, ctx);
  }

  function tick() {
    var realNow = new Date();
    var now = nowForSettings(realNow);
    if (dateKey(now) !== state.todayKey) {
      state.fired = {};
      recompute(realNow);
      checkAdhan(now, state.data);
      return;
    }
    var ctx = state.data;
    var loc = locate(ctx.moments, now.getTime());
    if (loc.next.ts !== ctx.next.ts) {
      recompute(realNow);
      checkAdhan(now, state.data);
      return;
    }
    ctx.current = loc.current;
    ctx.next = loc.next;

    renderClock(now, tzOffsetOf(state.settings, realNow));
    renderCards(now, ctx);
    renderRing(now, ctx);
    renderStatus(now, ctx);
    checkAdhan(now, ctx);
  }

  /* ------------------------------ jadwal sebulan ----------------------------- */
  function openMonthly() {
    var now = nowForSettings(new Date());
    state.modalMonth = { year: now.getFullYear(), month: now.getMonth() };
    renderMonthly();
    stopGallery();
    $('[data-modal-monthly]').hidden = false;
  }

  function renderMonthly() {
    var m = state.modalMonth;
    var tz = tzOffsetOf(state.settings, new Date());
    var use12 = state.settings.clockFormat === '12';
    var first = new Date(m.year, m.month, 1);
    var days = new Date(m.year, m.month + 1, 0).getDate();
    var todayK = dateKey(nowForSettings(new Date()));

    $('[data-monthly-sub]').textContent =
      PT.GREGORIAN_MONTHS[m.month] + ' ' + m.year + ' · ' +
      (CITIES.filter(function (c) { return c.name === state.settings.city; })[0] || {}).name +
      ' · ' + (PT.METHODS[state.settings.method] || PT.METHODS.kemenag).label;

    var rows = '';
    for (var d = 1; d <= days; d++) {
      var date = new Date(m.year, m.month, d);
      var t = timesFor(date, tz);
      var h = PT.gregorianToHijri(m.year, m.month + 1, d);
      var isToday = dateKey(date) === todayK;
      var isFri = date.getDay() === 5;
      rows += '<tr class="' + (isToday ? 'is-today ' : '') + (isFri ? 'is-friday' : '') + '">' +
        '<td>' + PT.DAY_NAMES[date.getDay()] + ', ' + d + '</td>' +
        '<td>' + h.day + ' ' + esc((PT.HIJRI_MONTHS[h.month - 1] || '').slice(0, 9)) + '</td>' +
        cell(t.imsak, use12, 'dim') +
        cell(t.fajr, use12, 'hl') +
        cell(t.sunrise, use12, 'dim') +
        cell(t.dhuhr, use12, 'hl') +
        cell(t.asr, use12, 'hl') +
        cell(t.maghrib, use12, 'hl') +
        cell(t.isha, use12, 'hl') +
        '</tr>';
    }
    $('[data-monthly-body]').innerHTML = rows;
  }

  function cell(hours, use12, cls) {
    return '<td class="num ' + cls + '">' + esc(formatClock(hours, use12)) + '</td>';
  }

  /* ---------------------------------- modal --------------------------------- */
  var FORM_FIELDS = ['name', 'address', 'ticker', 'city', 'lat', 'lng', 'tzMode', 'tzOffset',
    'method', 'asr', 'highLat', 'clockFormat', 'theme', 'adhanSound', 'adhanOverlay',
    'galleryOn', 'galleryInterval', 'galleryDim', 'galleryList'];

  function populateSelects() {
    var methodSel = $('[data-in="method"]');
    methodSel.innerHTML = Object.keys(PT.METHODS).map(function (k) {
      var m = PT.METHODS[k];
      return '<option value="' + k + '">' + esc(m.label) + ' — ' + esc(m.region) + '</option>';
    }).join('');

    var hlSel = $('[data-in="highLat"]');
    hlSel.innerHTML = Object.keys(PT.HIGH_LAT).map(function (k) {
      return '<option value="' + k + '">' + esc(PT.HIGH_LAT[k]) + '</option>';
    }).join('');

    var citySel = $('[data-in="city"]');
    citySel.innerHTML = CITIES.map(function (c) {
      return '<option value="' + esc(c.name) + '">' + esc(c.name + ' · ' + c.zone) + '</option>';
    }).join('');

    var tuneGrid = $('[data-tune-grid]');
    tuneGrid.innerHTML = TIMELINE.map(function (t) {
      return '<label class="field"><span>' + esc(t.label) + '</span>' +
        '<input type="number" step="1" min="-30" max="30" data-tune="' + t.key + '"></label>';
    }).join('');
  }

  function fillForm() {
    var s = state.settings;
    FORM_FIELDS.forEach(function (k) {
      var el = document.querySelector('[data-in="' + k + '"]');
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!s[k];
      else el.value = s[k];
    });
    $$('[data-tune]').forEach(function (el) {
      el.value = s.tune[el.getAttribute('data-tune')] || 0;
    });
    updateMethodNote();
    updateGalleryNote();
  }

  function updateGalleryNote(listOverride) {
    var el = $('[data-gallery-note]');
    if (!el) return;
    var custom = galleryItems(listOverride).length - DEFAULT_GALLERY.length;
    var total = custom + DEFAULT_GALLERY.length;
    el.textContent = custom > 0
      ? total + ' foto siap tayang (' + custom + ' tambahan dari daftar Anda).'
      : total + ' foto bawaan siap tayang. Tambahkan alamat gambar untuk menambah foto.';
  }

  function readForm() {
    var s = clone(state.settings);
    FORM_FIELDS.forEach(function (k) {
      var el = document.querySelector('[data-in="' + k + '"]');
      if (!el) return;
      if (el.type === 'checkbox') s[k] = el.checked;
      else if (el.type === 'number') s[k] = parseFloat(el.value);
      else s[k] = el.value;
    });
    s.lat = parseFloat(s.lat);
    s.lng = parseFloat(s.lng);
    s.tzOffset = parseFloat(s.tzOffset);
    s.tune = {};
    $$('[data-tune]').forEach(function (el) {
      s.tune[el.getAttribute('data-tune')] = parseFloat(el.value) || 0;
    });
    return s;
  }

  function updateMethodNote() {
    var key = $('[data-in="method"]').value;
    var m = PT.METHODS[key];
    $('[data-method-note]').textContent = m ? m.note : '';
    var asrSel = $('[data-in="asr"]');
    asrSel.disabled = !m;
  }

  function openSettings() {
    fillForm();
    stopGallery();
    $('[data-modal-settings]').hidden = false;
  }

  function closeSettings() {
    $('[data-modal-settings]').hidden = true;
    startGallery();
  }

  function applySettings(next, message) {
    state.settings = next;
    saveSettings();
    document.documentElement.setAttribute('data-theme', next.theme);
    state.arcCacheKey = null;
    state.fired = {};
    recompute(new Date());
    renderGallery();
    if (message) toast(message);
  }

  function toast(msg) {
    var el = $('[data-toast]');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.hidden = true; }, 2600);
  }

  /* ---------------------------------- acara --------------------------------- */
  function bind() {
    $('[data-open-settings]').addEventListener('click', openSettings);
    $$('[data-close-settings]').forEach(function (el) {
      el.addEventListener('click', closeSettings);
    });

    $('[data-in="method"]').addEventListener('change', updateMethodNote);

    $('[data-in="city"]').addEventListener('change', function () {
      var c = CITIES.filter(function (x) { return x.name === this.value; }.bind(this))[0];
      if (!c) return;
      $('[data-in="lat"]').value = c.lat;
      $('[data-in="lng"]').value = c.lng;
      $('[data-in="tzMode"]').value = 'manual';
      $('[data-in="tzOffset"]').value = c.tz;
      toast('Lokasi disetel ke ' + c.name + ' (' + c.zone + ')');
    });

    $('[data-save]').addEventListener('click', function () {
      var next = readForm();
      if (isNaN(next.lat) || isNaN(next.lng)) { toast('Lintang/bujur tidak sah'); return; }
      applySettings(next, 'Pengaturan disimpan');
      closeSettings();
    });

    $('[data-reset]').addEventListener('click', function () {
      if (!window.confirm('Kembalikan seluruh pengaturan ke bawaan?')) return;
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* abaikan */ }
      applySettings(loadSettings(), 'Pengaturan dikembalikan ke bawaan');
      fillForm();
    });

    $('[data-open-monthly]').addEventListener('click', openMonthly);
    $$('[data-close-monthly]').forEach(function (el) {
      el.addEventListener('click', function () {
        $('[data-modal-monthly]').hidden = true;
        startGallery();
      });
    });
    $('[data-month-prev]').addEventListener('click', function () {
      state.modalMonth.month--;
      if (state.modalMonth.month < 0) { state.modalMonth.month = 11; state.modalMonth.year--; }
      renderMonthly();
    });
    $('[data-month-next]').addEventListener('click', function () {
      state.modalMonth.month++;
      if (state.modalMonth.month > 11) { state.modalMonth.month = 0; state.modalMonth.year++; }
      renderMonthly();
    });
    $('[data-print]').addEventListener('click', function () { window.print(); });

    $('[data-adhan-close]').addEventListener('click', hideAdhan);

    $('[data-toggle-fullscreen]').addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', function () {
      document.body.classList.toggle('is-kiosk', !!document.fullscreenElement);
    });

    document.addEventListener('keydown', function (e) {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === 's' || e.key === 'S') { openSettings(); }
      if (e.key === 'm' || e.key === 'M') { openMonthly(); }
      if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); }
      if (e.key === 'ArrowLeft') { galleryStep(-1); }
      if (e.key === 'ArrowRight') { galleryStep(1); }
      if (e.key === ' ') { e.preventDefault(); toggleGalleryPause(); }
      if (e.key === 'Escape') {
        closeSettings();
        $('[data-modal-monthly]').hidden = true;
        startGallery();
        hideAdhan();
      }
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen || function () {})
        .call(document.documentElement).catch(function () { toast('Layar penuh tidak diizinkan'); });
    } else {
      document.exitFullscreen();
    }
  }

  /* ---------------------------------- mulai --------------------------------- */
  function init() {
    state.settings = loadSettings();
    document.documentElement.setAttribute('data-theme', state.settings.theme);

    // Kerangka kartu dibangun sekali, lalu diperbarui tiap detik.
    $('[data-cards]').innerHTML = SHOLAT.map(function (item) {
      return '<article class="card" data-card="' + item.key + '">' +
        '<span class="card__arabic" data-card-ar>' + esc(item.ar) + '</span>' +
        '<span class="card__time" data-card-time>--:--</span>' +
        '<span class="card__name" data-card-name>' + esc(item.label) + '</span>' +
        '<div class="card__foot">' +
          '<span data-card-hint>—</span>' +
          '<span class="card__tag" data-card-tag></span>' +
        '</div>' +
        '</article>';
    }).join('');

    populateSelects();
    bind();
    bindGallery();

    var nowReal = new Date();
    var now = nowForSettings(nowReal);
    recompute(nowReal);
    renderGallery();
    checkAdhan(now, state.data);

    state.tickTimer = setInterval(tick, 1000);
    window.addEventListener('resize', debounce(function () {
      renderArc(nowForSettings(new Date()), state.data);
    }, 200));
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) recompute(new Date());
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Untuk pengujian / otomatisasi.
  window.JadwalSholat = {
    state: state,
    recompute: function () { recompute(new Date()); },
    openSettings: openSettings,
    openMonthly: openMonthly,
    settings: function () { return state.settings; },
    galleryItems: galleryItems,
    gallery: function () { return { index: state.galleryIndex, paused: state.galleryPaused, items: state.galleryItems.length, running: !!state.galleryTimer }; },
    galleryStep: galleryStep,
    galleryPause: toggleGalleryPause,
    apply: function (patch) {
      var next = deepMerge(clone(state.settings), patch);
      applySettings(next, '');
    }
  };
})();
