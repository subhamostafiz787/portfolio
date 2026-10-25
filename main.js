(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var G = !!(window.gsap && window.ScrollTrigger) && !reduce;
  if (G) { gsap.registerPlugin(ScrollTrigger); document.documentElement.classList.add('g'); }

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return [].slice.call(document.querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')'; }
  function ease(t) { return t * t * (3 - 2 * t); }

  /* ---------- page transition: a pour wipe between pages ---------- */
  var wipe = $('.wipe');
  var FLAG = 'brew-wipe';
  function store(fn) { try { return fn(); } catch (e) { return null; } }
  // the CSS parks the wipe below the screen; hand that position to GSAP so its yPercent maths stays clean
  if (G && wipe) gsap.set(wipe, { y: 0, yPercent: 100 });
  // each pour takes the next colour in the rotation: cherry, olive, espresso, cream
  var POURS = [
    { bg: '#7C1E22', ink: '#F3EDE3' },
    { bg: '#5C6532', ink: '#F3EDE3' },
    { bg: '#2A1A14', ink: '#F3EDE3' },
    { bg: '#F3EDE3', ink: '#2A1A14' }
  ];
  function paintWipe(i) {
    var c = POURS[((i % POURS.length) + POURS.length) % POURS.length];
    wipe.style.background = c.bg; wipe.style.color = c.ink;
  }
  var pourIdx = parseInt(store(function () { return sessionStorage.getItem('brew-pour'); }) || '-1', 10);
  if (isNaN(pourIdx)) pourIdx = -1;
  if (G && wipe && store(function () { return sessionStorage.getItem(FLAG); })) {
    store(function () { sessionStorage.removeItem(FLAG); });
    paintWipe(pourIdx);
    gsap.set(wipe, { yPercent: 0 });
    gsap.to(wipe, { yPercent: -100, duration: 0.9, ease: 'power3.inOut', delay: 0.1 });
  }
  if (G && wipe) {
    $$('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!/^(index|work)\.html/.test(href)) return;
      var samePage = href.split('#')[0] === (location.pathname.split('/').pop() || 'index.html');
      if (samePage) return;
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        pourIdx += 1;
        paintWipe(pourIdx);
        store(function () { sessionStorage.setItem(FLAG, '1'); sessionStorage.setItem('brew-pour', String(pourIdx % POURS.length)); });
        gsap.fromTo(wipe, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'power3.inOut', onComplete: function () { location.href = href; } });
      });
    });
    // coming back with the browser's back button: make sure the page isn't covered
    window.addEventListener('pageshow', function (e) { if (e.persisted) gsap.set(wipe, { yPercent: 100 }); });
  }

  /* ---------- nav: colour follows the section under it; hides on the way down ---------- */
  var nav = $('#nav');
  var story = $('#story');
  var sections = $$('[data-bg]');
  var lastY = window.scrollY, stageCol = { bg: '#F3EDE3', ink: '#2A1A14' };
  function navUpdate() {
    var y = window.scrollY, probe = 40, bg = '#F3EDE3', ink = '#2A1A14', inStage = false;
    var sr = story ? story.getBoundingClientRect() : null;
    if (sr && sr.top <= probe && sr.bottom >= probe) { bg = stageCol.bg; ink = stageCol.ink; }
    else sections.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top <= probe && r.bottom >= probe) { bg = s.getAttribute('data-bg'); ink = s.getAttribute('data-ink'); } });
    nav.style.setProperty('--nav-bg', bg);
    nav.style.setProperty('--nav-ink', ink);
    if (sr) inStage = sr.top <= 0 && sr.bottom >= window.innerHeight;
    nav.classList.toggle('hide', !inStage && y > lastY + 4 && y > 300);
    if (y < lastY - 4 || inStage) nav.classList.remove('hide');
    lastY = y;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? clamp(y / max, 0, 1) : 0;
    $('#brewpct').textContent = Math.round(pct * 100) + '%';
    $('#mugfill').setAttribute('y', 20 - pct * 15);
  }

  /* ---------- the brew: story stage on the home page ---------- */
  var renderStory = null, halo = null;
  if (story) {
    var W = 6000, VB_H = 300;
    var CH = [
      { name: 'The beans', bg: '#F3EDE3', ink: '#2A1A14', pen: '#8C1D22', x: 940 },
      { name: 'The grind', bg: '#E2D9CB', ink: '#2A1A14', pen: '#8C1D22', x: 2040 },
      { name: 'The bloom', bg: '#5C6532', ink: '#F3EDE3', pen: '#E2B26B', x: 3140 },
      { name: 'The pour',  bg: '#7C1E22', ink: '#F3EDE3', pen: '#E2B26B', x: 4240 },
      { name: 'The cup',   bg: '#2A1A14', ink: '#F3EDE3', pen: '#D6BC98', x: 5340 }
    ];
    var stage = $('#stage'), strip = $('#strip'), svg = $('#line'), pen = $('#pen');
    halo = $('#halo');
    var chapters = $$('.chapter'), ticks = $$('#ticks i');
    var chNum = $('#chNum'), chName = $('#chName'), nextBtn = $('#next');

    var ox = function (el) { var g = el.closest('g[data-ox]'); return g ? parseFloat(g.getAttribute('data-ox')) : 0; };
    var mains = [].slice.call(svg.querySelectorAll('[data-main]')).map(function (el) {
      var len = el.getTotalLength();
      el.style.strokeDasharray = len + ' ' + len; el.style.strokeDashoffset = len;
      return { el: el, len: len, ox: ox(el) };
    });
    var total = mains.reduce(function (s, m) { return s + m.len; }, 0);
    var details = [].slice.call(svg.querySelectorAll('[data-detail]')).map(function (el) {
      var len = el.getTotalLength(), b = el.getBBox(), o = ox(el);
      el.style.strokeDasharray = len + ' ' + len; el.style.strokeDashoffset = len;
      return { el: el, len: len, x0: o + b.x - 30, span: Math.max(b.width, 50) + 40 };
    });
    var notes = [].slice.call(svg.querySelectorAll('[data-note]')).map(function (el) {
      return { el: el, x0: ox(el) + parseFloat(el.getAttribute('x')) - 60 };
    });
    var head = function (drawn) {
      var acc = 0;
      for (var i = 0; i < mains.length; i++) {
        var m = mains[i];
        if (drawn <= acc + m.len) { var p = m.el.getPointAtLength(Math.max(0, drawn - acc)); return { x: p.x + m.ox, y: p.y }; }
        acc += m.len;
      }
      return { x: W, y: 290 };
    };
    var lut = [];
    for (var s = 0; s <= 400; s++) lut.push(head(total * s / 400).x);
    var progressForX = function (x) { for (var i = 0; i < lut.length; i++) if (lut[i] >= x) return i / 400; return 1; };

    var scale = 1, stripW = 0, vw = 0, active = -1;
    var layout = function () {
      vw = strip.clientWidth;
      var h = Math.round(clamp(window.innerHeight * 0.36, 170, 320));
      stage.style.setProperty('--strip-h', h + 'px');
      scale = h / VB_H; stripW = W * scale;
      svg.style.width = stripW + 'px';
      svg.setAttribute('width', stripW); svg.setAttribute('height', h);
    };

    if (G) {
      chapters.forEach(function (c, n) {
        var h = c.querySelector('h2');
        h.innerHTML = h.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w"><span class="wi">' + w + '</span></span>'; }).join(' ');
        gsap.set(c, { autoAlpha: n === 0 ? 1 : 0 });
      });
    }
    var swapTl = null;
    var swapChapter = function (idx, prev) {
      chapters.forEach(function (el, n) { el.classList.toggle('on', n === idx); el.setAttribute('aria-hidden', n === idx ? 'false' : 'true'); });
      if (!G || prev < 0) return;
      var out = chapters[prev], inn = chapters[idx], dir = idx > prev ? 1 : -1;
      if (swapTl) swapTl.kill();
      chapters.forEach(function (c) { if (c !== out && c !== inn) gsap.set(c, { autoAlpha: 0 }); });
      var outFade = out.querySelectorAll('.eyebrow, .body'), inFade = inn.querySelectorAll('.eyebrow, .body');
      swapTl = gsap.timeline()
        .to(out.querySelectorAll('.wi'), { yPercent: -110 * dir, duration: 0.4, stagger: 0.015, ease: 'power3.in' }, 0)
        .to(outFade, { opacity: 0, y: -16 * dir, duration: 0.3, ease: 'power2.in' }, 0)
        .set(out, { autoAlpha: 0 })
        .set(inn, { autoAlpha: 1 })
        .fromTo(inn.querySelectorAll('.wi'), { yPercent: 110 * dir }, { yPercent: 0, duration: 0.8, stagger: 0.04, ease: 'power3.out' })
        .fromTo(inFade, { opacity: 0, y: 22 * dir }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out' }, '<0.12');
    };

    renderStory = function (p) {
      var drawn = total * p, acc = 0;
      for (var i = 0; i < mains.length; i++) {
        var m = mains[i], d = clamp(drawn - acc, 0, m.len);
        m.el.style.strokeDashoffset = m.len - d; acc += m.len;
      }
      var hd = head(drawn);
      for (var j = 0; j < details.length; j++) {
        var dt = details[j], t = clamp((hd.x - dt.x0) / dt.span, 0, 1);
        dt.el.style.strokeDashoffset = dt.len * (1 - t);
      }
      for (var k = 0; k < notes.length; k++) {
        var n = notes[k], o = clamp((hd.x - n.x0) / 120, 0, 1);
        n.el.style.opacity = o; n.el.style.transform = 'translateY(' + (1 - o) * 10 + 'px)';
      }
      pen.setAttribute('cx', hd.x); pen.setAttribute('cy', hd.y);
      halo.setAttribute('cx', hd.x); halo.setAttribute('cy', hd.y);
      var on = p > 0.001 && p < 0.999;
      pen.style.opacity = on ? 1 : 0; halo.style.opacity = on ? 0.18 : 0;

      var tx = clamp(hd.x * scale - vw * 0.58, 0, Math.max(0, stripW - vw));
      svg.style.transform = 'translate3d(' + (-tx) + 'px,0,0)';

      var f = 0;
      for (var c = 0; c < CH.length - 1; c++) {
        if (hd.x >= CH[c].x) f = c + clamp((hd.x - CH[c].x) / (CH[c + 1].x - CH[c].x), 0, 1);
      }
      var i0 = Math.floor(f), i1 = Math.min(i0 + 1, CH.length - 1);
      var t2 = ease(clamp(((f - i0) - 0.35) / 0.3, 0, 1));
      var bg = mix(CH[i0].bg, CH[i1].bg, t2), ink = mix(CH[i0].ink, CH[i1].ink, t2);
      stage.style.setProperty('--stage-bg', bg);
      stage.style.setProperty('--stage-ink', ink);
      stage.style.setProperty('--pen', mix(CH[i0].pen, CH[i1].pen, t2));
      var idx = (f - i0) > 0.5 ? i1 : i0;
      if (idx !== active) {
        var prev = active; active = idx;
        swapChapter(idx, prev);
        ticks.forEach(function (el, n) { el.classList.toggle('on', n <= idx); });
        chNum.textContent = '0' + idx;
        chName.textContent = CH[idx].name;
        nextBtn.innerHTML = idx < CH.length - 1 ? 'Keep brewing <i>→</i>' : 'On the menu <i>↓</i>';
      }
      return { bg: bg, ink: ink };
    };

    nextBtn.addEventListener('click', function () {
      var nextIdx = active + 1;
      if (nextIdx >= CH.length) { $('#menu').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
      var p = progressForX(CH[nextIdx].x + 240) * 0.94;
      var range = story.offsetHeight - window.innerHeight;
      window.scrollTo({ top: story.offsetTop + p * range, behavior: reduce ? 'auto' : 'smooth' });
    });

    layout();
    if (G) {
      var st = { p: 0 };
      var snaps = [0].concat(CH.map(function (c) { return progressForX(c.x + 240) * 0.94; })).concat([1]);
      gsap.to(st, {
        p: 1, ease: 'none',
        scrollTrigger: {
          trigger: story, start: 'top top', end: 'bottom bottom', scrub: 1.1,
          snap: { snapTo: snaps, duration: { min: 0.4, max: 1 }, delay: 0.2, ease: 'power2.inOut' },
          onRefresh: layout
        },
        onUpdate: function () { stageCol = renderStory(clamp(st.p / 0.94, 0, 1)); }
      });
      stageCol = renderStory(0);
      window.addEventListener('resize', function () { layout(); stageCol = renderStory(clamp(st.p / 0.94, 0, 1)); });
    } else {
      var cur = 0;
      window.addEventListener('resize', layout);
      (function tick() {
        var r = story.getBoundingClientRect();
        var target = clamp(-r.top / (story.offsetHeight - window.innerHeight) / 0.94, 0, 1);
        cur = reduce ? target : cur + (target - cur) * 0.12;
        if (Math.abs(target - cur) < 0.0002) cur = target;
        stageCol = renderStory(cur);
        requestAnimationFrame(tick);
      })();
    }
  }

  if (G) gsap.ticker.add(navUpdate);
  else (function loop() { navUpdate(); requestAnimationFrame(loop); })();

  /* ---------- order counter (home) ---------- */
  var orders = $$('.order');
  var ticket = $('#ticket');
  orders.forEach(function (b) {
    b.addEventListener('click', function () {
      orders.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      var span = document.createElement('span');
      span.textContent = b.getAttribute('data-line');
      ticket.replaceChildren(span);
      if (G) gsap.fromTo(b, { scale: 0.93 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
    });
  });
  var copy = $('#copy');
  if (copy) copy.addEventListener('click', function () {
    var addr = $('#addr'), text = addr.textContent;
    function selectAddr() { var r = document.createRange(); r.selectNodeContents(addr); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
    function done(msg) { copy.textContent = msg; setTimeout(function () { copy.textContent = 'Copy email'; }, 1800); }
    try {
      navigator.clipboard.writeText(text).then(function () { done('Copied'); }, function () { selectAddr(); done('Selected, press copy'); });
    } catch (e) { selectAddr(); done('Selected, press copy'); }
  });

  /* ---------- cursor ---------- */
  var cursor = $('.cursor');
  if (cursor && fine && !reduce) {
    var mx = -100, my = -100, cx = -100, cy = -100;
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; });
    (function follow() {
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(follow);
    })();
    $$('[data-cursor]').forEach(function (el) {
      el.addEventListener('pointerenter', function () { cursor.querySelector('span').textContent = el.getAttribute('data-cursor'); cursor.classList.add('big-c'); });
      el.addEventListener('pointerleave', function () { cursor.classList.remove('big-c'); });
    });
  }

  /* ---------- motion extras ---------- */
  if (G) {
    if ($('.hero')) gsap.from('.hero .eyebrow, .hero .lede, .hero-foot', { opacity: 0, y: 24, duration: 0.9, stagger: 0.12, delay: 0.35, ease: 'power3.out' });
    if (halo) gsap.to(halo, { attr: { r: 20 }, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    // work page title: words rise in
    var title = $('.page-title');
    if (title) {
      title.innerHTML = title.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w"><span class="wi">' + w + '</span></span>'; }).join(' ');
      gsap.from('.page-title .wi', { yPercent: 110, duration: 1, stagger: 0.08, ease: 'power3.out', delay: 0.15 });
      gsap.from('.work .head p', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, delay: 0.45, ease: 'power3.out' });
    }

    // sections rise in as they arrive
    gsap.utils.toArray('.card, .contact .intro, .counter, .menu-cta .wrap').forEach(function (el) {
      gsap.from(el, { y: 70, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    gsap.utils.toArray('.card').forEach(function (card) {
      gsap.fromTo(card.querySelector('.num'), { yPercent: -40 }, { yPercent: 60, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // the big menu link slides across as you scroll past
    gsap.utils.toArray('.cta-text').forEach(function (el) {
      gsap.fromTo(el, { xPercent: 8 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.from('.big > span', {
      yPercent: -130, rotation: function () { return gsap.utils.random(-30, 30); }, opacity: 0,
      duration: 1.3, stagger: 0.09, ease: 'bounce.out', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true }
    });

    // magnetic controls (mouse only)
    if (fine) {
      gsap.utils.toArray('.order, .copy, #next, .logo, .scroll-cue, .cta-big i').forEach(function (el) {
        var xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' }), yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * 0.25); yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
        });
        el.addEventListener('pointerleave', function () { gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' }); });
      });
    }
    // arriving at a #hash from the other page: let ScrollTrigger settle, then jump
    if (location.hash) window.addEventListener('load', function () { var t = document.querySelector(location.hash); if (t) setTimeout(function () { t.scrollIntoView(); }, 50); });
  }
})();
