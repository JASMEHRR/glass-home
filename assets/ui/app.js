/* Glass Home: screens, remote focus and behaviour. Native side is window.GH (see Bridge.java). */
(function () {
  'use strict';
  var GH = window.GH, Data = window.Data, Brain = window.Brain;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage'), scale = 1;

  function fit() {
    // The screen's size in CSS pixels. Not innerWidth: on the TV (960x540 at 2x density) the
    // 1920px stage stretches innerWidth to 1920, so the stage never shrank and was cut off.
    var de = document.documentElement, w = de.clientWidth || innerWidth, h = de.clientHeight || innerHeight;
    scale = Math.min(w / 1920, h / 1080);
    window.stageScale = scale; // orb.js sizes its canvases to real screen pixels with this
    stage.style.transform = 'scale(' + scale + ')';
    stage.style.left = Math.round((w - 1920 * scale) / 2) + 'px';
    stage.style.top = Math.round((h - 1080 * scale) / 2) + 'px';
    frostAll();
  }
  addEventListener('resize', fit);
  fit();

  // Baked glass (see .frost in style.css): tell each glass panel where it sits on the stage, so its
  // pre-blurred copy of the wallpaper lines up with the photo behind it.
  function frostAll() {
    var els = stage.querySelectorAll('.frost');
    for (var i = 0; i < els.length; i++) {
      var p = offsetIn(els[i], stage);
      els[i].style.setProperty('--gx', p[0]);
      els[i].style.setProperty('--gy', p[1]);
    }
  }
  // An element's place inside an ancestor, before transforms. Adds up the whole offsetParent chain:
  // Chrome measures from the nearest transformed ancestor too (the dock's sliding icon strip), so a
  // single offsetLeft is not relative to the dock, which put the old lens 18px left of the icon.
  function offsetIn(el, root) {
    var x = 0, y = 0;
    while (el && el !== root) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return [x, y];
  }
  // Keeps the glass lined up while panels slide or resize (their transitions last up to .7s).
  var frostRaf = 0, frostEnd = 0;
  function frostFollow(ms) {
    frostEnd = Math.max(frostEnd, performance.now() + (ms || 900));
    if (frostRaf) return;
    (function step() {
      frostAll();
      frostRaf = performance.now() < frostEnd ? requestAnimationFrame(step) : 0;
    })();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function ico(path, size, stroke) {
    return '<svg aria-hidden="true" width="' + (size || 34) + '" height="' + (size || 34) + '" viewBox="0 0 24 24" fill="none" stroke="' + (stroke || '#fff')
      + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  var I = {
    cap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    spark: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    tv: '<rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/>',
    wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
    bt: '<path d="m7 7 10 10-5 5V2l5 5L7 17"/>',
    chip: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    cast: '<path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 8 8"/><path d="M2 16a5 5 0 0 1 4 4"/><path d="M2 20h.01"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l-2 2"/><path d="M9 2h6"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    toggles: '<rect x="3" y="4" width="18" height="6.5" rx="3.25"/><rect x="3" y="13.5" width="18" height="6.5" rx="3.25"/><circle cx="16.8" cy="7.25" r="1.6" fill="currentColor"/><circle cx="7.2" cy="16.75" r="1.6" fill="currentColor"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
  };

  // ---- settings file ---------------------------------------------------------------------
  var P = {};
  function loadPrefs() { try { P = JSON.parse(GH.prefs()) || {}; } catch (e) { P = {}; } }
  function pref(k, d) { return P[k] != null && P[k] !== '' ? P[k] : d; }
  function setPref(k, v) { P[k] = v == null ? '' : String(v); GH.setPref(k, P[k]); }
  loadPrefs();

  // ---- live data --------------------------------------------------------------------------
  var live = { apps: [], weather: null, f1: null, anime: null, animeState: 'off', digest: null, status: {} };
  function refreshData() {
    loadPrefs();
    Data.weather(P).then(function (w) { live.weather = w; paintWeather(); }).catch(function () {});
    Data.f1().then(function (f) { live.f1 = f; paintRace(); }).catch(function () {});
    var u = pref('anilist.user', '');
    live.animeState = u ? 'loading' : 'off';
    if (u) Data.anilist(u).then(function (a) { live.anime = a; live.animeState = 'ok'; paintChips(); }).catch(function () { live.animeState = 'error'; paintChips(); });
    Data.digest(P).then(function (d) { live.digest = d; paintChips(); }).catch(function () { live.digest = null; });
    Data.watching(pref('stremio.key', '')).then(function (w) { live.watching = w; paintChips(); }).catch(function () { live.watching = null; });
    paintChips();
  }
  var musicSeen = '';
  function pollMusic() {
    var raw = '';
    try { raw = GH.nowPlaying ? GH.nowPlaying() : ''; } catch (e) { raw = ''; }
    if (raw === musicSeen) return false;
    musicSeen = raw;
    try { live.music = raw ? JSON.parse(raw) : null; } catch (e) { live.music = null; }
    return true;
  }
  function minutesLeft(x) { return Math.max(1, Math.round((x.duration - x.position) / 60000)); }
  function epLabel(x) { return (x.season > 0 ? 'S' + x.season + ' ' : '') + (x.episode > 0 ? 'E' + x.episode : ''); }

  // ---- screens and keys ----------------------------------------------------------------------
  var S = {}, base = 'home', overlays = [];
  var OVERLAY = { expanded: 1, jarvis: 1, command: 1, settings: 1 };
  var NAMES = ['home', 'ambient', 'foryou', 'expanded', 'jarvis', 'command', 'settings'];
  function top() { return overlays.length ? overlays[overlays.length - 1] : base; }
  function paintOn() {
    var t = top();
    NAMES.forEach(function (n) {
      var on = n === base || overlays.indexOf(n) >= 0;
      $(n).classList.toggle('on', on);
      // Overlays are opaque, so whatever is under one stops drawing (see .covered in style.css).
      $(n).classList.toggle('covered', on && n !== t);
      if (S[n] && S[n].orb && n !== t) S[n].orb.stop();
    });
  }
  function setText(el, s) { if (el.textContent !== s) el.textContent = s; }
  function go(name, arg) {
    var prev = top();
    if (name === 'expanded' && prev !== 'expanded') $('expanded').setAttribute('data-over', prev);
    if (!OVERLAY[name] && name !== 'ambient') fromDream = false;
    if (OVERLAY[name]) { overlays = overlays.filter(function (n) { return n !== name; }); overlays.push(name); }
    else { if (base !== name && S[base].leave) S[base].leave(); overlays.forEach(function (n) { if (S[n].leave) S[n].leave(); }); base = name; overlays = []; }
    paintOn();
    if (S[name].enter) S[name].enter(arg);
    resetIdle();
  }
  var fromDream = false; // the TV's screensaver opened us over another app: Back returns to it
  function back() {
    var t = top();
    if (S[t].back && S[t].back()) return;
    if (fromDream && t === 'ambient' && !overlays.length) {
      fromDream = false;
      GH.leaveDream();
      setTimeout(function () { go('home'); H.first(); }, 400);
      return;
    }
    if (overlays.length) {
      overlays.pop();
      if (S[t].leave) S[t].leave();
      paintOn();
      var n = top();
      if (S[n].resume) S[n].resume();
    } else if (base !== 'home') {
      go('home');
    } else {
      S.home.first();
    }
    resetIdle();
  }
  function key(k) {
    resetIdle();
    if (k === 'back') { back(); return; }
    if (k === 'menu') { if (top() === 'command') back(); else go('command'); return; }
    var s = S[top()];
    if (s && s.key) s.key(k);
  }
  var KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'ok', ' ': 'ok', Escape: 'back', Backspace: 'back', m: 'menu', ContextMenu: 'menu' };
  document.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.key] || (e.keyCode === 13 || e.keyCode === 23 ? 'ok' : null);
    if (!k) return;
    e.preventDefault();
    key(k);
  });

  // idle: screensaver, then sleep
  var idleT = 0, sleepT = 0;
  function resetIdle() {
    clearTimeout(idleT); clearTimeout(sleepT);
    var m = +pref('ambient.minutes', 5);
    if (m > 0) idleT = setTimeout(function () { if (top() === 'home' || top() === 'foryou') go('ambient'); }, m * 60000);
    var sm = +pref('sleep.minutes', 60);
    if (sm > 0) sleepT = setTimeout(function () { if (GH.guardOn()) GH.sleep(); }, sm * 60000);
  }

  // ---- Home scene and screensaver photo -----------------------------------------------------------
  // Home moves to the next scene every 30 minutes (or follows the time of day, or stays on the scene
  // picked in Home settings); the screensaver moves on to the next F1 photo each time it starts and
  // every 10 minutes while it shows. Scenes with fg have a cut-out drawn over the clock.
  var SCENES = { night: { label: 'Night', fg: 1 }, dawn: { label: 'Dawn', fg: 1 }, golden: { label: 'Golden', fg: 1 }, fog: { label: 'Fog', fg: 1 },
    water: { label: 'Water' }, albury: { label: 'Albury Storm' }, aresquiers: { label: 'Aresquiers Beach' }, grose: { label: 'Grose Valley' },
    tessellated: { label: 'Tessellated Pavement' }, vangvieng: { label: 'Vang Vieng Sunset' } };
  var SCENE_IDS = Object.keys(SCENES), ROTATE_MS = 30 * 60 * 1000;
  var F1 = [
    { n: 'suzuka', pos: '50% 40%', credit: 'PHOTO: TAKAYUKI SUZUKI, CC BY-SA 2.0' },
    { n: 'alonso', pos: '50% 50%', credit: 'PHOTO: TAKAYUKI SUZUKI, CC BY-SA 2.0' },
    { n: 'verstappen', pos: '50% 0%', credit: 'PHOTO: TAKAYUKI SUZUKI, CC BY-SA 2.0' },
    { n: 'bottas', pos: '50% 60%', credit: 'PHOTO: TAKAYUKI SUZUKI, CC BY-SA 2.0' }
  ];
  function sceneNow(d) {
    var pick = pref('scene', 'rotate');
    if (SCENES[pick]) return pick;
    if (pick === 'rotate') return SCENE_IDS[Math.floor(d.getTime() / ROTATE_MS) % SCENE_IDS.length];
    var h = d.getHours() + d.getMinutes() / 60;
    return h >= 5 && h < 9 ? 'dawn' : h >= 9 && h < 16.5 ? 'golden' : h >= 16.5 && h < 18.5 ? 'fog' : 'night';
  }
  var shownScene = '';
  function applyScene(d) {
    var s = sceneNow(d || new Date());
    if (s === shownScene) return;
    shownScene = s;
    var root = document.documentElement.style, g = 'img/scene-' + s + '-glass.jpg';
    $('homeBg').src = 'img/scene-' + s + '.jpg';
    var fg = $('homeFg');
    if (SCENES[s].fg) { fg.src = 'img/scene-' + s + '-fg.webp'; fg.style.display = ''; } else { fg.style.display = 'none'; fg.removeAttribute('src'); }
    root.setProperty('--home-glass', 'url(' + g + ')');
    root.setProperty('--home-frost', 'url(img/scene-' + s + '-frost.jpg)');
    Array.prototype.forEach.call(document.querySelectorAll('img.homeglass'), function (im) { im.src = g; });
  }
  function nextF1() {
    var i = (+pref('f1.photo', 0) + 1) % F1.length, p = F1[i];
    setPref('f1.photo', i);
    var root = document.documentElement.style, g = 'img/f1-' + p.n + '-glass.jpg';
    $('ambBg').src = 'img/f1-' + p.n + '.jpg';
    $('ambBg').style.objectPosition = p.pos;
    $('ambCredit').textContent = p.credit;
    root.setProperty('--f1-glass', 'url(' + g + ')');
    root.setProperty('--f1-frost', 'url(img/f1-' + p.n + '-frost.jpg)');
    Array.prototype.forEach.call(document.querySelectorAll('img.f1glass'), function (im) { im.src = g; });
  }
  applyScene();
  // Prime Video is built into Fire OS (cannot be uninstalled): hidden from the dock, also when the
  // hidden-apps list was customised before this change.
  if (P['apps.hide'] && P['apps.hide'].indexOf('com.amazon.firebat') < 0 && !P['hide.prime']) {
    setPref('apps.hide', P['apps.hide'] + ',com.amazon.firebat'); setPref('hide.prime', '1');
  }

  // ---- clock tick ----------------------------------------------------------------------------
  function tick() {
    var now = new Date(), h24 = pref('clock', '12') === '24';
    var c = Data.clock(now, h24);
    // Only touch text that changed: each rewrite makes the TV redraw the big glass clocks.
    setText($('homeClock'), c);
    var amb = $('ambClock'), parts = c.split(':');
    if (amb.getAttribute('data-t') !== c) {
      amb.setAttribute('data-t', c);
      amb.innerHTML = esc(parts[0]) + '<span class="c">:</span>' + esc(parts[1]);
    }
    if (amb.firstElementChild) amb.firstElementChild.classList.toggle('dim', now.getSeconds() % 2 === 1);
    setText($('homeGreet'), Data.greeting(now) + ', ' + pref('name', 'JasMehr'));
    setText($('homeDate'), Data.longDate(now));
    if (now.getSeconds() === 0) applyScene(now);
    if (top() === 'ambient' && now.getMinutes() % 10 === 0 && now.getSeconds() === 0) nextF1();
    paintRaceCount();
    if (top() === 'ambient') { paintChipTimers(); if (now.getSeconds() % 5 === 0 && pollMusic()) paintChips(); }
    if (top() === 'expanded') S.expanded.tick();
  }
  setInterval(tick, 1000);

  function paintWeather() {
    var w = live.weather, txt = w ? w.temp + '° ' + w.text : '';
    $('homeWx').textContent = txt;
    $('homeWxSep').style.display = txt ? '' : 'none';
    $('ambDate').innerHTML = esc(Data.longDate(new Date())) + (txt ? '<span class="dot-sep">·</span>' + esc(txt) : '');
    paintChips();
  }

  // ---- Home ----------------------------------------------------------------------------------
  var H = { idx: 1, area: 'dock', items: [], tx: 0, orb: null, lensX: null };
  S.home = H;
  // ---- Nothing-style app icons ------------------------------------------------------------------
  // White line glyphs for known apps; any other app gets its first letter as a 5x7 dot matrix.
  var GLYPHS = {
    'local.sendtotv': '<path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 8 8"/><path d="M2 16a5 5 0 0 1 4 4"/><path d="M2 20h.01"/>',
    'org.smarttube.stable': '<path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 50 50 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 50 50 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    'com.stremio.one': '<path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/><path d="m10.2 9.2 4.6 2.8-4.6 2.8z"/>',
    'com.amazon.firebat': '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    'com.amazon.tahoe': '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
    'com.amazon.venezia': '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    'dnsfilter.android': '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'com.amazon.cloud9': '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    'com.amazon.firetv.youtube': '<path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 50 50 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 50 50 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    'com.google.android.youtube.tv': '<path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 50 50 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 50 50 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    'com.fancode.tv': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    'com.spotify.tv.android': '<path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/>'
  };
  var DOTS = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31], 0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14],
    2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
    6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12]
  };
  function glyph(path) {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  function dotLetter(label) {
    var m = String(label || '').toUpperCase().match(/[A-Z0-9]/), rows = DOTS[m ? m[0] : ''];
    if (!rows) return glyph('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>');
    var out = '';
    for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++) if (rows[r] & (16 >> c)) out += '<circle cx="' + (2 + c * 4) + '" cy="' + (2 + r * 4) + '" r="1.5"/>';
    return '<svg class="dots" aria-hidden="true" viewBox="0 0 20 28" fill="#fff">' + out + '</svg>';
  }
  function nothingIcons() { return pref('icons', 'nothing') !== 'colour'; }
  function iconFor(item) {
    if (nothingIcons() && item.kind === 'app') return '<div class="tile glyph">' + (GLYPHS[item.id] ? glyph(GLYPHS[item.id]) : dotLetter(item.label)) + '</div>';
    if (nothingIcons() && item.kind === 'foryou') return '<div class="tile glyph">' + glyph(I.spark) + '</div>';
    if (nothingIcons() && item.kind === 'fire') return '<div class="tile glyph">' + glyph(I.gear) + '</div>';
    if (item.kind === 'foryou') return '<div class="tile builtin" style="background:linear-gradient(140deg,#0e7490,#0c1a2e)">' + ico(I.spark, 50, '#67e8f9') + '</div>';
    if (item.kind === 'fire') return '<div class="tile builtin" style="background:linear-gradient(160deg,rgba(90,94,104,.9),rgba(44,46,54,.92))">' + ico(I.gear, 50) + '</div>';
    if (item.kind === 'jarvis') return '<div class="tile orbtile"><canvas id="dockOrb"></canvas></div>';
    if (item.kind === 'sep') return '<span class="sep"></span>';
    return '<div class="tile"><img alt="" data-pkg="' + esc(item.id) + '"></div>';
  }
  H.build = function () {
    try { live.apps = JSON.parse(GH.apps()) || []; } catch (e) { live.apps = []; }
    H.items = [{ kind: 'foryou', label: 'For You' }].concat(live.apps.map(function (a) { return { kind: 'app', id: a.id, label: a.label }; }))
      .concat([{ kind: 'fire', label: 'Settings' }, { kind: 'sep' }, { kind: 'jarvis', label: 'Jarvis' }]);
    $('dockTrack').innerHTML = H.items.map(iconFor).join('');
    var imgs = Array.prototype.slice.call($('dockTrack').querySelectorAll('img[data-pkg]'));
    (function load(i) {
      if (i >= imgs.length) return;
      var src = GH.icon(imgs[i].getAttribute('data-pkg'));
      if (src) imgs[i].src = src;
      setTimeout(function () { load(i + 1); }, 0);
    })(0);
    if (H.orb) H.orb.stop();
    H.orb = new Orb($('dockOrb'), 108);
    H.orb.start();
    H.idx = Math.min(Math.max(H.idx, 0), H.items.length - 1);
    if (H.items[H.idx].kind === 'sep') H.idx = 0;
    H.lensX = null;
    frostAll(); // the dock's width (and so its place) depends on how many apps there are
    setTimeout(H.paint, 30);
  };
  function tiles() { return Array.prototype.slice.call($('dockTrack').children); }
  H.paint = function () {
    var ts = tiles(), t = ts[H.idx];
    ts.forEach(function (el, i) { if (el.classList) el.classList.toggle('focus', H.area === 'dock' && i === H.idx); });
    $('ccBtn').classList.toggle('focus', H.area === 'cc');
    $('phoneBtn').classList.toggle('focus', H.area === 'phone');
    if (H.orb) H.orb.focus(H.area === 'dock' && H.items[H.idx] && H.items[H.idx].kind === 'jarvis');
    var lens = $('lens'), tip = $('dockTip');
    if (H.area !== 'dock' || !t) { lens.classList.remove('show'); tip.style.opacity = 0; return; }
    // keep the focused tile inside the dock when there are many apps
    var clipW = $('dockTrack').parentNode.clientWidth, x = offsetIn(t, $('dockTrack'))[0];
    if (x + H.tx < 0) H.tx = -x;
    if (x + 108 + H.tx > clipW - 24) H.tx = clipW - 24 - 108 - x;
    if ($('dockTrack').scrollWidth <= clipW) H.tx = 0;
    $('dockTrack').style.transform = 'translateX(' + H.tx + 'px)';
    // the focused tile's centre, in the dock's own coordinates (where the lens canvas sits)
    var p = offsetIn(t, $('dock')), cx = p[0] + H.tx + 54, cy = p[1] + 54;
    lens.classList.add('show');
    lensTo(cx, cy, H.lensX == null);
    H.lensX = cx;
    tip.style.transform = 'translateX(' + cx + 'px) translateX(-50%)';
    tip.firstChild.textContent = H.items[H.idx].label || '';
    tip.style.opacity = 1;
  };

  // ---- Dock lens: a drop of liquid glass ------------------------------------------------------
  // Drawn on a canvas over the dock. On a move its leading edge springs ahead and the trailing
  // edge follows a beat later, so the drop stretches out of one icon, pinches in the middle like
  // water passing from one drop to the next, then pulls into the new icon and wobbles to rest.
  // At rest it is concentric with the focused icon (108px at scale 1.1) with a 3px glass rim.
  var LENS = 108 * 1.1 + 6, LENS_R = 26 * 1.1 + 3;
  var Lens = { a: 0, b: 0, va: 0, vb: 0, ta: 0, tb: 0, cy: 72, dir: 1, raf: 0, last: 0, s: 1, w: 0, h: 0, x: null };
  function lensTo(cx, cy, snap) {
    var cv = $('lens'), dock = $('dock');
    var s = Math.max(1, Math.min((window.devicePixelRatio || 1) * (window.stageScale || 1), 2));
    var w = dock.clientWidth, h = dock.clientHeight;
    if (cv.width !== Math.round(w * s) || cv.height !== Math.round(h * s)) {
      cv.width = Math.round(w * s); cv.height = Math.round(h * s);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
    }
    Lens.x = cv.getContext('2d'); Lens.s = s; Lens.w = w; Lens.h = h; Lens.cy = cy;
    var ta = cx - LENS / 2;
    if (ta !== Lens.ta) Lens.dir = ta > Lens.ta ? 1 : -1;
    Lens.ta = ta; Lens.tb = ta + LENS;
    if (snap) { Lens.a = Lens.ta; Lens.b = Lens.tb; Lens.va = Lens.vb = 0; }
    if (!Lens.raf) { Lens.last = performance.now(); Lens.raf = requestAnimationFrame(lensFrame); }
  }
  function lensFrame(now) {
    // Real elapsed time, stepped in fixed 1/240 s slices: a late TV frame then lands where the drop
    // should be instead of slowing it down and catching up (that was the jitter).
    var dt = Math.min((now - Lens.last) / 1000, 0.1); Lens.last = now;
    // two damped springs: the edge in front is stiff (quick), the one behind is soft (lags)
    var LEAD = 420, TRAIL = 130, ZETA = 0.5, h = 1 / 240;
    var ka = Lens.dir > 0 ? TRAIL : LEAD, kb = Lens.dir > 0 ? LEAD : TRAIL, ca = 2 * ZETA * Math.sqrt(ka), cb = 2 * ZETA * Math.sqrt(kb);
    for (Lens.acc = (Lens.acc || 0) + dt; Lens.acc >= h; Lens.acc -= h) {
      Lens.va += (ka * (Lens.ta - Lens.a) - ca * Lens.va) * h; Lens.a += Lens.va * h;
      Lens.vb += (kb * (Lens.tb - Lens.b) - cb * Lens.vb) * h; Lens.b += Lens.vb * h;
    }
    var still = Math.abs(Lens.ta - Lens.a) < 0.25 && Math.abs(Lens.tb - Lens.b) < 0.25 && Math.abs(Lens.va) < 3 && Math.abs(Lens.vb) < 3;
    if (still) { Lens.a = Lens.ta; Lens.b = Lens.tb; Lens.va = Lens.vb = 0; }
    drawLens();
    Lens.raf = still ? 0 : requestAnimationFrame(lensFrame);
  }
  function dropPath(x, a, b, top, bot, r, neck) {
    var mid = (a + b) / 2, ql = Math.max(0, mid - a - r) * 0.55, qr = Math.max(0, b - r - mid) * 0.55;
    x.beginPath();
    x.moveTo(a + r, top);
    x.bezierCurveTo(a + r + ql, top, mid - ql * 0.6, top + neck, mid, top + neck);
    x.bezierCurveTo(mid + qr * 0.6, top + neck, b - r - qr, top, b - r, top);
    x.arcTo(b, top, b, top + r, r);
    x.lineTo(b, bot - r);
    x.arcTo(b, bot, b - r, bot, r);
    x.bezierCurveTo(b - r - qr, bot, mid + qr * 0.6, bot - neck, mid, bot - neck);
    x.bezierCurveTo(mid - ql * 0.6, bot - neck, a + r + ql, bot, a + r, bot);
    x.arcTo(a, bot, a, bot - r, r);
    x.lineTo(a, top + r);
    x.arcTo(a, top, a + r, top, r);
    x.closePath();
  }
  function drawLens() {
    // The springs can overshoot until the edges cross; never draw narrower than a third of the drop.
    var x = Lens.x, a = Math.min(Lens.a, Lens.b), b = Math.max(Lens.a, Lens.b), mid0 = (a + b) / 2;
    if (b - a < LENS / 3) { a = mid0 - LENS / 6; b = mid0 + LENS / 6; }
    x.setTransform(Lens.s, 0, 0, Lens.s, 0, 0);
    x.clearRect(0, 0, Lens.w, Lens.h);
    var st = Math.max(-0.5, Math.min((b - a - LENS) / LENS, 1.5)); // >0 stretched, <0 squashed
    var h = LENS * (1 - 0.17 * st);                                // keeps its volume: longer = thinner
    var r = Math.max(0, Math.min(h / 2, (b - a) / 2, LENS_R + Math.max(0, st) * 46)); // stretched ends round off like a drop
    var neck = Math.max(0, Math.min(h * 0.34, (st - 0.08) * h * 0.46));   // the waist between the two drops
    var top = Lens.cy - h / 2, bot = Lens.cy + h / 2;
    dropPath(x, a, b, top, bot, r, neck);
    var g = x.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(255,255,255,.30)'); g.addColorStop(0.5, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(255,255,255,.16)');
    x.fillStyle = g; x.fill();
    x.lineWidth = 1.6; x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke();
    // the bright inner rim along the top edge, like light caught in a drop of water
    var i = 2.6;
    dropPath(x, a + i, b - i, top + i, bot - i, Math.max(0, r - i), neck);
    var rim = x.createLinearGradient(0, top, 0, top + h * 0.55);
    rim.addColorStop(0, 'rgba(255,255,255,.8)'); rim.addColorStop(1, 'rgba(255,255,255,0)');
    x.lineWidth = 2; x.strokeStyle = rim; x.stroke();
  }
  H.first = function () { H.area = 'dock'; H.idx = 1; H.paint(); };
  H.enter = function () { if (H.orb) H.orb.start(); frostAll(); H.paint(); if (GH.trim) setTimeout(function () { GH.trim(); }, 1500); };
  H.resume = H.enter;
  H.leave = function () { if (H.orb) H.orb.stop(); };
  H.key = function (k) {
    if (H.area === 'cc') {
      if (k === 'left') { H.area = 'phone'; H.paint(); }
      else if (k === 'down') { H.area = 'dock'; H.paint(); }
      else if (k === 'ok') go('command');
      return;
    }
    if (H.area === 'phone') {
      if (k === 'right') { H.area = 'cc'; H.paint(); }
      else if (k === 'down') { H.area = 'dock'; H.paint(); }
      else if (k === 'ok') go('jarvis'); // its QR opens the phone page: remote + Jarvis
      return;
    }
    var n = H.items.length;
    if (k === 'left' || k === 'right') {
      var i = H.idx + (k === 'left' ? -1 : 1);
      if (i >= 0 && i < n && H.items[i].kind === 'sep') i += (k === 'left' ? -1 : 1);
      if (i >= 0 && i < n) { H.idx = i; H.paint(); }
    } else if (k === 'up') {
      H.area = 'cc'; H.paint();
    } else if (k === 'ok') {
      var it = H.items[H.idx];
      if (it.kind === 'app') { if (!GH.launch(it.id)) toast('Could not open ' + it.label); }
      else if (it.kind === 'foryou') go('foryou');
      else if (it.kind === 'fire') GH.settings('all');
      else if (it.kind === 'jarvis') go('jarvis');
    }
  };

  // ---- Screensaver -------------------------------------------------------------------------
  var A = { idx: -1, keys: [], orb: null };
  S.ambient = A;
  var CHIP_DEFS = {
    deadlines: { label: 'Deadlines', icon: I.cap },
    weather: { label: 'Weather', icon: I.moon },
    music: { label: 'Music', icon: I.music },
    anime: { label: 'Next episodes', icon: I.spark },
    watching: { label: 'Continue watching', icon: I.tv }
  };
  function chipKeys() {
    return ['deadlines', 'weather', 'music', 'anime', 'watching'].filter(function (k) { return pref('chip.' + k, 'on') !== 'off'; });
  }
  function chipMini(k) {
    var w = live.weather, d = live.digest, an = live.anime;
    if (k === 'deadlines') return d && d.deadlines ? d.deadlines.length + ' due' : 'Set up';
    if (k === 'weather') return w ? w.temp + '°' : '--';
    if (k === 'music') return live.music && live.music.title ? (live.music.playing ? 'Playing' : 'Paused') : 'Music';
    if (k === 'anime') return an && an.length ? Data.shortLeft(an[0].at - Date.now()) : (live.animeState === 'off' ? 'Set up' : '--');
    var wt = live.watching;
    if (wt && wt.length) return wt[0].duration ? Math.round(100 * wt[0].position / wt[0].duration) + '%' : 'Next';
    return pref('stremio.key', '') ? 'None' : 'Link';
  }
  function chipBody(k) {
    var w = live.weather, d = live.digest, an = live.anime, h = '';
    if (k === 'deadlines') {
      h = '<div class="eyebrow">DEADLINES · FROM MUSE</div>';
      if (d && d.deadlines && d.deadlines.length) {
        d.deadlines.slice(0, 3).forEach(function (x, i) {
          h += '<div class="row"><span>' + esc(x.title) + '</span><span class="v" data-due="' + esc(new Date(x.due).getTime()) + '"' + (i === 0 ? ' style="color:#fbbf24"' : '') + '></span></div>';
        });
      } else {
        h += '<div class="note">Connect Ascend from the phone page and your deadlines from Muse show up here.</div>';
      }
    } else if (k === 'weather') {
      h = '<div class="eyebrow">WEATHER</div>';
      if (w) {
        h += '<div style="display:flex;align-items:baseline;gap:14px;margin-top:8px"><span class="big">' + w.temp + '°</span><span style="font-weight:700;font-size:22px">' + esc(w.text) + '</span></div>'
          + '<div style="display:flex;gap:22px;margin-top:14px;font-family:Outfit,sans-serif;font-size:19px;color:rgba(255,255,255,.8)">'
          + w.hours.slice(0, 3).map(function (x) { return '<span>' + esc(x.label) + ' ' + x.t + '°</span>'; }).join('')
          + (w.aqi != null ? '<span>Air ' + w.aqi + '</span>' : '') + '</div>';
      } else h += '<div class="note">Loading the weather…</div>';
    } else if (k === 'music') {
      var mu = live.music;
      h = '<div class="eyebrow">NOW PLAYING</div>';
      if (mu && mu.title) {
        h += '<div style="font-weight:800;font-size:28px;margin-top:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(mu.title) + '</div>'
          + '<div class="note" style="margin-top:4px">' + esc([mu.artist, mu.app].filter(Boolean).join(' · ')) + '</div>'
          + (mu.duration ? '<div class="bar"><i style="width:' + Math.min(100, Math.round(100 * mu.position / mu.duration)) + '%"></i></div>' : '');
      } else {
        h += '<div style="font-weight:800;font-size:28px;margin-top:12px">Nothing playing</div>'
          + '<div class="note">' + (mu && mu.access ? 'Play a song in any app and it shows here.' : 'Songs playing on the TV show here once music access is switched on.') + '</div>';
      }
    } else if (k === 'anime') {
      h = '<div class="eyebrow">NEXT EPISODES · ANILIST</div>';
      if (an && an.length) {
        an.slice(0, 3).forEach(function (x, i) {
          h += '<div class="row"><span>' + esc(x.title) + ' · Ep ' + x.ep + '</span><span class="v"' + (i === 0 ? ' data-due="' + x.at + '"' : '') + '>' + (i === 0 ? '' : esc(Data.day(x.at) + ' ' + Data.time(x.at))) + '</span></div>';
        });
      } else if (live.animeState === 'off') {
        h += '<div class="note">Add your AniList name from the phone page and your next episodes show up here.</div>';
      } else h += '<div class="note">' + (live.animeState === 'loading' ? 'Loading your list…' : 'No upcoming episodes on your list.') + '</div>';
    } else {
      var wt = live.watching;
      h = '<div class="eyebrow">CONTINUE WATCHING · STREMIO</div>';
      if (wt && wt.length) {
        var x = wt[0];
        h += '<div style="font-weight:800;font-size:28px;margin-top:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(x.name) + '</div>'
          + '<div class="note" style="margin-top:4px">' + esc([epLabel(x), x.upNext ? 'Up next' : minutesLeft(x) + ' min left'].filter(Boolean).join(' · ')) + '</div>'
          + (x.duration ? '<div class="bar"><i style="width:' + Math.round(100 * x.position / x.duration) + '%;background:#67e8f9"></i></div>' : '');
      } else {
        h += '<div class="note">' + (pref('stremio.key', '') ? 'Nothing part way through right now.' : 'Link Stremio in Home settings, Accounts, and what you are part way through shows up here.') + '</div>';
      }
    }
    return h;
  }
  function paintChips() {
    A.keys = chipKeys();
    var html = A.keys.map(function (k, i) {
      return '<div class="chip frost' + (i === A.idx ? ' open' : '') + '" data-k="' + k + '"><div class="mini">' + ico(CHIP_DEFS[k].icon) + '<b>' + esc(chipMini(k)) + '</b></div><div class="body">' + chipBody(k) + '</div></div>';
    }).join('');
    $('chips').innerHTML = html;
    frostAll();
    paintChipTimers();
  }
  function paintChipTimers() {
    var now = Date.now();
    Array.prototype.forEach.call(document.querySelectorAll('[data-due]'), function (el) {
      var at = +el.getAttribute('data-due');
      if (at) el.textContent = 'in ' + Data.countdown(at - now);
    });
  }
  function paintRace() {
    var f = live.f1 && live.f1.next;
    if (!f) { $('raceName').textContent = 'FORMULA 1'; $('raceSessions').textContent = 'Season complete'; return; }
    $('raceName').textContent = (f.name + (f.round ? ' · ROUND ' + f.round + (f.total ? ' OF ' + f.total : '') : '')).toUpperCase();
    $('raceSessions').textContent = f.sessions.filter(function (s) { return s.at > Date.now() - 3 * 3600000; }).slice(-3)
      .map(function (s) { return s.name + ' ' + Data.day(s.at) + ' ' + Data.time(s.at); }).join(' · ');
    paintRaceCount();
  }
  function paintRaceCount() {
    var f = live.f1 && live.f1.next;
    $('raceCount').textContent = f ? Data.countdown(f.start - Date.now()) : '';
  }
  A.paint = function () {
    Array.prototype.forEach.call($('chips').children, function (el, i) { el.classList.toggle('open', i === A.idx); });
    frostFollow(900); // pills slide while one opens; keep their glass lined up
    var onJ = A.idx === A.keys.length;
    $('ambJarvis').classList.toggle('focus', onJ);
    if (A.orb) A.orb.focus(onJ);
  };
  A.enter = function () {
    nextF1();
    A.idx = -1;
    paintChips();
    if (!A.orb) A.orb = new Orb($('ambOrb'), 200);
    A.orb.start();
    A.paint();
  };
  A.resume = function () { if (A.orb) A.orb.start(); };
  A.leave = function () { if (A.orb) A.orb.stop(); };
  A.key = function (k) {
    var n = A.keys.length;
    if (k === 'left') { A.idx = A.idx <= 0 ? 0 : A.idx - 1; A.paint(); }
    else if (k === 'right') { A.idx = A.idx < 0 ? 0 : Math.min(n, A.idx + 1); A.paint(); }
    else if (k === 'up' || k === 'down') { if (A.idx < 0) { A.idx = 0; A.paint(); } }
    else if (k === 'ok') {
      if (A.idx < 0) { A.idx = 0; A.paint(); }
      else if (A.idx === n) go('jarvis');
      else go('expanded', A.keys[A.idx]);
    }
  };

  // ---- Expanded view ---------------------------------------------------------------------------
  var E = { k: null };
  S.expanded = E;
  E.enter = function (k) {
    E.k = k || E.k;
    if (E.k === 'music') pollMusic();
    if (E.k === 'stremio') E.startLink();
    E.render();
  };
  E.leave = function () { clearInterval(E.pollT); E.link = null; };
  E.tick = function () { paintChipTimers(); if (E.k === 'music' && new Date().getSeconds() % 3 === 0 && pollMusic()) E.render(); };
  E.key = function (k) {
    if (E.k === 'watching' && k === 'ok' && live.watching && live.watching[0]) {
      var x = live.watching[0];
      GH.openStremioVideo(x.type, x.id, x.videoId);
    } else if (E.k === 'music') {
      GH.media(k === 'ok' ? 'play_pause' : k === 'left' ? 'previous' : k === 'right' ? 'next' : '');
      setTimeout(function () { if (pollMusic()) E.render(); }, 800);
    }
  };
  /** Stremio's "link a device": show a code, wait for the phone to approve it, keep the key. */
  E.startLink = function () {
    clearInterval(E.pollT);
    E.link = null; E.linkMsg = '';
    Data.stremioLink().then(function (l) {
      E.link = l; E.render();
      var started = Date.now();
      E.pollT = setInterval(function () {
        if (Date.now() - started > 5 * 60000) { clearInterval(E.pollT); E.startLink(); return; }
        Data.stremioLinkRead(l.code).then(function (key) {
          if (!key) return;
          clearInterval(E.pollT);
          setPref('stremio.key', key);
          E.link = null; E.linkMsg = 'Linked. Continue watching now follows your Stremio library.';
          E.render();
          refreshData();
        }).catch(function () { /* keep waiting */ });
      }, 3000);
    }).catch(function () { E.linkMsg = 'Could not reach Stremio. Check the internet and try again.'; E.render(); });
  };
  E.render = function () {
    var k = E.k, w = live.weather, d = live.digest, an = live.anime, src = '', h = '';
    if (k === 'deadlines') {
      src = 'from Muse, via Ascend';
      if (d && d.deadlines && d.deadlines.length) {
        h = '<div class="list">' + d.deadlines.slice(0, 6).map(function (x, i) {
          var at = new Date(x.due).getTime();
          return '<div class="it' + (i === 0 ? ' hot' : '') + '"><span>' + esc(x.title) + '<small>' + esc(Data.day(at) + ' ' + Data.time(at) + (x.course ? ' · ' + x.course : '')) + '</small></span><span class="v" data-due="' + at + '"' + (i === 0 ? ' style="color:#fbbf24"' : '') + '></span></div>';
        }).join('') + '</div>';
      } else h = '<div class="empty">Nothing yet. Open the phone page (Jarvis screen shows the address) and connect Ascend: Muse\'s deadlines then appear here with live countdowns.</div>';
    } else if (k === 'weather') {
      src = 'Open-Meteo';
      if (w) {
        h = '<div style="display:flex;align-items:baseline;gap:18px;margin-top:10px"><span style="font-family:Outfit,sans-serif;font-weight:300;font-size:96px;line-height:1">' + w.temp + '°</span><span><span style="display:block;font-weight:800;font-size:26px">' + esc(w.text) + '</span><span style="display:block;font-size:18px;color:rgba(255,255,255,.7)">Feels ' + w.feels + '°' + (w.aqi != null ? ' · Air ' + w.aqi : '') + '</span></span></div>'
          + '<div class="hours">' + w.hours.map(function (x) { return '<div><div>' + esc(x.label) + '</div><div>' + x.t + '°</div></div>'; }).join('') + '</div>'
          + '<div class="days">' + w.days.map(function (x) { return '<span>' + esc(x.label) + ' ' + x.max + '° / ' + x.min + '°</span>'; }).join('') + '</div>'
          + (w.sunrise ? '<div class="days" style="border:0;padding-top:0;margin-top:12px;font-size:17px;color:rgba(255,255,255,.6)"><span>Sunrise ' + esc(w.sunrise) + '</span><span>Sunset ' + esc(w.sunset) + '</span></div>' : '');
      } else h = '<div class="empty">Loading the weather…</div>';
    } else if (k === 'music') {
      src = 'on the TV';
      var mu = live.music;
      h = mu && mu.title
        ? '<div style="font-weight:800;font-size:34px;margin-top:24px">' + esc(mu.title) + '</div><div style="font-size:21px;color:rgba(255,255,255,.72);margin-top:6px">' + esc([mu.artist, mu.album, mu.app].filter(Boolean).join(' · ')) + '</div>'
          + (mu.duration ? '<div class="bar" style="margin-top:28px"><i style="width:' + Math.min(100, Math.round(100 * mu.position / mu.duration)) + '%"></i></div>' : '')
          + '<div class="empty" style="font-size:18px">OK: play or pause. Left and right: previous and next.</div>'
        : '<div class="empty">Nothing is playing right now. Songs from any app on the TV show here, with play, pause and skip, once music access is switched on for Glass Home.</div>';
    } else if (k === 'stremio') {
      src = 'link.stremio.com';
      h = E.link ? '<div style="display:flex;gap:30px;align-items:center;margin-top:26px"><img src="' + esc(GH.qr(E.link.link) || '') + '" alt="" style="width:200px;height:200px;border-radius:18px;background:#fff;padding:8px">'
        + '<div style="font-size:22px;line-height:1.55;color:rgba(255,255,255,.85)">Scan this with your phone, or open <b>link.stremio.com</b> and enter<div style="font-family:Outfit,sans-serif;font-size:56px;letter-spacing:.12em;margin-top:8px">' + esc(E.link.code) + '</div>Sign in there and this TV links by itself.</div></div>'
        : '<div class="empty">' + esc(E.linkMsg || 'Getting a code from Stremio…') + '</div>';
    } else if (k === 'anime') {
      src = 'your AniList';
      if (an && an.length) {
        h = '<div class="list">' + an.slice(0, 5).map(function (x, i) {
          return '<div class="it"><img class="cover" src="' + esc(x.cover) + '" alt=""><span style="flex:1">' + esc(x.title) + '<small>Episode ' + x.ep + ' · ' + esc(Data.day(x.at) + ' ' + Data.time(x.at)) + '</small></span><span class="v"' + (i === 0 ? ' data-due="' + x.at + '" style="color:#67e8f9"' : '') + '>' + (i === 0 ? '' : esc(Data.shortLeft(x.at - Date.now()))) + '</span></div>';
        }).join('') + '</div>';
      } else h = '<div class="empty">' + (live.animeState === 'off' ? 'Add your AniList user name from the phone page. Your watching and planning lists then show their next episodes here.' : 'No upcoming episodes on your list right now.') + '</div>';
    } else {
      src = 'Stremio';
      var wt = live.watching;
      h = wt && wt.length ? '<div class="list">' + wt.slice(0, 4).map(function (x, i) {
        return '<div class="it"' + (i === 0 ? ' style="margin-top:14px;border-radius:20px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3)"' : '') + '><img class="cover" src="' + esc(x.poster) + '" alt=""><span style="flex:1;min-width:0">' + esc(x.name)
          + '<small>' + esc([epLabel(x), x.upNext ? 'Up next' : minutesLeft(x) + ' min left'].filter(Boolean).join(' · ')) + '</small>'
          + (x.duration ? '<span class="bar" style="display:block;margin-top:8px;height:4px"><i style="height:4px;width:' + Math.round(100 * x.position / x.duration) + '%;background:#67e8f9"></i></span>' : '') + '</span></div>';
      }).join('') + '</div><div class="empty" style="font-size:18px;margin-top:16px">OK resumes the first one in Stremio.</div>'
        : '<div class="empty">Link your Stremio account from Home settings and the shows and films you are part way through appear here, ready to resume.</div>';
    }
    var title = { deadlines: 'DEADLINES', weather: 'WEATHER', music: 'NOW PLAYING', anime: 'NEXT EPISODES', watching: 'CONTINUE WATCHING', stremio: 'LINK STREMIO' }[k] || '';
    $('expPanel').innerHTML = '<div class="top"><span class="eyebrow">' + title + '</span><span class="src">' + esc(src) + '</span></div>' + h;
    paintChipTimers();
  };

  // ---- Jarvis --------------------------------------------------------------------------------
  var J = { orb: null, log: [], busy: false, timer: 0 };
  S.jarvis = J;
  function jState(s) {
    var label = { listening: 'LISTENING', thinking: 'THINKING', speaking: 'SPEAKING' }[s];
    var color = { listening: '#7dd3fc', thinking: '#c4b5fd', speaking: '#5eead4' }[s];
    $('jState').textContent = label; $('jState').style.color = color;
    if (J.orb) J.orb.set(s);
  }
  J.enter = function (text) {
    if (!J.orb) J.orb = new Orb($('bigOrb'), 600, { points: 140, neighbours: 3, state: 'listening' });
    J.orb.start();
    jState('listening');
    $('jWords').innerHTML = '';
    var link = {};
    try { link = JSON.parse(GH.phone()); } catch (e) { link = {}; }
    // the line is rebuilt each time (pairing below replaces its contents)
    $('jLinkText').innerHTML = 'Remote and Jarvis on your phone: scan, or open<br><b>' + esc((link.url || '').replace(/^https?:\/\//, '')) + '</b> · PIN <b>' + esc(link.pin || '') + '</b>';
    var qr = link.url && GH.qr ? GH.qr(link.url + '/#pin=' + link.pin) : '';
    // Paired with Ascend (or pairing): the one phone page on Ascend replaces the TV's own address.
    var tvPage = pref('ascend.url', '').replace(/\/+$/, '') + '/tv/';
    if (window.Relay && (Relay.state === 'paired' || Relay.state === 'pair') && GH.qr) {
      qr = GH.qr(tvPage);
      $('jLinkText').innerHTML = Relay.state === 'pair'
        ? 'Pair your phone: scan, or open<br><b>' + esc(tvPage.replace(/^https?:\/\//, '')) + '</b> and type <b style="letter-spacing:.2em">' + esc(Relay.code) + '</b>'
        : 'Remote and Jarvis on your phone: scan, or open<br><b>' + esc(tvPage.replace(/^https?:\/\//, '')) + '</b> · add it to your home screen';
    }
    $('jQr').style.display = qr ? '' : 'none';
    if (qr) $('jQr').src = qr;
    $('jLink').style.opacity = 1;
    if (text) J.hear(text);
  };
  J.leave = function () { if (J.orb) J.orb.stop(); GH.stopSpeaking(); };
  J.resume = function () { if (J.orb) J.orb.start(); }; // back from an overlay opened on top (Menu)
  J.key = function () {};
  function showWords(text) {
    $('jLink').style.opacity = 0;
    $('jWords').innerHTML = String(text).split(/\s+/).filter(Boolean).slice(0, 40).map(function (w, i) {
      return '<span style="animation-delay:' + (i * 0.12).toFixed(2) + 's">' + esc(w) + '</span>';
    }).join(' ');
  }
  function logLine(who, text) {
    J.log.push({ who: who, text: text, at: Date.now() });
    J.log = J.log.slice(-20);
    if (window.Relay) Relay.push({ log: J.log.slice(-14) });
    try { GH.jarvisLog(JSON.stringify(J.log)); } catch (e) { /* phone log is optional */ }
  }
  // Shows the reply on the TV and says it through the TV speakers (the shorter `spoken` line when
  // Ascend sends one). UI.voice('done') puts Jarvis back to listening after the voice ends.
  function reply(text, spoken) {
    if (!text) { jState('listening'); return; }
    logLine('jarvis', text);
    showWords(text);
    clearTimeout(J.timer);
    if (pref('voice', 'on') !== 'off' && GH.speak(spoken || text)) {
      J.timer = setTimeout(function () { jState('listening'); }, 30000); // in case the voice never reports back
      return;
    }
    J.timer = setTimeout(function () { jState('listening'); }, 5000);
  }
  J.hear = function (text) {
    showWords(text);
    logLine('you', text);
    jState('thinking');
    var r = Brain.parse(text, { apps: live.apps });
    setTimeout(function () { act(r); }, Math.min(1600, 400 + String(text).split(/\s+/).length * 120));
  };
  function info(topic) {
    var w = live.weather, f = live.f1 && live.f1.next, an = live.anime, d = live.digest;
    if (topic === 'weather') return w ? 'It is ' + w.temp + ' degrees and ' + w.text.toLowerCase() + '. Next few hours, ' + w.hours.slice(0, 3).map(function (x) { return x.t; }).join(', ') + ' degrees.' : 'I could not get the weather just now.';
    if (topic === 'f1') return f ? 'The ' + f.name + ' starts in ' + Data.countdown(f.start - Date.now()).replace(/:\d\d$/, '').replace('d ', ' days, ').replace(':', ' hours and ') + ' minutes, ' + Data.day(f.start) + ' at ' + Data.time(f.start) + '.' : 'The Formula 1 season is over for this year.';
    if (topic === 'anime') return an && an.length ? an[0].title + ' episode ' + an[0].ep + ' comes out ' + Data.day(an[0].at) + ' at ' + Data.time(an[0].at) + '.' : 'Add your AniList name on the phone page and I will track your episodes.';
    if (topic === 'deadlines') return d && d.deadlines && d.deadlines.length ? 'Next up: ' + d.deadlines[0].title + ', due ' + Data.day(new Date(d.deadlines[0].due).getTime()) + '.' : 'Connect Ascend on the phone page and I can read your deadlines from Muse.';
    if (topic === 'time') return 'It is ' + Data.time(Date.now()) + '.';
    return '';
  }
  function act(r) {
    var a = r.act || {};
    if (a.type === 'open') { reply(r.say); setTimeout(function () { GH.launch(a.id); }, 900); return; }
    if (a.type === 'search') { reply(r.say + ' Use the phone remote to pick one.'); setTimeout(function () { GH.searchIn(a.app, a.q); }, 900); return; }
    if (a.type === 'media') { GH.media(a.action); reply(r.say); return; }
    if (a.type === 'screen') { back(); go(a.name); return; }
    if (a.type === 'sleep') { reply(r.say); setTimeout(function () { if (!GH.sleep()) toast('Sleep works once Glass Home holds the Home button.'); }, 1500); return; }
    if (a.type === 'timer') { GH.sleepTimer(a.minutes); reply(r.say); return; }
    if (a.type === 'memory') { reply(r.say); Data.call('freeMemory').then(function (t) { reply('Freed ' + JSON.parse(t).freedMb + ' megabytes.'); }); return; }
    if (a.type === 'speed') { reply(r.say); Data.call('speedTest').then(function (t) { reply('About ' + JSON.parse(t).mbps + ' megabits per second.'); }).catch(function () { reply('The speed test failed.'); }); return; }
    if (a.type === 'info') { reply(info(a.topic)); if (a.show) setTimeout(function () { back(); go('ambient'); go('expanded', a.topic === 'deadlines' ? 'deadlines' : 'weather'); }, 2500); return; }
    if (a.type === 'ask') { ask(a.text); return; }
    reply(r.say);
  }
  /** Anything the TV cannot do itself goes to Ascend's Jarvis (and from there to Muse). */
  function ask(text) {
    loadPrefs(); // the phone page may have just set the Ascend address or key
    var url = pref('ascend.url', ''), k = pref('ascend.key', '');
    if (!url || !k) { reply('I can open apps, play or pause, show the weather, F1 and your episodes, and put the TV to sleep. Connect Ascend on the phone page and I can do everything else.'); return; }
    var ctx = { apps: (live.apps || []).map(function (a) { return a.label; }), screen: top() };
    var body = JSON.stringify({ key: k, surface: 'tv', context: ctx,
      messages: J.log.slice(-8).map(function (l) { return { role: l.who === 'you' ? 'user' : 'assistant', content: l.text }; }) });
    Data.get(url.replace(/\/$/, '') + '/api/tv/jarvis', body, 0).then(function (t) {
      var res = JSON.parse(t);
      if (res.error) { reply(/key/i.test(res.error) ? 'Ascend did not accept this TV\'s key.' : 'Ascend had a problem: ' + res.error); return; }
      reply(res.reply || res.text || 'Done.', res.speak);
      setTimeout(function () { runTvTools(res.toolCalls || []); }, 1200);
    }).catch(function (e) {
      var why = String(e && e.message || e);
      console.warn('ascend jarvis failed: ' + why); // shows in the TV log (tag GlassHome)
      reply(/504|timeout|timed out|429/i.test(why) ? 'Ascend is slow right now. Ask me again in a moment.' : 'I could not reach Ascend right now.');
    });
  }
  // Actions Ascend's Jarvis asks the TV to take (the tools declared in Ascend's tv-routes.ts).
  function runTvTools(calls) {
    calls.forEach(function (c) {
      if (!c || (typeof c.confidence === 'number' && c.confidence < 0.5)) return;
      var a = c.args || {};
      if (c.tool === 'openApp') {
        var want = String(a.app || '').toLowerCase(), app = (live.apps || []).filter(function (x) { return x.label.toLowerCase().indexOf(want) >= 0 || want.indexOf(x.label.toLowerCase()) >= 0; })[0];
        if (app) GH.launch(app.id); else toast('No app called ' + a.app);
      } else if (c.tool === 'searchStremio' && a.query) GH.searchIn('stremio', String(a.query));
      else if (c.tool === 'searchYouTube' && a.query) GH.searchIn('youtube', String(a.query));
      else if (c.tool === 'media' && /^(play|pause|next|previous)$/.test(a.action)) GH.media(a.action);
      else if (c.tool === 'showScreen' && /^(home|foryou|ambient|command|settings)$/.test(a.screen)) { back(); go(a.screen); }
      else if (c.tool === 'sleepTimer' && +a.minutes >= 0) GH.sleepTimer(+a.minutes);
    });
  }
  window.UI = window.UI || {};

  // ---- the phone page on Ascend (relay.js) ----------------------------------------------------------
  function relayPushAll() {
    if (!window.Relay) return;
    var installed = [];
    try { installed = JSON.parse(GH.installed()); } catch (e) { installed = []; }
    Relay.push({ label: 'Glass Home', screen: top(), tv: GH.tvState ? GH.tvState() : '', log: J.log.slice(-14), anilist: pref('anilist.user', ''), stremio: !!pref('stremio.key', ''),
      apps: (live.apps || []).map(function (a) { return { id: a.id, label: a.label }; }), installed: installed, apkPage: GH.apkPage() });
  }
  function relayCmd(c) {
    resetIdle();
    if (c.t === 'key') {
      if (c.k === 'play') GH.media('play_pause');
      else if (c.k === 'rew') GH.media('rewind');
      else if (c.k === 'ffwd') GH.media('fast_forward');
      else if (/^(up|down|left|right|ok|back|home|menu|del|volup|voldown|mute|power_on|power_off)$/.test(c.k)) GH.remote(c.k, '');
    } else if (c.t === 'type') GH.remote('type', String(c.text || '').slice(0, 200));
    else if (c.t === 'launch') {
      var app = (live.apps || []).filter(function (a) { return a.id === c.id; })[0];
      if (app) GH.launch(app.id);
    } else if (c.t === 'say' && c.text) {
      GH.showMe();
      setTimeout(function () { window.UI.heard(String(c.text).slice(0, 500)); }, 400);
    } else if (c.t === 'setting' && c.key === 'anilist.user' && /^[A-Za-z0-9_-]{0,40}$/.test(String(c.value || ''))) {
      setPref('anilist.user', String(c.value || ''));
      relayPushAll();
    } else if (c.t === 'uninstall' && c.id) {
      GH.uninstall(String(c.id));
      setTimeout(relayPushAll, 15000); // the list changes once it is confirmed on the TV
    } else if (c.t === 'screen' && c.name === 'stremio-link') {
      GH.showMe();
      setTimeout(function () { go('expanded', 'stremio'); }, 400);
    }
  }
  function relayStart() {
    if (!window.Relay) return;
    loadPrefs();
    Relay.start({ url: pref('ascend.url', ''), key: pref('ascend.key', ''), onCmd: relayCmd,
      onChange: function () { if (top() === 'jarvis') J.enter(); relayPushAll(); } });
  }
  setTimeout(relayStart, 2500);
  setInterval(function () { if (window.Relay && Relay.state === 'paired') relayPushAll(); }, 60000);

  // ---- Command Center ---------------------------------------------------------------------------
  var C = { idx: 0, items: [], orb: null, timerSteps: [0, 15, 30, 60, 90] };
  S.command = C;
  function status() { try { live.status = JSON.parse(GH.status()) || {}; } catch (e) { live.status = {}; } return live.status; }
  function sleepLabel() {
    var at = +(live.status.sleepAt || 0);
    return at > Date.now() ? 'Off in ' + Data.shortLeft(at - Date.now()) : 'Off';
  }
  C.defs = function () {
    var st = live.status;
    return [
      { t: 'Wi-Fi', s: st.wifi ? (st.ssid ? st.ssid + ' · ' : '') + st.signal + '%' : 'Not connected', i: ico(I.wifi, 44, '#1d7cf2'), a: function () { GH.settings('wifi'); } },
      { t: 'Bluetooth', s: 'Remotes, audio', i: ico(I.bt, 44, '#2f8bff'), a: function () { GH.settings('bluetooth'); } },
      { t: 'Memory', s: (st.memUsed != null ? st.memUsed + '% used · ' : '') + 'Free up', bar: st.memUsed, i: ico(I.chip, 44), a: function () { toast('Freeing memory…'); Data.call('freeMemory').then(function (t) { toast('Freed ' + JSON.parse(t).freedMb + ' MB'); status(); C.render(); }); } },
      { t: 'Speed test', s: st.lastSpeed ? 'Last ' + st.lastSpeed + ' Mbps' : 'Tap to test', i: ico(I.gauge, 44), a: function () { toast('Testing for 8 seconds…'); Data.call('speedTest').then(function (t) { toast(JSON.parse(t).mbps + ' Mbps'); status(); C.render(); }).catch(function () { toast('Speed test failed'); }); } },
      { t: 'Send to TV', s: 'Phone link', i: ico(I.cast, 44), a: function () { GH.launch('local.sendtotv'); } },
      { t: 'Sleep Timer', s: sleepLabel(), i: ico(I.timer, 44), a: function () {
        var at = +(live.status.sleepAt || 0), left = at > Date.now() ? (at - Date.now()) / 60000 : 0, steps = C.timerSteps, next = 0;
        for (var i = 0; i < steps.length; i++) if (steps[i] > left + 1) { next = steps[i]; break; }
        GH.sleepTimer(next); status(); C.render(); toast(next ? 'Sleeping in ' + next + ' minutes' + (GH.guardOn() ? '' : ' (needs the Home switch)') : 'Sleep timer off');
      } },
      { t: 'Ambient Mode', s: 'Screensaver', i: '<svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="#facc15"><path d="M10 2l1.6 5.4L17 9l-5.4 1.6L10 16l-1.6-5.4L3 9l5.4-1.6z"/><path d="M18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8z"/></svg>', a: function () { go('ambient'); } },
      { t: 'Power Off', s: 'Screen Off', i: ico(I.power, 44, '#ef4444'), a: function () { if (!GH.sleep()) toast('Screen off works once Glass Home holds the Home button'); } }
    ];
  };
  C.squares = [
    { label: 'Jarvis', a: function () { go('jarvis'); } },
    { label: 'Apps', i: ico(I.grid, 46), a: function () { GH.settings('apps'); } },
    { label: 'Fire TV settings', i: '<svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="#fff"><path d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7 7 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54a7 7 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.7 8.48a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88L2.82 14.5a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.38 1.05.7 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.8a.5.5 0 0 0 .49-.42l.36-2.54a7 7 0 0 0 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/></svg>', a: function () { GH.settings('all'); } },
    { label: 'Home settings', i: ico(I.toggles, 46), a: function () { go('settings'); } }
  ];
  C.render = function () {
    C.items = C.defs();
    $('ccGrid').innerHTML = C.items.map(function (d, i) {
      return '<button class="pill" style="animation-delay:' + (i * 0.03).toFixed(2) + 's">' + d.i + '<span style="flex:1;min-width:0"><span class="t">' + esc(d.t) + '</span><span class="s">' + esc(d.s) + '</span>'
        + (d.bar != null ? '<span style="display:block;height:6px;border-radius:3px;background:rgba(127,127,127,.35);margin-top:8px;width:156px"><span style="display:block;width:' + d.bar + '%;height:6px;border-radius:3px;background:currentColor"></span></span>' : '') + '</span></button>';
    }).join('');
    $('ccSq').innerHTML = C.squares.map(function (s, i) {
      return '<button class="sqb" aria-label="' + esc(s.label) + '" style="animation-delay:' + (0.26 + i * 0.03).toFixed(2) + 's">' + (s.i || '<canvas id="ccOrb" style="width:84px;height:84px"></canvas>') + '</button>';
    }).join('');
    if (C.orb) C.orb.stop();
    C.orb = new Orb($('ccOrb'), 84);
    C.orb.start();
    C.paint();
  };
  C.paint = function () {
    var all = Array.prototype.slice.call($('ccGrid').children).concat(Array.prototype.slice.call($('ccSq').children));
    all.forEach(function (el, i) { el.classList.toggle('focus', i === C.idx); });
    if (C.orb) C.orb.focus(C.idx === 8);
  };
  C.enter = function () { C.idx = 0; status(); C.render(); ccPop(); };
  // iOS-style opening: the panel drops in from the top, each row a beat behind (see .pop in
  // style.css). Only on opening; tiles re-render after some actions and should not replay it then.
  function ccPop() {
    var cmd = $('command');
    var tiles = cmd.querySelectorAll('.pill, .sqb');
    for (var i = 0; i < tiles.length; i++) {
      var row = Math.round((offsetIn(tiles[i], stage)[1] - 120) / 136);
      tiles[i].style.animationDelay = (0.03 + Math.max(0, row) * 0.035).toFixed(3) + 's';
    }
    cmd.classList.add('pop');
    clearTimeout(C.popT);
    C.popT = setTimeout(function () { cmd.classList.remove('pop'); }, 900);
  }
  C.leave = function () { if (C.orb) C.orb.stop(); };
  C.resume = function () { if (C.orb) C.orb.start(); }; // back from Home settings
  C.key = function (k) {
    var i = C.idx;
    if (i < 8) {
      if (k === 'left' && i % 2 === 1) i--;
      else if (k === 'right' && i % 2 === 0) i++;
      else if (k === 'up' && i >= 2) i -= 2;
      else if (k === 'down') i = i < 6 ? i + 2 : (i === 6 ? 8 : 10);
    } else {
      if (k === 'left' && i > 8) i--;
      else if (k === 'right' && i < 11) i++;
      else if (k === 'up') i = i < 10 ? 6 : 7;
    }
    if (k === 'ok') { (C.idx < 8 ? C.items[C.idx] : C.squares[C.idx - 8]).a(); return; }
    C.idx = i; C.paint();
  };
  var toastT = 0;
  function toast(t) {
    var el = top() === 'command' ? $('ccToast') : $('gToast'); // every screen gets the pop-up
    el.textContent = t; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  // ---- For You ------------------------------------------------------------------------------
  var F = { g: 0, area: 'row', idx: 0, items: [], tx: 0, loadSeq: 0, cat: 'anime' };
  S.foryou = F;
  // Anime / Shows / Movies along the top; the wheel on the left lists what each one offers.
  var CATS = ['continue', 'anilist', 'anime', 'shows', 'movies'];
  var ANILIST_VIEWS = ['Due to watch', 'Upcoming', 'Planning', 'All'];
  function catGenres(c) { return c === 'continue' ? ['Watching'] : c === 'anilist' ? ANILIST_VIEWS : c === 'anime' ? Object.keys(Data.ANIME) : ['Popular', 'Featured'].concat(Data.GENRES); }
  function anilistItems(view) {
    return Data.anilistList(pref('anilist.user', '')).then(function (all) {
      if (view === 'Due to watch') return all.filter(function (m) { return m.due > 0; });
      if (view === 'Upcoming') return all.filter(function (m) { return m.nextAt && !m.due; });
      if (view === 'Planning') return all.filter(function (m) { return m.listStatus === 'PLANNING'; });
      return all;
    });
  }
  var catDefault = pref('stremio.key', '') ? 'continue' : 'anime';
  F.cat = CATS.indexOf(pref('foryou.cat', catDefault)) >= 0 ? pref('foryou.cat', catDefault) : catDefault;
  // Continue watching from the linked Stremio library, shaped like catalog items.
  function continueItems() {
    var key = pref('stremio.key', '');
    if (!key) return Promise.reject(new Error('unlinked'));
    return Data.watching(key).then(function (w) {
      live.watching = w; paintChips();
      return (w || []).map(function (x) {
        var left = x.duration && x.position ? Math.max(1, Math.round((x.duration - x.position) / 60000)) + ' min left' : 'Up next';
        return { id: x.id, type: x.type, name: x.name, poster: x.poster, videoId: x.videoId,
          background: /^tt\d+$/.test(x.id) ? 'https://images.metahub.space/background/small/' + x.id + '/img' : '',
          meta: (x.season > 0 ? 'S' + x.season + ' E' + x.episode + ' \u00b7 ' : x.episode > 0 ? 'E' + x.episode + ' \u00b7 ' : '') + left };
      });
    });
  }
  F.genres = catGenres(F.cat);
  F.paintCats = function () {
    var el = $('fyCats'), blob = $('fyBlob'), cur = null;
    Array.prototype.forEach.call(el.querySelectorAll('b'), function (b) {
      var on = b.getAttribute('data-c') === F.cat;
      b.classList.toggle('cur', on);
      if (on) cur = b;
    });
    el.classList.toggle('focus', F.area === 'cats');
    if (!cur) return;
    var left = cur.offsetLeft, right = el.clientWidth - cur.offsetLeft - cur.offsetWidth;
    var was = +(blob.getAttribute('data-left') || left), dir = left > was ? 1 : left < was ? -1 : 0;
    // the edge in front moves first and fast, the one behind follows with a springy overshoot
    var lead = 'cubic-bezier(.3,1.25,.5,1) 0s', trail = 'cubic-bezier(.4,1.6,.45,1) .07s';
    blob.style.transition = 'background .25s, box-shadow .25s, left .42s ' + (dir < 0 ? lead : trail) + ', right .42s ' + (dir > 0 ? lead : trail);
    blob.style.left = left + 'px';
    blob.style.right = right + 'px';
    blob.setAttribute('data-left', left);
  };
  // Turns the genre wheel by one (down = next) and loads it, with the names sliding in that way.
  F.turn = function (dir) {
    var ga = F.genres.length, w = $('fyWheel');
    if (ga < 2) return;
    F.g = (F.g + dir + ga) % ga;
    w.classList.remove('turn-down', 'turn-up');
    F.paintWheel();
    void w.offsetWidth;
    w.classList.add(dir > 0 ? 'turn-down' : 'turn-up');
    clearTimeout(F.wt); F.wt = setTimeout(F.load, 350);
  };
  F.setCat = function (c) {
    if (c === F.cat) return;
    F.cat = c; setPref('foryou.cat', c);
    F.genres = catGenres(c); F.g = 0;
    F.paint(); clearTimeout(F.wt); F.wt = setTimeout(F.load, 350);
  };
  F.paintWheel = function () {
    var w = $('fyWheel'), html = w.querySelector('svg').outerHTML, n = F.genres.length;
    var spots = [[-1, 120, 118, -14], [0, 132, 248, 0], [1, 120, 388, 14]];
    var shown = spots.map(function (sp) { return F.genres[(F.g + sp[0] + n) % n]; }).join('|');
    // Rebuild only when the genres shown change; moving along the row repainted it every time.
    if (w.getAttribute('data-shown') !== shown) {
      w.setAttribute('data-shown', shown);
      spots.forEach(function (sp) {
        if (n < 2 && sp[0] !== 0) return;
        var gi = (F.g + sp[0] + n) % n;
        html += '<div class="g' + (sp[0] === 0 ? ' cur' : '') + '" style="left:' + sp[1] + 'px;top:' + sp[2] + 'px;transform:rotate(' + sp[3] + 'deg)"><i></i><b>' + esc(F.genres[gi].toUpperCase()) + '</b></div>';
      });
      w.innerHTML = html;
    }
    w.classList.toggle('focus', F.area === 'wheel');
  };
  F.load = function () {
    var seq = ++F.loadSeq, g = F.genres[F.g], type = F.cat === 'movies' ? 'movie' : 'series';
    F.loading = true;
    $('fyMsg').textContent = 'Loading from Stremio…';
    var p = F.cat === 'continue' ? continueItems() : F.cat === 'anilist' ? anilistItems(g) : F.cat === 'anime' ? Data.anime(g)
      : Data.picks(type, g === 'Popular' || g === 'Featured' ? '' : g, g === 'Featured' ? 'imdbRating' : 'top');
    p.then(function (items) {
      if (seq !== F.loadSeq) return;
      F.loading = false;
      F.items = items; F.idx = 0; F.tx = 0;
      $('fyMsg').textContent = items.length ? '' : F.cat === 'continue' ? 'Nothing to continue in your Stremio library yet.'
        : F.cat === 'anilist' ? (g === 'Due to watch' ? 'All caught up: nothing due on your AniList.' : 'Nothing in ' + g + ' on your AniList.') : 'Nothing in ' + g + ' right now.';
      $('fyRow').innerHTML = items.map(function (m) { return '<img src="' + esc(m.poster) + '" alt="">'; }).join('');
      F.paint();
    }).catch(function (e) {
      if (seq !== F.loadSeq) return;
      F.loading = false;
      if (e && e.message === 'no-anilist') {
        F.items = []; F.idx = 0; $('fyRow').innerHTML = ''; F.paint();
        $('fyMsg').textContent = 'Add your AniList user name: phone page, Setup tab.';
      } else if (e && e.message === 'unlinked') {
        F.items = []; F.idx = 0; $('fyRow').innerHTML = ''; F.paint();
        $('fyMsg').textContent = 'Link Stremio to see what you were watching: Home settings > Accounts > Stremio.';
      } else $('fyMsg').textContent = 'Could not reach Stremio\'s catalog.';
    });
  };
  F.paint = function () {
    F.paintWheel();
    F.paintCats();
    var m = F.items[F.idx];
    var imgs = $('fyRow').children;
    Array.prototype.forEach.call(imgs, function (el, i) { el.classList.toggle('focus', F.area === 'row' && i === F.idx); el.classList.toggle('sel', F.area !== 'row' && i === F.idx); });
    if (imgs[F.idx]) {
      var x = imgs[F.idx].offsetLeft, view = 1280 - 140;
      if (x + F.tx > view - 112) F.tx = view - 112 - x;
      if (x + F.tx < 0) F.tx = -x;
      $('fyRow').style.transform = 'translateX(' + F.tx + 'px)';
    }
    $('fyWant').classList.toggle('focus', F.area === 'want');
    $('fyPlay').classList.toggle('focus', F.area === 'play');
    if (!m) { $('fyTitle').textContent = ''; $('fyMeta').textContent = ''; $('fyPoster').style.opacity = 0; return; }
    var kind = F.cat === 'continue' ? 'CONTINUE' : F.cat === 'anilist' ? 'ANILIST' : F.cat === 'anime' ? 'ANIME' : m.type === 'movie' ? 'FILM' : 'SERIES', fk = $('fyKind');
    var where = F.cat !== 'anilist' ? 'STREMIO' : m.stremio ? 'ON STREMIO' : m.stremio === null ? 'SEARCH IN STREMIO' : 'CHECKING STREMIO';
    if (fk.getAttribute('data-k') !== kind + where) { fk.setAttribute('data-k', kind + where); fk.innerHTML = kind + ' <span>\u00b7 ' + where + '</span>'; }
    if (F.cat === 'anilist' && m.stremio === undefined && !m.checking) {
      m.checking = true;
      Data.onStremio(m.name).then(function (hit) { m.stremio = hit; m.checking = false; if (F.items[F.idx] === m) F.paint(); });
    }
    setText($('fyTitle'), m.name || '');
    var g = (m.genres && m.genres[0]) || '';
    setText($('fyMeta'), m.meta || [m.year, g, m.rating ? 'IMDb ' + m.rating : ''].filter(Boolean).join(' · '));
    if (m.poster && $('fyPoster').getAttribute('src') !== m.poster) $('fyPoster').src = m.poster;
    $('fyPoster').style.opacity = 1;
    paintArt(m.background);
  };
  // The blurred backdrop: drawn at 192x108 with the blur baked in, then stretched to full screen by
  // CSS. Looks like filter: blur(30px) on the full-size image at a tiny fraction of the GPU work.
  function paintArt(url) {
    var c = $('fyArt');
    if ((url || '') === F.artUrl) return;
    F.artUrl = url || '';
    clearTimeout(F.artT);
    if (!url) { c.classList.remove('show'); return; }
    // Wait until the selection rests (holding Right skips the titles in between). The picture is
    // fetched and decoded (and shrunk) off the main thread: decoding it inside drawImage stalled the
    // row on the TV. Falls back to a plain image where the fetch is not allowed (laptop preview).
    F.artT = setTimeout(function () {
      function draw(src, iw, ih) {
        if (F.artUrl !== url) return; // the user has already moved on to another title
        var x = c.getContext('2d'), w = c.width, h = c.height, pad = 4; // pad keeps the soft edges solid
        var s = Math.max((w + pad * 2) / iw, (h + pad * 2) / ih), dw = iw * s, dh = ih * s;
        x.filter = 'blur(1px) saturate(115%)';
        x.clearRect(0, 0, w, h);
        x.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
        c.classList.add('show');
      }
      function viaImage() {
        var im = new Image();
        im.src = url;
        im.decode().then(function () { draw(im, im.naturalWidth, im.naturalHeight); },
          function () { if (F.artUrl === url) c.classList.remove('show'); });
      }
      fetch(url).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); })
        .then(function (b) { return createImageBitmap(b, { resizeWidth: c.width + 16, resizeQuality: 'medium' }); })
        .then(function (bm) { draw(bm, bm.width, bm.height); }, viaImage);
    }, 180);
  }
  F.enter = function () { F.area = 'row'; if (!F.items.length && !F.loading) F.load(); F.paint(); };
  // Load For You a few seconds after start, so opening it is instant.
  setTimeout(function () { if (!F.items.length) F.load(); }, 4000);
  F.key = function (k) {
    var n = F.items.length, ga = F.genres.length;
    if (F.area === 'wheel') {
      if (k === 'up' || k === 'down') { F.turn(k === 'up' ? -1 : 1); return; }
      if (k === 'right' || k === 'ok') { F.area = 'row'; F.paint(); }
      return;
    }
    if (F.area === 'row') {
      if (k === 'left') { if (F.idx > 0) F.idx--; else F.area = 'wheel'; }
      else if (k === 'right') { if (F.idx < n - 1) F.idx++; }
      else if (k === 'up') F.area = 'play';
      else if (k === 'down') { F.turn(1); return; } // nothing below the row: turn the wheel to the next genre
      else if (k === 'ok') { open(); return; }
      F.paint(); return;
    }
    if (F.area === 'cats') {
      var ci = CATS.indexOf(F.cat);
      if (k === 'left' && ci > 0) F.setCat(CATS[ci - 1]);
      else if (k === 'right') { if (ci < CATS.length - 1) F.setCat(CATS[ci + 1]); else { F.area = 'want'; F.paint(); } }
      else if (k === 'down' || k === 'ok') { F.area = 'play'; F.paint(); }
      else if (k === 'up') F.turn(-1); // nothing above the tabs: turn the wheel back a genre
      return;
    }
    if (F.area === 'play') {
      if (k === 'down') F.area = 'row';
      else if (k === 'up') F.area = 'cats';
      else if (k === 'left') F.area = 'wheel';
      else if (k === 'ok') { open(); return; }
      F.paint(); return;
    }
    if (F.area === 'want') {
      if (k === 'down') { F.area = 'play'; F.paint(); }
      else if (k === 'left') { F.area = 'cats'; F.paint(); }
      else if (k === 'ok') go('jarvis');
    }
    function open() {
      var m = F.items[F.idx];
      if (!m) return;
      if (m.videoId) GH.openStremioVideo(m.type, m.id, m.videoId);
      else if (F.cat === 'anilist') { if (m.stremio) GH.openStremio(m.stremio.type, m.stremio.id); else GH.searchIn('stremio', m.name); }
      else GH.openStremio(m.type, m.id);
    }
  };

  // ---- Home settings ----------------------------------------------------------------------------
  var T = { sec: 0, area: 'nav', idx: 0, rows: [] };
  S.settings = T;
  function cyc(key, vals, labels, d) {
    var cur = pref(key, d), i = vals.indexOf(cur);
    return { val: labels[i < 0 ? 0 : i], a: function () { setPref(key, vals[(i + 1 + vals.length) % vals.length]); resetIdle(); T.render(); } };
  }
  T.sections = [
    { name: 'Appearance', icon: I.image, rows: function () {
      var c = cyc('clock', ['12', '24'], ['12-hour', '24-hour'], '12');
      var ic = cyc('icons', ['nothing', 'colour'], ['Nothing style', 'Original colours'], 'nothing');
      var sc = cyc('scene', ['rotate', 'auto'].concat(SCENE_IDS), ['All, every 30 min', 'By time of day'].concat(SCENE_IDS.map(function (k) { return SCENES[k].label; })), 'rotate');
      return [
        { lbl: 'LOOK' }, { b: 'Clean', s: 'Glass clock behind the mountain, app dock, Jarvis at the end', val: 'On' },
        { b: 'Clock', s: 'How the time is written', val: c.val, a: c.a },
        { b: 'App icons', s: 'Nothing style: white icons on dark glass. Or each app\'s own colours', val: ic.val, a: function () { ic.a(); H.build(); } },
        { lbl: 'SCENES' },
        { img: 'img/scene-' + sceneNow(new Date()) + '.jpg', b: 'Home scene', s: SCENE_IDS.length + ' scenes. Move through all of them, follow the time of day, or keep one', val: sc.val, a: function () { sc.a(); shownScene = ''; applyScene(); } },
        { img: 'img/f1-suzuka.jpg', b: 'Screensaver', s: 'A new F1 photo each time it starts, and every 10 minutes', val: F1.length + ' photos' }
      ];
    } },
    { name: 'Screensaver', icon: I.moon, rows: function () {
      var a = cyc('ambient.minutes', ['2', '5', '10', '15', '30', '0'], ['2 min', '5 min', '10 min', '15 min', '30 min', 'Off'], '5');
      var s = cyc('sleep.minutes', ['30', '60', '120', '0'], ['30 min', '1 hour', '2 hours', 'Never'], '60');
      var rows = [{ lbl: 'WHEN' }, { b: 'Start after', s: 'No buttons pressed on Home for this long', val: a.val, a: a.a },
        { b: 'Turn the TV off after', s: 'More time idle on the screensaver', val: s.val, a: s.a }, { lbl: 'BUTTONS' }];
      ['deadlines', 'weather', 'music', 'anime', 'watching'].forEach(function (k) {
        var t = cyc('chip.' + k, ['on', 'off'], ['Shown', 'Hidden'], 'on');
        rows.push({ b: CHIP_DEFS[k].label, val: t.val, a: function () { t.a(); paintChips(); } });
      });
      return rows;
    } },
    { name: 'Jarvis', icon: I.mic, rows: function () {
      var v = cyc('voice', ['on', 'off'], ['On', 'Off'], 'on'), link = {};
      try { link = JSON.parse(GH.phone()); } catch (e) { link = {}; }
      return [{ lbl: 'VOICE' }, { b: 'Spoken replies', s: 'Jarvis answers out loud', val: v.val, a: v.a },
        { lbl: 'PHONE' }, { b: 'Talk from your phone', s: (link.url || '').replace(/^https?:\/\//, '') + '  ·  PIN ' + (link.pin || ''), val: 'Open', a: function () { go('jarvis'); } },
        { lbl: 'BRAIN' }, { b: 'Ascend Jarvis', s: pref('ascend.url', '') ? 'Connected for questions and Muse tasks' : 'Set the Ascend address and TV key on the phone page', val: pref('ascend.url', '') ? 'On' : 'Not set' }];
    } },
    { name: 'Accounts', icon: I.user, rows: function () {
      return [{ lbl: 'ON THIS TV' },
        { b: 'Stremio', s: 'For Continue watching. Links with a code, no password here', val: pref('stremio.key', '') ? 'Linked' : 'Link now', a: function () {
          if (pref('stremio.key', '')) { setPref('stremio.key', ''); live.watching = null; T.render(); paintChips(); return; }
          go('expanded', 'stremio');
        } },
        { lbl: 'SET THESE ON THE PHONE PAGE' },
        { b: 'AniList', s: 'For your next episodes', val: pref('anilist.user', 'Not set') },
        { b: 'Ascend', s: 'Deadlines from Muse, and Jarvis\'s brain', val: pref('ascend.url', '') ? 'Linked' : 'Not set' },
        { b: 'Weather place', s: 'Found from your internet connection unless set', val: pref('weather.lat', '') ? 'Custom' : 'Automatic' }];
    } },
    { name: 'Apps', icon: I.grid, rows: function () {
      var hide = pref('apps.hide', 'com.amazon.bueller.music,com.amazon.minitv.android.app,com.amazon.firetv.troubleshooting,me.efesser.flauncher,com.amazon.spiderpork,tv.dumbtv.home,com.amazon.gamehub,com.android.providers.downloads.ui,com.amazon.ftv.profilepicker,com.amazon.avod,com.amazon.ftv.screensaver,com.amazon.ssm,com.amazon.vizzini.ftvcds,com.amazon.cloud9,com.amazon.tahoe,com.amazon.firebat').split(',');
      var all = live.apps.slice();
      hide.forEach(function (h) { if (h && !all.some(function (a) { return a.id === h; })) all.push({ id: h, label: h }); });
      return [{ lbl: 'ON THE DOCK' }].concat(all.slice(0, 12).map(function (app) {
        var hidden = hide.indexOf(app.id) >= 0;
        return { b: app.label, val: hidden ? 'Hidden' : 'Shown', a: function () {
          var list = hide.filter(function (x) { return x && x !== app.id; });
          if (!hidden) list.push(app.id);
          setPref('apps.hide', list.join(','));
          H.build(); T.render();
        } };
      }));
    } },
    { name: 'About', icon: I.info, rows: function () {
      return [{ lbl: 'GLASS HOME' }, { b: 'Made for JasMehr', s: 'Liquid glass from Ascend, layouts from tvOS Launcher and halo-tv', val: '' },
        { b: 'Home button', s: GH.guardOn() ? 'Glass Home is your home screen' : 'dumbtv still holds Home. Switch in Accessibility when ready.', val: GH.guardOn() ? 'On' : 'Off' },
        { b: 'Credits', s: 'dumbtv (MIT), tvOS Launcher (Apache-2.0), halo-tv (MIT), photo by Takayuki Suzuki (CC BY-SA 2.0)', val: '' }];
    } }
  ];
  T.render = function () {
    $('setNav').innerHTML = T.sections.map(function (s, i) {
      return '<div class="ni' + (i === T.sec ? ' cur' : '') + (T.area === 'nav' && i === T.sec ? ' focus' : '') + '">' + ico(s.icon, 26, 'currentColor') + esc(s.name) + '</div>';
    }).join('');
    T.rows = T.sections[T.sec].rows();
    var sel = T.rows.filter(function (r) { return !r.lbl; });
    T.idx = Math.min(T.idx, Math.max(0, sel.length - 1));
    var n = -1;
    $('setPane').innerHTML = '<h2 style="padding-left:0">' + esc(T.sections[T.sec].name) + '</h2>' + T.rows.map(function (r) {
      if (r.lbl) return '<div class="lbl">' + esc(r.lbl) + '</div>';
      n++;
      return '<div class="opt' + (T.area === 'pane' && n === T.idx ? ' focus' : '') + '">' + (r.img ? '<img src="' + esc(r.img) + '" alt="">' : '')
        + '<span style="flex:1;min-width:0"><b>' + esc(r.b) + '</b>' + (r.s ? '<small>' + esc(r.s) + '</small>' : '') + '</span><span class="val">' + esc(r.val || '') + '</span></div>';
    }).join('');
  };
  T.enter = function () { T.area = 'nav'; T.idx = 0; T.render(); };
  T.resume = function () { loadPrefs(); T.render(); };
  T.key = function (k) {
    var sel = T.rows.filter(function (r) { return !r.lbl; });
    if (T.area === 'nav') {
      if (k === 'up' && T.sec > 0) T.sec--;
      else if (k === 'down' && T.sec < T.sections.length - 1) T.sec++;
      else if ((k === 'right' || k === 'ok') && sel.length) { T.area = 'pane'; T.idx = 0; }
      T.render(); return;
    }
    if (k === 'up') { if (T.idx > 0) T.idx--; }
    else if (k === 'down') { if (T.idx < sel.length - 1) T.idx++; }
    else if (k === 'left') T.area = 'nav';
    else if (k === 'ok' && sel[T.idx] && sel[T.idx].a) { sel[T.idx].a(); return; }
    T.render();
  };

  // ---- native hooks -----------------------------------------------------------------------------
  window.UI = {
    key: key,
    back: back,
    go: function (name, arg) { if (S[name]) go(name, arg); },
    home: function () { fromDream = false; go('home'); H.first(); },
    // the Samsung TV link (TvControl): pairing and errors, shown here and on the phone page
    tvNote: function (msg) { if (top() !== 'ambient') toast(String(msg || '')); if (window.Relay) Relay.push({ tv: String(msg || '') }); },
    dreamPending: function () { if (GH.takeDream && GH.takeDream()) { go('ambient'); fromDream = true; } },
    resume: function () { loadPrefs(); resetIdle(); var t = top(); if (S[t].resume) S[t].resume(); tick(); },
    pause: function () { clearTimeout(idleT); clearTimeout(sleepT); [H, A, J, C].forEach(function (s) { if (s.orb) s.orb.stop(); }); },
    appsChanged: function () { H.build();  setTimeout(relayPushAll, 1500); }, // installs/uninstalls: tell the phone page
    heard: function (text) { if (top() !== 'jarvis') go('jarvis', text); else J.hear(text); },
    // Android's installer finished (ApkInstaller): say so on whatever Glass Home screen is up.
    installed: function (msg) { toast(String(msg || '')); if (GH.showMe) GH.showMe(); setTimeout(relayPushAll, 1500); },
    heardPending: function () { var t = GH.takeHeard(); if (t) window.UI.heard(t); },
    voice: function (ev) {
      if (top() !== 'jarvis') return;
      if (ev === 'start') jState('speaking');
      else { jState('listening'); }
    }
  };

  // ---- start ----------------------------------------------------------------------------------
  H.build();
  go('home');
  tick();
  refreshData();
  setInterval(refreshData, 30 * 60000);
  // settings saved from the phone page take effect within a minute
  var watched = '';
  setInterval(function () {
    loadPrefs();
    var now = [pref('anilist.user', ''), pref('ascend.url', ''), pref('ascend.key', '')].join('|');
    if (watched && now !== watched) refreshData();
    watched = now;
  }, 60000);
  window.UI.heardPending();
  window.UI.dreamPending();
})();
