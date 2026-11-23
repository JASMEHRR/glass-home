/* Glass Home's live link to the phone page on Ascend (ascend.../tv).
   The page writes commands to Firestore users/{uid}/tvCmds; this listens live, hands each one to
   app.js and deletes it, and keeps users/{uid}/tvState/main up to date (apps, screen, Jarvis log).
   The TV signs in with a custom token from Ascend's /api/tv/session (claim tv:true), which Ascend's
   Firestore rules limit to those two collections. Before pairing it shows a 6-digit code instead. */
(function (root) {
  'use strict';
  // Ascend's public web config (not secret: the same values Ascend's own site ships).
  var CFG = {"apiKey": "AIzaSyCD72xKQAPXBJl3uO783CL-sbRCScK77fE", "authDomain": "ascend-57d4e.firebaseapp.com", "projectId": "ascend-57d4e", "storageBucket": "ascend-57d4e.firebasestorage.app", "messagingSenderId": "632580482199", "appId": "1:632580482199:web:3f071f1be50afcfb1db5d2"};
  var R = { state: 'off', code: '', uid: '' };
  var db = null, stateRef = null, unsub = null, pending = null, pushT = 0, retryT = 0, opts = null;

  function post(path, body) {
    return root.Data.get(opts.url.replace(/\/+$/, '') + path, JSON.stringify(body), 0).then(function (t) { return JSON.parse(t); });
  }

  /** opts: {url, key, cfg?, onCmd(cmd), onChange()} */
  R.start = function (o) {
    opts = o;
    if (o.cfg) CFG = o.cfg;
    clearTimeout(retryT);
    if (!o.url || !o.key || !root.firebase) { R.state = 'off'; o.onChange(); return; }
    if (R.state !== 'pair') R.state = 'connecting';
    post('/api/tv/session', { key: o.key }).then(function (s) {
      if (s.paired && s.token) return signIn(s.uid, s.token);
      // Not paired: keep showing one code for 9 minutes (codes last 10), checking every 8 s.
      if (R.code && Date.now() - R.codeAt < 9 * 60000) {
        if (R.state !== 'pair') { R.state = 'pair'; o.onChange(); }
        retryT = setTimeout(function () { R.start(o); }, 8000);
        return;
      }
      return post('/api/tv/pair-code', { key: o.key }).then(function (p) {
        R.state = p.paired ? 'connecting' : 'pair';
        R.code = p.code || ''; R.codeAt = Date.now();
        o.onChange();
        retryT = setTimeout(function () { R.start(o); }, p.paired ? 3000 : 8000);
      });
    }).catch(function () {
      R.state = 'offline';
      o.onChange();
      retryT = setTimeout(function () { R.start(o); }, 30000);
    });
  };

  function signIn(uid, token) {
    if (!root.firebase.apps.length) root.firebase.initializeApp(CFG);
    var auth = root.firebase.auth();
    return auth.setPersistence(root.firebase.auth.Auth.Persistence.NONE).then(function () {
      return auth.signInWithCustomToken(token);
    }).then(function () {
      R.uid = uid; R.code = '';
      db = root.firebase.firestore();
      var me = db.collection('users').doc(uid);
      stateRef = me.collection('tvState').doc('main');
      if (unsub) unsub();
      var since = Date.now() - 60000; // older commands were meant for a TV that was off: drop them
      unsub = me.collection('tvCmds').onSnapshot(function (snap) {
        snap.docChanges().forEach(function (ch) {
          if (ch.type !== 'added') return;
          var d = ch.doc.data(), at = d.at && d.at.toMillis ? d.at.toMillis() : Date.now();
          ch.doc.ref.delete().catch(function () { /* someone else cleaned it */ });
          if (at >= since) { try { opts.onCmd(d); } catch (e) { console.warn('relay command failed: ' + e); } }
        });
      }, function (e) {
        console.warn('relay listen failed: ' + e);
        R.state = 'offline'; opts.onChange();
        retryT = setTimeout(function () { R.start(opts); }, 15000);
      });
      R.state = 'paired';
      opts.onChange();
      R.push(pending || {});
    }).catch(function (e) {
      console.warn('relay sign-in failed: ' + e);
      R.state = 'offline'; opts.onChange();
      retryT = setTimeout(function () { R.start(opts); }, 30000);
    });
  }

  /** Sends the TV's state to the phone page (merged, at most twice a second). */
  R.push = function (s) {
    pending = Object.assign(pending || {}, s);
    if (!stateRef || pushT) return;
    pushT = setTimeout(function () {
      pushT = 0;
      var out = pending; pending = null;
      out.seen = root.firebase.firestore.FieldValue.serverTimestamp();
      stateRef.set(out, { merge: true }).catch(function (e) { console.warn('relay state failed: ' + e); });
    }, 500);
  };

  root.Relay = R;
})(window);
