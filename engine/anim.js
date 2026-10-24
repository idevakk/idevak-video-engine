/* Deterministic scene choreography. One paused timeline owns every pixel. */
(function () {
  var SCENES = window.__SCENES__;
  var TOTAL = window.__TOTAL__;
  var tl = gsap.timeline({ paused: true });
  gsap.config({ nullTargetWarn: false });
  var E = { out: "power4.out", soft: "power3.out", inOut: "power2.inOut", expo: "expo.out" };

  function q(el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); }
  function rep(dur, cycle) { return Math.max(0, Math.floor(dur / cycle) - 1); }
  function ac(s) { return s.accent || "#38bdf8"; }

  /* ---------------------------------------------------------- backdrop */
  gsap.set("#bg-bloom", { xPercent: -50, yPercent: -50, x: 960, y: 540 });
  tl.to("#bg-grid", { x: -140, y: -90, duration: TOTAL, ease: "none" }, 0);
  tl.to("#bg-noise", { x: 90, y: -60, duration: TOTAL, ease: "none" }, 0);
  tl.to("#bg-bloom", { scale: 1.16, duration: TOTAL, ease: "none" }, 0);
  tl.to(":root", { duration: 1.8, ease: "sine.inOut" }, 0);

  /* ---------------------------------------------------------- helpers */
  function words(el, at, opts) {
    var o = opts || {};
    var nodes = q(el, ".wi");
    if (!nodes.length) return;
    tl.fromTo(nodes,
      { yPercent: 118, opacity: 0, x: o.x || 0, rotate: o.rotate || 0.001 },
      { yPercent: 0, opacity: 1, rotate: 0, duration: o.dur || 0.85, ease: E.expo, stagger: o.stagger || 0.045 },
      at);
  }
  function fade(el, at, o) {
    if (!el) return;
    o = o || {};
    tl.fromTo(el, { y: o.y == null ? 26 : o.y, opacity: 0 },
      { y: 0, opacity: 1, duration: o.dur || 0.7, ease: o.ease || E.soft }, at);
  }
  function line(el, at, o) {
    o = o || {};
    var nodes = q(el, ".lni");
    tl.fromTo(nodes, { yPercent: 116, opacity: 0 }, { yPercent: 0, opacity: 1, duration: o.dur || 0.8, ease: E.expo, stagger: o.stagger || 0.06 }, at);
  }
  function draw(svgPaths, at, o) {
    o = o || {};
    svgPaths.forEach(function (p, i) {
      var len = 0;
      try { len = p.getTotalLength(); } catch (e) { len = 300; }
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(p, { strokeDashoffset: 0, duration: o.dur || 0.7, ease: o.ease || "power2.inOut" }, at + i * (o.stagger || 0.12));
    });
  }
  function typeOn(nodes, at, o) {
    o = o || {};
    nodes.forEach(function (n, i) {
      tl.fromTo(n, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: o.dur || 0.7, ease: "steps(" + (o.steps || 20) + ")" }, at + i * (o.stagger || 0.5));
    });
  }
  function countUp(node, at, o) {
    o = o || {};
    if (!node || node.getAttribute("data-nocount") === "1") return;
    var to = parseFloat(node.getAttribute("data-to") || "0");
    var dec = parseInt(node.getAttribute("data-dec") || "0", 10);
    var sep = node.getAttribute("data-sep") === "1";
    var from = o.from == null ? 0 : o.from;
    function fmt(v) {
      var s = dec ? v.toFixed(dec) : String(Math.round(v));
      return sep ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s;
    }
    node.textContent = fmt(from);
    var p = { v: from };
    tl.to(p, {
      v: to, duration: o.dur || 1.5, ease: o.ease || "power2.out",
      onUpdate: function () { node.textContent = fmt(p.v); },
    }, at);
  }
  function rail(at, strength) {
    tl.fromTo("#cut-rail", { x: 0, opacity: 0 }, { x: 1980, opacity: strength || 0.5, duration: 0.22, ease: "power2.in" }, at);
    tl.to("#cut-rail", { opacity: 0, duration: 0.2, ease: "power1.out" }, at + 0.2);
  }
  function amb(el, dur, at) {
    if (!el) return;
    tl.fromTo(el, { scale: 1, x: 0 }, { scale: 1.06, x: 18, duration: 5, ease: "sine.inOut", repeat: rep(dur, 5) }, at);
  }
  function pulse(el, at, dur, times, o) {
    o = o || {};
    times.forEach(function (t, i) {
      tl.fromTo(el, { opacity: 0.14 }, { opacity: o.peak || 0.3, duration: 0.16, ease: "power2.out" }, at + t);
      tl.to(el, { opacity: 0.14, duration: o.tail || 0.4, ease: "power1.out" }, at + t + 0.16 + i * 0.001);
    });
  }

  /* ---------------------------------------------------------- per type */
  var ANIM = {

    cold: function (el, s, at, dur) {
      var ghost = el.querySelector(".cold-ghost");
      var rule = el.querySelector(".cold-rule");
      var eyebrow = el.querySelector(".cold-eyebrow");
      var title = el.querySelector(".cold-title");
      var sub = el.querySelector(".cold-sub");
      var chips = q(el, ".chip");
      amb(ghost, dur, at);
      if (at === 0) {
        /* frame 0 must already read as a title card */
        tl.fromTo(ghost, { opacity: 0.45, scale: 1.05, x: 30 }, { opacity: 1, scale: 1, x: 0, duration: 2.6, ease: E.expo }, 0);
        tl.fromTo(rule, { scaleX: 0.18 }, { scaleX: 1, duration: 1.5, ease: E.expo }, 0.05);
        tl.fromTo(q(title, ".wi"), { opacity: 1, scale: 1.045 }, { opacity: 1, scale: 1, duration: 2.4, ease: E.expo, stagger: 0.025 }, 0);
        if (sub) tl.fromTo(sub, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.9, ease: E.soft }, 0.85);
        tl.fromTo(chips, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: E.soft }, 1.15);
        return;
      }
      tl.fromTo(ghost, { scale: 1.1, opacity: 0, x: 60 }, { scale: 1, opacity: 1, x: 0, duration: 2.4, ease: E.expo }, at);
      tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: E.expo }, at + 0.15);
      fade(eyebrow, at + 0.2, { y: 14, dur: 0.6 });
      words(title, at + 0.35, { stagger: 0.055, dur: 0.95 });
      fade(sub, at + 0.8, { dur: 0.8 });
      tl.fromTo(chips, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: E.soft }, at + 1.05);
    },

    hero: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      words(el.querySelector(".hero-title"), at + 0.1, { stagger: 0.05, dur: 0.9 });
      fade(el.querySelector(".hero-sub"), at + 0.55, { dur: 0.7 });
      tl.fromTo(el.querySelector(".hero-mark"), { opacity: 0, x: 40, scale: 0.94 }, { opacity: 1, x: 0, scale: 1, duration: 1.2, ease: E.expo }, at + 0.15);
      tl.fromTo(el.querySelector(".hero-baseline"), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: E.expo }, at + 0.3);
      amb(el.querySelector(".hero-mark"), dur, at);
    },

    statement: function (el, s, at, dur) {
      if (el.querySelector(".eyebrow")) fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      words(el.querySelector(".statement"), at + 0.06, { stagger: 0.042, dur: 0.85, x: s.variant === 2 ? 34 : s.variant === 1 ? -34 : 0 });
      if (el.querySelector(".st-sub")) fade(el.querySelector(".st-sub"), at + 0.42, { dur: 0.7 });
      if (el.querySelector(".st-ghost")) tl.fromTo(el.querySelector(".st-ghost"), { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 1.8, ease: E.expo }, at);
      var ticks = q(el, ".st-tickrow span");
      tl.fromTo(ticks, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.5, stagger: 0.07, ease: E.soft }, at + 0.6);
      amb(el.querySelector(".st-ghost"), dur, at);
    },

    stat: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var num = el.querySelector(".stat-number");
      tl.fromTo(el.querySelector(".stat-main"), { y: 46, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: E.expo }, at + 0.05);
      countUp(num, at + 0.25, { duration: Math.min(2.1, Math.max(1.1, dur * 0.3)) });
      tl.fromTo(el.querySelector(".stat-label"), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: E.soft }, at + 0.5);
      if (el.querySelector(".stat-sub")) fade(el.querySelector(".stat-sub"), at + 0.65, { dur: 0.7 });
      tl.fromTo(el.querySelector(".stat-ruler"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, at + 0.4);
      tl.fromTo(el.querySelector(".stat-ruler-fill"), { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power2.inOut" }, at + 0.5);
      if (el.querySelector(".stat-ghost")) tl.fromTo(el.querySelector(".stat-ghost"), { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 2, ease: E.expo }, at);
      amb(el.querySelector(".stat-ghost"), dur, at);
    },

    dateline: function (el, s, at, dur) {
      tl.fromTo(el.querySelector(".dl-date"), { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: E.expo }, at);
      tl.fromTo(el.querySelector(".dl-day"), { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: E.expo }, at + 0.05);
      tl.fromTo(q(el, ".dl-mon, .dl-yr"), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: E.soft }, at + 0.3);
      fade(el.querySelector(".eyebrow"), at + 0.15, { y: 12, dur: 0.55 });
      words(el.querySelector(".dl-title"), at + 0.2, { stagger: 0.04, dur: 0.82 });
      if (el.querySelector(".dl-sub")) fade(el.querySelector(".dl-sub"), at + 0.55, { dur: 0.7 });
      tl.fromTo(el.querySelector(".dl-rail span"), { scaleX: 0 }, { scaleX: 1, duration: 1.5, ease: "power2.inOut" }, at + 0.3);
      amb(el.querySelector(".dl-date"), dur, at);
    },

    code: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      tl.fromTo(el.querySelector(".code-shell"), { y: 34, opacity: 0, scale: 0.985 }, { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: E.expo }, at + 0.05);
      var lines = q(el, ".cl");
      tl.fromTo(lines, { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.09, ease: E.soft }, at + 0.25);
      var key = el.querySelector(".cl.is-key");
      if (key) {
        tl.fromTo(key, { borderLeftColor: "rgba(0,0,0,0)", backgroundColor: "rgba(0,0,0,0)" },
          { borderLeftColor: ac(s), duration: 0.3 }, at + 0.3 + lines.length * 0.09);
        tl.fromTo(el.querySelector(".code-scan"), { opacity: 0 }, { opacity: 0.5, duration: 0.25 }, at + 1.1);
        tl.fromTo(el.querySelector(".code-scan"), { y: 0 }, { y: Math.max(120, lines.length * 52), duration: 1.0, ease: "power1.inOut" }, at + 1.1);
        tl.to(el.querySelector(".code-scan"), { opacity: 0, duration: 0.35 }, at + 2.1);
      }
      var call = el.querySelector(".code-callout");
      if (call) tl.fromTo(call, { clipPath: "inset(0 100% 0 0)", opacity: 1 }, { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "steps(28)" }, at + 0.5);
      if (el.querySelector(".code-sub")) fade(el.querySelector(".code-sub"), at + 0.7, { dur: 0.6 });
      tl.fromTo(el.querySelector(".code-shell"), { rotateX: 2 }, { rotateX: 0, duration: 1.4, ease: E.soft, transformPerspective: 1200 }, at + 0.05);
    },

    diff: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      tl.fromTo(el.querySelector(".diff-shell"), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: E.expo }, at + 0.05);
      var lines = q(el, ".df-line");
      tl.fromTo(lines, { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.075, ease: E.soft }, at + 0.2);
      var add = q(el, ".df-add");
      if (add.length) tl.fromTo(add, { backgroundColor: "rgba(45,212,191,0)" }, { backgroundColor: "rgba(45,212,191,0.09)", duration: 0.6, stagger: 0.1 }, at + 0.6);
      var call = el.querySelector(".code-callout");
      if (call) tl.fromTo(call, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: "steps(24)" }, at + 0.55);
      if (el.querySelector(".code-sub")) fade(el.querySelector(".code-sub"), at + 0.8, { dur: 0.6 });
    },

    flow: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var nodes = q(el, ".flow-node");
      tl.fromTo(nodes, { y: 40, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.75, stagger: 0.12, ease: E.expo }, at + 0.1);
      var paths = q(el, ".fl-p");
      draw(paths, at + 0.5, { dur: 0.6, stagger: 0.1 });
      var arr = q(el, ".fl-a");
      arr.forEach(function (a, i) { tl.fromTo(a, { opacity: 0 }, { opacity: 1, duration: 0.3 }, at + 0.9 + i * 0.1); });
      if (el.querySelector(".flow-cap")) fade(el.querySelector(".flow-cap"), at + 0.55, { dur: 0.7 });
      if (el.querySelector(".flow-sub")) fade(el.querySelector(".flow-sub"), at + 0.7, { dur: 0.6 });
      var railEl = el.querySelector(".flow-rail");
      var packet = el.querySelector(".flow-packet");
      if (railEl && packet) {
        tl.fromTo(railEl, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.9, ease: E.expo }, at + 0.3);
        tl.fromTo(packet, { x: 0, opacity: 0 }, { opacity: 1, duration: 0.2 }, at + 0.9);
        tl.to(packet, { x: 1660, duration: Math.max(1.4, Math.min(4, dur * 0.45)), ease: "power2.inOut" }, at + 1.0);
        tl.to(packet, { opacity: 0, duration: 0.25 }, at + 1.0 + Math.max(1.4, Math.min(4, dur * 0.45)));
      }
      amb(nodes[0], dur, at);
    },

    ledger: function (el, s, at, dur) {
      tl.fromTo(el.querySelector(".lg-card"), { x: -46, opacity: 0, rotateY: 6 }, { x: 0, opacity: 1, rotateY: 0, duration: 0.95, ease: E.expo, transformPerspective: 1200 }, at);
      var rows = q(el, ".lg-row");
      tl.fromTo(rows, { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.11, ease: E.soft }, at + 0.25);
      fade(el.querySelector(".eyebrow"), at + 0.2, { y: 12, dur: 0.55 });
      words(el.querySelector(".lg-title"), at + 0.3, { stagger: 0.04, dur: 0.8 });
      if (el.querySelector(".lg-sub")) fade(el.querySelector(".lg-sub"), at + 0.65, { dur: 0.7 });
      var pts = q(el, ".lg-pt");
      tl.fromTo(pts, { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.09, ease: E.soft }, at + 0.8);
      var stamp = el.querySelector(".lg-stamp");
      if (stamp) {
        tl.fromTo(stamp, { opacity: 0, scale: 2.1, rotate: -18 }, { opacity: 1, scale: 1, rotate: -7, duration: 0.34, ease: "back.out(2.4)" }, at + Math.min(dur * 0.55, 3.4));
      }
      amb(el.querySelector(".lg-card"), dur, at);
    },

    memory: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var cells = q(el, ".mc");
      var count = el.querySelector(".mem-n");
      var n = parseInt((count && count.getAttribute("data-n")) || "2", 10);
      tl.fromTo(el.querySelector(".mem-shell"), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: E.expo }, at + 0.04);
      tl.fromTo(cells, { scale: 0.86, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, stagger: 0.055, ease: "back.out(1.7)" }, at + 0.2);
      var live = cells.slice(0, n);
      tl.fromTo(live.map(function (c) { return c.querySelector(".mc-b"); }), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.12 }, at + 0.7);
      tl.fromTo(live, { borderColor: "rgba(255,255,255,.11)" }, { borderColor: ac(s), duration: 0.3, stagger: 0.12 }, at + 0.7);
      if (count) {
        var cp = { v: 0 };
        tl.to(cp, {
          v: n, duration: 0.8, ease: "none",
          onUpdate: function () { count.textContent = String(Math.round(cp.v)); },
        }, at + 0.6);
      }
      var bad = cells.filter(function (c) { return c.classList.contains("is-bad"); })[0];
      if (bad) {
        tl.fromTo(bad, { opacity: 0.25 }, { opacity: 1, duration: 0.12, repeat: 5, yoyo: true }, at + Math.min(dur * 0.5, 3.2));
        tl.to(bad, { boxShadow: "0 0 34px -2px rgba(255,92,114,.85)", duration: 0.4 }, at + Math.min(dur * 0.5, 3.2) + 0.7);
      }
      var ptr = el.querySelector(".mem-ptr");
      if (ptr) {
        tl.fromTo(ptr, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5 }, at + 1.0);
        draw(q(ptr, "path"), at + 1.05, { dur: 0.6 });
      }
      tl.fromTo(el.querySelector(".mem-side"), { x: 36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.85, ease: E.expo }, at + 0.2);
      words(el.querySelector(".mem-title"), at + 0.35, { stagger: 0.04, dur: 0.8 });
      if (el.querySelector(".mem-sub")) fade(el.querySelector(".mem-sub"), at + 0.7, { dur: 0.7 });
    },

    timeline: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      words(el.querySelector(".tl-head"), at + 0.05, { stagger: 0.04, dur: 0.8 });
      tl.fromTo(el.querySelector(".tl-line"), { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.85, ease: E.expo }, at + 0.35);
      var fill = el.querySelector(".tl-line-fill");
      tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: Math.max(2.2, dur * 0.52), ease: "power2.inOut" }, at + 0.6);
      tl.fromTo(el.querySelector(".tl-play"), { x: 0 }, { x: 1664, duration: Math.max(2.2, dur * 0.52), ease: "power2.inOut" }, at + 0.6);
      var evs = q(el, ".tl-ev");
      evs.forEach(function (e, i) {
        var t = at + 0.7 + (i / Math.max(1, evs.length)) * Math.max(1.6, dur * 0.46);
        tl.fromTo(e.querySelector(".tl-dot"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2.2)" }, t);
        tl.fromTo(e.querySelector(".tl-card"), { y: e.getBoundingClientRect ? 16 : 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: E.soft }, t + 0.06);
      });
      if (el.querySelector(".tl-sub")) fade(el.querySelector(".tl-sub"), at + 0.8, { dur: 0.7 });
    },

    terminal: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      tl.fromTo(el.querySelector(".tm-shell"), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: E.expo }, at);
      var lines = q(el, ".tm-line");
      lines.forEach(function (l, i) {
        var t = at + 0.25 + i * 0.42;
        tl.fromTo(l, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t);
        tl.fromTo(l.querySelector(".tm-t"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.34, ease: "steps(18)" }, t);
      });
      var cur = el.querySelector(".tm-cursor");
      if (cur) {
        var start = at + 0.3;
        tl.fromTo(cur, { opacity: 0 }, { opacity: 1, duration: 0.12, repeat: rep(Math.max(1.2, dur - 0.4), 0.9), yoyo: true }, start);
      }
      if (el.querySelector(".tm-title")) fade(el.querySelector(".tm-title"), at + 0.55, { dur: 0.7 });
      if (el.querySelector(".tm-sub")) fade(el.querySelector(".tm-sub"), at + 0.7, { dur: 0.7 });
    },

    compare: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      tl.fromTo(el.querySelector(".cmp-left"), { x: -54, opacity: 0 }, { x: 0, opacity: 0.72, duration: 0.9, ease: E.expo }, at + 0.02);
      tl.fromTo(el.querySelector(".cmp-right"), { x: 54, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: E.expo }, at + 0.06);
      tl.fromTo(el.querySelector(".cmp-mid"), { scale: 0, opacity: 0, rotate: -45 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.7, ease: "back.out(2.2)" }, at + 0.35);
      tl.fromTo(q(el, ".cmp-p"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.09, ease: E.soft }, at + 0.6);
      if (el.querySelector(".cmp-cap")) fade(el.querySelector(".cmp-cap"), at + 0.7, { dur: 0.65 });
      if (el.querySelector(".cmp-sub")) fade(el.querySelector(".cmp-sub"), at + 0.82, { dur: 0.65 });
    },

    stack: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      words(el.querySelector(".stk-title"), at + 0.08, { stagger: 0.04, dur: 0.82 });
      if (el.querySelector(".stk-sub")) fade(el.querySelector(".stk-sub"), at + 0.5, { dur: 0.7 });
      var layers = q(el, ".stk-layer");
      tl.fromTo(el.querySelector(".stk-stack"), { rotateX: 14, rotateY: -8, y: 40, opacity: 0 }, { rotateX: 0, rotateY: 0, y: 0, opacity: 1, duration: 1.2, ease: E.expo, transformPerspective: 1600 }, at + 0.1);
      tl.fromTo(layers, { z: -80, opacity: 0 }, { z: 0, opacity: 1, duration: 0.7, stagger: 0.12, ease: E.out }, at + 0.25);
      var hot = el.querySelector(".stk-layer.is-hot");
      if (hot) tl.fromTo(hot, { borderColor: "rgba(255,255,255,.11)" }, { borderColor: ac(s), duration: 0.4 }, at + 1.4);
    },

    quote: function (el, s, at, dur) {
      tl.fromTo(el.querySelector(".q-mark"), { opacity: 0, scale: 0.8, y: 20 }, { opacity: 0.1, scale: 1, y: 0, duration: 1.2, ease: E.expo }, at);
      words(el.querySelector(".q-text"), at + 0.08, { stagger: 0.035, dur: 0.85 });
      fade(el.querySelector(".q-by"), at + 0.6, { dur: 0.7 });
      tl.fromTo(el.querySelector(".q-line"), { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.8, ease: E.expo }, at + 0.5);
    },

    matrix: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      words(el.querySelector(".mx-title"), at + 0.05, { stagger: 0.038, dur: 0.8 });
      if (el.querySelector(".mx-sub")) fade(el.querySelector(".mx-sub"), at + 0.45, { dur: 0.7 });
      fade(el.querySelector(".mx-legend"), at + 0.6, { dur: 0.6 });
      var cells = q(el, ".mx-c");
      var bad = [];
      cells.forEach(function (c, i) {
        /* deterministic sparse pattern: seeded by index */
        var h = (i * 2654435761) % 100;
        if (h < 26) c.classList.add("is-bad");
        if (c.classList.contains("is-bad")) bad.push(c);
      });
      tl.fromTo(cells, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.5, stagger: { each: 0.004, from: "center", grid: "auto" }, ease: "power2.out" }, at + 0.15);
      tl.fromTo(bad, { backgroundColor: "rgba(255,255,255,.055)" }, { backgroundColor: ac(s), duration: 0.3, stagger: { each: 0.012, from: "start" } }, at + 1.1);
      tl.fromTo(bad, { boxShadow: "0 0 0px rgba(0,0,0,0)" }, { boxShadow: "0 0 12px -2px " + ac(s), duration: 0.4, stagger: 0.012 }, at + 1.1);
      if (el.querySelector(".mx-count")) fade(el.querySelector(".mx-count"), at + 0.9, { dur: 0.6 });
    },

    webref: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var shell = el.querySelector(".web-shell");
      if (shell) {
        tl.fromTo(shell, { y: 35, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.75, ease: E.expo }, at + 0.05);
      }
      var ps = q(el, ".web-p");
      if (ps.length) {
        tl.fromTo(ps, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: E.soft }, at + 0.25);
      }
      var callout = el.querySelector(".web-callout");
      if (callout) {
        tl.fromTo(callout, { opacity: 0, scale: 0.94, x: -10 }, { opacity: 1, scale: 1, x: 0, duration: 0.65, ease: "back.out(1.4)" }, at + 0.45);
      }
      var cursor = el.querySelector(".web-cursor");
      if (cursor) {
        tl.fromTo(cursor, { opacity: 0, x: 120, y: 80 }, { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "power2.out" }, at + 0.35);
        tl.to(cursor, { scale: 0.82, duration: 0.16, ease: "power2.inOut", yoyo: true, repeat: 1 }, at + 1.2);
      }
      words(el.querySelector(".web-foot-title"), at + 0.2, { stagger: 0.04, dur: 0.8 });
      if (el.querySelector(".web-foot-sub")) fade(el.querySelector(".web-foot-sub"), at + 0.6, { dur: 0.65 });
    },

    meme: function (el, s, at, dur) {
      amb(el.querySelector(".meme-ghost"), dur, at);
      fade(el.querySelector(".meme-badge"), at, { y: 10, dur: 0.4 });
      var card = el.querySelector(".meme-card");
      if (card) {
        tl.fromTo(card, { scale: 0.82, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.42, ease: "back.out(1.6)" }, at + 0.05);
      }
      var stage = el.querySelector(".meme-stage");
      if (stage) {
        /* Fireship comic impact shake */
        tl.to(stage, { x: -8, y: 4, duration: 0.06, ease: "power1.inOut" }, at + 0.08);
        tl.to(stage, { x: 7, y: -5, duration: 0.06, ease: "power1.inOut" }, at + 0.14);
        tl.to(stage, { x: -4, y: 2, duration: 0.06, ease: "power1.inOut" }, at + 0.20);
        tl.to(stage, { x: 0, y: 0, duration: 0.08, ease: "power1.out" }, at + 0.26);
      }
      var glitch = el.querySelector(".meme-glitch-bar");
      if (glitch) {
        tl.fromTo(glitch, { y: 0, opacity: 0 }, { y: 340, opacity: 0.8, duration: 0.7, ease: "none", repeat: rep(dur, 0.7) }, at + 0.1);
      }
      words(el.querySelector(".meme-caption"), at + 0.18, { stagger: 0.038, dur: 0.65 });
      if (el.querySelector(".meme-sub")) fade(el.querySelector(".meme-sub"), at + 0.5, { dur: 0.6 });
    },

    cloud: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      fade(el.querySelector(".cloud-header"), at + 0.05, { y: 10, dur: 0.5 });
      var nodes = q(el, ".cloud-node");
      tl.fromTo(nodes, { y: 30, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.12, ease: E.expo }, at + 0.15);
      var paths = q(el, ".cld-path");
      draw(paths, at + 0.35, { stagger: 0.15, dur: 0.6 });
      var packet = el.querySelector(".cloud-packet");
      if (packet) {
        tl.fromTo(packet, { x: 0 }, { x: 1540, duration: 1.8, ease: "none", repeat: rep(dur, 1.8) }, at + 0.4);
      }
      words(el.querySelector(".cloud-title"), at + 0.2, { stagger: 0.038, dur: 0.8 });
      if (el.querySelector(".cloud-sub")) fade(el.querySelector(".cloud-sub"), at + 0.6, { dur: 0.65 });
    },

    mascot: function (el, s, at, dur) {
      var hud = el.querySelector(".mascot-hud-frame");
      if (hud) {
        tl.fromTo(hud, { x: -40, opacity: 0, scale: 0.92 }, { x: 0, opacity: 1, scale: 1, duration: 0.85, ease: E.expo }, at + 0.05);
        tl.to(hud, { y: -8, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: rep(dur, 4.4) }, at + 0.8);
      }
      var bubble = el.querySelector(".mascot-bubble-box");
      if (bubble) {
        tl.fromTo(bubble, { scale: 0.88, opacity: 0, x: 20 }, { scale: 1, opacity: 1, x: 0, duration: 0.6, ease: "back.out(1.4)" }, at + 0.2);
      }
      words(el.querySelector(".mascot-bubble-text"), at + 0.3, { stagger: 0.04, dur: 0.75 });
      if (el.querySelector(".mascot-sub")) fade(el.querySelector(".mascot-sub"), at + 0.65, { dur: 0.65 });
      var statItems = q(el, ".mst-item");
      if (statItems.length) {
        tl.fromTo(statItems, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: E.soft }, at + 0.6);
      }
    },

    outro: function (el, s, at, dur) {
      tl.fromTo(el.querySelector(".out-ghost"), { opacity: 0, scale: 1.08, x: 40 }, { opacity: 1, scale: 1, x: 0, duration: 2.2, ease: E.expo }, at);
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      words(el.querySelector(".out-title"), at + 0.1, { stagger: 0.05, dur: 0.9 });
      if (el.querySelector(".out-sub")) fade(el.querySelector(".out-sub"), at + 0.5, { dur: 0.75 });
      fade(el.querySelector(".out-cta"), at + 0.85, { dur: 0.7 });
      fade(el.querySelector(".out-ch"), at + 1.05, { dur: 0.7 });
    },
  };

  /* ---------------------------------------------------------- build */
  gsap.set(".sc-in", { transformOrigin: "50% 45%" });

  SCENES.forEach(function (s, i) {
    var el = document.getElementById("s" + String(i + 1).padStart(3, "0"));
    if (!el) return;
    var at = s.start;
    var dur = s.end - s.start;

    /* accent for shared bloom */
    tl.to(":root", { "--ac": s.accent || "#38bdf8", duration: 1.2, ease: "sine.inOut" }, at);

    /* slow camera push keeps every frame alive */
    tl.fromTo(el.querySelector(".sc-in"), { scale: 1 }, { scale: 1.014, duration: Math.max(1, dur), ease: "none" }, at);

    /* Fireship punch zoom on punch beats */
    if (s.punch) {
      tl.fromTo(el.querySelector(".sc-in"), { scale: 1.05 }, { scale: 1.014, duration: 0.38, ease: "power4.out" }, at);
    }

    /* Universal Mascot Overlay */
    var mOv = el.querySelector(".m-ov");
    if (mOv) {
      tl.fromTo(mOv, { y: 60, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.5)" }, at + 0.15);
      var mBubble = mOv.querySelector(".m-ov-bubble");
      if (mBubble) {
        tl.fromTo(mBubble, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.3)" }, at + 0.3);
      }
      var mRing = mOv.querySelector(".m-ov-ring");
      if (mRing) {
        tl.to(mRing, { opacity: 0.8, scale: 1.08, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: rep(dur, 1.4) }, at + 0.2);
      }
    }

    /* cut rail rhythm - every scene, subtler on minor beats */
    rail(at, i % 6 === 0 ? 0.72 : 0.38);

    var fn = ANIM[s.type] || ANIM.statement;
    fn(el, s, at, dur);

    /* mid-scene camera beat so long holds never go static */
    if (dur > 7.5) {
      var beatAt = at + Math.max(2.4, dur * 0.52);
      tl.to(el.querySelector(".sc-in"), { y: -9, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: 1 }, beatAt);
      tl.to(el.querySelector(".amb"), { opacity: 0.2, duration: 0.9, ease: "sine.out" }, beatAt);
      tl.to(el.querySelector(".amb"), { opacity: 0.1, duration: 1.2, ease: "sine.in" }, beatAt + 0.9);
    }
    if (dur > 10.5) {
      var beat2 = at + dur * 0.78;
      tl.to(el.querySelector(".amb"), { opacity: 0.24, duration: 0.8, ease: "sine.out" }, beat2);
      tl.to(el.querySelector(".amb"), { opacity: 0.1, duration: 1.4, ease: "sine.in" }, beat2 + 0.8);
    }
  });

  /* final fade at the very end */
  tl.to("#bg-vignette", { opacity: 1, duration: 0.6 }, Math.max(0, TOTAL - 0.8));

  window.__timelines = window.__timelines || {};
  window.__timelines["__COMPOSITION_ID__"] = tl;
})();
