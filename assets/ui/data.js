/* Data for the screens: weather, F1, AniList, Stremio catalogs, Ascend digest.
   Network goes through window.GH.fetch (native, cached); parsers are pure so node can test them. */
(function (root) {
  'use strict';
  var Data = {};
  var pending = {}, seq = 0;

  root.GH_done = function (id, ok, text) {
    var p = pending[id];
    if (!p) return;
    delete pending[id];
    if (ok) p.res(text); else p.rej(new Error(text || 'failed'));
  };

  /** Async native call: GH[method](id, ...args) answers through GH_done. */
  Data.call = function (method) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (res, rej) {
      var id = 'c' + (++seq);
      pending[id] = { res: res, rej: rej };
      try { root.GH[method].apply(root.GH, [id].concat(args)); } catch (e) { delete pending[id]; rej(e); return; }
      // Jarvis questions (fetch with a body: a POST to Ascend) may think for up to a minute.
      var wait = method === 'fetch' && args[1] ? 60000 : 25000;
      setTimeout(function () { if (pending[id]) { delete pending[id]; rej(new Error('timeout')); } }, wait);
    });
  };
  Data.get = function (url, body, maxAge) { return Data.call('fetch', url, body || '', maxAge || 0); };
  Data.json = function (url, body, maxAge) { return Data.get(url, body, maxAge).then(function (t) { return JSON.parse(t); }); };

  // ---- time helpers ---------------------------------------------------------------------
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function pad(v) { return (v < 10 ? '0' : '') + v; }
  Data.clock = function (d, h24) {
    if (h24) return pad(d.getHours()) + ':' + pad(d.getMinutes());
    var h = d.getHours() % 12 || 12;
    return h + ':' + pad(d.getMinutes());
  };
  Data.time = function (ms) {
    var d = new Date(ms), h = d.getHours() % 12 || 12;
    return h + ':' + pad(d.getMinutes()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM');
  };
  Data.day = function (ms) { return DAYS[new Date(ms).getDay()]; };
  Data.longDate = function (d) { return DAYS_LONG[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  Data.greeting = function (d) {
    var h = d.getHours();
    return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
  };
  Data.countdown = function (ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400);
    return (d ? d + 'd ' : '') + pad(Math.floor(s % 86400 / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60);
  };
  Data.shortLeft = function (ms) {
    var m = Math.max(0, Math.round(ms / 60000));
    if (m < 60) return m + 'm';
    if (m < 48 * 60) return Math.round(m / 60) + 'h';
    return Math.round(m / 1440) + 'd';
  };

  // ---- weather ----------------------------------------------------------------------------
  var WX = [[0, 'Clear'], [1, 'Mostly clear'], [2, 'Partly cloudy'], [3, 'Cloudy'], [45, 'Fog'], [48, 'Fog'],
    [51, 'Drizzle'], [53, 'Drizzle'], [55, 'Drizzle'], [56, 'Freezing drizzle'], [57, 'Freezing drizzle'],
    [61, 'Light rain'], [63, 'Rain'], [65, 'Heavy rain'], [66, 'Freezing rain'], [67, 'Freezing rain'],
    [71, 'Light snow'], [73, 'Snow'], [75, 'Heavy snow'], [77, 'Snow'], [80, 'Showers'], [81, 'Showers'],
    [82, 'Heavy showers'], [85, 'Snow showers'], [86, 'Snow showers'], [95, 'Thunderstorm'], [96, 'Thunderstorm'], [99, 'Thunderstorm']];
  Data.wxText = function (code, isDay) {
    for (var i = 0; i < WX.length; i++) if (WX[i][0] === code) {
      var t = WX[i][1];
      return !isDay && (t === 'Clear' || t === 'Mostly clear') ? t + ' night' : t;
    }
    return 'Weather';
  };
  Data.parseWeather = function (fc, aq, now) {
    now = now || new Date();
    var c = fc.current || {}, h = fc.hourly || {}, d = fc.daily || {};
    var out = {
      temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature),
      code: c.weather_code, text: Data.wxText(c.weather_code, c.is_day === 1), hours: [], days: [],
      aqi: aq && aq.current ? Math.round(aq.current.us_aqi) : null
    };
    var times = h.time || [], start = 0;
    for (var i = 0; i < times.length; i++) { if (new Date(times[i]).getTime() > now.getTime()) { start = i; break; } }
    for (var j = start; j < Math.min(start + 6, times.length); j++) {
      var ht = new Date(times[j]);
      out.hours.push({ label: (ht.getHours() % 12 || 12) + ' ' + (ht.getHours() < 12 ? 'AM' : 'PM'), t: Math.round(h.temperature_2m[j]) });
    }
    var dt = d.time || [];
    for (var k = 1; k < Math.min(4, dt.length); k++) {
      out.days.push({ label: DAYS[new Date(dt[k] + 'T12:00').getDay()], max: Math.round(d.temperature_2m_max[k]), min: Math.round(d.temperature_2m_min[k]) });
    }
    if (d.sunrise && d.sunrise[0]) out.sunrise = Data.time(new Date(d.sunrise[0]).getTime());
    if (d.sunset && d.sunset[0]) out.sunset = Data.time(new Date(d.sunset[0]).getTime());
    return out;
  };
  Data.weather = function (prefs) {
    var lat = parseFloat(prefs['weather.lat']), lon = parseFloat(prefs['weather.lon']);
    var where = isFinite(lat) && isFinite(lon) ? Promise.resolve({ lat: lat, lon: lon })
      : Data.json('https://get.geojs.io/v1/ip/geo.json', '', 86400).then(function (g) { return { lat: +g.latitude, lon: +g.longitude, city: g.city }; });
    return where.then(function (p) {
      var q = 'latitude=' + p.lat.toFixed(3) + '&longitude=' + p.lon.toFixed(3);
      return Promise.all([
        Data.json('https://api.open-meteo.com/v1/forecast?' + q + '&current=temperature_2m,apparent_temperature,weather_code,is_day'
          + '&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=4', '', 1800),
        Data.json('https://air-quality-api.open-meteo.com/v1/air-quality?' + q + '&current=us_aqi', '', 3600).catch(function () { return null; })
      ]).then(function (r) { return Data.parseWeather(r[0], r[1]); });
    });
  };

  // ---- Formula 1 (Jolpica, the Ergast successor) ----------------------------------------------
  var SESSIONS = [['FirstPractice', 'Practice 1'], ['SecondPractice', 'Practice 2'], ['ThirdPractice', 'Practice 3'],
    ['SprintQualifying', 'Sprint Quali'], ['SprintShootout', 'Sprint Quali'], ['Sprint', 'Sprint'], ['Qualifying', 'Qualifying']];
  function when(o) { return o && o.date ? new Date(o.date + 'T' + (o.time || '00:00:00Z')).getTime() : null; }
  Data.parseNextRace = function (json, total) {
    var races = json && json.MRData && json.MRData.RaceTable ? json.MRData.RaceTable.Races : [];
    if (!races || !races.length) return null;
    var r = races[0], out = { name: r.raceName, round: +r.round, total: total || null, season: r.season,
      circuit: r.Circuit ? r.Circuit.circuitName : '', start: when(r), sessions: [] };
    SESSIONS.forEach(function (s) { var t = when(r[s[0]]); if (t) out.sessions.push({ name: s[1], at: t }); });
    out.sessions.push({ name: 'Race', at: out.start });
    out.sessions.sort(function (a, b) { return a.at - b.at; });
    return out;
  };
  Data.parseStandings = function (json) {
    try {
      return json.MRData.StandingsTable.StandingsLists[0].DriverStandings.slice(0, 5).map(function (s) {
        return { pos: +s.position, name: s.Driver.givenName + ' ' + s.Driver.familyName, team: s.Constructors && s.Constructors[0] ? s.Constructors[0].name : '', pts: +s.points };
      });
    } catch (e) { return []; }
  };
  Data.f1 = function () {
    return Promise.all([
      Data.json('https://api.jolpi.ca/ergast/f1/current/next.json', '', 3600),
      Data.json('https://api.jolpi.ca/ergast/f1/current.json', '', 86400).catch(function () { return null; }),
      Data.json('https://api.jolpi.ca/ergast/f1/current/driverStandings.json', '', 10800).catch(function () { return null; })
    ]).then(function (r) {
      var total = r[1] && r[1].MRData ? +r[1].MRData.total : null;
      var next = Data.parseNextRace(r[0], total);
      return { next: next, standings: r[2] ? Data.parseStandings(r[2]) : [] };
    });
  };

  // ---- AniList ----------------------------------------------------------------------------------
  var ANI_Q = 'query($u:String){MediaListCollection(userName:$u,type:ANIME,status_in:[CURRENT,PLANNING,REPEATING]){lists{entries{'
    + 'media{id title{english romaji} coverImage{medium} nextAiringEpisode{episode airingAt}}}}}}';
  Data.parseAniList = function (json) {
    var out = [], lists = json && json.data && json.data.MediaListCollection ? json.data.MediaListCollection.lists : [];
    (lists || []).forEach(function (l) {
      (l.entries || []).forEach(function (e) {
        var m = e.media, n = m && m.nextAiringEpisode;
        if (!n) return;
        out.push({ title: m.title.english || m.title.romaji, ep: n.episode, at: n.airingAt * 1000, cover: m.coverImage ? m.coverImage.medium : '' });
      });
    });
    out.sort(function (a, b) { return a.at - b.at; });
    return out.filter(function (x, i) { return out.findIndex(function (y) { return y.title === x.title; }) === i; }).slice(0, 6);
  };
  // The For You "AniList" tab: your Watching / Planning lists with what is due and what airs next.
  var ANI_LIST_Q = 'query($u:String){MediaListCollection(userName:$u,type:ANIME,status_in:[CURRENT,PLANNING,REPEATING]){lists{entries{status progress '
    + 'media{id title{english romaji} coverImage{large} bannerImage episodes genres seasonYear averageScore nextAiringEpisode{episode airingAt}}}}}}';
  Data.parseAniListFull = function (json, now) {
    var seen = {}, out = [], lists = json && json.data && json.data.MediaListCollection ? json.data.MediaListCollection.lists : [];
    now = now || Date.now();
    (lists || []).forEach(function (l) {
      (l.entries || []).forEach(function (e) {
        var m = e.media;
        if (!m || seen[m.id]) return;
        seen[m.id] = true;
        var next = m.nextAiringEpisode, progress = e.progress || 0;
        var aired = next ? next.episode - 1 : (m.episodes || 0);
        var due = e.status === 'PLANNING' ? 0 : Math.max(0, aired - progress);
        var meta = due > 0 ? due + (due === 1 ? ' episode' : ' episodes') + ' to watch \u00b7 next is episode ' + (progress + 1)
          : next ? 'Episode ' + next.episode + ' in ' + Data.shortLeft(next.airingAt * 1000 - now)
          : e.status === 'PLANNING' ? 'Planning' + (m.episodes ? ' \u00b7 ' + m.episodes + ' episodes' : '') : 'All caught up';
        out.push({ id: 'anilist:' + m.id, type: 'series', name: m.title.english || m.title.romaji, poster: m.coverImage ? m.coverImage.large : '',
          background: m.bannerImage || '', genres: m.genres || [], year: m.seasonYear ? String(m.seasonYear) : '',
          rating: m.averageScore ? (m.averageScore / 10).toFixed(1) : '', meta: meta, listStatus: e.status, due: due,
          nextAt: next ? next.airingAt * 1000 : 0 });
      });
    });
    out.sort(function (a, b) {
      if (a.due || b.due) return b.due - a.due;
      if (a.nextAt || b.nextAt) return (a.nextAt || 9e15) - (b.nextAt || 9e15);
      return a.name.localeCompare(b.name);
    });
    return out;
  };
  Data.anilistList = function (user) {
    if (!user) return Promise.reject(new Error('no-anilist'));
    return Data.json('https://graphql.anilist.co', JSON.stringify({ query: ANI_LIST_Q, variables: { u: user } }), 900)
      .then(function (j) { return Data.parseAniListFull(j); });
  };
  /** Is this anime on Stremio (Anime Kitsu catalog)? Resolves {type,id} of the best match, or null. */
  Data.onStremio = function (title) {
    var t = String(title || '').trim();
    if (!t) return Promise.resolve(null);
    var url = 'https://anime-kitsu.strem.fun/catalog/anime/kitsu-anime-list/search=' + encodeURIComponent(t) + '.json';
    var norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
    return Data.json(url, '', 86400).then(function (j) {
      var metas = (j && j.metas) || [], want = norm(t);
      var hit = metas.filter(function (m) { return norm(m.name) === want; })[0] || metas[0];
      return hit && hit.id ? { type: hit.type === 'movie' ? 'movie' : 'series', id: hit.id } : null;
    }).catch(function () { return null; });
  };
  Data.anilist = function (user) {
    if (!user) return Promise.resolve(null);
    return Data.json('https://graphql.anilist.co', JSON.stringify({ query: ANI_Q, variables: { u: user } }), 3600).then(Data.parseAniList);
  };

  // ---- Stremio's Cinemeta catalog ------------------------------------------------------------------
  Data.GENRES = ['Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family',
    'Fantasy', 'History', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western'];
  // Cinemeta's images (images.metahub.space) come in small/medium/large. Medium backdrops are
  // 1920x1080 (about 1 MB, 100+ ms to decode on the Fire TV); small (480x270) is plenty for the
  // blurred backdrop, and small posters (300x450) still cover the 240px poster and the thumbnails.
  Data.smallImage = function (url) {
    return String(url || '').replace(/^(https:\/\/images\.metahub\.space\/(?:poster|background)\/)(?:medium|large)\//, '$1small/');
  };
  Data.parseCinemeta = function (json) {
    return ((json && json.metas) || []).filter(function (m) { return m && m.id && m.poster; }).map(function (m) {
      return { id: m.id, type: m.type, name: m.name, poster: Data.smallImage(m.poster), background: Data.smallImage(m.background),
        year: String(m.releaseInfo || m.year || '').slice(0, 9), genres: m.genres || m.genre || [], rating: m.imdbRating || '',
        description: m.description || '' };
    });
  };
  Data.catalog = function (type, list, genre) {
    var url = 'https://v3-cinemeta.strem.io/catalog/' + type + '/' + list + (genre ? '/genre=' + encodeURIComponent(genre) : '') + '.json';
    return Data.json(url, '', 21600).then(Data.parseCinemeta);
  };
  /** Shows or films only (type series/movie), optionally one genre; list is top or imdbRating. */
  Data.picks = function (type, genre, list) {
    return Data.catalog(type, list || 'top', genre).then(function (a) { return a.slice(0, 30); });
  };
  /** Anime from Stremio's Anime Kitsu catalog (anime-kitsu.strem.fun: metadata only, no streams). */
  Data.ANIME = { 'Trending': 'kitsu-anime-trending', 'Top Airing': 'kitsu-anime-airing', 'Most Popular': 'kitsu-anime-popular', 'Highest Rated': 'kitsu-anime-rating' };
  Data.anime = function (list) {
    var url = 'https://anime-kitsu.strem.fun/catalog/anime/' + (Data.ANIME[list] || Data.ANIME.Trending) + '.json';
    return Data.json(url, '', 21600).then(Data.parseCinemeta).then(function (a) { return a.slice(0, 30); });
  };
  /** For You picks: popular series and films mixed, optionally in one genre. */
  Data.forYou = function (genre, list) {
    list = list || 'top';
    return Promise.all([Data.catalog('series', list, genre).catch(function () { return []; }),
      Data.catalog('movie', list, genre).catch(function () { return []; })]).then(function (r) {
      var out = [], a = r[0], b = r[1];
      for (var i = 0; i < Math.max(a.length, b.length) && out.length < 30; i++) { if (a[i]) out.push(a[i]); if (b[i]) out.push(b[i]); }
      return out;
    });
  };

  // ---- Stremio account: link a device, then the library for Continue watching --------------------
  Data.stremioLink = function () {
    return Data.json('https://link.stremio.com/api/v2/create?type=Create', '', 0).then(function (o) {
      if (!o || !o.result || !o.result.code) throw new Error('no code');
      return { code: o.result.code, link: o.result.link || ('https://link.stremio.com/' + o.result.code) };
    });
  };
  Data.stremioLinkRead = function (code) {
    return Data.json('https://link.stremio.com/api/v2/read?type=Read&code=' + encodeURIComponent(code), '', 0)
      .then(function (o) { return o && o.result && o.result.authKey ? o.result.authKey : ''; });
  };
  function stamp(v) { return typeof v === 'number' ? v : (v ? Date.parse(v) || 0 : 0); }
  /** Stremio's own continue-watching rule: in the library (or just watched), not live, with a position. */
  Data.parseLibrary = function (items) {
    return (items || []).filter(function (o) {
      var st = o && o.state;
      if (!st || o.type === 'other' || o.type === 'tv') return false;
      if (o.behaviorHints && o.behaviorHints.isLive) return false;
      return (!o.removed || o.temp) && (st.timeOffset || 0) > 0;
    }).sort(function (a, b) { return stamp(b._mtime) - stamp(a._mtime); }).slice(0, 8).map(function (o) {
      var st = o.state, vid = st.video_id || '', s = -1, e = -1;
      if (vid.indexOf(o._id + ':') === 0) {
        var parts = vid.slice(o._id.length + 1).split(':');
        if (parts.length === 2) { s = +parts[0]; e = +parts[1]; } else if (parts.length === 1) e = +parts[0];
      }
      var upNext = st.timeOffset <= 1000;
      return { id: o._id, type: o.type, name: o.name, poster: Data.smallImage(o.poster), videoId: vid, season: s, episode: e,
        position: upNext ? 0 : st.timeOffset, duration: st.duration || 0, upNext: upNext };
    });
  };
  Data.watching = function (key) {
    if (!key) return Promise.resolve(null);
    return Data.json('https://api.strem.io/api/datastoreGet', JSON.stringify({ authKey: key, collection: 'libraryItem', ids: [], all: true }), 300)
      .then(function (o) { if (o && o.error) throw new Error(o.error.message || 'stremio'); return Data.parseLibrary(o && o.result); });
  };

  // ---- Ascend (deadlines, inbox) -----------------------------------------------------------------
  /** Expects {deadlines:[{title,due,course}], inbox:[{from,subject}]} from Ascend's TV digest. */
  Data.digest = function (prefs) {
    var url = prefs['ascend.url'], key = prefs['ascend.key'];
    if (!url || !key) return Promise.resolve(null);
    // The key goes in the POST body, never in the URL.
    return Data.json(url.replace(/\/$/, '') + '/api/tv/digest', JSON.stringify({ key: key }), 600);
  };

  root.Data = Data;
  if (typeof module !== 'undefined') module.exports = Data;
})(typeof window !== 'undefined' ? window : globalThis);
