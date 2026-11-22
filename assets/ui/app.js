/* Glass Home: screens, remote focus and behaviour. Native side is window.GH (see Bridge.java). */
(function () {
  'use strict';
  var GH = window.GH, Data = window.Data, Brain = window.Brain;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage'), scale = 1;

  function fit() {
    scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = 'scale(' + scale + ')';
    stage.style.left = Math.round((innerWidth - 1920 * scale) / 2) + 'px';
    stage.style.top = Math.round((innerHeight - 1080 * scale) / 2) + 'px';
  }
  addEventListener('resize', fit);
  fit();

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
  function paintOn() { NAMES.forEach(function (n) { $(n).classList.toggle('on', n === base || overlays.indexOf(n) >= 0); }); }
  function go(name, arg) {
    var prev = top();
    if (OVERLAY[name]) { overlays = overlays.filter(function (n) { return n !== name; }); overlays.push(name); }
    else { if (base !== name && S[base].leave) S[base].leave(); overlays.forEach(function (n) { if (S[n].leave) S[n].leave(); }); base = name; overlays = []; }
    paintOn();
    if (S[name].enter) S[name].enter(arg);
    resetIdle();
  }
  function back() {
    var t = top();
    if (S[t].back && S[t].back()) return;
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

  // ---- clock tick ----------------------------------------------------------------------------
  function tick() {
    var now = new Date(), h24 = pref('clock', '12') === '24';
    var c = Data.clock(now, h24);
    $('homeClock').textContent = c;
    var parts = c.split(':');
    $('ambClock').innerHTML = esc(parts[0]) + '<span class="c">:</span>' + esc(parts[1]);
    $('homeGreet').textContent = Data.greeting(now) + ', ' + pref('name', 'JasMehr');
    $('homeDate').textContent = Data.longDate(now);
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
  var H = { idx: 1, area: 'dock', items: [], tx: 0, orb: null, lensT: 0, lensX: null };
  S.home = H;
  function iconFor(item) {
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
    setTimeout(H.paint, 30);
  };
  function tiles() { return Array.prototype.slice.call($('dockTrack').children); }
  H.paint = function () {
    var ts = tiles(), t = ts[H.idx];
    ts.forEach(function (el, i) { if (el.classList) el.classList.toggle('focus', H.area === 'dock' && i === H.idx); });
    $('ccBtn').classList.toggle('focus', H.area === 'cc');
    if (H.orb) H.orb.focus(H.area === 'dock' && H.items[H.idx] && H.items[H.idx].kind === 'jarvis');
    var lens = $('lens'), tip = $('dockTip');
    if (H.area !== 'dock' || !t) { lens.classList.remove('show'); tip.style.opacity = 0; return; }
    // keep the focused tile inside the dock when there are many apps
    var clipW = $('dockTrack').parentNode.clientWidth, x = t.offsetLeft - 18;
    if (x + H.tx < 0) H.tx = -x;
    if (x + 108 + H.tx > clipW - 24) H.tx = clipW - 24 - 108 - x;
    if ($('dockTrack').scrollWidth <= clipW) H.tx = 0;
    $('dockTrack').style.transform = 'translateX(' + H.tx + 'px)';
    var to = t.offsetLeft + H.tx - 8;
    moveLens(H.lensX == null ? to : H.lensX, to);
    H.lensX = to;
    tip.style.left = (to + 62) + 'px';
    tip.firstChild.textContent = H.items[H.idx].label || '';
    tip.style.opacity = 1;
  };
  function moveLens(from, to) {
    var lens = $('lens');
    lens.classList.add('show');
    clearTimeout(H.lensT);
    if (from === to) {
      lens.style.transition = 'none';
      lens.style.left = to + 'px'; lens.style.width = '124px'; lens.style.top = '10px'; lens.style.height = '124px';
      return;
    }
    lens.style.transition = 'left .13s ease-in, width .13s ease-in, top .13s ease-in, height .13s ease-in';
    lens.style.left = Math.min(from, to) + 'px';
    lens.style.width = (Math.abs(to - from) + 124) + 'px';
    lens.style.top = '17px'; lens.style.height = '110px';
    H.lensT = setTimeout(function () {
      lens.style.transition = 'left .42s var(--ease-spring), width .42s var(--ease-spring), top .42s var(--ease-spring), height .42s var(--ease-spring)';
      lens.style.left = to + 'px'; lens.style.width = '124px'; lens.style.top = '10px'; lens.style.height = '124px';
    }, 130);
  }
  H.first = function () { H.area = 'dock'; H.idx = 1; H.paint(); };
  H.enter = function () { if (H.orb) H.orb.start(); H.paint(); };
  H.resume = H.enter;
  H.leave = function () { if (H.orb) H.orb.stop(); };
  H.key = function (k) {
    if (H.area === 'cc') {
      if (k === 'down' || k === 'left') { H.area = 'dock'; H.paint(); }
      else if (k === 'ok') go('command');
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
      return '<div class="chip' + (i === A.idx ? ' open' : '') + '" data-k="' + k + '"><div class="mini">' + ico(CHIP_DEFS[k].icon) + '<b>' + esc(chipMini(k)) + '</b></div><div class="body">' + chipBody(k) + '</div></div>';
    }).join('');
    $('chips').innerHTML = html;
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
    var onJ = A.idx === A.keys.length;
    $('ambJarvis').classList.toggle('focus', onJ);
    if (A.orb) A.orb.focus(onJ);
  };
  A.enter = function () {
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
    $('jUrl').textContent = (link.url || '').replace('http://', '');
    $('jPin').textContent = link.pin || '';
    var qr = link.url && GH.qr ? GH.qr(link.url + '/#pin=' + link.pin) : '';
    $('jQr').style.display = qr ? '' : 'none';
    if (qr) $('jQr').src = qr;
    $('jLink').style.opacity = 1;
    if (text) J.hear(text);
  };
  J.leave = function () { if (J.orb) J.orb.stop(); GH.stopSpeaking(); };
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
    try { GH.jarvisLog(JSON.stringify(J.log)); } catch (e) { /* phone log is optional */ }
  }
  function reply(text) {
    if (!text) { jState('listening'); return; }
    logLine('jarvis', text);
    if (pref('voice', 'on') !== 'off' && GH.speak(text)) return;
    showWords(text);
    clearTimeout(J.timer);
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
    var url = pref('ascend.url', ''), k = pref('ascend.key', '');
    if (!url || !k) { reply('I can open apps, play or pause, show the weather, F1 and your episodes, and put the TV to sleep. Connect Ascend on the phone page and I can do everything else.'); return; }
    var body = JSON.stringify({ key: k, surface: 'tv', messages: J.log.slice(-8).map(function (l) { return { role: l.who === 'you' ? 'user' : 'assistant', content: l.text }; }) });
    Data.get(url.replace(/\/$/, '') + '/api/tv/jarvis', body, 0).then(function (t) {
      var res = JSON.parse(t);
      reply(res.reply || res.text || 'Done.');
    }).catch(function () { reply('I could not reach Ascend right now.'); });
  }
  window.UI = window.UI || {};

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
  C.enter = function () { C.idx = 0; status(); C.render(); };
  C.leave = function () { if (C.orb) C.orb.stop(); };
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
    var el = top() === 'command' ? $('ccToast') : null;
    if (!el) { console.log(t); return; }
    el.textContent = t; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  // ---- For You ------------------------------------------------------------------------------
  var F = { g: 0, area: 'row', idx: 0, items: [], tx: 0, loadSeq: 0 };
  S.foryou = F;
  F.genres = ['For You', 'Featured'].concat(Data.GENRES);
  F.paintWheel = function () {
    var w = $('fyWheel'), html = w.querySelector('svg').outerHTML, n = F.genres.length;
    var spots = [[-1, 120, 118, -14], [0, 132, 248, 0], [1, 120, 388, 14]];
    spots.forEach(function (sp) {
      var gi = (F.g + sp[0] + n) % n;
      html += '<div class="g' + (sp[0] === 0 ? ' cur' : '') + '" style="left:' + sp[1] + 'px;top:' + sp[2] + 'px;transform:rotate(' + sp[3] + 'deg)"><i></i><b>' + esc(F.genres[gi].toUpperCase()) + '</b></div>';
    });
    w.innerHTML = html;
    w.classList.toggle('focus', F.area === 'wheel');
  };
  F.load = function () {
    var seq = ++F.loadSeq, g = F.genres[F.g];
    $('fyMsg').textContent = 'Loading from Stremio…';
    var p = g === 'For You' ? Data.forYou('', 'top') : g === 'Featured' ? Data.forYou('', 'imdbRating') : Data.forYou(g, 'top');
    p.then(function (items) {
      if (seq !== F.loadSeq) return;
      F.items = items; F.idx = 0; F.tx = 0;
      $('fyMsg').textContent = items.length ? '' : 'Nothing in ' + g + ' right now.';
      $('fyRow').innerHTML = items.map(function (m) { return '<img src="' + esc(m.poster) + '" alt="">'; }).join('');
      F.paint();
    }).catch(function () { if (seq === F.loadSeq) $('fyMsg').textContent = 'Could not reach Stremio\'s catalog.'; });
  };
  F.paint = function () {
    F.paintWheel();
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
    $('fyKind').innerHTML = (m.type === 'movie' ? 'FILM' : 'SERIES') + ' <span>· STREMIO</span>';
    $('fyTitle').textContent = m.name;
    var g = (m.genres && m.genres[0]) || '';
    $('fyMeta').textContent = [m.year, g, m.rating ? 'IMDb ' + m.rating : ''].filter(Boolean).join(' · ');
    $('fyPoster').src = m.poster; $('fyPoster').style.opacity = 1;
    var art = $('fyArt');
    if (m.background) { art.src = m.background; art.classList.add('show'); } else art.classList.remove('show');
  };
  F.enter = function () { F.area = 'row'; if (!F.items.length) F.load(); F.paint(); };
  F.key = function (k) {
    var n = F.items.length, ga = F.genres.length;
    if (F.area === 'wheel') {
      if (k === 'up' || k === 'down') { F.g = (F.g + (k === 'up' ? -1 : 1) + ga) % ga; F.paintWheel(); clearTimeout(F.wt); F.wt = setTimeout(F.load, 350); return; }
      if (k === 'right' || k === 'ok') { F.area = 'row'; F.paint(); }
      return;
    }
    if (F.area === 'row') {
      if (k === 'left') { if (F.idx > 0) F.idx--; else F.area = 'wheel'; }
      else if (k === 'right') { if (F.idx < n - 1) F.idx++; }
      else if (k === 'up') F.area = 'play';
      else if (k === 'ok') { open(); return; }
      F.paint(); return;
    }
    if (F.area === 'play') {
      if (k === 'down') F.area = 'row';
      else if (k === 'up') F.area = 'want';
      else if (k === 'left') F.area = 'wheel';
      else if (k === 'ok') { open(); return; }
      F.paint(); return;
    }
    if (F.area === 'want') {
      if (k === 'down') { F.area = 'play'; F.paint(); }
      else if (k === 'ok') go('jarvis');
    }
    function open() { var m = F.items[F.idx]; if (m) GH.openStremio(m.type, m.id); }
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
      return [
        { lbl: 'LOOK' }, { b: 'Clean', s: 'Glass clock behind the mountain, app dock, Jarvis at the end', val: 'On' },
        { b: 'Clock', s: 'How the time is written', val: c.val, a: c.a },
        { lbl: 'SCENES' }, { img: 'img/scene-night.jpg', b: 'Night', s: 'Home: the clock sits behind the mountain', val: 'On' },
        { img: 'img/f1-suzuka.jpg', b: 'F1', s: 'Screensaver photo', val: 'On' }
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
        { lbl: 'PHONE' }, { b: 'Talk from your phone', s: (link.url || '').replace('http://', '') + '  ·  PIN ' + (link.pin || ''), val: 'Open', a: function () { go('jarvis'); } },
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
      var hide = pref('apps.hide', 'com.amazon.bueller.music,com.amazon.minitv.android.app,com.amazon.firetv.troubleshooting,me.efesser.flauncher,com.amazon.spiderpork,tv.dumbtv.home').split(',');
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
    home: function () { go('home'); H.first(); },
    resume: function () { loadPrefs(); resetIdle(); var t = top(); if (S[t].resume) S[t].resume(); tick(); },
    pause: function () { clearTimeout(idleT); clearTimeout(sleepT); [H, A, J, C].forEach(function (s) { if (s.orb) s.orb.stop(); }); },
    appsChanged: function () { H.build(); },
    heard: function (text) { if (top() !== 'jarvis') go('jarvis', text); else J.hear(text); },
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
})();
