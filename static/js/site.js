/* The only script on the site. It sends nothing anywhere. It does six things.
   1. The light and dark switch. Without the script the page follows the system setting.
   2. The header: as the page scrolls the mark shrinks to the height of the header's links and stands in their row,
      and its outer ring turns with the page, forward going down and back going up (and the two upper corner
      ornaments, when the site shows them, shrink).
   3. The mark answers the pointer in one way, the same every time: over it, the rings lean away under the pointer,
      the inner ring shifts toward it, a light follows it and the far side is shaded; a press, by mouse or by touch,
      sinks the mark and starts its outer ring on a half turn forward. With keyboard focus it glows steadily.
      The mark is a link to the front page: on the front page a click does not reload the page, and from any other
      page the turn that the press began is carried to the front page and finishes there.
   4. The corner ornaments answer the pointer with a small movement: each slides a few pixels toward the pointer,
      without changing size or shape.
   5. A reader who has asked the system for reduced motion gets none of what is described in 3 and 4, also when the
      setting changes while a page is open.
   6. A box over a long list narrows it as one types, and buttons beside it show one kind of entry. */
(function () {
  var KEY = 'hub-theme';
  var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function quiet() { return !!(motion && motion.matches); }
  var root = document.documentElement;
  root.classList.add('js');

  /* ---- 1. theme ---- */
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (e) {}
  function current() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  /* a page restored by Back from the browser's cache takes up the theme chosen on another page since */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    try {
      var s = localStorage.getItem(KEY);
      if (s === 'light' || s === 'dark') root.setAttribute('data-theme', s); else root.removeAttribute('data-theme');
    } catch (err) {}
    labelAll();
  });
  var themed = [];   /* called whenever the theme may have changed */
  function labelAll() {
    for (var t = 0; t < themed.length; t++) themed[t]();
    /* the switch is a sign for the page it leads to (a sun for the light page, a moon for the dark one: the
       stylesheet draws the one that data-to names), with its name in words for a screen reader and as a tip */
    var other = current() === 'dark' ? 'light' : 'dark';
    var buttons = document.querySelectorAll('.theme');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('data-to', other);
      buttons[i].setAttribute('aria-label', 'Switch to the ' + other + ' theme');
      buttons[i].setAttribute('title', other === 'dark' ? 'Dark theme' : 'Light theme');
    }
  }

  /* ---- 2. scroll: --p sizes the mark and --q the upper ornaments; both run from 0 to 1 over RANGE pixels. (Short
     pages get room at their foot from the stylesheet, so the mark can always settle.) ---- */
  var RANGE = 260;
  var pending = false;
  var afterScroll = [];   /* called once the mark and the ornaments have their size for the new scroll position */
  function unit(x) { return Math.max(0, Math.min(1, x)).toFixed(3); }
  function setProgress() {
    pending = false;
    var y = window.scrollY || window.pageYOffset || 0;
    root.style.setProperty('--p', unit(y / RANGE));
    root.style.setProperty('--q', unit(y / RANGE));
    /* at the very top of a page the header shows no name: the stylesheet hides it there and fades it in with --p */
    root.classList.toggle('top0', y < 1);
    /* the corner marks' outer ring turns with the page: its rim (100 of the 208 units of a mark's box from the centre)
       moves as far as the page has scrolled, forward going down and back going up; none with reduced motion */
    if (!rimR) {
      var cms = document.querySelectorAll('.ac.cm');   /* the first one shown: two of them are hidden on wide screens */
      for (var c = 0; c < cms.length && !rimR; c++) rimR = cms[c].getBoundingClientRect().width * 100 / 208;
      if (!rimR) rimR = -1;   /* none shown: asked again only after a resize */
    }
    root.style.setProperty('--sa', quiet() || rimR <= 0 ? '0deg' : (y * 180 / (Math.PI * rimR)).toFixed(1) + 'deg');
    /* The mark's outer ring: the angle is written on the turning part itself, not handed to the stylesheet as a
       property. The colour run and the light are drawn through copies of the rings (<use>), and a copy follows a
       change written on the original, but not a change of a property that only a style rule reads: with such a
       rule the copies stood still while the ring turned. Nothing is written at the top of a page. */
    var a = quiet() ? 0 : markAngle(y);
    if (!turned) turned = document.querySelector('.emblem .mk-s');
    if (turned) {
      if (a) turned.style.transform = 'rotate(' + a.toFixed(1) + 'deg)';
      else if (turned.getAttribute('style') !== null) {
        turned.style.removeProperty('transform');
        if (!turned.getAttribute('style')) turned.removeAttribute('style');
      }
    }
    for (var i = 0; i < afterScroll.length; i++) afterScroll[i]();
  }
  var turned = null;   /* the part of the mark's outer ring that the scroll turns */
  var rimR = 0;   /* the rim's radius in px of a corner mark that does not change size with the scroll; 0 = measure again */
  /* The mark's outer ring turns with the page at one steady rate, a full turn for every TURN pixels scrolled,
     forward going down and back going up. (A ring that rolled at the page's own speed whirled once the mark was
     small: more than a turn for one notch of the wheel.) */
  var TURN = 720;
  function markAngle(y) { return y > 0 ? y * 360 / TURN : 0; }
  function onScroll() {
    if (!pending) { pending = true; window.requestAnimationFrame(setProgress); }
  }
  if (window.matchMedia) {
    var scheme = window.matchMedia('(prefers-color-scheme: dark)');
    if (scheme.addEventListener) scheme.addEventListener('change', labelAll);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { rimR = 0; onScroll(); });
  /* the corner marks' ring takes up its angle again when reduced motion is switched off */
  if (motion && motion.addEventListener) motion.addEventListener('change', onScroll);
  setProgress();

  /* ---- 3. the mark and the pointer ----
     The mark answers in one way, the same every time, built from its own parts: the outer ring is a progress ring
     that only ever moves forward, and the inner ring, the omega, is the nearer of two layers.
     - Pointer over the mark: the rings lean away under the pointer, as one flat object turned about an axis in its own
       plane would (drawn as a squeeze across that axis), the omega shifts toward the pointer as the nearer layer, a
       light follows the pointer across the rings, and the side away from the pointer is shaded. The lean and the
       shade grow with the distance from the centre (the lean up to 12 degrees); the light is strongest at the centre
       (strength 1) and keeps 0.6 of it at the rim.
     - Press, by mouse or by touch: within about 0.1 s the outer ring sinks by 3.5 per cent and the omega, the nearer
       layer, by 6.4 per cent, and the outer ring starts a half turn forward; a press late in a turn adds the next half turn, so no press goes unanswered; release springs back
       with a short settle. A half turn looks like none, so the ring rests as before.
     - Pointer leaves: everything returns within about a second; the ring never turns back.
     - Keyboard focus: a steady glow.
     - Reduced motion: none of this, also when the setting changes while a page is open.
     Nothing here moves by itself, and nothing is left behind at rest: no inline style, no added element, no id. */
  var NS = 'http://www.w3.org/2000/svg';
  var marks = 0;

  function spring(s, to, dt, w, z) {
    /* moves s = {x, v} toward "to" as a spring of natural frequency w (per second) and damping ratio z; false at rest */
    var n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (var k = 0; k < n; k++) { s.v += (-w * w * (s.x - to) - 2 * z * w * s.v) * h; s.x += s.v * h; }
    if (Math.abs(s.x - to) < 1e-3 && Math.abs(s.v) < 1e-2) { s.x = to; s.v = 0; return false; }
    return true;
  }
  function svgEl(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var a in attrs) if (attrs.hasOwnProperty(a)) e.setAttribute(a, attrs[a]);
    return e;
  }
  function matrix(m, e, f) {
    return 'matrix(' + m[0].toFixed(4) + ',' + m[1].toFixed(4) + ',' + m[2].toFixed(4) + ',' + m[3].toFixed(4) + ',' +
           (e || 0).toFixed(2) + ',' + (f || 0).toFixed(2) + ')';
  }
  function unstyle(el, prop) {
    /* clears one inline property, and the style attribute with it once it is empty */
    el.style[prop] = '';
    if (el.getAttribute('style') === '') el.removeAttribute('style');
  }

  /* The lean: a flat ring turned by an angle a about an axis in its own plane looks exactly like the ring squeezed to
     cos a across that axis, so the lean is a 2D matrix and needs no 3D transform. The axis is perpendicular to the
     line from the centre to the pointer, so the rings lean away under the pointer; the omega, DEPTH units in front
     of the outer ring, then shifts toward the pointer by DEPTH times sin a. The light is a white spot on the rings
     only, and the shade a black gradient toward the far rim, both drawn through a mask that reuses the rings
     themselves. Springs: the lean at damping 0.9, the light and the return at 1.0 (no overshoot for input without
     momentum), the release at 0.6 (a short settle after a press). */
  function respond(c, P) {
    var TILT = 12, DEPTH = 20, SHADE = 0.4, RAD = Math.PI / 180;
    var qx = { x: 0, v: 0 }, qy = { x: 0, v: 0 };          /* the lean, a vector toward the pointer, in degrees */
    var L = { x: 0, v: 0 }, lx = { x: 0, v: 0 }, ly = { x: 0, v: 0 };   /* the light: strength and centre */
    var D = { x: 0, v: 0 };                                 /* the press, from 0 to 1 */
    var R = { a: 0, v: 0, to: 0, w: 9 };                    /* the outer ring's angle and speed, in degrees */
    var lit = null, alpha = 0.62, shade = SHADE, styled = false;

    function buildLight() {
      /* the white spot and the shade, masked by the alpha of the two rings as drawn: a <use> of each, which
         therefore gets an id for as long as the light is on. (Not a <use> of their group: the group carries the
         glow of keyboard focus, and the light would fall on the glow as well.) */
      var id = 'mk' + c.uid + 'l';
      if (!c.ring.id) c.ring.setAttribute('id', id + 'o');
      if (!c.parts[2].id) c.parts[2].setAttribute('id', id + 'i');
      var col = (window.getComputedStyle(c.mark).color.match(/\d+(\.\d+)?/g) || [0, 0, 0]).map(Number);
      var pale = 0.2126 * col[0] + 0.7152 * col[1] + 0.0722 * col[2] > 110;
      alpha = pale ? 0.62 : 0.44;        /* a black mark takes less white before it greys out */
      shade = pale ? SHADE : 0;          /* and cannot be shaded: it is already black */
      var g = svgEl('g', { 'class': 'mk-light' }), defs = svgEl('defs', {});
      var grad = svgEl('radialGradient', { id: id + 'g', gradientUnits: 'userSpaceOnUse', cx: 0, cy: 0, r: 72 });
      var stops = [];
      [[0, 1], [0.45, 0.45], [1, 0]].forEach(function (p) {
        var st = svgEl('stop', { offset: p[0], 'stop-color': '#fff', 'stop-opacity': 0 });
        st.k = p[1]; stops.push(st); grad.appendChild(st);
      });
      /* the shade: black, from nothing at the centre to its full strength at the rim away from the pointer */
      var dark = svgEl('linearGradient', { id: id + 's', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: -100, y2: 0 });
      var far = svgEl('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': 0 });
      dark.appendChild(svgEl('stop', { offset: 0.12, 'stop-color': '#000', 'stop-opacity': 0 }));
      dark.appendChild(far);
      var mask = svgEl('mask', { id: id + 'm', maskUnits: 'userSpaceOnUse', x: -112, y: -112, width: 224, height: 224,
                                 'mask-type': 'alpha', style: 'mask-type:alpha' });
      mask.appendChild(svgEl('use', { href: '#' + c.ring.id }));
      mask.appendChild(svgEl('use', { href: '#' + c.parts[2].id }));
      defs.appendChild(grad); defs.appendChild(dark); defs.appendChild(mask); g.appendChild(defs);
      g.appendChild(svgEl('rect', { x: -112, y: -112, width: 224, height: 224, fill: 'url(#' + id + 's)',
                                    mask: 'url(#' + id + 'm)' }));
      g.appendChild(svgEl('rect', { x: -112, y: -112, width: 224, height: 224, fill: 'url(#' + id + 'g)',
                                    mask: 'url(#' + id + 'm)' }));
      c.rings.parentNode.insertBefore(g, c.rings.nextSibling);
      lit = { g: g, grad: grad, stops: stops, dark: dark, far: far };
    }
    function dropLight() {
      if (lit && lit.g.parentNode) lit.g.parentNode.removeChild(lit.g);
      if (lit && c.ring.id === 'mk' + c.uid + 'lo') c.ring.removeAttribute('id');
      if (lit && c.parts[2].id === 'mk' + c.uid + 'li') c.parts[2].removeAttribute('id');
      lit = null;
    }
    function unstyleParts() {
      if (styled) { unstyle(c.ring, 'transform'); unstyle(c.parts[2], 'transform'); styled = false; }
    }
    function nextHalf() { return (Math.floor(R.a / 180 + 1e-6) + 1) * 180; }
    function stepRing(dt) {
      /* critically damped toward R.to, which only grows; the speed is never negative, so the ring never turns back */
      if (R.to < R.a) R.to = R.a;
      var n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n, w = R.w;
      for (var k = 0; k < n; k++) {
        R.v += (-w * w * (R.a - R.to) - 2 * w * R.v) * h;
        if (R.v < 0) R.v = 0;
        R.a = Math.min(R.to, R.a + R.v * h);
      }
      if (R.to - R.a < 1e-3 && R.v < 1e-2) {
        R.a = R.to; R.v = 0;
        if (Math.abs(R.a / 180 - Math.round(R.a / 180)) < 1e-9) { R.a = 0; R.to = 0; }   /* a half turn looks like none */
        return false;
      }
      return true;
    }
    function render() {
      var th = Math.sqrt(qx.x * qx.x + qy.x * qy.x), ux = 1, uy = 0;
      if (th > 1e-6) { ux = qx.x / th; uy = qy.x / th; }
      var cs = Math.cos(th * RAD), sn = Math.sin(th * RAD), S = 1 - 0.035 * D.x, Si = S * (1 - 0.03 * D.x);
      var t11 = 1 + (cs - 1) * ux * ux, t12 = (cs - 1) * ux * uy, t22 = 1 + (cs - 1) * uy * uy;
      var ca = Math.cos(R.a * RAD), sa = Math.sin(R.a * RAD);
      if (th < 1e-6 && D.x === 0 && R.a === 0) {
        unstyleParts();
      } else {
        /* CSS matrix(a, b, c, d) is [[a, c], [b, d]]: the lean T times the ring's own turn, times the press */
        c.ring.style.transform = matrix([S * (t11 * ca + t12 * sa), S * (t12 * ca + t22 * sa),
                                         S * (-t11 * sa + t12 * ca), S * (-t12 * sa + t22 * ca)]);
        var dz = DEPTH * (1 - 0.5 * D.x) * sn;
        c.parts[2].style.transform = matrix([Si * t11, Si * t12, Si * t12, Si * t22], dz * ux, dz * uy);
        styled = true;
      }
      if (L.x > 0.002) {
        if (!lit) buildLight();
        lit.grad.setAttribute('cx', lx.x.toFixed(2));
        lit.grad.setAttribute('cy', ly.x.toFixed(2));
        var a = alpha * Math.min(1.25, L.x);
        for (var i = 0; i < 3; i++) lit.stops[i].setAttribute('stop-opacity', (a * lit.stops[i].k).toFixed(3));
        /* the shade follows the lean: none with the pointer at the centre, full at the rim, on the far side */
        lit.dark.setAttribute('x2', (-100 * ux).toFixed(2));
        lit.dark.setAttribute('y2', (-100 * uy).toFixed(2));
        lit.far.setAttribute('stop-opacity', (shade * Math.min(1, th / TILT) * Math.min(1, L.x * 1.6)).toFixed(3));
      } else if (lit) dropLight();
    }
    return {
      enter: function () { if (L.x < 0.01) { lx.x = P.x; ly.x = P.y; lx.v = 0; ly.v = 0; } },
      press: function () {
        /* the next half turn; late in a turn, the one after it, so that no press is lost while the ring settles */
        var next = nextHalf();
        R.to = R.to > R.a && R.to - R.a < 90 ? Math.min(R.to + 180, next + 180) : Math.max(R.to, next);
      },
      step: function (dt) {
        var on = P.on, r = Math.sqrt(P.x * P.x + P.y * P.y), f = on ? TILT / Math.max(100, r) : 0;
        var m = spring(qx, P.x * f, dt, 14, 0.9);
        m = spring(qy, P.y * f, dt, 14, 0.9) || m;
        m = spring(L, on ? 0.5 + 0.5 * P.s + (P.down ? 0.3 : 0) : 0, dt, 18, 1) || m;
        m = spring(lx, P.x, dt, 24, 1) || m;
        m = spring(ly, P.y, dt, 24, 1) || m;
        var pressing = P.down ? 1 : 0;
        m = spring(D, pressing, dt, pressing > D.x ? 50 : 17, pressing > D.x ? 1 : 0.6) || m;
        m = stepRing(dt) || m;
        render();
        return m;
      },
      /* the theme changed: the light is built again, for the mark's new colour */
      retheme: function () { if (lit) dropLight(); },
      reset: function () {
        qx.x = qx.v = qy.x = qy.v = L.x = L.v = D.x = D.v = 0;
        R.a = R.v = R.to = 0;
        styled = true;
        unstyleParts();
        dropLight();
      },
      /* the turn and the press, to be carried to the next page; null when the ring is at rest */
      save: function () {
        return R.to > R.a || R.v > 0 ? { a: R.a, v: R.v, to: R.to, d: D.x, dv: D.v } : null;
      },
      /* takes them up again on the next page, advanced by the time the change of page took (dt, in seconds), so
         that the turn ends when it would have ended on one page; false when the saved state is not a turn */
      load: function (s, dt) {
        var nums = [s.a, s.v, s.to, s.d, s.dv];
        for (var i = 0; i < nums.length; i++) if (typeof nums[i] !== 'number' || !isFinite(nums[i])) return false;
        if (!(s.a >= 0 && s.to > s.a && s.to - s.a <= 360 && s.v >= 0 && s.v < 4000 && Math.abs(s.d) <= 2)) return false;
        R.a = s.a; R.v = s.v; R.to = s.to; R.w = 9; D.x = s.d; D.v = s.dv;
        for (; dt > 0; dt -= 0.05) { var h = Math.min(0.05, dt); stepRing(h); spring(D, 0, h, 17, 0.6); }
        render();
        return true;
      }
    };
  }

  function wireMark(mark) {
    var svg = mark.querySelector('svg'), rings = mark.querySelector('.mk'), ring = mark.querySelector('.mk-o');
    var parts = [mark.querySelector('.mk-1'), mark.querySelector('.mk-2'), mark.querySelector('.mk-3')];
    if (!svg || !rings || !ring || !parts[0] || !parts[1] || !parts[2]) return;
    /* c is what the behaviour works on. P is the pointer: on the mark, pressed, where (in the mark's units, centre 0,
       outer radius 100), and its strength s, from 1 at the centre to 0.2 at the rim. */
    var c = { mark: mark, svg: svg, rings: rings, ring: ring, parts: parts, uid: ++marks };
    var P = { on: false, down: false, tilt: false, x: 0, y: 0, s: 0.2 };
    var mod = respond(c, P);
    var focused = false, fg = 0, filt = '', frame = 0, then = 0;

    var lastX = 0, lastY = 0;
    function at(e) {
      if (e) { lastX = e.clientX; lastY = e.clientY; P.tilt = false; }   /* a pointer has the say over a tilt */
      else if (P.tilt) return;                                            /* no pointer to place again */
      var r = svg.getBoundingClientRect(), u = r.width / 224;
      P.x = (lastX - (r.left + r.width / 2)) / u;
      P.y = (lastY - (r.top + r.height / 2)) / u;
      var d = Math.sqrt(P.x * P.x + P.y * P.y) / 100;
      P.s = 0.2 + 0.8 * Math.max(0, Math.min(1, 1 - d));
    }
    function moved() {
      /* the page scrolled or the window changed under a pointer that did not move: the mark has another size and
         place now, and the browser sends no pointer event for that. Called from the scroll code of section 2, after
         it has set the mark's new size. */
      if (P.on && !quiet()) { at(null); run(); }
    }
    function setGlow(k) {
      var f = k > 0.004 ? 'drop-shadow(0 0 ' + (9 * k).toFixed(1) + 'px var(--acc)) drop-shadow(0 0 ' +
                          (26 * k).toFixed(1) + 'px var(--acc))' : '';
      if (f === filt) return;
      filt = f;
      if (f) rings.style.filter = f; else unstyle(rings, 'filter');
    }
    function draw(dt) {
      var busy = mod.step(dt);
      var want = focused ? 0.6 : 0;      /* keyboard focus: a steady glow */
      fg += (want - fg) * Math.min(1, dt * 9);
      if (Math.abs(fg - want) < 0.004) fg = want; else busy = true;
      setGlow(fg);
      return busy;
    }
    function halt() {
      /* stop at once and leave nothing behind: used when the reader turns reduced motion on while a page is open */
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0; then = 0;
      P.on = false; P.down = false; P.tilt = false; focused = false; fg = 0;
      mod.reset();
      setGlow(0);
    }
    function tick(now) {
      frame = 0;
      if (quiet()) { halt(); return; }
      var dt = then ? Math.min(0.05, (now - then) / 1000) : 0;
      then = now;
      if (draw(dt) || dt === 0) { frame = window.requestAnimationFrame(tick); return; }
      /* at rest: under the pointer, or settled after it left; nothing runs until the next event */
      if (!P.on && !focused) mod.reset();
      then = 0;
    }
    function run() { if (!frame) frame = window.requestAnimationFrame(tick); }

    function refocus() {
      /* the keyboard focus may be on the mark while nothing answered it: its steady glow comes back */
      var vis = false;
      try { vis = document.activeElement === mark && mark.matches(':focus-visible'); } catch (err) {}
      if (vis && !quiet()) { focused = true; run(); }
    }
    if (motion && motion.addEventListener) motion.addEventListener('change', function () {
      if (motion.matches) halt(); else refocus();
    });
    mark.addEventListener('pointerenter', function (e) {
      if (quiet()) return;
      P.on = true;
      at(e);
      mod.enter();
      run();
    });
    mark.addEventListener('pointermove', function (e) {
      if (quiet()) return;
      /* a pointer already on the mark when it began to answer (reduced motion switched off) enters on its first move */
      if (!P.on) { P.on = true; at(e); mod.enter(); }
      at(e);
      run();
    });
    mark.addEventListener('pointerleave', function () { P.on = false; P.down = false; P.tilt = false; run(); });
    mark.addEventListener('pointerdown', function (e) {
      if (quiet() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (!P.on) { P.on = true; at(e); mod.enter(); }
      P.down = true;
      at(e);
      mod.press();
      run();
    });
    mark.addEventListener('pointerup', function () { if (P.down) { P.down = false; run(); } });
    mark.addEventListener('pointercancel', function () { P.down = false; P.on = false; P.tilt = false; run(); });
    mark.addEventListener('focus', function () {
      try { if (!mark.matches(':focus-visible')) return; } catch (err) {}
      if (quiet()) return;
      focused = true;
      run();
    });
    mark.addEventListener('blur', function () { focused = false; run(); });
    afterScroll.push(moved);
    themed.push(function () { mod.retheme(); if ((P.on || focused) && !quiet()) run(); });
    /* a page that comes back from the browser's back-forward cache still holds the state it left with */
    window.addEventListener('pageshow', function (e) { if (e.persisted) { halt(); refocus(); } });

    /* The click. On the front page the mark links to the page the reader is on: a plain click (one with a modifier
       or another button is left to the browser: new tab, new window) does not reload it. The page goes to its top,
       and the turn plays out where it began. On any other page the link is followed, and the turn is carried to the
       front page (see 3b). */
    var leaving = null;
    mark.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (mark.target && mark.target !== '_self') return;
      var to = new URL(mark.href, location.href);
      if (to.origin !== location.origin) return;
      if (samePage(to)) {
        e.preventDefault();
        if (location.hash) history.pushState(null, '', location.pathname + location.search);
        window.scrollTo(0, 0);
        return;
      }
      leaving = to.href;
    });
    function store() {
      /* on leaving the page: the ring's state at the last frame drawn, stamped with that frame's time */
      var s = mod.save(), when = Date.now() - (then ? performance.now() - then : 0);
      try {
        if (s && leaving && !quiet()) sessionStorage.setItem(CARRY, JSON.stringify({ to: leaving, t: when, s: s }));
        else sessionStorage.removeItem(CARRY);
      } catch (err) {}
    }
    window.addEventListener('pageswap', function (e) {
      /* where the browser has this event, it says where the reader is really going */
      var act = e.activation;
      if (!(leaving && act && act.entry && act.entry.url === leaving &&
            (act.navigationType === 'push' || act.navigationType === 'replace'))) leaving = null;
      store();
    });
    window.addEventListener('pagehide', function (e) {
      if (leaving) store();
      leaving = null;
      /* kept in the back-forward cache: come back at rest, not in the middle of a turn */
      if (e.persisted) halt();
    });
    return {
      /* a phone's tilt in the pointer's place (section 3c): where the light falls, in the mark's units */
      tilt: function (x, y) {
        if (quiet() || P.down || (P.on && !P.tilt)) return;      /* a pointer or a finger on the mark has the say */
        if (!P.on) { P.on = true; P.tilt = true; mod.enter(); }
        P.x = x; P.y = y;
        P.s = 0.2 + 0.8 * Math.max(0, Math.min(1, 1 - Math.sqrt(x * x + y * y) / 100));
        run();
      },
      level: function () { if (P.tilt) { P.tilt = false; P.on = false; run(); } },
      resume: function () {
        /* the page this one replaced was left in the middle of a turn begun by a press on its mark */
        var c = null, to = null;
        try { c = JSON.parse(sessionStorage.getItem(CARRY)); sessionStorage.removeItem(CARRY); } catch (err) {}
        if (!c || typeof c !== 'object' || !c.s || typeof c.s !== 'object' || quiet()) return false;
        try { to = new URL(c.to); } catch (err) { return false; }
        var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
        var age = Date.now() - c.t;
        if ((nav && (nav.type === 'reload' || nav.type === 'back_forward')) || !(age >= 0 && age < 2000) ||
            !samePage(to)) return false;
        if (!mod.load(c.s, age / 1000)) return false;
        run();
        return true;
      }
    };
  }

  /* ---- 3b. the mark across a change of page ----
     A press on the mark of any page but the front page starts the turn there, and the link takes the reader to the
     front page. The front page takes the turn up where it was, as if one page had been on screen throughout:
     - the old page stores the ring's state (angle, speed, target, the press) and the time of its last frame in
       sessionStorage when it is left (pageswap, and pagehide where there is no pageswap);
     - the new page reads it before its first frame (pagereveal, and DOMContentLoaded where there is no pagereveal),
       advances it by the time that has passed, and goes on. It is used once, for the front page only, within two
       seconds, never on a reload or a move through the history, and never with reduced motion.
     The change of page itself still shows for a moment: the browser holds the last frame of the old page until the
     new one is drawn. Without the script the link is a plain link. */
  var CARRY = 'hub-mark-turn';
  function path(u) { return u.pathname.replace(/\/index\.html$/, '/'); }
  function samePage(u) {
    return u.origin === location.origin && path(u) === path(location) && u.search === location.search;
  }
  var ctl = null;
  function wire() {
    if (!ctl) { var m = document.querySelector('.emblem'); if (m) ctl = wireMark(m) || null; }
    return ctl;
  }
  window.addEventListener('pagereveal', function () { var c = wire(); if (c) c.resume(); });
  /* The other link home (the name in the header) behaves like the mark on the front page: a plain click goes to the
     top of the page instead of loading it again. The name is not shown at the top of a page, so the keyboard's
     place moves to the mark, which leads home too. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a.home') : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    var to = new URL(a.href, location.href);
    if (to.hash || !samePage(to)) return;
    e.preventDefault();
    if (location.hash) history.pushState(null, '', location.pathname + location.search);
    var mark = document.querySelector('.emblem');
    if (mark && document.activeElement === a) mark.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  });

  /* The name in the header answers the pointer in the mark's colours: a white light follows the pointer across the
     letters, and the side away from the pointer is shaded (a pale name only: a black one cannot be shaded, and
     takes less white before it greys out). The strengths are the mark's. The stylesheet draws both from four
     properties set here while the pointer is on the name. Nothing runs and nothing is left on it at rest. None
     with reduced motion, and none for a finger, which has no place to rest. */
  var names = [];   /* the name wherever it wears its dress: each can be lit (section 3c lights them by a phone's tilt) */
  function nameLight(el, host) {
    /* host: what the pointer has to be on for el to be lit (el itself unless given: a figure is lit from its tile) */
    host = host || el;
    var on = false, k = 0, x = 0.5, to = 0.5, last = 0, raf = 0, alpha = 0.62, shade = 0.5;
    function tone() {
      var col = (window.getComputedStyle(el).color.match(/\d+(\.\d+)?/g) || [0, 0, 0]).map(Number);
      var pale = 0.2126 * col[0] + 0.7152 * col[1] + 0.0722 * col[2] > 110;
      alpha = pale ? 0.62 : 0.44;
      shade = pale ? 0.5 : 0;
    }
    function frame(t) {
      raf = 0;
      var dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
      last = t;
      var want = on && !quiet() ? 1 : 0;
      k += (want - k) * Math.min(1, dt * 9);
      x += (to - x) * Math.min(1, dt * 16);
      if (Math.abs(k - want) < 0.004) k = want;
      if (k === 0) {                       /* at rest: no property is left on the name */
        ['--nx', '--nl', '--ns', '--na'].forEach(function (p) { el.style.removeProperty(p); });
        if (!el.getAttribute('style')) el.removeAttribute('style');
        last = 0;
        return;
      }
      el.style.setProperty('--nx', (x * 100).toFixed(1) + '%');
      el.style.setProperty('--nl', (alpha * k).toFixed(3));
      el.style.setProperty('--ns', (shade * k * Math.min(1, Math.abs(x - 0.5) * 2.4)).toFixed(3));
      el.style.setProperty('--na', x < 0.5 ? '90deg' : '270deg');   /* the shade lies toward the end away from the light */
      if (k !== want || Math.abs(to - x) > 0.002) run();
    }
    function run() { if (!raf) raf = window.requestAnimationFrame(frame); }
    var c = {
      el: el,
      /* the light at a place along the name, from 0 at its left end to 1 at its right end */
      show: function (pos) {
        if (quiet()) return;
        to = Math.max(0, Math.min(1, pos));
        if (!on) { tone(); if (k === 0) x = to; }
        on = true; run();
      },
      hide: function () { if (on) { on = false; run(); } }
    };
    function under(e) {
      if (e.pointerType === 'touch') return;
      var r = el.getBoundingClientRect();
      c.show(r.width ? (e.clientX - r.left) / r.width : 0.5);
    }
    host.addEventListener('pointerenter', under);
    host.addEventListener('pointermove', under);
    host.addEventListener('pointerleave', c.hide);
    if (motion && motion.addEventListener) motion.addEventListener('change', function () { if (motion.matches) c.hide(); });
    return c;
  }
  /* The name in the header stands wherever it fits in the links' row beside the mark, and nowhere else. The room
     left of the mark depends on the window's width and on the mark's size, which the scroll changes: at the top of
     a page, where the mark is large, a window of middle width has no room for the name, and it comes in once the
     mark has shrunk. (Ruled by window widths alone, the name stood in a second row over the links in some widths,
     and the links' rows went from one to two, back to one and to two again as a window was drawn narrower.) */
  /* call fn whenever web fonts have finished loading: measures taken with a fallback face are taken again. (A
     browser may report the fonts ready before the page's faces have begun to load.) */
  function refont(fn) {
    var f = document.fonts;
    if (!f) return;
    if (f.ready && f.ready.then) f.ready.then(fn);
    if (f.addEventListener) f.addEventListener('loadingdone', fn);
  }
  function wireFit() {
    var navl = document.querySelector('.navl');
    var home = navl && navl.querySelector('.home');
    if (!home) return;
    /* The name is written out where the row holds it, shortened (.ns) where only the short form fits, and left out
       where neither does: as a window narrows it goes from the one to the next once. */
    var needFull = 0, needShort = 0, shown = '';
    function rowWidth() {   /* the width of the row with the name in it; the links' size changes with the window */
      var kids = navl.children, w = 0;
      for (var i = 0; i < kids.length; i++) {
        var cs = window.getComputedStyle(kids[i]);
        w += kids[i].getBoundingClientRect().width + (parseFloat(cs.marginLeft) || 0) + (parseFloat(cs.marginRight) || 0);
      }
      return Math.ceil(w + (parseFloat(window.getComputedStyle(navl).columnGap) || 0) * (kids.length - 1)) + 1;
    }
    function measure() {
      navl.classList.remove('nn');
      navl.classList.add('full');
      needFull = rowWidth();
      navl.classList.remove('full');
      needShort = rowWidth();
      shown = '';
    }
    function fit() {
      if (!needFull) measure();
      var room = navl.clientWidth;
      var state = room >= needFull ? 'full' : room >= needShort ? 'short' : 'none';
      if (state === shown) return;
      shown = state;
      navl.classList.toggle('full', state === 'full');
      navl.classList.toggle('nn', state === 'none');
      home.classList.toggle('nin', state !== 'none');   /* it comes in over a moment; it leaves at once, with its room */
    }
    afterScroll.push(fit);
    window.addEventListener('resize', function () { needFull = 0; });
    refont(function () { needFull = 0; fit(); });
    fit();
  }
  function wireName() {
    var found = document.querySelectorAll('.topin .home, .wm');
    for (var i = 0; i < found.length; i++) names.push(nameLight(found[i]));
    /* the figures of the tiles wear the same dress: a figure is lit while the pointer is anywhere on its tile */
    var figures = document.querySelectorAll('.stat .tnum');
    for (var j = 0; j < figures.length; j++) names.push(nameLight(figures[j], figures[j].closest('.stat')));
  }

  /* ---- 3c. a phone's tilt ----
     A phone has no pointer for the mark and the name to answer. Where the browser reports how the phone is held,
     its tilt stands in: tilting the phone moves the light across the mark, which leans with it, and across the
     name, as light falls differently on a thing turned in the hand. The way the phone is held counts as level,
     and that level follows the hand slowly, so any way of holding it becomes level again within a few seconds.
     A phone held still gets no light: it fades a second and a half after the last tilt, and nothing runs. A finger
     on the mark has the say while it is there. None with reduced motion.
     Every other item that answers a pointer answers the tilt as well: the small ring signs before the next steps
     and the theme switch turn with it (the stylesheet reads --tt), as they turn under a pointer.
     Safari on an iPhone reports the tilt only after the reader has allowed it in a dialog of its own, which a page
     may open only from a tap: the first tap on the page that is not on a link or a button opens it (Max, 2026-11-16:
     the tilt did nothing on his phone). A link is left alone, so that the dialog never stands in a page's way. */
  function wireTilt() {
    var DOE = window.DeviceOrientationEvent;
    /* With ?tilt in the address, a small box at the foot of the window says what the tilt is doing, for checking a
       phone: whether the browser reports the tilt, whether it asks leave and what the reader answered, whether
       reduced motion is on, and the reports as they come. Nothing shows without ?tilt. */
    var diag = null, D = { asked: '-', events: 0, b: 0, g: 0 };
    if (/[?&]tilt\b/.test(location.search)) {
      diag = document.createElement('div');
      diag.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99;padding:8px 10px;font:12px/1.5 monospace;' +
        'background:rgba(0,0,0,.85);color:#fff;border:1px solid #94B1FF;border-radius:6px;white-space:pre-wrap';
      document.body.appendChild(diag);
      window.setInterval(function () {
        diag.textContent = 'tilt API: ' + (DOE ? 'yes' : 'NO') +
          ' | needs leave: ' + (DOE && typeof DOE.requestPermission === 'function' ? 'yes' : 'no') +
          ' | answer: ' + D.asked + '\nreduced motion: ' + (quiet() ? 'ON (effects off)' : 'off') +
          ' | reports: ' + D.events + ' | front-back ' + D.b.toFixed(1) + ' side ' + D.g.toFixed(1) +
          ' | lit: ' + (live ? 'yes' : 'no');
      }, 250);
    }
    if (!DOE) return;
    if (typeof DOE.requestPermission === 'function') {
      var asking = false;
      var ask = function (e) {
        var t = e.target && e.target.closest ? e.target.closest('a, button, input, summary, label, select, textarea') : null;
        if (t || asking || quiet()) return;
        asking = true;
        D.asked = 'asking';
        DOE.requestPermission().then(function (state) {
          D.asked = state;
          if (state === 'granted' || state === 'denied') document.removeEventListener('touchend', ask);
          asking = false;
        }, function (err) { D.asked = 'not a tap (' + (err && err.name || 'error') + '), will ask again'; asking = false; });
      };
      document.addEventListener('touchend', ask, { passive: true });
    }
    var REACH = 18;        /* degrees of tilt that carry the light from the middle to the edge */
    var STILL = 0.6;       /* degrees: less than this between two reports is a hand holding still */
    var b0 = null, g0 = null, lb = 0, lg = 0, then = 0, timer = 0, live = false;
    function rest() {
      timer = 0; live = false;
      var c = wire();
      if (c) c.level();
      for (var i = 0; i < names.length; i++) names[i].hide();
      root.style.removeProperty('--tt');
    }
    window.addEventListener('deviceorientation', function (e) {
      if (typeof e.beta !== 'number' || typeof e.gamma !== 'number') return;
      D.events++; D.b = e.beta; D.g = e.gamma;
      if (quiet() || document.hidden) { if (live) rest(); return; }
      /* front to back and side to side as the reader sees the screen, whichever way up the phone is */
      var turn = (window.screen && screen.orientation && screen.orientation.angle) || 0;
      var b = turn === 90 ? -e.gamma : turn === 270 ? e.gamma : turn === 180 ? -e.beta : e.beta;
      var g = turn === 90 ? e.beta : turn === 270 ? -e.beta : turn === 180 ? -e.gamma : e.gamma;
      var now = e.timeStamp || Date.now(), dt = then ? Math.min(0.25, Math.max(0, (now - then) / 1000)) : 0;
      then = now;
      if (b0 === null) { b0 = lb = b; g0 = lg = g; return; }
      var follow = 1 - Math.exp(-dt / 4);
      b0 += (b - b0) * follow; g0 += (g - g0) * follow;
      if (Math.abs(b - lb) + Math.abs(g - lg) >= STILL) {
        lb = b; lg = g; live = true;
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(rest, 1500);
      }
      if (!live) return;
      var x = Math.max(-1, Math.min(1, (g - g0) / REACH)), y = Math.max(-1, Math.min(1, (b - b0) / REACH));
      var c = wire();
      if (c) c.tilt(x * 78, y * 78);
      for (var i = 0; i < names.length; i++) names[i].show(0.5 + x * 0.5);
      root.style.setProperty('--tt', (x * 90).toFixed(1) + 'deg');   /* the small signs turn with the tilt */
    });
  }

  /* ---- 4. the corner ornaments ----
     Each ornament answers the pointer with a small movement and nothing else: it slides toward the pointer, by at
     most REACH CSS pixels whatever its size (none with the pointer at its centre, most at its edge), and slides
     back when the pointer leaves. (A share of the drawing's own size moved a 48 px ornament by little more than a
     pixel, which reads as no movement at all.) It never changes size or shape, has no light, and does nothing more under a press.
     The ornaments stay out of the pointer's way (the stylesheet gives them pointer-events: none), so that they never
     cover a link: the script watches where the pointer is instead, once per frame while it moves. An ornament that
     slides past its own box is drawn over the frame's lines (the stylesheet lets it overflow). At rest nothing runs
     and nothing is left on an ornament. */
  function wireOrnaments() {
    var found = document.querySelectorAll('.oc, .ac'), items = [];
    for (var i = 0; i < found.length; i++) {
      var use = found[i].querySelector('use, .cmv');
      var vb = found[i].viewBox && found[i].viewBox.baseVal;
      if (use) items.push({ svg: found[i], use: use, on: false, x: 0, y: 0, k: 0, qx: { x: 0, v: 0 },
                            qy: { x: 0, v: 0 }, styled: false, half: vb && vb.width ? vb.width / 2 : HALF });
    }
    if (!items.length) return;
    var REACH = 4, HALF = 24;    /* an ornament is drawn in a box of 48 units: 96 or 48 px on the page */
    var px = 0, py = 0, inside = false, due = false, frame = 0, then = 0;

    function scan() {
      /* which ornament the pointer is on, and where on it, in the ornament's own units from its centre. Three of the
         four are mirror images, set by the stylesheet with a transform whose signs are read here. */
      due = false;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], r = it.svg.getBoundingClientRect();
        it.on = inside && r.width > 0 && px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
        if (!it.on) continue;
        var t = window.getComputedStyle(it.svg).transform;
        var m = t && t.indexOf('matrix(') === 0 ? t.slice(7).split(',') : null;
        var u = r.width / (2 * it.half);
        it.k = REACH / u;          /* the reach in the drawing's units: 2 at 96 px, 4 at 48 px */
        it.x = (m && parseFloat(m[0]) < 0 ? -1 : 1) * (px - (r.left + r.width / 2)) / u;
        it.y = (m && parseFloat(m[3]) < 0 ? -1 : 1) * (py - (r.top + r.height / 2)) / u;
      }
    }
    function draw(dt) {
      var busy = false;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], d = Math.sqrt(it.x * it.x + it.y * it.y), f = it.on ? it.k / Math.max(it.half, d) : 0;
        var m = spring(it.qx, it.x * f, dt, 14, 1);
        m = spring(it.qy, it.y * f, dt, 14, 1) || m;
        if (m) busy = true;
        if (it.qx.x === 0 && it.qy.x === 0) {
          if (it.styled) { unstyle(it.use, 'transform'); it.styled = false; }
          continue;
        }
        it.use.style.transform = 'translate(' + it.qx.x.toFixed(2) + 'px,' + it.qy.x.toFixed(2) + 'px)';
        it.styled = true;
      }
      return busy;
    }
    function halt() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0; then = 0; inside = false; due = false;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        it.on = false; it.qx.x = it.qx.v = it.qy.x = it.qy.v = 0;
        if (it.styled) { unstyle(it.use, 'transform'); it.styled = false; }
      }
    }
    function tick(now) {
      frame = 0;
      if (quiet()) { halt(); return; }
      if (due) scan();
      var dt = then ? Math.min(0.05, (now - then) / 1000) : 0;
      then = now;
      if (draw(dt)) { frame = window.requestAnimationFrame(tick); return; }
      then = 0;   /* at rest: nothing runs until the pointer moves again */
    }
    function look() { due = true; if (!frame) frame = window.requestAnimationFrame(tick); }
    function at(e) { px = e.clientX; py = e.clientY; inside = true; look(); }
    function gone() { if (inside) { inside = false; look(); } }
    var passive = { passive: true };

    if (motion && motion.addEventListener) motion.addEventListener('change', function () { if (motion.matches) halt(); });
    document.addEventListener('pointermove', function (e) { if (!quiet()) at(e); }, passive);
    /* a finger or a pen has no hover: it is on an ornament from the touch until it lifts */
    document.addEventListener('pointerdown', function (e) { if (!quiet()) at(e); }, passive);
    document.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') gone(); }, passive);
    document.addEventListener('pointercancel', gone, passive);
    document.documentElement.addEventListener('pointerleave', gone);
    window.addEventListener('blur', gone);
    /* the ornaments move, and the pinned ones change size, under a resting pointer as the page scrolls */
    afterScroll.push(function () { if (inside) look(); });
    /* kept in the back-forward cache: come back at rest, not in the middle of a slide */
    window.addEventListener('pagehide', function (e) { if (e.persisted) halt(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) gone(); });
  }


  /* ---- 6. filters: a box over a long list hides the entries that do not hold every word typed, and a group (a topic,
     a paper) with no entry left. Without the script the box stays hidden and the whole list shows. ---- */
  function wireFilters() {
    var boxes = document.querySelectorAll('input.filter');
    for (var i = 0; i < boxes.length; i++) (function (box) {
      var list = document.getElementById(box.getAttribute('data-for'));
      if (!list) return;
      var items = list.querySelectorAll('[data-item]'), groups = list.querySelectorAll('[data-group]');
      var wrap = box.closest('.filt'), count = wrap.querySelector('.fcount');
      var texts = [];
      for (var k = 0; k < items.length; k++) texts.push(items[k].textContent.toLowerCase());
      wrap.hidden = false;
      var kind = '', chips = wrap.querySelectorAll('.chip[data-kind]');   /* not the switch for the Lean statements */
      var index = document.querySelectorAll('.onpage a[href^="#"], .topics a[href^="#"], .side a[href^="#"]');
      for (var c = 0; c < chips.length; c++) chips[c].addEventListener('click', function () {
        kind = this.getAttribute('data-kind');
        for (var d = 0; d < chips.length; d++) chips[d].setAttribute('aria-pressed', chips[d] === this ? 'true' : 'false');
        apply();
      });
      box.addEventListener('input', apply);
      /* the switch that opens every folded Lean statement of the list, or folds them all again */
      var opener = wrap.querySelector('.openall');
      if (opener) opener.addEventListener('click', function () {
        /* a button whose label says what it will do (it was also marked pressed, and a screen reader heard
           "Fold Lean statements, pressed") */
        var open = this.getAttribute('data-open') !== 'true', folds = list.querySelectorAll('details');
        for (var d = 0; d < folds.length; d++) folds[d].open = open;
        this.setAttribute('data-open', open ? 'true' : 'false');
        this.textContent = open ? 'Fold Lean statements' : 'Show Lean statements';
        onScroll();   /* the list has another length: the sidebar marks its place again */
      });
      function apply() {
        var words = box.value.toLowerCase().split(/\s+/).filter(Boolean), shown = 0;
        for (var k = 0; k < items.length; k++) {
          var ok = (!kind || items[k].getAttribute('data-kind') === kind) &&
                   words.every(function (w) { return texts[k].indexOf(w) >= 0; });
          items[k].hidden = !ok;
          if (ok) shown++;
        }
        for (var g = groups.length - 1; g >= 0; g--) groups[g].hidden = !groups[g].querySelector('[data-item]:not([hidden])');
        if (count) count.textContent = words.length || kind ? shown + ' of ' + items.length + ' shown' : '';
        /* the page's index of chapters or topics lists only what is still shown */
        for (var n = 0; n < index.length; n++) {
          var id = index[n].getAttribute('href').slice(1), target = id ? document.getElementById(id) : null;
          if (target && list.contains(target)) index[n].parentNode.hidden = !!target.closest('[hidden]');
        }
        onScroll();   /* the sidebar marks its place again: the list has changed under it */
      }
    })(boxes[i]);
  }

  /* The signs before the front page's next steps: under the pointer a sign's ring makes a quarter turn forward, as
     the mark's ring turns on a press, and like it never turns back (the stylesheet eases the turn). None with
     reduced motion, and none for a finger. */
  function wireSteps() {
    var links = document.querySelectorAll('.steps a.g');
    for (var i = 0; i < links.length; i++) (function (el) {
      var turn = 0;
      el.addEventListener('pointerenter', function (e) {
        if (quiet() || e.pointerType === 'touch') return;
        turn += 90;
        el.style.setProperty('--gt', turn + 'deg');
      });
    })(links[i]);
  }

  /* ---- 7. the sidebar of a long list ----
     Marks the part of the list that is being read: the last part whose heading has passed under the header. A part
     that the filter has hidden is passed over. Where the sidebar is longer than the window, the marked entry is
     kept in view. Nothing is done while the sidebar is not shown (a narrow window). */
  function wireSide() {
    var navs = document.querySelectorAll('nav.side');
    for (var n = 0; n < navs.length; n++) (function (nav) {
      var links = nav.querySelectorAll('a[href^="#"]'), items = [], cur = null;
      for (var k = 0; k < links.length; k++) {
        var t = document.getElementById(links[k].getAttribute('href').slice(1));
        if (t) items.push({ a: links[k], t: t });
      }
      if (!items.length) return;
      /* The sidebar comes in once the reader has begun to scroll and its place beside the text has come up into
         the window (the upper three fifths), and goes again when that is no longer so: a rule of the scroll's
         position alone, the same after any resize. On a page whose sidebar starts under the title that is the
         first movement of the page; on the front page it is the arrival at "A case in point". */
      var wasFoot = false, placed = false, shown = false, asked = null;
      /* the entry a reader chose: at the foot of the page, where the last parts cannot reach the top, it stays
         marked (choosing a short part near the foot used to mark the last one) */
      nav.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        asked = null;
        for (var i = 0; i < items.length; i++) if (items[i].a === a) asked = items[i];
      });
      function fade() {   /* a sidebar longer than its room fades at its foot and its top while there is more */
        var room = nav.scrollHeight - nav.clientHeight;
        nav.classList.toggle('over', room > 1 && nav.scrollTop < room - 2);
        nav.classList.toggle('under', room > 1 && nav.scrollTop > 1);
      }
      nav.addEventListener('scroll', fade, { passive: true });
      function show() {
        var y = window.scrollY || window.pageYOffset || 0;
        var on = y > 4 && nav.parentNode.getBoundingClientRect().top < window.innerHeight * 0.6;
        if (on !== shown) { shown = on; nav.classList.toggle('on', on); }
      }
      function seen(it) { var r = it.t.getBoundingClientRect(); return r.width || r.height; }   /* not hidden by the filter */
      function edge(from, step) { for (var i = from; i >= 0 && i < items.length; i += step) if (seen(items[i])) return items[i]; return null; }
      /* A sidebar that is longer than its room has a scroll of its own, and that scroll keeps step with the page:
         at its start while the first part is read, at its end while the last part is read or the page is at its
         foot, and in between with the part being read at mid-height. It moves when the part changes, so a reader
         who scrolls the sidebar by hand to look ahead is left alone until then. */
      function follow(atOnce) {
        var room = nav.scrollHeight - nav.clientHeight;
        if (room < 2) return;
        var to = 0;
        if (wasFoot || (cur && cur === edge(items.length - 1, -1))) to = room;
        else if (cur && cur !== edge(0, 1)) {
          var a = cur.a.getBoundingClientRect(), b = nav.getBoundingClientRect();
          to = Math.max(0, Math.min(room, a.top - b.top + nav.scrollTop + a.height / 2 - nav.clientHeight / 2));
        }
        if (room < 40) to = to < room / 2 ? 0 : room;   /* a few pixels of scroll would cut a line at both ends */
        if (Math.abs(nav.scrollTop - to) < 2) return;
        if (atOnce || quiet() || !nav.scrollTo) nav.scrollTop = to;
        else nav.scrollTo({ top: to, behavior: 'smooth' });
      }
      function mark() {
        if (!nav.offsetParent) { placed = false; return; }   /* not shown at this window width */
        var appeared = !placed;      /* the first time it is shown at this window width: no glide to its place */
        placed = true;
        show();
        var best = null;
        for (var i = 0; i < items.length; i++) {
          /* a part whose heading holds is being read from the moment its heading takes the hold place, so that
             the sidebar and the held heading change together; any other part from 150px down (a part reached by
             its link stands 116px down, scroll-padding-top) */
          var t = items[i].t, hh = t.closest ? t.closest('.holds') : null;
          if (!hh && t.firstElementChild && t.firstElementChild.classList.contains('holds')) hh = t.firstElementChild;
          var r = (hh || t).getBoundingClientRect();
          if (!r.width && !r.height) continue;       /* hidden by the filter */
          if (r.top > (hh ? (parseFloat(window.getComputedStyle(hh).top) || 0) + 2 : 150)) break;
          best = items[i];
        }
        /* at the foot of the page the last parts are too short for their headings to reach the header: the last
           part that is shown counts as the one being read */
        var foot = window.innerHeight + (window.scrollY || 0) >= document.documentElement.scrollHeight - 4;
        if (foot) best = (asked && seen(asked) ? asked : null) || edge(items.length - 1, -1) || best;
        else asked = null;
        var moved = best !== cur || foot !== wasFoot;
        wasFoot = foot;
        if (best !== cur) {
          if (cur) cur.a.removeAttribute('aria-current');
          cur = best;
          if (cur) cur.a.setAttribute('aria-current', 'location');
        }
        if (moved || appeared) follow(appeared);
        fade();
      }
      afterScroll.push(mark);
      mark();
    })(navs[n]);
  }

  /* ---- 7. the heading of the part being read ----
     A section's heading holds under the frame's top line while its section is read (the stylesheet makes it
     sticky, see .holds). The script says three things the stylesheet cannot: which headings are short enough to hold
     (one or two lines), which are holding now (they get the fading ground under them), and which of those has a
     later heading of its own part at or above its foot, arriving, held or leaving: that one is hidden, so that only
     the innermost heading shows. (Hidden only while a later heading was held, the outer heading came back for a
     moment between two of them, with the next one's rule sliding through its words.) */
  function wireStick() {
    if (!(window.CSS && CSS.supports && CSS.supports('position', 'sticky'))) return;
    var found = document.querySelectorAll('.sec, h3.ch3'), bar = document.getElementById('top'), heads = [];
    if (!found.length || !bar) return;
    for (var i = 0; i < found.length; i++) heads.push({ el: found[i], known: false, ok: false, off: 0, stuck: false, under: false, later: [] });
    /* the later headings of a heading's own part: those after it in the element that holds it (a book's chapters,
       the reading list's topics, the next sections of a page of prose) */
    for (var a = 0; a < heads.length; a++) {
      for (var b = a + 1; b < heads.length; b++) {
        if (heads[a].el.parentNode.contains(heads[b].el)) heads[a].later.push(heads[b]);
      }
    }
    var sized = false;
    function size() {   /* the window changed: every heading is measured again when it is next shown */
      sized = true;
      for (var i = 0; i < heads.length; i++) {
        var h = heads[i];
        h.el.classList.remove('holding', 'covered');
        h.el.classList.add('holds');
        h.known = h.stuck = h.under = false;
      }
    }
    function measure(h, hb) {   /* false while the heading is hidden by a filter: it cannot be measured then */
      var el = h.el, words = el.querySelector('h2, h3') || el, cs = window.getComputedStyle(words);
      var tall = words.getBoundingClientRect().height - (words === el ? parseFloat(cs.paddingTop) || 0 : 0);
      if (!(tall > 0)) return false;
      h.known = true;
      h.ok = tall < (parseFloat(cs.lineHeight) || 1) * 2.5;
      h.off = h.ok ? hb - (parseFloat(window.getComputedStyle(el).top) || 0) : 0;   /* it holds this far above the header's foot */
      el.classList.toggle('holds', h.ok);
      return true;
    }
    var main = document.querySelector('main');
    function mark() {
      if (!sized) size();
      var hb = bar.getBoundingClientRect().bottom;
      /* At the foot of a page the last parts are too short to reach the top, and the heading of a part above them
         stayed held over them: there, a heading whose part ends above the end of the page's text lets go. */
      var foot = window.innerHeight + (window.scrollY || 0) >= document.documentElement.scrollHeight - 4;
      var end = foot && main ? main.getBoundingClientRect().bottom : 0;
      for (var i = 0; i < heads.length; i++) {
        var h = heads[i];
        if (!h.known && !measure(h, hb)) continue;
        if (!h.ok) continue;
        var r = h.el.getBoundingClientRect();
        var shown = (r.width || r.height) && r.bottom > hb - 2;          /* not hidden by a filter, not gone by */
        var stuck = !!shown && r.top <= hb - h.off + 0.5;
        var under = false;
        if (stuck && foot && h.el.parentNode.getBoundingClientRect().bottom < end - 24) under = true;
        for (var k = 0; stuck && !under && k < h.later.length; k++) {
          var q = h.later[k].el.getBoundingClientRect();
          under = (q.width || q.height) > 0 && q.top < r.bottom - 1;     /* a filter's hidden heading has no box */
        }
        if (stuck !== h.stuck) { h.stuck = stuck; h.el.classList.toggle('holding', stuck); }
        if (under !== h.under) { h.under = under; h.el.classList.toggle('covered', under); }
      }
    }
    afterScroll.push(mark);
    window.addEventListener('resize', function () { sized = false; });
    refont(function () { sized = false; mark(); });
    mark();

    /* A link to a heading, or to a place in it, lands where the heading holds, at the top of its part. (The
       browser's own jump goes to where a sticky heading stands now: to a heading that was holding it did not move
       at all, and to one that was not yet holding it left the part before it in view, its heading over the one
       asked for.) The heading's place in the page is read with its hold let go for a moment. */
    function holder(t) {   /* the held heading of t: one it is in, or one it opens with (a figure) */
      if (!t || !t.closest) return null;
      var f = t.firstElementChild;
      return t.closest('.holds') || (f && f.classList.contains('holds') ? f : null);
    }
    function land(t, push) {
      var h = holder(t), w = null;
      for (var i = 0; i < heads.length && !w; i++) if (heads[i].el === h) w = heads[i];
      if (!h || !w || !w.ok) return false;
      /* its place in the page, with only its hold let go (the class also sets a chapter heading's margins, and
         taking the class away measured it 12px off) */
      h.style.position = 'static';
      var y = h.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
      h.style.position = '';
      if (!h.getAttribute('style')) h.removeAttribute('style');
      var settled = parseFloat(window.getComputedStyle(document.body).getPropertyValue('--hd1')) || bar.getBoundingClientRect().bottom;
      /* the new history entry comes first, so that Back returns to where the reader was */
      if (push && history.pushState && location.hash !== push) history.pushState(null, '', push);
      window.scrollTo(0, Math.max(0, Math.round(y - (settled - w.off))));
      /* the keyboard's place moves to the part, as with the browser's own jump */
      if (push) {
        if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
        try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); }
      }
      return true;
    }
    function target(hash) {
      if (!hash || hash.length < 2) return null;
      try { return document.getElementById(decodeURIComponent(hash.slice(1))); } catch (e) { return null; }
    }
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!sized) size();
      var t = target(a.getAttribute('href')), hb = bar.getBoundingClientRect().bottom;
      for (var i = 0; i < heads.length; i++) if (!heads[i].known) measure(heads[i], hb);
      if (t && land(t, a.getAttribute('href'))) e.preventDefault();
    });
    window.addEventListener('hashchange', function () { var t = target(location.hash); if (t) land(t, null); });
    /* a page opened at a heading: the browser's jump left the part before it in view; the heading takes its place */
    if (location.hash) {
      window.setTimeout(function () {
        var t = target(location.hash), hb = bar.getBoundingClientRect().bottom;
        if (!t || !holder(t)) return;
        var r = t.getBoundingClientRect();
        if (r.top < 0 || r.top > window.innerHeight * 0.5) return;   /* the reader has moved on, or the page was restored elsewhere */
        for (var i = 0; i < heads.length; i++) if (!heads[i].known) measure(heads[i], hb);
        land(t, null);
      }, 0);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('.theme');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].hidden = false;
      buttons[i].addEventListener('click', function () {
        var next = current() === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
        labelAll();
      });
    }
    labelAll();
    setProgress();
    var c = wire();
    if (c) c.resume();   /* nothing is left to take up when pagereveal has already done it */
    wireFit();
    wireName();
    wireTilt();
    wireOrnaments();
    wireFilters();
    wireSide();
    wireSteps();
    wireStick();
  });
})();
