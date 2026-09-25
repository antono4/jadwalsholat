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
  // Sumber tunggal: window.PrayerTimes.CITIES (dipakai juga oleh display.html).
  var CITIES = PT.CITIES;

  /* ----------------------------- linimasa waktu ------------------------------ */
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
    galleryList: '',
    /* Saldo kas disimpan per dana. Bawaan mati supaya masjid yang belum
       mengisi saldo tidak menampilkan "Rp 0" di papan jamaah. */
    kasOn: false,
    kasAsOf: '',
    kasNote: '',
    kasFunds: null,
    /* Cuaca ikut kota yang dipilih. Bawaan hidup karena kartunya hanya membaca,
       dan koordinatnya sudah benar sejak awal. */
    cuacaOn: true
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
    galleryItems: [],
    cuacaReading: null,
    cuacaAt: 0,
    cuacaTimer: null,
    cuacaBusy: false,
    cuacaLastKey: ''
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
  // Utilitas zona waktu tinggal di prayer-times.js agar dipakai bersama display.html.
  var deviceZone = PT.DEVICE_ZONE;
  var zoneSupported = PT.ZONE_SUPPORTED;
  var zoneOffsetAt = PT.zoneOffsetAt;
  var zoneLabelFor = PT.zoneLabelFor;
  var formatOffset = PT.formatOffset;

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
    // Lengkapi dana yang hilang agar data lama/rusak tidak membuat panel kosong.
    s.kasFunds = Kas.normalize({ funds: s.kasFunds }).funds;
    s.kasOn = !!s.kasOn;
    s.kasAsOf = typeof s.kasAsOf === 'string' ? s.kasAsOf : '';
    s.kasNote = typeof s.kasNote === 'string' ? s.kasNote : '';
    s.cuacaOn = s.cuacaOn !== false;
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
    var seconds = ':' + String(sec).padStart(2, '0');

    // Dua permukaan jam: ringkas di bilah atas, besar di panel fokus.
    $('[data-clock]').textContent = main;
    $('[data-clock-sec]').textContent = seconds;
    $('[data-clock-big]').firstChild.nodeValue = main;
    $('[data-clockface-sec]').textContent = seconds;

    var zone = resolveZone(s, new Date());
    var label = zoneLabel(zone, new Date());
    $('[data-clock-ampm]').textContent = suffix ? suffix + ' · ' + label : label;
    $('[data-clockface-zone]').textContent = suffix ? suffix + ' · ' + label : label;
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

  function renderRail(now, ctx) {
    var T = ctx.todayTimes;
    var isFriday = now.getDay() === 5;
    var use12 = state.settings.clockFormat === '12';
    var anyPassed = false;

    SHOLAT.forEach(function (item, i) {
      var stop = $('[data-card="' + item.key + '"]');
      if (!stop) return;

      var todayTs = PT.toDate(ctx.today, T[item.key]).getTime();
      var isCurrent = ctx.current && ctx.current.key === item.key && !ctx.current.next && !ctx.current.prev;
      var isNext = ctx.next && ctx.next.key === item.key && !ctx.next.next;
      var isPast = todayTs < now && !isCurrent;

      stop.querySelector('[data-card-name]').textContent =
        item.key === 'dhuhr' && isFriday ? "Jum'at" : item.label;
      stop.querySelector('[data-card-ar]').textContent = item.ar;
      stop.querySelector('[data-card-time]').textContent = formatClock(T[item.key], use12);

      stop.classList.toggle('stop--now', !!isCurrent);
      stop.classList.toggle('stop--next', !!isNext && !isCurrent);
      stop.classList.toggle('stop--past', !!isPast && !isCurrent && !isNext);
      stop.classList.toggle('stop--jumuah', item.key === 'dhuhr' && isFriday);

      // Urutan tidak lagi menyiratkan "berikutnya", jadi penanda harus eksplisit.
      if (isCurrent) stop.setAttribute('aria-current', 'step');
      else stop.removeAttribute('aria-current');

      var state_ = stop.querySelector('[data-card-state]');
      if (state_) {
        state_.textContent = isCurrent ? 'Berlangsung' : isNext ? 'Berikutnya'
          : isPast || anyPassed ? 'Selesai' : 'Menanti';
      }
      if (isPast || isCurrent) anyPassed = true;

      // Bilah kecil menandai kemajuan menuju waktu ini.
      var fill = stop.querySelector('[data-card-fill]');
      if (fill) {
        if (isCurrent) fill.style.width = '100%';
        else if (isNext) {
          var prevTs = ctx.current ? ctx.current.ts : todayTs;
          var span = todayTs - prevTs;
          fill.style.width = span > 0 ? Math.round(Math.min(1, Math.max(0, (now - prevTs) / span)) * 100) + '%' : '0%';
        } else fill.style.width = isPast ? '100%' : '0%';
      }
    });
  }

  function renderNextUp(now, ctx) {
    var total = ctx.next.ts - ctx.current.ts;
    var elapsed = now - ctx.current.ts;
    var frac = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 0;
    var pct = Math.round(frac * 100);

    var isTomorrow = !!ctx.next.next;
    var name = ctx.next.key === 'dhuhr' && now.getDay() === 5 ? "Jum'at" : ctx.next.label;

    $('[data-next-name]').textContent = name + (isTomorrow ? ' (besok)' : '');
    $('[data-next-ar]').textContent = ctx.next.ar || '—';
    $('[data-next-at]').textContent = 'pukul ' + formatClock(
      hourOfTs(ctx.next, ctx, now), state.settings.clockFormat === '12');
    $('[data-countdown]').textContent = formatCountdown(ctx.next.ts - now);
    $('[data-next-span]').textContent = isTomorrow
      ? 'selang ' + formatDuration(total)
      : formatDuration(now - ctx.current.ts) + ' dari ' + formatDuration(total);

    $('[data-next-bar]').style.width = pct + '%';
    var bar = $('[data-next-progress]');
    if (bar) bar.setAttribute('aria-valuenow', String(pct));
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

  function renderTimes(now, ctx) {
    var T = ctx.todayTimes;
    var use12 = state.settings.clockFormat === '12';
    var sunrise = PT.toDate(ctx.today, T.sunrise).getTime();
    var sunset = PT.toDate(ctx.today, T.sunset).getTime();

    var items = [
      { label: 'Imsak', time: formatClock(T.imsak, use12), hint: '10 menit sebelum Subuh' },
      { label: 'Syuruq', time: formatClock(T.sunrise, use12), hint: 'Awal waktu dhuha' },
      { label: 'Panjang siang', time: formatDuration(sunset - sunrise), hint: 'Terbit ke terbenam' },
      { label: 'Tengah malam', time: formatClock(T.midnight, use12),
        hint: 'Sepertiga malam ' + formatClock(T.lastThird, use12) }
    ];

    $('[data-strip]').innerHTML = items.map(function (it) {
      return '<li class="times__row">' +
        '<span class="times__label">' + esc(it.label) + '</span>' +
        '<span class="times__time">' + esc(it.time) + '</span>' +
        '<span class="times__hint">' + esc(it.hint) + '</span>' +
        '</li>';
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
        var sedang = !major && a % 30 === 0;
        html += '<line x1="60" y1="' + (major ? 6 : (sedang ? 8 : 9)) + '" x2="60" y2="' +
                (major ? 16 : (sedang ? 14 : 13)) + '"' +
                (major ? ' class="qibla__tick--major"' : '') +
                ' transform="rotate(' + a + ' 60 60)"/>';
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

  /* ---------------------------------- cuaca ---------------------------------- */

  /* Kota dipakai hanya sebagai cadangan koordinat bila setelan belum menyimpan
     lat/lng sendiri. */
  function cityFor(nama) {
    var found = CITIES.filter(function (c) { return c.name === nama; })[0];
    return found || CITIES[0];
  }

  /* Koordinat cuaca mengikuti kota yang dipilih, bukan daftar terpisah, supaya
     suhu dan jadwal sholat tidak pernah mengacu tempat berbeda. */
  function cuacaCoords() {
    var s = state.settings;
    var lat = Number(s.lat), lng = Number(s.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat: lat, lng: lng };
    var c = cityFor(s.city);
    return { lat: c.lat, lng: c.lng };
  }

  /* Gambar cuaca ke wadahnya. `nada` diberikan saat data sudah basi atau gagal,
     supaya jamaah tahu angkanya bukan bacaan terkini. */
  function renderCuaca(nada) {
    var box = $('[data-cuaca]');
    if (!box) return;

    if (!state.settings.cuacaOn) {
      box.hidden = true;
      return;
    }
    box.hidden = false;

    var r = state.cuacaReading;
    if (!r) {
      box.setAttribute('data-state', 'memuat');
      box.innerHTML = '<span class="cuaca__loading">Memuat cuaca…</span>';
      return;
    }

    var d = Cuaca.describe(r);
    box.setAttribute('data-state', nada || 'siap');
    box.innerHTML = Cuaca.markup(d, { label: true });
  }

  /* Ambil cuaca tanpa pernah membuang angka lama saat jaringan gagal: papan
     yang kehilangan internet tetap menampilkan bacaan terakhir sambil
     menandainya basi. */
  function muatCuaca() {
    if (!state.settings.cuacaOn || !window.Cuaca) return;
    if (state.cuacaBusy) return;

    var pos = cuacaCoords();
    var kunci = Cuaca.cacheKeyFor(pos.lat, pos.lng);
    if (kunci !== state.cuacaLastKey) {
      state.cuacaLastKey = kunci;
      state.cuacaReading = Cuaca.readCache(pos.lat, pos.lng);
      // Singgahan langsung ditayangkan supaya jaringan lambat tidak membuat
      // papan kosong selama beberapa detik.
      if (state.cuacaReading) {
        renderCuaca(Cuaca.isStale(state.cuacaReading.at) ? 'basi' : 'siap');
      }
    }

    state.cuacaBusy = true;
    Cuaca.fetchReading({ lat: pos.lat, lng: pos.lng }).then(function (r) {
      state.cuacaBusy = false;
      state.cuacaReading = r;
      Cuaca.writeCache(pos.lat, pos.lng, r);
      renderCuaca('siap');
    }, function () {
      state.cuacaBusy = false;
      renderCuaca(state.cuacaReading ? (Cuaca.isStale(state.cuacaReading.at) ? 'basi' : 'luring') : 'gagal');
    });
  }

  /* Singgahan disegarkan tiap sepuluh menit, dan sekali lagi saat tab kembali
     terlihat supaya papan yang lama menganggur tidak menyajikan angka basi. */
  function mulaiCuaca() {
    if (!window.Cuaca) return;
    muatCuaca();
    clearInterval(state.cuacaTimer);
    state.cuacaTimer = setInterval(muatCuaca, Cuaca.REFRESH_MS);
  }

  /* ---------------------------------- kas ----------------------------------- */

  /* Panel saldo hanya tampil bila operator menyalakannya, supaya masjid yang
     belum mengisi saldo tidak menayangkan "Rp 0" ke jamaah. */
  function renderKas() {
    var panel = $('[data-kas-card]');
    if (!panel) return;

    var aktif = !!state.settings.kasOn;
    panel.hidden = !aktif;
    if (!aktif) return;

    var kas = Kas.summary({
      on: true,
      asOf: state.settings.kasAsOf,
      note: state.settings.kasNote,
      funds: state.settings.kasFunds
    });

    $('[data-kas-total]').textContent = kas.totalText;
    $('[data-kas-total-compact]').textContent = kas.totalCompact;

    var asof = $('[data-kas-asof]');
    asof.textContent = kas.asOfText ? 'Per ' + kas.asOfText : 'Belum ada tanggal';
    asof.hidden = false;

    var note = $('[data-kas-note]');
    note.textContent = kas.note;
    note.hidden = !kas.note;

    // Baris dana: label, nilai, dan bar porsi. Dana bernilai 0 tetap
    // ditampilkan agar jamaah tahu posnya ada, hanya barnya kosong.
    var list = $('[data-kas-rows]');
    list.innerHTML = kas.rows.map(function (r) {
      return '<li class="kasrow" data-kas-row="' + r.key + '">' +
        '<span class="kasrow__label">' + esc(r.label) + '</span>' +
        '<span class="kasrow__val' + (r.value < 0 ? ' kasrow__val--negatif' : '') + '"' +
        ' data-kas-value>' + esc(r.text) + '</span>' +
        '<span class="kasrow__track" aria-hidden="true">' +
        '<span class="kasrow__fill" style="width:' + (r.share * 100).toFixed(1) + '%"></span>' +
        '</span>' +
        '</li>';
    }).join('');
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
    $('[data-arc-legend]').innerHTML =
      legend('Terbit', formatClock(T.sunrise, state.settings.clockFormat === '12')) +
      legend('Terbenam', formatClock(T.sunset, state.settings.clockFormat === '12'));
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
    // Dipakai CSS untuk melunakkan vignette saat foto tampil.
    document.documentElement.setAttribute('data-photo', on ? 'on' : 'off');
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
    renderRail(now, ctx);
    renderNextUp(now, ctx);
    renderStatus(now, ctx);
    renderTimes(now, ctx);
    renderQibla();
    renderKas();
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
    renderRail(now, ctx);
    renderNextUp(now, ctx);
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
        '<td data-l="Tanggal">' + PT.DAY_NAMES[date.getDay()] + ', ' + d + '</td>' +
        '<td data-l="Hijriah">' + h.day + ' ' + esc((PT.HIJRI_MONTHS[h.month - 1] || '').slice(0, 9)) + '</td>' +
        cell(t.imsak, use12, 'dim', 'Imsak') +
        cell(t.fajr, use12, 'hl', 'Subuh') +
        cell(t.sunrise, use12, 'dim', 'Syuruq') +
        cell(t.dhuhr, use12, 'hl', 'Dzuhur') +
        cell(t.asr, use12, 'hl', 'Ashar') +
        cell(t.maghrib, use12, 'hl', 'Maghrib') +
        cell(t.isha, use12, 'hl', 'Isya') +
        '</tr>';
    }
    $('[data-monthly-body]').innerHTML = rows;
  }

  function cell(hours, use12, cls, label) {
    return '<td class="num ' + cls + '" data-l="' + esc(label || '') + '">' +
      esc(formatClock(hours, use12)) + '</td>';
  }

  /* ---------------------------------- modal --------------------------------- */
  var FORM_FIELDS = ['name', 'address', 'ticker', 'city', 'lat', 'lng', 'tzMode', 'tzOffset',
    'method', 'asr', 'highLat', 'clockFormat', 'theme', 'adhanSound', 'adhanOverlay',
    'galleryOn', 'galleryInterval', 'galleryDim', 'galleryList', 'kasOn', 'kasAsOf', 'cuacaOn'];

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

  /* --------------------------- pengaturan: bagian ---------------------------- */
  var PANES = [
    { key: 'identitas', label: 'Identitas' },
    { key: 'lokasi', label: 'Lokasi' },
    { key: 'hisab', label: 'Hisab' },
    { key: 'ihtiyati', label: 'Ihtiyati' },
    { key: 'tampilan', label: 'Tampilan' },
    { key: 'kas', label: 'Keuangan' },
    { key: 'latar', label: 'Latar' }
  ];

  // Pratinjau tema: gradien kecil supaya nuansa terlihat sebelum dipilih.
  var THEME_CARDS = [
    { key: 'night', label: 'Malam mihrab', hint: 'Indigo gelap', a: '#101a33', b: '#c9a24a' },
    { key: 'dawn', label: 'Fajar', hint: 'Krem hangat', a: '#f3e7d4', b: '#a9762a' },
    { key: 'emerald', label: 'Zamrud', hint: 'Hijau tua', a: '#0a2620', b: '#c8a85a' }
  ];

  function buildTabs() {
    var nav = $('[data-settings-tabs]');
    if (!nav) return;
    nav.innerHTML = PANES.map(function (p, i) {
      return '<button class="tabs__btn" type="button" role="tab" data-tab="' + p.key + '"' +
        ' aria-selected="' + (i === 0 ? 'true' : 'false') + '"' +
        ' aria-controls="pane-' + p.key + '">' + esc(p.label) + '</button>';
    }).join('');
    $$('.pane', $('[data-settings-body]')).forEach(function (pane) {
      pane.id = 'pane-' + pane.getAttribute('data-pane');
      pane.setAttribute('role', 'tabpanel');
    });
  }

  function selectPane(key) {
    $$('[data-tab]').forEach(function (btn) {
      btn.setAttribute('aria-selected', btn.getAttribute('data-tab') === key ? 'true' : 'false');
    });
    $$('.pane').forEach(function (pane) {
      pane.hidden = pane.getAttribute('data-pane') !== key;
    });
  }

  function buildThemePicker() {
    var wrap = $('[data-theme-picker]');
    if (!wrap) return;
    wrap.innerHTML = THEME_CARDS.map(function (t) {
      return '<button class="theme-card" type="button" role="radio" data-theme-pick="' + t.key + '"' +
        ' aria-checked="false" aria-label="Nuansa ' + esc(t.label) + '">' +
        '<span class="theme-card__swatch" style="--sw-a:' + t.a + ';--sw-b:' + t.b + '"></span>' +
        '<span class="theme-card__label">' + esc(t.label) + '</span>' +
        '<span class="theme-card__hint">' + esc(t.hint) + '</span>' +
        '</button>';
    }).join('');
  }

  function syncThemePicker() {
    var current = $('[data-in="theme"]').value;
    $$('[data-theme-pick]').forEach(function (btn) {
      btn.setAttribute('aria-checked', btn.getAttribute('data-theme-pick') === current ? 'true' : 'false');
    });
  }

  var THEME_ORDER = ['night', 'dawn', 'emerald'];

  function cycleTheme() {
    var current = $('[data-in="theme"]').value;
    var next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
    $('[data-in="theme"]').value = next;
    state.settings.theme = next;
    document.documentElement.setAttribute('data-theme', next);
    saveSettings();
    syncThemePicker();
    toast('Nuansa: ' + next);
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
    fillKasForm();
    updateMethodNote();
    updateGalleryNote();
    updateKasPreview();
    syncThemePicker();
  }

  /* Nominal dana diisi sebagai angka polos tanpa pemisah ribuan, supaya bisa
     langsung disunting tanpa harus menghapus titik dulu. */
  function fillKasForm() {
    var funds = Kas.normalize({ funds: state.settings.kasFunds }).funds;
    var note = $('[data-in="kasNote"]');
    if (note) note.value = state.settings.kasNote || '';
    Kas.FUNDS.forEach(function (f) {
      var el = document.querySelector('[data-kas-in="' + f.key + '"]');
      if (el) el.value = funds[f.key] ? String(funds[f.key]) : '';
    });
  }

  function readKasForm() {
    var funds = {};
    Kas.FUNDS.forEach(function (f) {
      var el = document.querySelector('[data-kas-in="' + f.key + '"]');
      funds[f.key] = el ? Kas.coerceRupiah(el.value) : 0;
    });
    var note = $('[data-in="kasNote"]');
    return { funds: funds, note: note ? note.value : '' };
  }

  /* Pratinjau total langsung saat mengetik: operator melihat persis angka yang
     akan tampil di papan sebelum menekan Simpan. */
  function updateKasPreview() {
    var el = $('[data-kas-preview]');
    if (!el) return;
    el.hidden = false;
    var kas = readKasForm();
    var s = Kas.summary({ funds: kas.funds });
    if (s.total === 0) {
      el.textContent = 'Total seluruh dana: Rp 0 — panel akan tampil kosong.';
      return;
    }
    var rincian = s.rows.map(function (r) {
      return r.short + ' ' + Kas.formatCompact(r.value);
    }).join(' · ');
    el.textContent = 'Total ' + s.totalText + ' (' + rincian + ')';
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
    var kas = readKasForm();
    s.kasFunds = kas.funds;
    s.kasNote = kas.note;
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
    selectPane('identitas');
    stopGallery();
    var panel = $('[data-modal-settings]');
    panel.hidden = false;
    var first = $('[data-tab]', panel);
    if (first) first.focus();
  }

  function openHelp() {
    stopGallery();
    var panel = $('[data-modal-help]');
    panel.hidden = false;
    var btn = $('[data-close-help]', panel);
    if (btn) btn.focus();
  }

  function closeHelp() {
    $('[data-modal-help]').hidden = true;
    startGallery();
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
    renderKas();
    renderCuaca(state.cuacaReading ? 'siap' : 'memuat');
    mulaiCuaca();
    syncThemePicker();
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

    // Nominal kas & catatan: perbarui pratinjau saat mengetik.
    $$('[data-kas-in]').forEach(function (el) {
      el.addEventListener('input', updateKasPreview);
    });
    $('[data-in="kasNote"]').addEventListener('input', updateKasPreview);

    $$('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { selectPane(btn.getAttribute('data-tab')); });
    });
    $('[data-settings-tabs]').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var btns = $$('[data-tab]');
      var i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = e.key === 'ArrowRight' ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length;
      btns[n].focus();
      selectPane(btns[n].getAttribute('data-tab'));
    });

    $('[data-theme-picker]').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-theme-pick]');
      if (!btn) return;
      var key = btn.getAttribute('data-theme-pick');
      $('[data-in="theme"]').value = key;
      state.settings.theme = key;
      document.documentElement.setAttribute('data-theme', key);
      saveSettings();
      syncThemePicker();
      renderGallery();
    });

    $('[data-help]').addEventListener('click', openHelp);
    $$('[data-close-help]').forEach(function (el) {
      el.addEventListener('click', closeHelp);
    });

    $('[data-in="city"]').addEventListener('change', function () {
      var c = CITIES.filter(function (x) { return x.name === this.value; }.bind(this))[0];
      if (!c) return;
      $('[data-in="lat"]').value = c.lat;
      $('[data-in="lng"]').value = c.lng;
      // Zona kota tetap dipakai (auto) agar label ramah dan DST tetap benar;
      // offset hanya ditampilkan sebagai rujukan.
      $('[data-in="tzMode"]').value = 'auto';
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
      if (e.key === '?') { openHelp(); }
      if (e.key === 't' || e.key === 'T') { cycleTheme(); }
      if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); }
      if (e.key === 'ArrowLeft') { galleryStep(-1); }
      if (e.key === 'ArrowRight') { galleryStep(1); }
      if (e.key === ' ') { e.preventDefault(); toggleGalleryPause(); }
      if (e.key === 'Escape') {
        closeSettings();
        closeHelp();
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

    // Rel dibangun sekali, lalu diperbarui tiap detik.
    $('[data-cards]').innerHTML = SHOLAT.map(function (item) {
      return '<li class="stop" data-card="' + item.key + '">' +
        '<span class="stop__state" data-card-state>Menanti</span>' +
        '<span class="stop__ar" data-card-ar>' + esc(item.ar) + '</span>' +
        '<span class="stop__name" data-card-name>' + esc(item.label) + '</span>' +
        '<span class="stop__time" data-card-time>--:--</span>' +
        '<span class="stop__track" aria-hidden="true"><span class="stop__fill" data-card-fill></span></span>' +
        '</li>';
    }).join('');

    populateSelects();
    buildTabs();
    buildThemePicker();
    selectPane('identitas');
    syncThemePicker();
    bind();
    bindGallery();

    var nowReal = new Date();
    var now = nowForSettings(nowReal);
    recompute(nowReal);
    renderGallery();
    renderCuaca('memuat');
    mulaiCuaca();
    checkAdhan(now, state.data);

    state.tickTimer = setInterval(tick, 1000);
    window.addEventListener('resize', debounce(function () {
      renderArc(nowForSettings(new Date()), state.data);
    }, 200));
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      recompute(new Date());
      // Papan yang lama menganggur bisa melewati beberapa putaran singgahan;
      // segarkan begitu tab kembali terlihat.
      muatCuaca();
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
    kas: function () { return Kas.summary({ on: state.settings.kasOn, asOf: state.settings.kasAsOf, note: state.settings.kasNote, funds: state.settings.kasFunds }); },
    renderKas: renderKas,
    cuaca: function () {
      var pos = cuacaCoords();
      return {
        on: !!state.settings.cuacaOn,
        coords: Cuaca.cacheKeyFor(pos.lat, pos.lng),
        reading: state.cuacaReading,
        age: state.cuacaReading ? Cuaca.relativeAge(state.cuacaReading.at) : '',
        stale: state.cuacaReading ? Cuaca.isStale(state.cuacaReading.at) : false,
        lastKey: state.cuacaLastKey,
        busy: state.cuacaBusy
      };
    },
    renderCuaca: renderCuaca,
    muatCuaca: muatCuaca,
    setCuacaReading: function (r) { state.cuacaReading = r; renderCuaca('siap'); },
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
