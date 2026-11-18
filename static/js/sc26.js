/* The wall of thoughts, and the form that adds to it, on the page of record R4 (sc26/index.html). Loaded by that page
   only. This is the one script of the site that talks to a service: the Worker whose address the page names in
   data-worker (the build's WORKER_ORIGIN). It reads the thoughts that have been checked and shown, and sends one
   thought at a time, with the answer of the bot check. It builds every card with createElement and textContent, and
   puts nothing a reader or the service wrote into markup.

   What the service is taken to answer (the page tolerates the other spellings that are given in brackets):
     GET  {worker}/thoughts?since=<rev>  ->  200 { "rev": n, "thoughts": [ {id, text, tbl}, ..., {id} ] }
          ("thoughts" or "items" or "rows", or the array alone; "tbl" or "table"). A row with a text is a thought to
          show; a row with only an id is a thought that has been hidden since: its card goes. The next request
          asks for the largest rev seen.
     POST {worker}/thoughts  with the body {text, table, token, device} as text/plain (no preflight)  ->  2xx when it
          was taken, with { "ok": true, "text": the thought as the service cleaned and stored it, "id": its number,
          "status": "shown" or "held" }. A shown thought goes on the wall at once as a card with its own id (the poll
          that returns it later finds it there). A held one (the service's emergency mode) is the sender's own card,
          awaiting its check, keyed on that text so that the shown copy replaces it. Any other answer is a failure,
          with an optional JSON { "message": "..." } that is shown as written.
     thoughts.json next to the page: the same answer as the GET, which the build copies there once the session is over
          (content/sc26-thoughts.json). It is read when the service fails before anything has been shown, and the wall
          then stands on it while the service is tried again.

   With ?mock in the address (a dev switch: ?mock, ?mock=few, ?mock=empty, ?mock=held, ?mock=fail) the page uses the sample
   thoughts of sc26-mock.js instead of the network, and the bot check is left out.

   The wall (Max, 2026-11-16: visible floating, a standing glare, the mark's hover):
   - columns: clamp(1, floor(width / 260), 4); each card goes under the shortest column, once, and the cards are laid
     again only when the width changes, when fonts have loaded, when a card goes, or when the number of cards crosses
     5 (up to 5 thoughts stand as one centred group, in larger type);
   - each card is two elements: the outer one floats (CSS keyframes, drift of 8 to 10 px, period and phase from a hash
     of the id) and the inner one leans, so the two never fight; only cards near the window float;
   - the glare: the rim runs from the accent to the ink, and a sheen passes across the card (site.css);
   - under the pointer a card answers as the mark does: the light and the shade of site.js's nameLight (with a
     height), the lean that sinks the side under the pointer (up to 8 degrees, the direction of the mark's lean), and
     the press that sinks the card by 3.5 per cent. With keyboard focus it glows steadily (site.css). The cards are
     not in the list that a phone's tilt lights;
   - Pause motion, and reduced motion: no float, no sheen, no light, no lean.
   Nothing here runs at rest except the float, which the browser draws from the stylesheet. */
(function () {
  'use strict';
  var root = document.querySelector('.sc');
  var wall = document.getElementById('sc-wall');
  if (!root || !wall) return;
  var WORKER = (root.getAttribute('data-worker') || '').replace(/\/+$/, '');
  var SITEKEY = root.getAttribute('data-sitekey') || '';
  var TURNSTILE = root.getAttribute('data-turnstile') || '';
  var here = document.currentScript && document.currentScript.src ? document.currentScript.src : '';
  var mockKind = (/[?&]mock(?:=([^&#]*))?/.exec(location.search) || [])[1];
  var MOCK = /[?&]mock\b/.test(location.search) ? (mockKind || 'full') : '';

  function $(id) { return document.getElementById(id); }
  /* how many breakouts there are: the form's choice lists them (and a first choice for none) */
  function breakouts() { var s = document.getElementById('sc-table'); return s ? s.options.length - 1 : 0; }
  var empty = $('sc-empty'), total = $('sc-total'), pause = $('sc-pause'), stateEl = $('sc-state'), live = $('sc-live');
  var bar = $('sc-bar'), wallwrap = $('sc-wallwrap'), stateText = $('sc-state-text'), retry = $('sc-retry');
  var form = $('sc-form'), box = $('sc-text'), tableSel = $('sc-table'), counter = $('sc-n'), msg = $('sc-msg');
  var countBox = $('sc-count'), left = $('sc-left'), note = $('sc-note');
  var sendBtn = $('sc-send'), tsHost = $('sc-ts'), sendLabel = sendBtn ? sendBtn.textContent : 'SEND';
  var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var paused = false;
  function still() { return paused || !!(motion && motion.matches); }

  /* ---------------------------------------------------------------- small helpers */
  function hash(str) {        /* 32 bits, from a string (FNV-1a): the same card floats the same way on every screen */
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function norm(s) {          /* what two copies of one thought share: the service cleans the text it stores */
    var t = String(s);
    try { t = t.normalize('NFKC'); } catch (e) {}
    return t.replace(/\s+/g, ' ').trim();
  }
  function unstyle(el, prop) {
    el.style[prop] = '';
    if (el.getAttribute('style') === '') el.removeAttribute('style');
  }
  function spring(s, to, dt, w, z) {
    /* moves s = {x, v} toward "to" as a spring of natural frequency w (per second) and damping ratio z, as the
       mark's; false at rest */
    var n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (var k = 0; k < n; k++) { s.v += (-w * w * (s.x - to) - 2 * z * w * s.v) * h; s.x += s.v * h; }
    if (Math.abs(s.x - to) < 1e-3 && Math.abs(s.v) < 1e-2) { s.x = to; s.v = 0; return false; }
    return true;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* ---------------------------------------------------------------- the service (or the sample thoughts) */
  function withTimeout(ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl ? window.setTimeout(function () { ctl.abort(); }, ms) : 0;
    return { signal: ctl ? ctl.signal : undefined, done: function () { if (timer) window.clearTimeout(timer); } };
  }
  var api = {
    get: function (since) {
      var t = withTimeout(10000);
      return fetch(WORKER + '/thoughts?since=' + encodeURIComponent(since), {
        credentials: 'omit', headers: { Accept: 'application/json' }, signal: t.signal
      }).then(function (res) {
        t.done();
        if (!res.ok) throw new Error('status ' + res.status);
        return res.json();
      }, function (err) { t.done(); throw err; });
    },
    post: function (body) {
      var t = withTimeout(15000);
      return fetch(WORKER + '/thoughts', {
        method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(body), signal: t.signal
      }).then(function (res) {
        t.done();
        if (res.ok) {
          /* the service answers {ok, text, id, status}: text is the thought as it cleaned and stored it, id its number, and
             status "shown" (it is on the wall), "held" (it waits for a person) or "hidden" (a repeat of a removed thought) */
          return res.json().then(function (j) {
            return { ok: true, text: j && typeof j.text === 'string' ? j.text : '', id: j && j.id !== undefined && j.id !== null ? String(j.id) : '',
                     status: j && (j.status === 'shown' || j.status === 'hidden') ? j.status : 'held' };
          }, function () { return { ok: true, text: '', id: '', status: 'held' }; });
        }
        return res.json().then(function (j) { return j; }, function () { return {}; }).then(function (j) {
          return { ok: false, status: res.status, message: j && typeof j.message === 'string' ? j.message : '' };
        });
      }, function (err) { t.done(); throw err; });
    },
    pollMs: 30000
  };

  /* ---------------------------------------------------------------- the cards */
  var cards = [];             /* in the order they came: this is also the reading order */
  var byId = {};
  var geo = null, laidWidth = 0, laidFew = null, loaded = false, roving = null;
  var GAP = 22, VGAP = 30;

  function lightOf(inner, host) { return window.tnpgLight ? window.tnpgLight(inner, host, true) : null; }

  function makeCard(t, mine) {
    var li = document.createElement('li');
    li.className = 'sc-card' + (mine ? ' mine' : '');
    li.setAttribute('tabindex', '-1');
    var inner = document.createElement('div');
    inner.className = 'sc-in';
    var p = document.createElement('p');
    p.className = 'sc-text';
    p.textContent = t.text;
    inner.appendChild(p);
    var bits = [];
    if (mine) bits.push('Awaiting check');
    if (t.table) bits.push('Breakout ' + t.table);
    if (bits.length) {
      var m = document.createElement('p');
      m.className = 'sc-meta m';
      m.textContent = bits.join(' · ');
      inner.appendChild(m);
    }
    li.appendChild(inner);
    var h = hash(mine ? 'mine:' + t.key : 'id:' + t.id);
    var period = 11 + ((h >>> 3) % 60) / 10, sheen = 12 + ((h >>> 11) % 20) / 10;   /* 11 to 17 s a float, a sheen about every 13 s */
    li.style.setProperty('--sc-d', period.toFixed(1) + 's');
    li.style.setProperty('--sc-t', (-(((h >>> 9) % 1000) / 1000) * period).toFixed(2) + 's');
    li.style.setProperty('--sc-a', (3 + ((h >>> 15) % 4)) + 'px');      /* a drift of 3 to 6 px */
    li.style.setProperty('--sc-x', (((h >>> 5) % 3) - 1) + 'px');
    li.style.setProperty('--sc-s', sheen.toFixed(1) + 's');
    li.style.setProperty('--sc-u', (-(((h >>> 17) % 1000) / 1000) * sheen).toFixed(2) + 's');
    var c = {
      id: t.id, key: norm(t.text), text: t.text, table: t.table || 0, mine: !!mine, el: li, inner: inner, at: t.at || 0,
      dx: (h % 9) - 4, dy: (h >>> 7) % 15, h: 0, near: !wantObserver(),
      P: { on: false, down: false, x: 0, y: 0 }, qx: { x: 0, v: 0 }, qy: { x: 0, v: 0 }, D: { x: 0, v: 0 }, styled: false,
      light: lightOf(inner, li)
    };
    if (c.light) c.light.off = still();
    wire(c);
    return c;
  }

  /* ---- only cards near the window float ---- */
  var observer = null;
  function wantObserver() { return !!window.IntersectionObserver; }
  /* a card near the window carries .on, which is what the stylesheet animates; Pause motion leaves it on and freezes the
     animation in place (.still on the wall), so that nothing snaps; reduced motion takes it away */
  function reduced() { return !!(motion && motion.matches); }
  function motionClass(c) { c.el.classList.toggle('on', c.near && !reduced()); }
  if (wantObserver()) {
    observer = new IntersectionObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        for (var k = 0; k < cards.length; k++) {
          if (cards[k].el === list[i].target) { cards[k].near = list[i].isIntersecting; motionClass(cards[k]); break; }
        }
      }
    }, { rootMargin: '240px 0px' });
  }

  /* ---- the answer to the pointer: the mark's light, lean and press ---- */
  var TILT = 8, PERSPECTIVE = 700, active = [], frame = 0, then = 0;
  function render(c) {
    if (c.qx.x === 0 && c.qy.x === 0 && c.D.x === 0) {
      if (c.styled) { unstyle(c.inner, 'transform'); c.styled = false; }
      return;
    }
    /* the side under the pointer sinks away from the reader, as the mark's rings lean away under the pointer: a
       pointer at the right turns the card about its vertical axis so that its right edge recedes, a pointer
       below turns it about its horizontal axis so that its lower edge recedes */
    c.inner.style.transform = 'perspective(' + PERSPECTIVE + 'px) rotateX(' + (-c.qy.x).toFixed(2) + 'deg) rotateY(' +
      c.qx.x.toFixed(2) + 'deg) scale(' + (1 - 0.035 * c.D.x).toFixed(4) + ')';
    c.styled = true;
  }
  function step(c, dt) {
    var P = c.P, m = Math.sqrt(P.x * P.x + P.y * P.y), th = P.on ? TILT * Math.min(1, m) : 0;
    var ux = m > 1e-6 ? P.x / m : 0, uy = m > 1e-6 ? P.y / m : 0;
    var busy = spring(c.qx, ux * th, dt, 14, 0.9);
    busy = spring(c.qy, uy * th, dt, 14, 0.9) || busy;
    busy = spring(c.D, P.down ? 1 : 0, dt, P.down ? 50 : 17, P.down ? 1 : 0.6) || busy;
    render(c);
    return busy;
  }
  function tick(now) {
    frame = 0;
    var dt = then ? Math.min(0.05, (now - then) / 1000) : 0;
    then = now;
    var keep = [];
    for (var i = 0; i < active.length; i++) { if (step(active[i], dt) || dt === 0) keep.push(active[i]); }
    active = keep;
    if (active.length) frame = window.requestAnimationFrame(tick); else then = 0;
  }
  function run(c) {
    if (active.indexOf(c) < 0) active.push(c);
    if (!frame) frame = window.requestAnimationFrame(tick);
  }
  function place(c, e) {
    var r = c.el.getBoundingClientRect();
    c.P.x = r.width ? (e.clientX - (r.left + r.width / 2)) / (r.width / 2) : 0;
    c.P.y = r.height ? (e.clientY - (r.top + r.height / 2)) / (r.height / 2) : 0;
  }
  function wire(c) {
    var el = c.el;
    el.addEventListener('pointerenter', function (e) {
      if (still() || e.pointerType === 'touch') return;
      c.P.on = true; place(c, e); run(c);
    });
    el.addEventListener('pointermove', function (e) {
      if (still() || e.pointerType === 'touch') return;
      c.P.on = true; place(c, e); run(c);
    });
    el.addEventListener('pointerleave', function () { c.P.on = false; c.P.down = false; run(c); });
    el.addEventListener('pointerdown', function (e) {
      if (still() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      c.P.down = true; if (e.pointerType !== 'touch') { c.P.on = true; place(c, e); } run(c);
    });
    el.addEventListener('pointerup', function () { if (c.P.down) { c.P.down = false; run(c); } });
    el.addEventListener('pointercancel', function () { c.P.down = false; c.P.on = false; run(c); });
    el.addEventListener('focus', function () { setRoving(c); });
  }
  function settle(c) {      /* nothing is left on a card: no lean, no light */
    c.P.on = false; c.P.down = false;
    c.qx.x = c.qx.v = c.qy.x = c.qy.v = c.D.x = c.D.v = 0;
    render(c);
    if (c.light) { c.light.off = still(); c.light.hide(); }
  }

  /* ---- roving focus: one card is in the tab order, the arrow keys move among them ---- */
  function setRoving(c) {
    if (roving && roving !== c) roving.el.setAttribute('tabindex', '-1');
    roving = c;
    if (c) c.el.setAttribute('tabindex', '0');
  }
  function ensureRoving() {
    if (roving && cards.indexOf(roving) >= 0) return;
    roving = null;
    if (cards.length) setRoving(cards[0]);
  }
  wall.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var at = -1;
    for (var i = 0; i < cards.length; i++) if (cards[i].el === document.activeElement) at = i;
    if (at < 0) return;
    var to = at;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = Math.min(cards.length - 1, at + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = Math.max(0, at - 1);
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = cards.length - 1;
    else return;
    e.preventDefault();
    if (to !== at) cards[to].el.focus();
  });

  /* ---- the layout ---- */
  function geometry() {
    var W = wall.clientWidth, n = cards.length, few = n > 0 && n <= 5;
    var cols = Math.max(1, Math.min(4, Math.floor(W / 260)));
    if (few) cols = Math.min(cols, n);
    var w = Math.floor((W - GAP * (cols - 1)) / cols);
    if (few) w = Math.min(w, 380);
    var left = few ? Math.max(0, Math.floor((W - (cols * w + GAP * (cols - 1))) / 2)) : 0;
    return { W: W, cols: cols, w: w, left: left, few: few, heights: [] };
  }
  function put(c) {
    var k = 0, hs = geo.heights;
    for (var i = 1; i < geo.cols; i++) if (hs[i] < hs[k]) k = i;
    var dx = geo.cols > 1 ? (k === 0 ? Math.max(0, c.dx) : k === geo.cols - 1 ? Math.min(0, c.dx) : c.dx) : 0;
    var y = hs[k] + (geo.few ? 0 : c.dy);
    c.el.style.left = (geo.left + k * (geo.w + GAP) + dx) + 'px';
    c.el.style.top = y + 'px';
    hs[k] = y + c.h + VGAP;
  }
  function height() {
    var m = 0;
    for (var i = 0; i < geo.heights.length; i++) m = Math.max(m, geo.heights[i]);
    wall.style.height = (cards.length ? m - VGAP : 0) + 'px';
  }
  function reveal(list) {
    window.requestAnimationFrame(function () {
      for (var i = 0; i < list.length; i++) { list[i].el.classList.add('placed'); }
    });
  }
  function layoutAll() {
    if (!wall.clientWidth) return;
    geo = geometry();
    for (var i = 0; i < geo.cols; i++) geo.heights.push(0);
    wall.classList.toggle('few', geo.few);
    for (i = 0; i < cards.length; i++) cards[i].el.style.width = geo.w + 'px';
    for (i = 0; i < cards.length; i++) cards[i].h = cards[i].el.offsetHeight;    /* all widths first, then all heights */
    for (i = 0; i < cards.length; i++) put(cards[i]);
    height();
    laidWidth = geo.W; laidFew = geo.few;
    reveal(cards);
  }
  function add(list) {       /* new cards go under the shortest column; nothing already there moves */
    var fresh = [], i;
    for (i = 0; i < list.length; i++) {
      cards.push(list[i]);
      wall.appendChild(list[i].el);
      if (observer) observer.observe(list[i].el); else { list[i].near = true; }
      motionClass(list[i]);
      fresh.push(list[i]);
    }
    var few = cards.length <= 5;
    if (!geo || few !== laidFew || wall.clientWidth !== laidWidth) { layoutAll(); }
    else {
      for (i = 0; i < fresh.length; i++) fresh[i].el.style.width = geo.w + 'px';
      for (i = 0; i < fresh.length; i++) fresh[i].h = fresh[i].el.offsetHeight;
      for (i = 0; i < fresh.length; i++) put(fresh[i]);
      height();
      reveal(fresh);
    }
    ensureRoving();
  }
  function remove(c) {
    var at = cards.indexOf(c);
    if (at < 0) return;
    cards.splice(at, 1);
    if (observer) observer.unobserve(c.el);
    var i = active.indexOf(c);
    if (i >= 0) active.splice(i, 1);
    if (c.el.parentNode) c.el.parentNode.removeChild(c.el);
    if (!c.mine) delete byId[c.id];
    if (roving === c) { roving = null; ensureRoving(); }
  }
  function relayout() { if (loaded || cards.length) { layoutAll(); ensureRoving(); } }

  var resizing = 0;
  function onWidth() {
    if (resizing) return;
    resizing = window.requestAnimationFrame(function () {
      resizing = 0;
      if (wall.clientWidth && wall.clientWidth !== laidWidth) relayout();
    });
  }
  if (window.ResizeObserver) new ResizeObserver(onWidth).observe(wall); else window.addEventListener('resize', onWidth);
  /* the fonts decide the cards' heights: measured again once they have loaded */
  if (document.fonts) {
    if (document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(relayout);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', relayout);
  }

  /* ---------------------------------------------------------------- motion: Pause motion, reduced motion */
  function applyMotion() {
    var off = still();
    ringMotion();
    wall.classList.toggle('still', off);
    for (var i = 0; i < cards.length; i++) {
      motionClass(cards[i]);
      if (off) settle(cards[i]); else if (cards[i].light) cards[i].light.off = false;
    }
  }
  if (pause) {
    var pauseLabel = pause.textContent;
    pause.addEventListener('click', function () {
      paused = !paused;
      pause.textContent = paused ? 'Resume motion' : pauseLabel;      /* the label says what the button will do */
      applyMotion();
    });
  }
  if (motion && motion.addEventListener) motion.addEventListener('change', applyMotion);

  /* ---------------------------------------------------------------- the ring of the empty wall
     It moves as the outer ring of the front page's mark does (site.js, respond): a critically damped spring of natural
     frequency 9 toward a target that only ever moves forward, by half turns (the ring is the same after a half turn, so
     the angle goes back to 0 at rest), and the press, which starts a half turn and sinks the ring by 3.5 per cent. The
     press is given by a click or a tap on the ring; by itself the ring makes one whole turn every 30 seconds (Max,
     2026-11-17). It moves only while the wall is
     empty, the ring is shown (not on a phone) and in view, and the tab is visible; Pause motion stops it where it is
     (and the button is shown with the empty wall for that), and reduced motion keeps it at rest. Only transforms are
     written: the angle on #sc-spin, which sits inside the mask that cuts the colour run, and the sink on the ring. */
  var ring = document.querySelector('.sc-ring'), spinG = $('sc-spin');
  var RR = { a: 0, v: 0, to: 0, w: 9 }, RD = { x: 0, v: 0 }, ringFrame = 0, ringThen = 0, ringTimer = 0, ringDown = false, ringSeen = true;
  function ringNextHalf() { return (Math.floor(RR.a / 180 + 1e-6) + 1) * 180; }
  function ringPress() {
    var next = ringNextHalf();
    RR.to = RR.to > RR.a && RR.to - RR.a < 90 ? Math.min(RR.to + 180, next + 180) : Math.max(RR.to, next);
  }
  function ringStep(dt) {
    if (RR.to < RR.a) RR.to = RR.a;
    var n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n, w = RR.w;
    for (var k = 0; k < n; k++) {
      RR.v += (-w * w * (RR.a - RR.to) - 2 * w * RR.v) * h;
      if (RR.v < 0) RR.v = 0;
      RR.a = Math.min(RR.to, RR.a + RR.v * h);
    }
    var moving = true;
    if (RR.to - RR.a < 1e-3 && RR.v < 1e-2) {
      RR.a = RR.to; RR.v = 0; moving = false;
      if (Math.abs(RR.a / 180 - Math.round(RR.a / 180)) < 1e-9) { RR.a = 0; RR.to = 0; }
    }
    return moving;
  }
  function ringRender() {
    if (RR.a) spinG.setAttribute('transform', 'rotate(' + RR.a.toFixed(2) + ')'); else spinG.removeAttribute('transform');
    if (RD.x > 0) ring.style.transform = 'scale(' + (1 - 0.035 * RD.x).toFixed(4) + ')'; else unstyle(ring, 'transform');
  }
  function ringTick(now) {
    ringFrame = 0;
    if (still()) { ringThen = 0; return; }                 /* paused or reduced: where it stands, nothing runs */
    var dt = ringThen ? Math.min(0.05, (now - ringThen) / 1000) : 0;
    ringThen = now;
    var press = ringDown ? 1 : 0;
    var busy = ringStep(dt);
    busy = spring(RD, press, dt, press > RD.x ? 50 : 17, press > RD.x ? 1 : 0.6) || busy;
    ringRender();
    if (busy || dt === 0) ringFrame = window.requestAnimationFrame(ringTick); else ringThen = 0;
  }
  function ringRun() { if (!ringFrame && !still()) ringFrame = window.requestAnimationFrame(ringTick); }
  function ringCan() {
    return !still() && !document.hidden && !empty.hidden && ringSeen && ring.getClientRects().length > 0;
  }
  function ringLater(ms) {
    if (ringTimer) window.clearTimeout(ringTimer);
    ringTimer = window.setTimeout(function () {
      if (ringCan()) { RR.to = Math.max(RR.to, ringNextHalf() + 180); RR.v = Math.max(RR.v, 420); ringRun(); }   /* one whole turn, flicked */
      ringLater(30000);                          /* once every 30 seconds (Max, 2026-11-17) */
    }, ms);
  }
  function ringEnter() { if (ring && spinG) ringLater(1500); }       /* the first turn soon after the empty wall appears */       /* the empty wall has just appeared */
  function ringMotion() {
    if (!ring || !spinG) return;
    if (reduced()) { RR.a = RR.v = RR.to = 0; RD.x = RD.v = 0; ringRender(); }              /* reduced motion: at rest at once */
    else if (!still()) ringRun();                                                          /* resumed: it goes on from where it stood */
  }
  if (ring && spinG) {
    ring.addEventListener('pointerdown', function (e) {
      if (still() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      ringDown = true; ringPress(); ringRun();
    });
    var ringUp = function () { if (ringDown) { ringDown = false; ringRun(); } };
    ring.addEventListener('pointerup', ringUp);
    ring.addEventListener('pointercancel', ringUp);
    ring.addEventListener('pointerleave', ringUp);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (l) { ringSeen = l[l.length - 1].isIntersecting; }).observe(ring);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) ringRun(); });
  }

  /* ---------------------------------------------------------------- what is shown above and beside the wall */
  var stale = false;
  function shownCount() { var n = 0; for (var i = 0; i < cards.length; i++) if (!cards[i].mine) n++; return n; }
  function showState() {
    /* the wall is in one of four states: loading (the row says so, and the wall keeps its room, so that "No thoughts yet"
       never flashes), empty (no row, a sign and a line), ok (the count and the pause button) and stale (one line with
       a way to try again) */
    var n = shownCount(), st = stale ? 'stale' : !loaded ? 'loading' : cards.length ? 'ok' : 'empty', line = [];
    var was = wallwrap.getAttribute('data-state');
    wallwrap.setAttribute('data-state', st);
    wall.classList.toggle('stale', stale);
    if (MOCK) line.push('Preview with sample thoughts: nothing is sent or read.');
    if (stale) line.push('Updating');
    stateText.textContent = line.join(' ');
    stateEl.hidden = !line.length;
    retry.hidden = !stale;
    bar.hidden = st === 'stale';
    empty.hidden = st !== 'empty';
    total.textContent = st === 'loading' ? 'Loading thoughts' : n ? plural(n, 'thought', 'thoughts') : '';
    if (pause) pause.hidden = st !== 'ok' && st !== 'empty';      /* the empty wall's ring moves: it can be paused too */
    if (st === 'empty' && was !== 'empty') ringEnter();
  }
  if (retry) retry.addEventListener('click', function () {
    if (inflight) return;
    if (timer) { window.clearTimeout(timer); timer = 0; }
    poll();
  });
  var lastSaid = 0, said = -1, sayTimer = 0;
  function announce(first) {
    var n = shownCount();
    if (first) { said = n; return; }              /* what is there on arrival is read as the page is read */
    if (n === said) return;
    var wait = 15000 - (Date.now() - lastSaid);
    if (wait > 0) { if (!sayTimer) sayTimer = window.setTimeout(function () { sayTimer = 0; announce(false); }, wait); return; }
    lastSaid = Date.now(); said = n;
    live.textContent = n ? plural(n, 'thought', 'thoughts') + ' on the wall.' : '';
  }

  /* ---------------------------------------------------------------- the sender's own thoughts, awaiting their check */
  var MINE = 'tnpg-sc26-mine', DAY = 24 * 3600 * 1000;
  var mine = [];                 /* {key, text, table, t}: kept in this browser only, for a day */
  function readMine() {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(MINE) || '[]'); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    var now = Date.now();
    return list.filter(function (x) {
      return x && typeof x.text === 'string' && typeof x.t === 'number' && now - x.t < DAY && x.t <= now + 60000;
    }).slice(0, 20);
  }
  function writeMine() { try { localStorage.setItem(MINE, JSON.stringify(mine)); } catch (e) {} }
  function mineCard(x) { return makeCard({ key: x.key, text: x.text, table: x.table }, true); }
  function dropMineLike(shownKeys) {
    var gone = [];
    mine = mine.filter(function (x) {
      if (shownKeys[x.key]) { gone.push(x.key); return false; }
      return true;
    });
    if (!gone.length) return false;
    for (var i = cards.length - 1; i >= 0; i--) if (cards[i].mine && gone.indexOf(cards[i].key) >= 0) remove(cards[i]);
    writeMine();
    return true;
  }

  /* ---------------------------------------------------------------- reading the thoughts */
  var since = 0, fails = 0, inflight = false, timer = 0, lastTry = 0, staleTimer = 0, fromFile = false;
  function rowsOf(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.thoughts)) return data.thoughts;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.rows)) return data.rows;
    throw new Error('unexpected answer');
  }
  function take(data) {
    var rows = rowsOf(data), fresh = [], gone = false, keys = {}, i, r;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (!r || typeof r !== 'object' || r.id === undefined || r.id === null) continue;
      var id = String(r.id);
      if (typeof r.text === 'string' && r.text) {
        keys[norm(r.text)] = true;
        if (byId[id]) continue;
        var tb = parseInt(r.tbl !== undefined ? r.tbl : r.table, 10);
        var c = makeCard({ id: id, text: r.text, table: tb >= 1 && tb <= breakouts() ? tb : 0 }, false);
        byId[id] = c;
        fresh.push(c);
      } else if (byId[id]) {
        remove(byId[id]); gone = true;
      }
    }
    var rev = data && typeof data.rev === 'number' ? data.rev : 0;
    if (rev > since) since = rev;
    var dropped = dropMineLike(keys);
    if (fresh.length) add(fresh);
    if (gone || dropped) relayout();
    return fresh.length || gone || dropped;
  }
  function schedule(ms) {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(poll, ms);
  }
  function delay() {
    var base = fails ? Math.min(300000, api.pollMs * Math.pow(2, fails)) : api.pollMs;
    return base * (0.85 + Math.random() * 0.3);
  }
  function markStale() { staleTimer = 0; stale = true; showState(); }
  /* the snapshot next to the page (sc26/thoughts.json, written once the session is over): the same answer as the
     service gives, read when the service cannot be reached and nothing has been shown yet */
  function snapshot() {
    return fetch(new URL('thoughts.json', location.href).href, { credentials: 'omit', headers: { Accept: 'application/json' } })
      .then(function (res) { if (!res.ok) throw new Error('status ' + res.status); return res.json(); });
  }
  function poll() {
    timer = 0;
    if (document.hidden) return;             /* the tab is not looked at: asked again when it is */
    if (inflight) return;
    inflight = true; lastTry = Date.now();
    var first = !loaded;
    function done() { inflight = false; schedule(delay()); }
    function failed() {
      fails++;
      if (!fromFile && !staleTimer && !stale) staleTimer = window.setTimeout(markStale, 60000);   /* "Updating" after 60 s of failures */
    }
    api.get(since).then(function (data) { take(data); }).then(function () {
      fails = 0; loaded = true; stale = false; fromFile = false;
      if (staleTimer) { window.clearTimeout(staleTimer); staleTimer = 0; }
      showState(); announce(first);
    }, function () {
      if (loaded || MOCK) { failed(); return; }
      /* the service failed before anything was shown: the snapshot, if there is one, stands in until it answers */
      return snapshot().then(function (data) { take(data); }).then(function () {
        fails++; loaded = true; fromFile = true;
        showState(); announce(true);
      }, failed);
    }).then(done, done);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden || inflight || timer) return;
    schedule(Math.max(0, api.pollMs - (Date.now() - lastTry)));
  });

  /* ---------------------------------------------------------------- the form */
  function deviceId() {
    var key = 'tnpg-sc26-device', v = null;
    try { v = localStorage.getItem(key); } catch (e) {}
    if (v && /^[0-9a-f]{32}$/.test(v)) return v;
    var bytes = new Uint8Array(16), s = '', i;
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    for (i = 0; i < 16; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    try { localStorage.setItem(key, s); } catch (e) {}
    return s;
  }
  function say(text, kind) {
    /* the message stands where the privacy note stands, and the note comes back on the next input */
    msg.textContent = text;
    msg.setAttribute('data-kind', kind || '');
    note.hidden = !!text;
  }
  var token = '', tokenAt = 0, widget = null, down = false, sending = false, pending = false, redo = false;
  function resetCheck() {
    token = MOCK ? 'mock' : ''; tokenAt = Date.now();
    if (!MOCK && widget !== null && window.turnstile) { try { window.turnstile.reset(widget); } catch (e) {} }
  }
  var DOWN = 'The check that keeps bots out could not load, so the form is unavailable on this network. Try cellular data.';
  function themeNow() {
    var set = document.documentElement.getAttribute('data-theme');
    if (set === 'light' || set === 'dark') return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function drawCheck() {
    if (widget !== null) return;
    widget = window.turnstile.render(tsHost, {
      sitekey: SITEKEY, theme: themeNow(), appearance: 'interaction-only',
      callback: function (t) {
        token = t; tokenAt = Date.now();
        if (down) { down = false; say('', ''); }
        if (pending) { pending = false; say('', ''); submit(); }      /* SEND was pressed before the check had finished */
      },
      'expired-callback': function () { resetCheck(); },
      'error-callback': function () { token = ''; pending = false; say('The check that keeps bots out did not finish. Please reload the page, or try another network.', 'bad'); },
      'timeout-callback': function () { resetCheck(); }
    });
  }
  function startCheck() {
    if (MOCK) { token = 'mock'; return; }
    var s = document.createElement('script');
    s.src = TURNSTILE; s.async = true; s.defer = true;
    document.head.appendChild(s);
    var t0 = Date.now();
    (function look() {
      if (window.turnstile && typeof window.turnstile.render === 'function') {
        drawCheck();
        return;
      }
      if (Date.now() - t0 >= 8000 && !down) { down = true; say(DOWN, 'bad'); }
      window.setTimeout(look, down ? 1000 : 150);
    })();
  }
  function submit() {
    if (sending) return;
    var text = norm(box.value);
    if (!text) { say('Enter your thought first.', 'bad'); box.focus(); return; }
    if (text.length < 8) { say('Please write a little more: at least 8 characters.', 'bad'); box.focus(); return; }
    if (down) { say(DOWN, 'bad'); return; }
    if (token && !MOCK && Date.now() - tokenAt > 240000) { resetCheck(); }     /* a token older than 4 min may be expired (a phone that slept) */
    if (!token) {
      pending = true;                                  /* sent by itself when the check delivers its token */
      say('One moment: the check that keeps bots out is finishing. Your thought will be sent as soon as it does. If a box appears above SEND, tick it.', '');
      return;
    }
    pending = false;
    sending = true;
    sendBtn.setAttribute('aria-disabled', 'true');       /* not disabled, so that a double press is ignored, not lost */
    sendBtn.textContent = 'SENDING\u2026';
    say('Sending.', '');
    var table = parseInt(tableSel.value, 10) || null, tableNo = table || 0;
    api.post({ text: text, table: table, token: token, device: deviceId() }).then(function (res) {
      if (res.ok) {
        redo = false;
        box.value = ''; updateCount();
        try { sessionStorage.removeItem(DRAFT); } catch (e) {}
        /* the text the service stored (it strips invisible characters and caps combining marks) is the thought's own */
        var kept = res.text ? res.text : text, key = norm(kept), i, c;
        var present = false;
        for (i = 0; i < cards.length; i++) if (!cards[i].mine && cards[i].key === key) present = true;
        if (res.status === 'shown') {
          /* a thought that is shown is on the wall at once, as any other card, under its own number: the poll that
             returns it later finds it there */
          say(form.getAttribute('data-thanks') || 'Thank you. Your thought is on the wall.', 'ok');
          if (!present && !(res.id && byId[res.id])) {
            c = makeCard({ id: res.id || ('s' + Date.now()), text: kept, table: tableNo }, false);
            byId[c.id] = c;
            add([c]);
          } else if (res.id && byId[res.id]) c = byId[res.id];
        } else if (res.status === 'hidden') {
          /* the same thought was sent before and has been removed: it does not come back, and no card waits for it */
          say('Thank you.', 'ok');
        } else {
          /* held (a person looks at it first): the sender's own card, awaiting its check, until the shown copy comes */
          say(form.getAttribute('data-thanks-held') || 'Thank you. Your thought will appear after a quick check.', 'ok');
          if (!present) {
            var x = { key: key, text: kept, table: tableNo || 0, t: Date.now() };
            mine.push(x); writeMine();
            c = mineCard(x);
            add([c]);
          }
        }
        if (c) {
          var r = c.el.getBoundingClientRect();
          if ((r.bottom < 0 || r.top > window.innerHeight) && c.el.scrollIntoView) {
            c.el.scrollIntoView({ block: 'center', behavior: still() ? 'auto' : 'smooth' });
          }
        }
        showState();
      } else if (res.status === 403 && !redo) {
        redo = true; pending = true;                 /* an expired or used token: one more try with the next one, without a second press */
        say('The check had expired. Sending again\u2026', '');
      } else if (res.status === 403) {
        say('Not sent: the check did not pass. Please reload the page and try again.', 'bad');
      } else if (res.status === 429) {
        say('Not sent: too many tries just now. Please wait a few minutes.', 'bad');
      } else {
        say('Not sent. ' + (res.message ? res.message.slice(0, 200) : 'Please check what you wrote and try again.'), 'bad');
      }
    }, function () {
      say('Not sent. Please check your connection and try again.', 'bad');
    }).then(finish, finish);
    function finish() {                                /* also when the answer's own handling threw: the button must come back */
      sending = false; sendBtn.removeAttribute('aria-disabled'); sendBtn.textContent = sendLabel;
      resetCheck();                                    /* a token is good for one use */
    }
  }
  /* the count sits inside the field; from 180 characters it is in full ink, and it is read out (not before, and not at
     every key) */
  var leftTimer = 0;
  function updateCount() {
    var n = box.value.length;
    counter.textContent = String(n);
    countBox.classList.toggle('full', n >= 180);
    if (leftTimer) window.clearTimeout(leftTimer);
    leftTimer = window.setTimeout(function () {
      leftTimer = 0;
      left.textContent = n >= 180 ? plural(200 - n, 'character', 'characters') + ' left.' : '';
    }, 700);
  }
  /* the draft stays in the tab (sessionStorage) until it is sent, and comes back if the page is reloaded */
  var DRAFT = 'tnpg-sc26-draft';
  function saveDraft() {
    try {
      if (box.value || tableSel.value) sessionStorage.setItem(DRAFT, JSON.stringify({ t: box.value, b: tableSel.value }));
      else sessionStorage.removeItem(DRAFT);
    } catch (e) {}
  }
  function loadDraft() {
    try {
      var d = JSON.parse(sessionStorage.getItem(DRAFT) || 'null');
      if (d && typeof d.t === 'string') box.value = d.t.slice(0, 200);
      if (d && /^\d$/.test(d.b) && +d.b >= 1 && +d.b <= breakouts()) tableSel.value = d.b;
    } catch (e) {}
    updateCount();
  }
  if (form) {
    loadDraft();
    box.addEventListener('input', function () { updateCount(); saveDraft(); if (msg.textContent) say('', ''); });
    tableSel.addEventListener('change', saveDraft);
    form.addEventListener('submit', function (e) { e.preventDefault(); redo = false; submit(); });   /* a press by hand gets its own retry */
  }

  /* ---------------------------------------------------------------- start */
  function start() {
    mine = readMine();
    writeMine();
    var own = mine.map(function (x) { x.key = norm(x.text); return mineCard(x); });
    if (own.length) add(own);
    showState();
    if (form) startCheck();
    poll();
  }
  if (MOCK) {
    var s = document.createElement('script');
    s.src = here.replace(/sc26\.js(\?.*)?$/, 'sc26-mock.js$1');
    s.onload = function () {
      var m = window.tnpgMock(MOCK);
      api.get = m.get; api.post = m.post; api.pollMs = m.pollMs;
      start();
    };
    s.onerror = function () { stale = true; showState(); };
    document.head.appendChild(s);
  } else {
    start();
  }
})();
