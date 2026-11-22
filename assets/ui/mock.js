/* Laptop preview only: when the page is not inside the TV app (no window.GH), this stands in for
   the Android side, with sample data when the network is not reachable. #ambient, #foryou,
   #command, #settings, #jarvis, #expanded:weather open a screen; J simulates the phone saying something. */
(function () {
  'use strict';
  if (window.GH) return;
  var store = {};
  try { store = JSON.parse(localStorage.getItem('gh.prefs') || '{}'); } catch (e) { store = {}; }
  function save() { try { localStorage.setItem('gh.prefs', JSON.stringify(store)); } catch (e) { /* private mode */ } }
  function tile(bg, svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="216" height="216" viewBox="0 0 216 216">'
      + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + bg[0] + '"/><stop offset="1" stop-color="' + bg[1] + '"/></linearGradient></defs>'
      + '<rect width="216" height="216" fill="url(#g)"/>' + svg + '</svg>');
  }
  var APPS = [
    { id: 'local.sendtotv', label: 'Send to TV', icon: tile(['#2563eb', '#1e3a8a'], '<g fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><rect x="38" y="62" width="34" height="86" rx="9"/><path d="M84 105h30M100 90l15 15-15 15"/><rect x="126" y="70" width="58" height="52" rx="8"/><path d="M144 146h24"/></g>') },
    { id: 'org.smarttube.stable', label: 'SmartTube', icon: tile(['#333', '#333'], '<rect x="48" y="62" width="120" height="76" rx="10" fill="#e53935"/><rect x="72" y="146" width="72" height="8" rx="4" fill="#e53935"/><text x="108" y="118" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="56" fill="#fff">S</text>') },
    { id: 'com.stremio.one', label: 'Stremio', icon: tile(['#8b5cf6', '#4c1d95'], '<rect x="62" y="62" width="92" height="92" rx="20" transform="rotate(45 108 108)" fill="none" stroke="#fff" stroke-width="11"/><path d="M95 84v48l38-24z" fill="#fff"/>') },
    { id: 'com.amazon.firebat', label: 'Prime Video', icon: tile(['#1aa7e8', '#0f5f9e'], '<text x="108" y="100" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="40" fill="#fff">prime</text><text x="108" y="142" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="40" fill="#fff">video</text>') },
    { id: 'com.amazon.venezia', label: 'Appstore', icon: tile(['#f59e0b', '#b45309'], '<path d="M70 88h76l-8 68H78z" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"/><path d="M88 88c0-26 40-26 40 0" fill="none" stroke="#fff" stroke-width="10"/>') }
  ];

  // sample answers for when the preview has no network
  function hoursFrom(now) {
    var t = [], v = [];
    for (var i = -2; i < 30; i++) { var d = new Date(now.getTime() + i * 3600000); d.setMinutes(0, 0, 0); t.push(d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + 'T' + ('0' + d.getHours()).slice(-2) + ':00'); v.push(22 - Math.round(i / 3)); }
    return { time: t, temperature_2m: v };
  }
  function dayStr(off) { var d = new Date(Date.now() + off * 86400000); return d.toISOString().slice(0, 10); }
  function fixture(url) {
    var now = new Date();
    if (url.indexOf('geojs') >= 0) return { latitude: '30.34', longitude: '76.39', city: 'Home' };
    if (url.indexOf('air-quality') >= 0) return { current: { us_aqi: 62 } };
    if (url.indexOf('open-meteo') >= 0) return { current: { temperature_2m: 22, apparent_temperature: 21, weather_code: 0, is_day: 0 }, hourly: hoursFrom(now),
      daily: { time: [dayStr(0), dayStr(1), dayStr(2), dayStr(3)], temperature_2m_max: [24, 25, 23, 24], temperature_2m_min: [14, 15, 13, 14],
        sunrise: [dayStr(0) + 'T06:52', dayStr(1) + 'T06:53'], sunset: [dayStr(0) + 'T17:21', dayStr(1) + 'T17:21'] } };
    if (url.indexOf('current/next') >= 0) {
      var race = new Date(now.getTime() + 6 * 86400000 + 19 * 3600000);
      var iso = function (d) { return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 19) + 'Z' }; };
      return { MRData: { RaceTable: { Races: [{ season: '2026', round: '23', raceName: 'Qatar Grand Prix', Circuit: { circuitName: 'Lusail International Circuit' },
        date: iso(race).date, time: iso(race).time, Sprint: iso(new Date(race - 86400000 + 3600000)), Qualifying: iso(new Date(race - 86400000 + 5 * 3600000)) }] } } };
    }
    if (url.indexOf('driverStandings') >= 0) return { MRData: { StandingsTable: { StandingsLists: [{ DriverStandings: [] }] } } };
    if (url.indexOf('jolpi') >= 0) return { MRData: { total: '24' } };
    if (url.indexOf('cinemeta') >= 0) {
      var cols = [['#1d4ed8', '#0b1220'], ['#be185d', '#1e1b4b'], ['#0e7490', '#020617'], ['#b45309', '#1c1917'], ['#4338ca', '#020617'], ['#dc2626', '#450a0a'], ['#15803d', '#0b1220'], ['#7c3aed', '#0e7490']];
      return { metas: cols.map(function (c, i) {
        return { id: 'tt00' + i, type: i % 2 ? 'movie' : 'series', name: 'Sample title ' + (i + 1), releaseInfo: '202' + (i % 6), imdbRating: (7 + i / 10).toFixed(1), genres: ['Drama'],
          poster: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs><rect width="240" height="360" fill="url(#g)"/></svg>') };
      }) };
    }
    if (url.indexOf('anilist') >= 0) return { data: { MediaListCollection: { lists: [] } } };
    return null;
  }

  window.GH = {
    apps: function () { return JSON.stringify(APPS.map(function (a) { return { id: a.id, label: a.label }; })); },
    icon: function (id) { var a = APPS.filter(function (x) { return x.id === id; })[0]; return a ? a.icon : ''; },
    launch: function (id) { console.log('[GH] launch', id); return true; },
    settings: function (w) { console.log('[GH] settings', w); return true; },
    status: function () { return JSON.stringify({ wifi: true, ssid: 'Mehr', signal: 79, link: 144, memUsed: 61, memFreeMb: 380, ip: '192.168.100.156', guard: false, sleepAt: store['sleep.at'] || '', lastSpeed: store['speed.last'] || '' }); },
    freeMemory: function (id) { setTimeout(function () { window.GH_done(id, true, '{"freedMb":120}'); }, 700); },
    speedTest: function (id) { setTimeout(function () { store['speed.last'] = '10'; window.GH_done(id, true, '{"mbps":10}'); }, 1200); },
    fetch: function (id, url, body) {
      var opts = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body } : undefined;
      fetch(url, opts).then(function (r) { return r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)); })
        .then(function (t) { window.GH_done(id, true, t); })
        .catch(function (e) { var f = fixture(url); if (f) window.GH_done(id, true, JSON.stringify(f)); else window.GH_done(id, false, String(e)); });
    },
    prefs: function () { return JSON.stringify(store); },
    setPref: function (k, v) { if (v) store[k] = v; else delete store[k]; save(); },
    guardOn: function () { return false; },
    sleep: function () { console.log('[GH] sleep'); return false; },
    sleepTimer: function (m) { var at = m > 0 ? String(Date.now() + m * 60000) : ''; if (at) store['sleep.at'] = at; else delete store['sleep.at']; save(); return at; },
    openStremio: function (t, id) { console.log('[GH] stremio', t, id); return true; },
    openStremioVideo: function (t, id, v) { console.log('[GH] stremio', t, id, v); return true; },
    nowPlaying: function () { return JSON.stringify({ access: true, title: 'Sample song', artist: 'Sample artist', app: 'Spotify', duration: 228000, position: 102000, playing: true }); },
    media: function (a) { console.log('[GH] media', a); },
    speak: function (t) {
      if (!window.speechSynthesis) return false;
      var u = new SpeechSynthesisUtterance(t);
      u.onstart = function () { window.UI.voice('start'); };
      u.onend = function () { window.UI.voice('done'); };
      speechSynthesis.speak(u);
      return true;
    },
    stopSpeaking: function () { if (window.speechSynthesis) speechSynthesis.cancel(); },
    phone: function () { return JSON.stringify({ url: 'http://192.168.100.156:8766', pin: '4821' }); },
    qr: function () { return ''; },
    jarvisLog: function () {},
    takeHeard: function () { return ''; }
  };

  window.addEventListener('load', function () {
    setTimeout(function () {
      var h = location.hash.slice(1).split(':');
      if (h[0] && window.UI && window.UI.go) window.UI.go(h[0], h[1]);
    }, 300);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'j' && window.UI) window.UI.heard('open stremio and tell me the weather');
  });
})();
