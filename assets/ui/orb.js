/* Jarvis orb: a port of Ascend's JarvisOrb (fibonacci sphere of points with neuron links).
   Dots and lines only: no outline, no glow blob, and the radius never pulses. States change
   colour, speed, how many dots are lit and a brightness shimmer. focus() wakes it up. */
(function (root) {
  'use strict';
  var STATES = {
    idle:      { sp: 0.14, act: 0.5, r: 94,  g: 234, b: 212, lk: 1.0, gl: 0 },
    focus:     { sp: 0.9,  act: 1.0, r: 56,  g: 189, b: 248, lk: 1.8, gl: 0 },
    listening: { sp: 0.35, act: 0.86, r: 56, g: 189, b: 248, lk: 1.5, gl: 0.25 },
    thinking:  { sp: 1.4,  act: 1.0, r: 167, g: 139, b: 250, lk: 2.2, gl: 0.15 },
    speaking:  { sp: 0.55, act: 0.93, r: 94, g: 234, b: 212, lk: 1.6, gl: 0.6 }
  };

  function sphere(n) {
    var pts = [], gold = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = gold * i;
      pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }
    return pts;
  }

  function links(pts, k) {
    var out = [], seen = {};
    for (var i = 0; i < pts.length; i++) {
      var ds = [];
      for (var j = 0; j < pts.length; j++) {
        if (i === j) continue;
        var a = pts[i], b = pts[j];
        ds.push([(a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]) + (a[2] - b[2]) * (a[2] - b[2]), j]);
      }
      ds.sort(function (p, q) { return p[0] - q[0]; });
      for (var m = 0; m < k; m++) {
        var lo = Math.min(i, ds[m][1]), hi = Math.max(i, ds[m][1]), key = lo + '-' + hi;
        if (!seen[key]) { seen[key] = 1; out.push([lo, hi]); }
      }
    }
    return out;
  }

  function Orb(canvas, size, opts) {
    opts = opts || {};
    this.c = canvas;
    this.size = size;
    this.n = opts.points || 110;
    this.pts = sphere(this.n);
    this.links = links(this.pts, opts.neighbours || 2);
    this.state = opts.state || 'idle';
    this.focused = false;
    var s = STATES[this.state];
    this.cur = { sp: s.sp, act: s.act, r: s.r, g: s.g, b: s.b, lk: s.lk, gl: s.gl };
    this.ang = Math.random() * 6.28;
    this.px = new Float32Array(this.n); this.py = new Float32Array(this.n); this.pz = new Float32Array(this.n);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr; canvas.height = size * dpr;
    this.x = canvas.getContext('2d');
    this.x.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.raf = 0;
    this.last = 0;
    this.frame = this.frame.bind(this);
  }

  Orb.prototype.set = function (state) { if (STATES[state]) this.state = state; };
  Orb.prototype.focus = function (on) { this.focused = !!on; };
  Orb.prototype.start = function () { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); } };
  Orb.prototype.stop = function () { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; };

  Orb.prototype.frame = function (now) {
    var dt = Math.min((now - this.last) / 1000, 0.05); this.last = now;
    var t = now / 1000, cur = this.cur;
    var tg = STATES[this.focused && this.state === 'idle' ? 'focus' : this.state];
    var k = 1 - Math.exp(-dt * 3.5);
    for (var key in tg) cur[key] += (tg[key] - cur[key]) * k;
    this.ang += cur.sp * dt;
    var size = this.size, half = size / 2, rad = size * 0.4, persp = size * 1.6, x = this.x;
    var wob = Math.sin(t * 0.25) * 0.3, ca = Math.cos(this.ang), sa = Math.sin(this.ang), cw = Math.cos(wob), sn = Math.sin(wob);
    var px = this.px, py = this.py, pz = this.pz, pts = this.pts, n = this.n;
    for (var i = 0; i < n; i++) {
      var d = pts[i], X = d[0] * ca + d[2] * sa, Z = -d[0] * sa + d[2] * ca, Y = d[1] * cw - Z * sn;
      Z = d[1] * sn + Z * cw;
      var sc = persp / (persp - Z * rad);
      px[i] = half + X * rad * sc; py[i] = half + Y * rad * sc; pz[i] = Z;
    }
    var act = Math.round(cur.act * n), r = Math.round(cur.r), g = Math.round(cur.g), b = Math.round(cur.b);
    x.clearRect(0, 0, size, size);
    x.lineWidth = Math.max(0.6, size / 220);
    var L = this.links;
    for (var m = 0; m < L.length; m++) {
      var a1 = L[m][0], a2 = L[m][1];
      if (a1 >= act || a2 >= act) continue;
      var dp = (pz[a1] + pz[a2]) / 2;
      x.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + Math.min(1, (0.07 + 0.2 * (dp + 1) * 0.5) * cur.lk) + ')';
      x.beginPath(); x.moveTo(px[a1], py[a1]); x.lineTo(px[a2], py[a2]); x.stroke();
    }
    var db = Math.max(0.9, size / 70), rr = Math.min(255, r + 70), gg = Math.min(255, g + 25), bb = Math.min(255, b + 35);
    for (var j = 0; j < act; j++) {
      var dd = (pz[j] + 1) * 0.5;
      var sh = 1 + cur.gl * Math.sin(t * 7 + j * 1.7) * Math.sin(t * 3.1 + j * 0.9);
      x.fillStyle = 'rgba(' + rr + ',' + gg + ',' + bb + ',' + Math.max(0, Math.min(1, (0.3 + 0.7 * dd) * sh)) + ')';
      x.beginPath(); x.arc(px[j], py[j], db * (0.55 + 0.8 * dd), 0, 6.2832); x.fill();
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  root.Orb = Orb;
})(this);
