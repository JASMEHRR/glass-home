/* Jarvis's local brain: turns what you said into one action on the TV. Anything it does not
   understand goes to Ascend's Jarvis when that is connected. Pure function, tested in node. */
(function (root) {
  'use strict';
  var Brain = {};

  var ALIASES = [
    [/\b(you ?tube|smart ?tube)\b/, 'org.smarttube.stable'],
    [/\b(prime( video)?|amazon prime)\b/, 'com.amazon.firebat'],
    [/\bstremio\b/, 'com.stremio.one'],
    [/\b(send to tv|browser|web)\b/, 'local.sendtotv'],
    [/\bfan ?code\b/, 'com.fancode.tv']
  ];
  var SCREENS = [
    [/\b(for you|recommend|something to watch|what (should|can) i watch|tonight i want|suggest)\b/, 'foryou'],
    [/\b(command cent(er|re)|control (panel|cent(er|re))|quick settings)\b/, 'command'],
    [/\b(home settings|launcher settings|settings for (the )?home)\b/, 'settings'],
    [/\b(screen ?saver|ambient)\b/, 'ambient'],
    [/^(go )?home$|\bgo (back )?home\b|\bhome screen\b/, 'home']
  ];
  var NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty five': 45, sixty: 60, ninety: 90 };

  function clean(t) {
    return String(t || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/^(hey |ok |okay )?(jarvis )?(please |can you |could you |would you )*/, '').replace(/ please$/, '').trim();
  }
  Brain.clean = clean;

  function findApp(name, apps) {
    var n = name.replace(/^the /, '').replace(/ app$/, '').trim();
    if (!n) return null;
    for (var i = 0; i < ALIASES.length; i++) {
      if (ALIASES[i][0].test(n)) {
        var id = ALIASES[i][1];
        var hit = (apps || []).filter(function (a) { return a.id === id; })[0];
        return hit || { id: id, label: n, missing: true };
      }
    }
    var best = null;
    (apps || []).forEach(function (a) {
      var l = a.label.toLowerCase();
      if (l === n) best = a;
      else if (!best && (l.indexOf(n) === 0 || n.indexOf(l) === 0 || l.indexOf(' ' + n) >= 0)) best = a;
    });
    return best;
  }

  function minutes(t) {
    var m = t.match(/(\d+|an|a|one|two|three|four|five|ten|fifteen|twenty|thirty|forty five|forty|sixty|ninety) (minute|min|hour|hr)s?/);
    if (!m) return null;
    var v = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : NUM[m[1]];
    if (/^h/.test(m[2])) v *= 60;
    if (/half an hour/.test(t)) v = 30;
    return v > 0 && v <= 600 ? v : null;
  }

  /** {say, act:{type,...}}. act.type: open, screen, media, sleep, timer, memory, speed, info, ask. */
  Brain.parse = function (text, ctx) {
    ctx = ctx || {};
    var t = clean(text);
    if (!t) return { say: '', act: { type: 'none' } };

    if (/^(pause|stop|pause (it|this|the tv|the video))$/.test(t)) return { say: 'Paused.', act: { type: 'media', action: 'pause' } };
    if (/^(play|resume|continue|unpause|play it)$/.test(t)) return { say: 'Playing.', act: { type: 'media', action: 'play' } };
    if (/^(next|skip|next (episode|song|track))$/.test(t)) return { say: 'Next.', act: { type: 'media', action: 'next' } };
    if (/^(previous|previous (song|track|episode))$/.test(t)) return { say: 'Previous.', act: { type: 'media', action: 'previous' } };

    if (/\b(cancel|stop|turn off) (the )?sleep timer\b/.test(t)) return { say: 'Sleep timer off.', act: { type: 'timer', minutes: 0 } };
    if (/\bsleep\b|\bturn off\b|\bswitch off\b|\bscreen off\b|\bgood ?night\b/.test(t)) {
      var mins = minutes(t);
      if (mins && /\b(in|after|for)\b/.test(t)) return { say: 'Sleeping in ' + mins + ' minutes.', act: { type: 'timer', minutes: mins } };
      return { say: 'Good night.', act: { type: 'sleep' } };
    }
    if (/\b(free|clear|clean)( up)? (the )?(memory|ram)\b|\bspeed (it )?up\b/.test(t)) return { say: 'Freeing memory.', act: { type: 'memory' } };
    if (/\b(speed ?test|internet speed|how fast is (the|my) (internet|wifi|wi fi))\b/.test(t)) return { say: 'Testing the internet speed.', act: { type: 'speed' } };

    // "play naruto on stremio", "search lofi on youtube", "find interstellar in stremio"
    var srch = t.match(/^(play|watch|put on|find|search( for)?|look up|open) (.+?) (on|in) (stremio|you ?tube|smart ?tube)$/)
      || t.match(/^(search|look up|find) (stremio|you ?tube|smart ?tube) for (.+)$/);
    if (srch) {
      // both patterns put the query in group 3
      var q = srch[3], inStremio = /stremio$/.test(srch[0]) || /^(search|look up|find) stremio for /.test(srch[0]);
      var where = inStremio ? 'stremio' : 'youtube';
      return { say: 'Looking for ' + q + ' on ' + (where === 'stremio' ? 'Stremio' : 'YouTube') + '.', act: { type: 'search', app: where, q: q } };
    }

    var open = t.match(/^(open|launch|start|go to|show me|show|put on|play) (.+)$/);
    if (open) {
      var rest = open[2];
      for (var s = 0; s < SCREENS.length; s++) if (SCREENS[s][0].test(rest)) return { say: '', act: { type: 'screen', name: SCREENS[s][1] } };
      if (/^(the )?(weather|forecast)$/.test(rest)) return { say: '', act: { type: 'info', topic: 'weather', show: true } };
      if (/\b(deadlines?|assignments?)\b/.test(rest)) return { say: '', act: { type: 'info', topic: 'deadlines', show: true } };
      var app = findApp(rest, ctx.apps);
      if (app && !app.missing) return { say: 'Opening ' + app.label + '.', act: { type: 'open', id: app.id } };
      if (app && app.missing) return { say: app.label.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + " isn't installed on this TV.", act: { type: 'none' } };
    }
    for (var k = 0; k < SCREENS.length; k++) if (SCREENS[k][0].test(t)) return { say: '', act: { type: 'screen', name: SCREENS[k][1] } };

    if (/\b(weather|temperature|rain|cold|hot outside|forecast)\b/.test(t)) return { say: '', act: { type: 'info', topic: 'weather' } };
    if (/\b(f1|formula (one|1)|grand prix|next race|race (is|start)|qualifying)\b/.test(t)) return { say: '', act: { type: 'info', topic: 'f1' } };
    if (/\b(anime|episode|anilist)\b/.test(t)) return { say: '', act: { type: 'info', topic: 'anime' } };
    if (/\b(deadline|due|assignment|submission)s?\b/.test(t)) return { say: '', act: { type: 'info', topic: 'deadlines' } };
    if (/\bwhat( is|'s) the time\b|\bwhat time is it\b/.test(t)) return { say: '', act: { type: 'info', topic: 'time' } };
    if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))$/.test(t)) return { say: 'Hello JasMehr. What should I do?', act: { type: 'none' } };

    return { say: '', act: { type: 'ask', text: String(text).trim() } };
  };

  root.Brain = Brain;
  if (typeof module !== 'undefined') module.exports = Brain;
})(typeof window !== 'undefined' ? window : globalThis);
