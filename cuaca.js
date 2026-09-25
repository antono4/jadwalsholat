/* ============================================================================
   cuaca.js — pembaca cuaca yang dipakai bersama oleh dashboard dan papan TV.

   Sumber data: Open-Meteo (https://open-meteo.com), tanpa kunci API. Sumbangan
   yang diminta hanya koordinat, jadi cuaca otomatis mengikuti kota yang dipilih
   di setelan sholat — tidak ada daftar kota kedua yang bisa melenceng.

   Modul ini tidak menyentuh DOM. Halaman memanggil describe() lalu menyusun
   markahnya sendiri, sehingga bentuk tampilan tiap halaman tetap bebas.
   ========================================================================= */
(function (global) {
  'use strict';

  var API = 'https://api.open-meteo.com/v1/forecast';

  /* Cuaca jarang berubah tiap detik. Sepuluh menit sudah lebih dari cukup dan
     menghemat kuota papan yang menyala berhari-hari. */
  var REFRESH_MS = 10 * 60 * 1000;

  /* Setelah ambang ini, angka lama ditandai basi: papan yang kehilangan
     internet tidak boleh menyajikan suhu pagi sebagai suhu sore. */
  var STALE_MS = 45 * 60 * 1000;

  var TIMEOUT_MS = 8000;
  var CACHE_KEY = 'jadwal-sholat-masjid/cuaca/v1';

  /* Tabel kode WMO dipakai Open-Meteo. Sepuluh kelompoknya dipetakan ke satu
     kondisi Indonesia supaya label papan tetap ringkas. */
  var WMO = {
    0: 'cerah',
    1: 'cerahBerawan', 2: 'berawan', 3: 'mendung',
    45: 'kabut', 48: 'kabut',
    51: 'gerimis', 53: 'gerimis', 55: 'hujan',
    56: 'gerimisBeku', 57: 'gerimisBeku',
    61: 'hujan', 63: 'hujan', 65: 'hujanLebat',
    66: 'hujanBeku', 67: 'hujanBeku',
    71: 'salju', 73: 'salju', 75: 'salju', 77: 'salju',
    80: 'hujanLokal', 81: 'hujanLokal', 82: 'hujanLokalLebat',
    85: 'saljuLokal', 86: 'saljuLokal',
    95: 'hujanPetir', 96: 'hujanPetir', 99: 'hujanPetir'
  };

  /* Kondisi: label Indonesia + ikon. `siang`/`malam` hanya berbeda untuk
     cuaca cerah, karena matahari dan bulan memang dua benda berbeda. */
  var KONDISI = {
    cerah: { label: 'Cerah', icon: 'sun', malam: 'moon' },
    cerahBerawan: { label: 'Cerah Berawan', icon: 'cloudSun', malam: 'cloudMoon' },
    berawan: { label: 'Berawan', icon: 'cloud' },
    mendung: { label: 'Mendung', icon: 'cloud' },
    kabut: { label: 'Berkabut', icon: 'fog' },
    gerimis: { label: 'Gerimis', icon: 'drizzle' },
    gerimisBeku: { label: 'Gerimis Beku', icon: 'drizzle' },
    hujan: { label: 'Hujan', icon: 'rain' },
    hujanLebat: { label: 'Hujan Lebat', icon: 'rain' },
    hujanBeku: { label: 'Hujan Beku', icon: 'rain' },
    hujanLokal: { label: 'Hujan Lokal', icon: 'rain' },
    hujanLokalLebat: { label: 'Hujan Lokal Lebat', icon: 'rain' },
    salju: { label: 'Hujan Salju', icon: 'snow' },
    saljuLokal: { label: 'Hujan Salju Lokal', icon: 'snow' },
    hujanPetir: { label: 'Hujan Petir', icon: 'storm' },
    tidakDiketahui: { label: 'Cuaca', icon: 'cloud' }
  };

  /* Ikon digambar sendiri dari primitif sederhana dengan stroke currentColor,
     jadi warnanya ikut tema dan tidak perlu pustaka ikon di halaman mana pun.
     Lucide hanya ada di papan TV, sedangkan dashboard tidak memakainya. */
  var IKON = {
    sun: '<circle cx="12" cy="12" r="4.2"/>' +
      '<path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2' +
      'M5.2 5.2l1.5 1.5M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5"/>',
    moon: '<path d="M20 13.6A8.3 8.3 0 0 1 10.4 4a8.5 8.5 0 1 0 9.6 9.6z"/>',
    cloud: '<path d="M6.6 18.4h10.2a4 4 0 0 0 .4-8 5.6 5.6 0 0 0-10.7 1.2 3.4 3.4 0 0 0 .1 6.8z"/>',
    cloudSun: '<circle cx="7.8" cy="7.4" r="2.6"/>' +
      '<path d="M7.8 2.2v1.5M3.1 7.4H1.6M4.5 4.1 3.4 3M4.5 10.7 3.4 11.8"/>' +
      '<path d="M9 20h7.9a3.7 3.7 0 0 0 .4-7.4 5.2 5.2 0 0 0-9.9 1.2A3.1 3.1 0 0 0 9 20z"/>',
    cloudMoon: '<path d="M10.8 7.4A4.6 4.6 0 0 1 5.6 2.2a4.9 4.9 0 1 0 5.2 5.2z"/>' +
      '<path d="M9 20h7.9a3.7 3.7 0 0 0 .4-7.4 5.2 5.2 0 0 0-9.9 1.2A3.1 3.1 0 0 0 9 20z"/>',
    fog: '<path d="M6.6 14.6h10.2a3.7 3.7 0 0 0 .4-7.4 5.2 5.2 0 0 0-9.9 1.2 3.1 3.1 0 0 0-.7 6.2z"/>' +
      '<path d="M4.2 18.2h15.6M6.8 21.3h10.4"/>',
    drizzle: '<path d="M6.6 15.4h10.2a3.7 3.7 0 0 0 .4-7.4 5.2 5.2 0 0 0-9.9 1.2 3.1 3.1 0 0 0-.7 6.2z"/>' +
      '<path d="M9.2 18.3l-.7 2.1M13.2 18.3l-.7 2.1M17.2 18.3l-.7 2.1"/>',
    rain: '<path d="M6.6 14.8h10.2a3.7 3.7 0 0 0 .4-7.4 5.2 5.2 0 0 0-9.9 1.2 3.1 3.1 0 0 0-.7 6.2z"/>' +
      '<path d="M9.2 17.6 7.6 21.5M13.2 17.6l-1.6 3.9M17.2 17.6l-1.6 3.9"/>',
    snow: '<path d="M6.6 14.6h10.2a3.7 3.7 0 0 0 .4-7.4 5.2 5.2 0 0 0-9.9 1.2 3.1 3.1 0 0 0-.7 6.2z"/>' +
      '<path d="M9 18v4M7.3 19l3.4 2M10.7 19l-3.4 2M15 18v4M13.3 19l3.4 2M16.7 19l-3.4 2"/>',
    storm: '<path d="M6.6 13.8h10.2a3.7 3.7 0 0 0 .4-7.4 5.2 5.2 0 0 0-9.9 1.2 3.1 3.1 0 0 0-.7 6.2z"/>' +
      '<path d="M13.4 15.8h-3l-1.5 3.1h2.3L10.3 23l3.9-4.5h-2.3l1.5-2.7z"/>',
    wind: '<path d="M3.2 8.4h9.6a2.6 2.6 0 1 0-2.6-2.6"/>' +
      '<path d="M3.2 12.6h12.9a2.6 2.6 0 1 1-2.6 2.6"/>' +
      '<path d="M3.2 16.8h6.4"/>'
  };

  /* ------------------------------- markah ----------------------------------- */

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Markah dalam untuk wadah `.cuaca`. Ditulis sekali di sini supaya dashboard
     dan papan TV tidak menggandakan struktur; tiap halaman hanya menyetel
     wadahnya dan memberi `data-state`. */
  function markup(d, opts) {
    opts = opts || {};
    var angka = function (v, fallback) { return (v === '' || v === null || v === undefined) ? fallback : v; };
    var meta = [
      ['Terasa', angka(d && d.feels, '—')],
      ['Lembap', angka(d && d.humidity, '—')],
      ['Angin', angka(d && d.wind, '—')]
    ].map(function (r) {
      return '<div class="cuaca__item"><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
    }).join('');

    return '<div class="cuaca__head">' +
        '<span class="cuaca__ikon" data-cuaca-icon>' + svg((d && d.icon) || 'cloud') + '</span>' +
        '<div class="cuaca__main">' +
          '<span class="cuaca__temp" data-cuaca-temp>' + angka(d && d.temp, '—') + '</span>' +
          '<span class="cuaca__label" data-cuaca-label>' +
            (opts.label === false ? '' : esc((d && d.label) || 'Cuaca')) + '</span>' +
        '</div>' +
      '</div>' +
      '<dl class="cuaca__meta">' + meta + '</dl>' +
      (opts.note ? '<p class="cuaca__note" data-cuaca-note>' + esc(opts.note) + '</p>' : '');
  }

  function numOr(v, fallback) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /* Kondisi dari kode WMO. `isDay` hanya menggeser ikon cerah/cerah berawan. */
  function kondisiFor(code, isDay) {
    var key = WMO[numOr(code, -1)] || 'tidakDiketahui';
    var k = KONDISI[key] || KONDISI.tidakDiketahui;
    var icon = (isDay === false && k.malam) ? k.malam : k.icon;
    return { key: key, label: k.label, icon: icon };
  }

  function svg(icon, cls) {
    var isi = IKON[icon] || IKON.cloud;
    return '<svg class="' + (cls || 'cuaca__ikon-svg') + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + isi + '</svg>';
  }

  function buildUrl(lat, lng) {
    return API +
      '?latitude=' + Number(lat).toFixed(4) +
      '&longitude=' + Number(lng).toFixed(4) +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m' +
      '&timezone=auto';
  }

  /* Ubah balasan mentah jadi pembacaan yang sudah jinak. Mengembalikan null
     bila bentuknya tidak dikenali, supaya pemanggil bisa mempertahankan angka
     lama alih-alih menampilkan "undefined". */
  function parse(payload, at) {
    var c = payload && payload.current;
    if (!c || typeof c !== 'object') return null;
    var temp = numOr(c.temperature_2m, null);
    if (temp === null) return null;
    return {
      at: numOr(at, Date.now()),
      code: numOr(c.weather_code, -1),
      tempC: Math.round(temp),
      feelsC: numOr(c.apparent_temperature, null) === null ? null : Math.round(c.apparent_temperature),
      humidity: numOr(c.relative_humidity_2m, null) === null ? null : Math.round(c.relative_humidity_2m),
      windKmh: numOr(c.wind_speed_10m, null) === null ? null : Math.round(c.wind_speed_10m),
      isDay: c.is_day === 1 || c.is_day === true,
      timezone: typeof payload.timezone === 'string' ? payload.timezone : ''
    };
  }

  /* Pembacaan -> bagian siap tampil. Dipisah dari fetch supaya bisa diuji
     tanpa jaringan. */
  function describe(reading) {
    var r = reading || {};
    var k = kondisiFor(r.code, r.isDay);
    return {
      key: k.key,
      label: k.label,
      icon: k.icon,
      tempC: numOr(r.tempC, null),
      temp: numOr(r.tempC, null) === null ? '—' : Math.round(r.tempC) + '°',
      feels: numOr(r.feelsC, null) === null ? '' : Math.round(r.feelsC) + '°',
      humidity: numOr(r.humidity, null) === null ? '' : Math.round(r.humidity) + '%',
      wind: numOr(r.windKmh, null) === null ? '' : Math.round(r.windKmh) + ' km/j',
      isDay: r.isDay !== false,
      at: numOr(r.at, 0)
    };
  }

  /* Umur data tanpa bergantung zona waktu: jam dinding papan bisa berbeda dari
     zona masjid, sedangkan "5 menit lalu" selalu benar di mana pun. */
  function relativeAge(at, now) {
    var d = numOr(now, Date.now()) - numOr(at, 0);
    if (!Number.isFinite(d) || d <= 0) return 'baru saja';
    var menit = Math.floor(d / 60000);
    if (menit < 1) return 'baru saja';
    if (menit < 60) return menit + ' menit lalu';
    var jam = Math.floor(menit / 60);
    if (jam < 24) return jam + ' jam lalu';
    return Math.floor(jam / 24) + ' hari lalu';
  }

  function isStale(at, now, maxAgeMs) {
    var cap = numOr(at, null);
    /* Cap waktu tak dikenal diperlakukan basi: lebih baik memperingatkan jamaah
       daripada menyajikan angka yang usianya tidak dapat dipastikan. */
    if (cap === null) return true;
    return numOr(now, Date.now()) - cap > numOr(maxAgeMs, STALE_MS);
  }

  /* ------------------------------- singgahan -------------------------------- */

  /* Kunci singgahan ikut koordinat, jadi berpindah kota tidak menyajikan cuaca
     kota lama. Dibulatkan ke 2 desimal (~1 km) agar koordinat yang bergoyang
     halus tidak terus membuang singgahan. */
  function cacheKeyFor(lat, lng) {
    return Number(lat).toFixed(2) + ',' + Number(lng).toFixed(2);
  }

  function readCache(lat, lng) {
    try {
      var raw = global.localStorage && global.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var box = JSON.parse(raw);
      if (!box || box.key !== cacheKeyFor(lat, lng) || !box.reading) return null;
      return box.reading;
    } catch (e) { return null; }
  }

  function writeCache(lat, lng, reading) {
    try {
      if (!global.localStorage || !reading) return;
      global.localStorage.setItem(CACHE_KEY, JSON.stringify({
        key: cacheKeyFor(lat, lng), reading: reading
      }));
    } catch (e) { /* penyimpanan penuh atau diblokir */ }
  }

  /* -------------------------------- jaringan -------------------------------- */

  /* Ambil cuaca terbaru. Selalu menolak dengan Error bila jaringan gagal,
     supaya pemanggil bisa memutuskan mempertahankan data lama. */
  function fetchReading(opts) {
    opts = opts || {};
    var lat = numOr(opts.lat, null), lng = numOr(opts.lng, null);
    if (lat === null || lng === null) return Promise.reject(new Error('koordinat tidak sah'));
    if (typeof global.fetch !== 'function') return Promise.reject(new Error('fetch tidak tersedia'));

    var jam = numOr(opts.timeoutMs, TIMEOUT_MS);
    var ctl = typeof global.AbortController === 'function' ? new global.AbortController() : null;
    var timer = null;
    if (ctl) {
      timer = setTimeout(function () {
        /* Papan TV bisa menggantung tanpa batas bila jaringan menjawab lambat. */
        try { ctl.abort(); } catch (e) {}
      }, jam);
    }

    var init = { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store' };
    if (ctl) init.signal = ctl.signal;

    var selesai = function () { if (timer) clearTimeout(timer); };

    return global.fetch(buildUrl(lat, lng), init).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (payload) {
      var r = parse(payload, Date.now());
      if (!r) throw new Error('balasan tidak dikenali');
      selesai();
      return r;
    }, function (err) {
      selesai();
      throw err;
    });
  }

  global.Cuaca = {
    API: API,
    REFRESH_MS: REFRESH_MS,
    STALE_MS: STALE_MS,
    TIMEOUT_MS: TIMEOUT_MS,
    CACHE_KEY: CACHE_KEY,
    WMO: WMO,
    KONDISI: KONDISI,
    IKON: IKON,
    kondisiFor: kondisiFor,
    svg: svg,
    markup: markup,
    buildUrl: buildUrl,
    parse: parse,
    describe: describe,
    relativeAge: relativeAge,
    isStale: isStale,
    cacheKeyFor: cacheKeyFor,
    readCache: readCache,
    writeCache: writeCache,
    fetchReading: fetchReading
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.Cuaca;
})(typeof window !== 'undefined' ? window : globalThis);
