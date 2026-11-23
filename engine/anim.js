/* Deterministic scene choreography. One paused timeline owns every pixel. */
(function () {
  // Measure evidence geometry only after local fonts have settled. Font metrics
  // can otherwise move the viewport after its root-level video was positioned.
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
  var SCENES = window.__SCENES__;
  var TOTAL = window.__TOTAL__;
  var tl = gsap.timeline({ paused: true });
  gsap.config({ nullTargetWarn: false });

  var E = {
    out: "power4.out",
    soft: "power3.out",
    inOut: "power2.inOut",
    expo: "expo.out",
    spring: "power3.out",
    springSubtle: "power3.out",
    cinematic: "sine.inOut",
    smooth: "power2.out",
  };

  function q(el, sel) { return el ? Array.prototype.slice.call(el.querySelectorAll(sel)) : []; }
  // Repeats needed to fill a window. GSAP counts repeat against the tween's own
  // duration, so a yoyo caller must pass its full round trip and get twice as
  // many legs. Floor also dropped the partial cycle, which froze decorative
  // loops (ring, bob, glare, packets) for the tail of their scene.
  function rep(dur, cycle) { return Math.max(0, Math.ceil(dur / cycle) - 1); }
  // Same, for yoyo tweens whose repeat counts duration legs, not round trips.
  function repYoyo(dur, roundTrip) { return rep(dur, roundTrip) * 2 + 1; }
  function ac(s) { return s.accent || "#38bdf8"; }

  /* ---------------------------------------------------------- backdrop */
  gsap.set("#bg-bloom", { xPercent: -50, yPercent: -50, x: 0, y: 0 });
  tl.to("#bg-grid", { x: -40, y: -24, duration: TOTAL, ease: "none" }, 0);
  tl.to("#bg-noise", { x: 90, y: -60, duration: TOTAL, ease: "none" }, 0);
  tl.to("#bg-grain", { x: -70, y: 80, duration: TOTAL, ease: "none" }, 0);
  tl.to(":root", { duration: 1.8, ease: "sine.inOut" }, 0);

  /* ---------------------------------------------------------- audio-visual haptics (sfx engine) */
  // Index-based noise keeps each procedural buffer repeatable across workers.
  function noiseSample(index) {
    var n = Math.imul(index + 1, 374761393);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 2147483648 - 1;
  }
  // Scheduling is shared by build-time offline synthesis and the exported track.
  var sfxEvents = [];
  window.__SFX_EVENTS__ = sfxEvents;
  function playSFX(type, opt, ctx) {
    var t = 0;
    opt = opt || {};

    if (type === "whoosh") {
      // Clean air whoosh on camera transitions
      var bufferSize = ctx.sampleRate * 0.22;
      var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) { data[i] = noiseSample(i); }
      var noise = ctx.createBufferSource();
      noise.buffer = buffer;
      var filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.exponentialRampToValueAtTime(1400, t + 0.1);
      filter.frequency.exponentialRampToValueAtTime(200, t + 0.22);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.12 * (opt.vol == null ? 1 : opt.vol), t + 0.08);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.22);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
    } else if (type === "thud") {
      // Sub-bass impact thud for stat reveals & punch cuts
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.28);
      g.gain.setValueAtTime(0.28 * (opt.vol == null ? 1 : opt.vol), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    } else if (type === "click") {
      // Crisp mechanical keyclick for terminal typing
      var o = ctx.createOscillator();
      var g2 = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(1600, t);
      o.frequency.exponentialRampToValueAtTime(200, t + 0.03);
      g2.gain.setValueAtTime(0.08 * (opt.vol == null ? 1 : opt.vol), t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      o.connect(g2);
      g2.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.04);
    } else if (type === "chime") {
      // Cyber telemetry chime on badge reveals / mascot pop
      var o3 = ctx.createOscillator();
      var g3 = ctx.createGain();
      o3.type = "sine";
      o3.frequency.setValueAtTime(880, t);
      o3.frequency.setValueAtTime(1320, t + 0.06);
      g3.gain.setValueAtTime(0.07 * (opt.vol == null ? 1 : opt.vol), t);
      g3.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o3.connect(g3);
      g3.connect(ctx.destination);
      o3.start(t);
      o3.stop(t + 0.24);
    } else if (type === "swipe") {
      // Felt highlighter marker sweep sound
      var bufferSize = Math.floor(ctx.sampleRate * 0.16);
      var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) { data[i] = (noiseSample(i)) * 0.5; }
      var noise = ctx.createBufferSource();
      noise.buffer = buffer;
      var filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.linearRampToValueAtTime(3200, t + 0.12);
      filter.Q.setValueAtTime(2.5, t);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.09 * (opt.vol == null ? 1 : opt.vol), t + 0.05);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.16);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
    } else if (type === "unmask") {
      // Forensic redaction peel & razor unmask chirp
      var o4 = ctx.createOscillator();
      var g4 = ctx.createGain();
      o4.type = "sawtooth";
      o4.frequency.setValueAtTime(1800, t);
      o4.frequency.exponentialRampToValueAtTime(420, t + 0.14);
      var f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(2800, t);
      g4.gain.setValueAtTime(0.12 * (opt.vol == null ? 1 : opt.vol), t);
      g4.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o4.connect(f);
      f.connect(g4);
      g4.connect(ctx.destination);
      o4.start(t);
      o4.stop(t + 0.16);
    } else if (type === "flare") {
      // High-frequency optical refraction ping & sub-bass shimmer
      var o5 = ctx.createOscillator();
      var g5 = ctx.createGain();
      o5.type = "sine";
      o5.frequency.setValueAtTime(2400, t);
      o5.frequency.exponentialRampToValueAtTime(320, t + 0.28);
      g5.gain.setValueAtTime(0.08 * (opt.vol == null ? 1 : opt.vol), t);
      g5.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o5.connect(g5);
      g5.connect(ctx.destination);
      o5.start(t);
      o5.stop(t + 0.3);
    } else if (type === "decrypt") {
      // Rapid cyber matrix decryption data-chatter
      var o6 = ctx.createOscillator();
      var g6 = ctx.createGain();
      o6.type = "sawtooth";
      o6.frequency.setValueAtTime(1400, t);
      o6.frequency.linearRampToValueAtTime(2200, t + 0.08);
      g6.gain.setValueAtTime(0.035 * (opt.vol == null ? 1 : opt.vol), t);
      g6.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o6.connect(g6);
      g6.connect(ctx.destination);
      o6.start(t);
      o6.stop(t + 0.1);
    } else if (type === "tick") {
      // Crisp mechanical odometer tick
      var o7 = ctx.createOscillator();
      var g7 = ctx.createGain();
      o7.type = "triangle";
      o7.frequency.setValueAtTime(950, t);
      o7.frequency.exponentialRampToValueAtTime(150, t + 0.015);
      g7.gain.setValueAtTime(0.04 * (opt.vol == null ? 1 : opt.vol), t);
      g7.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
      o7.connect(g7);
      g7.connect(ctx.destination);
      o7.start(t);
      o7.stop(t + 0.02);
    }
  }

  function queueSFX(type, at, opt) {
    if (Number.isFinite(at) && at >= 0 && at < TOTAL) {
      sfxEvents.push({ type: type, at: at, vol: opt && opt.vol != null ? opt.vol : 1 });
    }
  }

  // Render each sound once; Node places these samples at the exact cue times.
  window.__synthesizeSFX = async function () {
    var clips = {};
    for (var type of new Set(sfxEvents.map(function (e) { return e.type; }))) {
      var ctx = new OfflineAudioContext(1, 16800, 48000);
      playSFX(type, { vol: 1 }, ctx);
      var buffer = await ctx.startRendering();
      clips[type] = Array.from(buffer.getChannelData(0));
    }
    return { events: sfxEvents, clips: clips };
  };

  /* ---------------------------------------------------------- helpers */
  function normTok(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function words(el, at, opts) {
    var o = opts || {};
    var allNodes = q(el, ".wi");
    if (!allNodes.length) return;
    var nodes = allNodes.filter(function (n) {
      return !n.closest(".forensic-redact");
    });
    if (!nodes.length) return;

    /* Reveal words without changing their layout or overshooting. */
    var revealDur = o.dur || 0.82;
    var staggerVal = o.stagger || 0.038;
    tl.fromTo(nodes,
      { yPercent: 70, opacity: 0, x: o.x || 0 },
      { yPercent: 0, opacity: 1, x: 0, duration: revealDur, ease: E.expo, stagger: staggerVal },
      at);

    // Narration matches do not restyle ordinary words during their readable hold.
    // Intentional emphasis belongs to authored highlights and redactions below.
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
    var output = node.querySelector(".stat-value") || node;
    output.textContent = fmt(from);
    var p = { v: from };
    var countDur = o.duration || o.dur || 1.4;

    /* Monotonic count with a fixed-width final-value reserve. */
    tl.to(p, {
      v: to,
      duration: countDur,
      ease: o.ease || "power3.out",
      onUpdate: function () {
        output.textContent = fmt(p.v);
      },
    }, at);

    /* Acoustic tick intervals */
    var tickSteps = 8;
    for (var k = 0; k < tickSteps; k++) {
      var tickTime = at + (k / tickSteps) * (countDur * 0.75);
      queueSFX("tick", tickTime, { vol: 0.7 });
    }
  }
  function rail(at, strength) {
    tl.fromTo("#cut-rail", { x: 0, opacity: 0 }, { x: 1980, opacity: strength || 0.5, duration: 0.22, ease: "power2.in" }, at);
    tl.to("#cut-rail", { opacity: 0, duration: 0.2, ease: "power1.out" }, at + 0.2);
  }
  function triggerFlare(at, opt) {
    opt = opt || {};
    var flare = document.getElementById("bg-flare");
    if (!flare) return;
    var dur = opt.dur || 0.42;
    var root = document.getElementById("root");
    var yPos = (opt.y == null ? 540 : opt.y) * ((root && root.clientHeight) || 1080) / 1080;
    var xPos = (opt.x == null ? 960 : opt.x) * ((root && root.clientWidth) || 1920) / 1920;
    var rot = opt.rot == null ? (Math.round(at * 30) % 2 ? -1.8 : 1.5) : opt.rot;
    var core = flare.querySelector(".flare-core");
    var halo = flare.querySelector(".flare-halo");
    var streak = flare.querySelector(".flare-streak");
    var streakSub = flare.querySelector(".flare-streak-sub");

    if (core) tl.set(core, { x: xPos, y: yPos, xPercent: -50, yPercent: -50 }, at);
    if (halo) tl.set(halo, { x: xPos, y: yPos, xPercent: -50, yPercent: -50 }, at);
    if (streak) tl.set(streak, { top: yPos, rotate: rot }, at);
    if (streakSub) tl.set(streakSub, { top: yPos, rotate: rot * 0.7 }, at);

    tl.fromTo(flare,
      { opacity: 0, scaleY: 0.2 },
      { opacity: Math.min(0.45, opt.intensity || 0.4), scaleY: 1.0, duration: 0.08, ease: "power2.out" },
      at
    );
    tl.to(flare,
      { opacity: 0, scaleY: 0.4, duration: dur - 0.08, ease: "power3.in" },
      at + 0.08
    );
    queueSFX("flare", at, { vol: 0.9 });
  }
  function cutTransition(s, previousS, at, i, dur) {
    if (i === 0 || s.type === "stat") return;
    // Keep the shared backdrop continuous. Scene choreography supplies the
    // motion; flashes and sweeping rails obscure evidence at the cut.
    if (s.act && previousS && s.act !== previousS.act) {
      queueSFX("whoosh", at, { vol: 0.32 });
      tl.to(":root", { "--ac": s.accent || "#38bdf8", duration: 0.7, ease: "power2.inOut" }, at);
    }
  }
  function amb(el, dur, at) {
    if (!el) return;
    // Begin after the longest entrance, with no repeating reset or competing tween.
    var delay = 2.6;
    if (dur <= delay) return;
    // Force a composited layer. A plain sub-pixel translate re-rasterizes the
    // outlined ghost glyphs every frame, which reads as shimmer on large text.
    tl.to(el, { x: 12, duration: dur - delay, ease: "sine.inOut", force3D: true }, at + delay);
  }
  function pulse(el, at, dur, times, o) {
    o = o || {};
    times.forEach(function (t, i) {
      tl.fromTo(el, { opacity: 0.14 }, { opacity: o.peak || 0.3, duration: 0.16, ease: "power2.out" }, at + t);
      tl.to(el, { opacity: 0.14, duration: o.tail || 0.4, ease: "power1.out" }, at + t + 0.16 + i * 0.001);
    });
  }

  /* ---------------------------------------------------------- forensic animations */
  function forensicAnimations(container, at, dur, s) {
    if (!container) return;

    // 1. Live Highlighter Markers
    var hlMarkers = q(container, ".hl-marker");
    hlMarkers.forEach(function (m, idx) {
      var ink = m.querySelector(".hl-ink");
      if (!ink) return;

      gsap.set(ink, { scaleX: 0, opacity: 0, transformOrigin: "left center" });

      var rawTarget = m.getAttribute("data-hl") || m.textContent;
      var hlTarget = normTok(rawTarget);
      var targetTime = at + Math.min(dur * 0.45, 0.45 + idx * 0.4);
      var swipeDur = 0.45;

      if (s && s.wordTimings && s.wordTimings.length) {
        for (var k = 0; k < s.wordTimings.length; k++) {
          var wt = s.wordTimings[k];
          var wtText = normTok(wt.w);
          if (wtText && wtText.length >= 3 && hlTarget.indexOf(wtText) !== -1) {
            targetTime = at + Math.max(0.2, wt.t);
            swipeDur = Math.max(0.32, Math.min(1.0, (wt.d || 0.35) * 1.8));
            break;
          }
        }
      }

      tl.to(ink, {
        scaleX: 1,
        opacity: 1,
        duration: swipeDur,
        ease: "power2.out"
      }, targetTime);

      queueSFX("swipe", targetTime, { vol: 0.85 });

      var wordsInside = q(m, ".wi");
      if (wordsInside.length) {
        tl.to(wordsInside, {
          color: "#ffffff",
          textShadow: "0 0 16px rgba(255,255,255,0.7), 0 0 28px " + ac(s),
          duration: 0.25,
          ease: "power2.out"
        }, targetTime + 0.05);
      }
    });

    // 2. Forensic Redactions
    var redacts = q(container, ".forensic-redact");
    redacts.forEach(function (r, idx) {
      var tape = r.querySelector(".redact-tape");
      var laser = r.querySelector(".redact-laser");
      var text = r.querySelector(".redact-text");
      if (!tape || !text) return;

      gsap.set(tape, { scaleX: 1, transformOrigin: "right center" });
      if (laser) gsap.set(laser, { opacity: 1, xPercent: 0 });
      gsap.set(text, { opacity: 0, filter: "blur(5px)" });

      var rawTarget = r.getAttribute("data-redact") || r.textContent;
      var redTarget = normTok(rawTarget);
      var revealTime = at + Math.min(dur * 0.65, 0.85 + idx * 0.6);

      if (s && s.wordTimings && s.wordTimings.length) {
        for (var k = 0; k < s.wordTimings.length; k++) {
          var wt = s.wordTimings[k];
          var wtText = normTok(wt.w);
          if (wtText && wtText.length >= 3 && redTarget.indexOf(wtText) !== -1) {
            revealTime = at + Math.max(0.25, wt.t);
            break;
          }
        }
      }

      if (laser) {
        tl.to(laser, {
          xPercent: 100,
          opacity: 0,
          duration: 0.38,
          ease: "power2.inOut"
        }, revealTime);
      }

      tl.to(tape, {
        scaleX: 0,
        duration: 0.38,
        ease: "power3.inOut"
      }, revealTime);

      tl.to(text, {
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.26,
        ease: "power2.out"
      }, revealTime + 0.08);

      queueSFX("unmask", revealTime, { vol: 1.1 });

      var wordsInside = q(text, ".wi");
      if (wordsInside.length) {
        tl.fromTo(wordsInside,
          { scale: 1.12, color: "#ffffff" },
          { scale: 1.0, color: "inherit", textShadow: "0 0 22px " + ac(s) + ", 0 0 36px " + ac(s), duration: 0.35, ease: E.springSubtle },
          revealTime + 0.1
        );
      }
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
      var wrap = el.querySelector(".cold-wrap");
      amb(ghost, dur, at);

      if (at === 0) {
        /* frame 0 must already read as a title card */
        /* Micro camera recoil punch: 1.042x -> 1.0x */
        if (wrap) tl.fromTo(wrap, { scale: 1.042 }, { scale: 1, duration: 0.42, ease: E.expo }, 0);
        queueSFX("thud", 0, { vol: 0.85 });

        /* Ghost chromatic aberration trace on drop */
        tl.fromTo(ghost, { opacity: 0.5, scale: 1.1, x: 45, rotateX: 4, filter: "drop-shadow(-8px 0 0 rgba(56,189,248,0.4)) drop-shadow(8px 0 0 rgba(255,59,92,0.4))" }, { opacity: 1, scale: 1, x: 0, rotateX: 0, filter: "drop-shadow(0 0 0 transparent)", duration: 1.8, ease: E.expo, transformPerspective: 1200 }, 0);
        
        /* Snappier stagger: rule & whoosh at 0.08s, subline at 0.22s, chips at 0.45s */
        tl.fromTo(rule, { scaleX: 0.18 }, { scaleX: 1, duration: 0.9, ease: E.expo }, 0.06);
        queueSFX("whoosh", 0.08, { vol: 0.45 });
        gsap.set(q(title, ".wi"), { opacity: 1 });
        tl.fromTo(title, { y: 14, opacity: 0.9 }, { y: 0, opacity: 1, duration: 0.7, ease: E.expo }, 0);
        if (sub) tl.fromTo(sub, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: E.soft }, 0.22);
        tl.fromTo(chips, { opacity: 0, y: 16, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.06, ease: E.springSubtle }, 0.45);
        if (chips.length) queueSFX("click", 0.45, { vol: 0.7 });
        return;
      }

      /* At non-zero cuts */
      if (wrap) tl.fromTo(wrap, { scale: 1.04 }, { scale: 1, duration: 0.4, ease: E.expo }, at);
      queueSFX("thud", at, { vol: 0.75 });
      tl.fromTo(ghost, { scale: 1.12, opacity: 0, x: 60, rotateX: 6, filter: "drop-shadow(-8px 0 0 rgba(56,189,248,0.4)) drop-shadow(8px 0 0 rgba(255,59,92,0.4))" }, { scale: 1, opacity: 1, x: 0, rotateX: 0, filter: "drop-shadow(0 0 0 transparent)", duration: 1.8, ease: E.expo, transformPerspective: 1200 }, at);
      tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: E.expo }, at + 0.08);
      queueSFX("whoosh", at + 0.08, { vol: 0.45 });
      fade(eyebrow, at + 0.12, { y: 12, dur: 0.5 });
      words(title, at + 0.2, { stagger: 0.04, dur: 0.7 }, s);
      fade(sub, at + 0.38, { dur: 0.6 });
      tl.fromTo(chips, { y: 16, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.06, ease: E.springSubtle }, at + 0.5);
      if (chips.length) queueSFX("click", at + 0.5, { vol: 0.7 });
    },

    hero: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      words(el.querySelector(".hero-title"), at + 0.1, { stagger: 0.05, dur: 0.9 }, s);
      fade(el.querySelector(".hero-sub"), at + 0.45, { dur: 0.7 });
      tl.fromTo(el.querySelector(".hero-mark"), { opacity: 0, x: 40, scale: 0.94 }, { opacity: 1, x: 0, scale: 1, duration: 1.2, ease: E.expo }, at + 0.12);
      var vrule = el.querySelector(".hero-vrule");
      if (vrule) tl.fromTo(vrule, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.8, ease: E.expo }, at + 0.18);
      tl.fromTo(el.querySelector(".hero-baseline"), { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.9, ease: E.expo }, at + 0.25);
      queueSFX("whoosh", at + 0.12, { vol: 0.5 });
      amb(el.querySelector(".hero-mark"), dur, at);
    },

    statement: function (el, s, at, dur) {
      var wrap = el.querySelector(".stat-wrap");
      if (wrap) tl.fromTo(wrap, { scale: 1.035 }, { scale: 1, duration: 0.38, ease: E.expo }, at);
      queueSFX("thud", at, { vol: 0.75 });

      if (el.querySelector(".eyebrow")) fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.5 });
      words(el.querySelector(".statement"), at + 0.08, { stagger: 0.042, dur: 0.8, x: s.variant === 2 ? 34 : s.variant === 1 ? -34 : 0 }, s);
      if (el.querySelector(".st-sub")) fade(el.querySelector(".st-sub"), at + 0.38, { dur: 0.65 });
      
      var ghost = el.querySelector(".st-ghost");
      if (ghost) {
        tl.fromTo(ghost, 
          { opacity: 0, x: 50, scale: 1.08, filter: "drop-shadow(-6px 0 0 rgba(245,158,11,0.4)) drop-shadow(6px 0 0 rgba(255,59,92,0.4))" }, 
          { opacity: 0.9, x: 0, scale: 1, filter: "drop-shadow(0 0 0 transparent)", duration: 1.8, ease: E.expo }, at);
      }

      var ticks = q(el, ".st-tickrow span");
      tl.fromTo(ticks, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.45, stagger: 0.08, ease: E.springSubtle }, at + 0.5);
      if (ticks.length) {
        queueSFX("click", at + 0.5, { vol: 0.6 });
      }
      amb(ghost, dur, at);
    },

    stat: function (el, s, at, dur) {
      var stage = el.querySelector(".stat-stage");
      if (stage) {
        tl.fromTo(stage, { scale: 0.985 }, { scale: 1.015, duration: dur, ease: "none" }, at);
      }

      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var num = el.querySelector(".stat-number");
      var suffix = el.querySelector(".stat-suffix");
      var rulerFill = el.querySelector(".stat-ruler-fill");
      var cued = typeof s.revealTime === "number";
      var revealAt = at + (cued ? s.revealTime : 0.05);
      var countAt = cued ? revealAt : at + 0.25;
      var countDur = cued ? Math.max(0.1, Math.min(0.65, dur - s.revealTime - 0.05)) : Math.min(2.1, Math.max(1.1, dur * 0.3));

      tl.fromTo(el.querySelector(".stat-main"), { y: 46, opacity: 0 }, { y: 0, opacity: 1, duration: cued ? 0.35 : 1, ease: E.expo }, revealAt);
      
      var trend = num ? (num.getAttribute("data-trend") || "neutral") : "neutral";
      var rawFrom = num ? num.getAttribute("data-from") : null;
      var fromVal = rawFrom != null && rawFrom !== "" ? parseFloat(rawFrom) : (s.meta?.from != null ? s.meta.from : parseFloat(s.meta?.value || "0"));
      countUp(num, countAt, { duration: countDur, from: fromVal });
      queueSFX("thud", countAt, { vol: 1.1 });

      /* Intense mechanical odometer click burst during count */
      var tickBursts = 14;
      for (var tIdx = 0; tIdx < tickBursts; tIdx++) {
        var tickTime = countAt + (tIdx / tickBursts) * countDur;
        queueSFX("tick", tickTime, { vol: 0.85 });
      }

      /* Dynamic state transition at count completion */
      var alertAt = countAt + countDur * 0.8;
      var prefix = el.querySelector(".stat-prefix");
      var bead = el.querySelector(".stat-ruler-bead");

      tl.call(function () {
        var cls = "is-" + trend;
        var targetNodes = [num, suffix, prefix, rulerFill, bead].filter(Boolean);
        targetNodes.forEach(function (n) {
          n.classList.remove("is-up", "is-down", "is-alert", "is-neutral");
          n.classList.add(cls);
          if (trend === "down") n.classList.add("is-alert");
        });
      }, null, alertAt);

      if (trend === "down") {
        queueSFX("glitch", alertAt, { vol: 0.65 });
      } else if (trend === "up") {
        queueSFX("flare", alertAt, { vol: 0.85 });
      } else {
        queueSFX("tick", alertAt, { vol: 0.75 });
      }

      /* Delta badge spring stamp */
      var deltaBadge = el.querySelector(".stat-delta");
      if (deltaBadge) {
        tl.fromTo(deltaBadge, { scale: 0, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: E.springSubtle }, alertAt + 0.1);
      }

      /* Headline words */
      words(el.querySelector(".stat-label"), at + 0.45, { stagger: 0.04, dur: 0.75 }, s);
      if (el.querySelector(".stat-sub")) fade(el.querySelector(".stat-sub"), at + 0.65, { dur: 0.7 });

      /* Ruler and laser traveling bead */
      tl.fromTo(el.querySelector(".stat-ruler"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, at + 0.4);
      if (rulerFill) {
        tl.fromTo(rulerFill, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power2.inOut" }, at + 0.5);
      }
      var bead = el.querySelector(".stat-ruler-bead");
      if (bead) {
        tl.fromTo(bead, { left: "0%", opacity: 0 }, { left: "100%", opacity: 1, duration: 1.4, ease: "power2.inOut" }, at + 0.5);
        tl.to(bead, { scale: 1.5, opacity: 0.4, yoyo: true, repeat: -1, duration: 0.6, ease: "sine.inOut" }, at + 1.9);
      }

      var ghost = el.querySelector(".stat-ghost");
      if (ghost) {
        tl.fromTo(ghost, { opacity: 0, x: 60 }, { opacity: 0.8, x: 0, duration: 2, ease: E.expo }, cued ? revealAt : at);
        amb(ghost, dur, at);
      }
    },

    dateline: function (el, s, at, dur) {
      var grid = el.querySelector(".dl-grid");
      if (grid) {
        tl.fromTo(grid, { scale: 0.985 }, { scale: 1.015, duration: dur, ease: "none" }, at);
      }

      var ghost = el.querySelector(".dl-ghost");
      if (ghost) {
        tl.fromTo(ghost, { opacity: 0, x: 50 }, { opacity: 0.85, x: 0, duration: 2, ease: E.expo }, at);
        amb(ghost, dur, at);
      }

      var laserBar = el.querySelector(".dl-laser-bar");
      var laserDot = el.querySelector(".dl-laser-dot");
      if (laserBar) {
        tl.fromTo(laserBar, { scaleY: 0 }, { scaleY: 1, duration: 0.85, ease: E.expo }, at);
      }
      if (laserDot) {
        tl.fromTo(laserDot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: E.springSubtle }, at + 0.3);
      }

      tl.fromTo(el.querySelector(".dl-date"), { x: -35, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: E.expo }, at);
      tl.fromTo(el.querySelector(".dl-day"), { yPercent: 25, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: E.expo }, at + 0.05);
      tl.fromTo(q(el, ".dl-mon, .dl-yr"), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: E.soft }, at + 0.3);

      /* Synchronized chronometer micro-ticks */
      var clockSteps = q(el, ".dl-clock-step");
      var pips = q(el, ".dl-pip");
      var gauge = el.querySelector(".dl-chrono-gauge");
      var statusEl = el.querySelector(".dl-chrono-status");

      if (gauge) {
        tl.fromTo(gauge, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: E.soft }, at + 0.45);
      }

      if (clockSteps.length) {
        gsap.set(clockSteps, { opacity: 0, y: 8 });
        gsap.set(clockSteps[0], { opacity: 1, y: 0 });
      }

      for (var k = 0; k < 6; k++) {
        var tickTime = at + 0.6 + k * 0.25;

        // 1. Audio tick
        queueSFX("tick", tickTime, { vol: 0.85 });

        // 2. Step the clock
        if (clockSteps.length > k) {
          var curStep = clockSteps[k];
          var prevStep = k > 0 ? clockSteps[k - 1] : null;
          if (prevStep) {
            tl.to(prevStep, { opacity: 0, y: -6, duration: 0.08, ease: "power2.in" }, tickTime);
          }
          tl.fromTo(curStep,
            { opacity: 0, y: 6, scale: 1.08 },
            { opacity: 1, y: 0, scale: 1, duration: 0.12, ease: "power2.out" },
            tickTime
          );
        }

        // 3. Light up corresponding pip on the gauge
        if (pips.length > k) {
          var pip = pips[k];
          tl.fromTo(pip,
            { backgroundColor: "#ffffff", scaleY: 2.2, boxShadow: "0 0 14px #ffffff" },
            { backgroundColor: "var(--ac)", scaleY: 1.0, boxShadow: "0 0 10px var(--ac)", duration: 0.22, ease: "power2.out" },
            tickTime
          );
        }

        // 4. Pulse the laser beacon dot on top of the vertical rule
        if (laserDot) {
          tl.fromTo(laserDot,
            { scale: 2.2, opacity: 1, boxShadow: "0 0 24px 4px var(--ac)" },
            { scale: 1.0, opacity: 0.8, duration: 0.22, ease: "power2.out" },
            tickTime
          );
        }
      }

      // Lock-in impact when the 6th tick arrives!
      var lockTime = at + 0.6 + 5 * 0.25;
      queueSFX("click", lockTime, { vol: 0.95 });
      if (statusEl) {
        tl.to(statusEl, { color: "var(--ac)", textShadow: "0 0 12px var(--ac)", duration: 0.2 }, lockTime);
        tl.call(function () {
          if (statusEl) statusEl.textContent = "LOCKED";
        }, null, lockTime);
      }
      if (clockSteps.length >= 6) {
        var finalStep = clockSteps[5];
        tl.to(finalStep, {
          color: "var(--ac)",
          textShadow: "0 0 20px color-mix(in srgb,var(--ac) 80%,transparent), 0 0 40px var(--ac)",
          scale: 1.06,
          duration: 0.3,
          ease: E.springSubtle
        }, lockTime);
      }
      if (pips.length) {
        tl.fromTo(pips,
          { boxShadow: "0 0 18px 2px var(--ac)" },
          { boxShadow: "0 0 8px var(--ac)", duration: 0.35, ease: "power2.out" },
          lockTime
        );
      }
      if (laserDot) {
        tl.to(laserDot, { opacity: 0.4, scale: 0.8, yoyo: true, repeat: -1, duration: 0.6, ease: "sine.inOut" }, lockTime + 0.3);
      }

      fade(el.querySelector(".eyebrow"), at + 0.15, { y: 12, dur: 0.55 });
      words(el.querySelector(".dl-title"), at + 0.2, { stagger: 0.04, dur: 0.82 }, s);
      if (el.querySelector(".dl-sub")) fade(el.querySelector(".dl-sub"), at + 0.55, { dur: 0.7 });

      var railSpan = el.querySelector(".dl-rail span");
      if (railSpan) {
        tl.fromTo(railSpan, { scaleX: 0 }, { scaleX: 1, duration: 1.5, ease: "power2.inOut" }, at + 0.3);
      }
      var bead = el.querySelector(".dl-rail-bead");
      if (bead) {
        tl.fromTo(bead, { left: "0%", opacity: 0 }, { left: "100%", opacity: 1, duration: 1.5, ease: "power2.inOut" }, at + 0.3);
        tl.to(bead, { scale: 1.6, opacity: 0.3, yoyo: true, repeat: -1, duration: 0.7, ease: "sine.inOut" }, at + 1.8);
      }

      queueSFX("thud", at + 0.05, { vol: 0.8 });
      queueSFX("whoosh", at + 0.35, { vol: 0.45 });
    },

    code: function (el, s, at, dur) {
      var ghost = el.querySelector(".code-ghost");
      if (ghost) {
        fade(ghost, at, { dur: 0.8, y: 10 });
        amb(ghost, dur, at);
      }
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      if (el.querySelector(".code-head")) {
        words(el.querySelector(".code-head"), at + 0.05, { dur: 0.65, stagger: 0.035, y: 16 });
      }
      queueSFX("whoosh", at + 0.05, { vol: 0.4 });
      tl.fromTo(el.querySelector(".code-shell"),
        { y: 34, opacity: 0, scale: 0.985, rotateX: 3, rotateY: -1.5 },
        { y: 0, opacity: 1, scale: 1, rotateX: 0, rotateY: 0, duration: 0.85, ease: E.expo, transformPerspective: 1200 },
        at + 0.08
      );
      var lines = q(el, ".cl");
      tl.fromTo(lines, { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.09, ease: E.soft }, at + 0.25);
      queueSFX("click", at + 0.28, { vol: 0.55 });
      var key = el.querySelector(".cl.is-key");
      if (key) {
        tl.fromTo(key, { borderLeftColor: "rgba(0,0,0,0)", backgroundColor: "rgba(0,0,0,0)" },
          { borderLeftColor: ac(s), duration: 0.3 }, at + 0.3 + lines.length * 0.09);
        tl.fromTo(el.querySelector(".code-scan"), { opacity: 0 }, { opacity: 0.6, duration: 0.25 }, at + 1.05);
        tl.fromTo(el.querySelector(".code-scan"), { y: 0 }, { y: Math.max(120, lines.length * 52), duration: 1.05, ease: "power1.inOut" }, at + 1.05);
        tl.to(el.querySelector(".code-scan"), { opacity: 0, duration: 0.35 }, at + 2.1);
        tl.to(key, { backgroundColor: "rgba(56,189,248,0.06)", duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: repYoyo(dur - 2.1, 3.2) }, at + 2.2);
        var otherLines = lines.filter(function (l) {
          return l !== key && !l.classList.contains("is-bad") && !l.classList.contains("cl-bad");
        });
        if (otherLines.length) {
          tl.to(otherLines, { opacity: 0.4, duration: 0.45, ease: "power2.out" }, at + 1.3);
        }
      }
      var badLines = q(el, ".cl.is-bad, .cl-bad");
      badLines.forEach(function (bl) {
        var badAt = at + 1.25;
        tl.fromTo(bl,
          { backgroundColor: "rgba(255,59,92,0)", borderLeftColor: "transparent", opacity: 0.7 },
          { backgroundColor: "rgba(255,59,92,0.22)", borderLeftColor: "#ff3b5c", opacity: 1, duration: 0.35, ease: "power2.out" },
          badAt
        );
        // Warning glow pulse on the bad line across hold phase
        tl.to(bl,
          { backgroundColor: "rgba(255,59,92,0.32)", boxShadow: "inset 0 0 35px -4px rgba(255,59,92,0.75)", duration: 0.7, yoyo: true, repeat: repYoyo(dur - (badAt - at) - 0.4, 1.4), ease: "sine.inOut" },
          badAt + 0.4
        );
        // Beacon tag entrance & warning pulse
        var beacon = bl.querySelector(".cl-bad-beacon");
        if (beacon) {
          tl.fromTo(beacon,
            { scale: 0, opacity: 0, x: -12 },
            { scale: 1, opacity: 1, x: 0, duration: 0.35, ease: "back.out(1.7)" },
            badAt + 0.15
          );
          tl.to(beacon,
            { boxShadow: "0 0 26px rgba(255,59,92,0.85)", borderColor: "#ff3b5c", duration: 0.55, yoyo: true, repeat: repYoyo(dur - (badAt - at) - 0.5, 1.1), ease: "sine.inOut" },
            badAt + 0.5
          );
        }
        var cur = bl.querySelector(".cl-bad-cursor");
        if (cur) {
          tl.fromTo(cur,
            { opacity: 0 },
            { opacity: 1, duration: 0.18, repeat: repYoyo(Math.max(1.2, dur - (badAt - at) - 0.3), 0.5), yoyo: true },
            badAt + 0.2
          );
        }
        // Forensic inspection sound effects
        queueSFX("thud", badAt, { vol: 0.95 });
        queueSFX("glitch", badAt + 0.05, { vol: 0.65 });
        queueSFX("click", badAt + 0.14, { vol: 0.65 });
        queueSFX("click", badAt + 0.22, { vol: 0.72 });
        queueSFX("click", badAt + 0.30, { vol: 0.8 });
        queueSFX("flare", badAt + 0.38, { vol: 0.85 });
      });
      var call = el.querySelector(".code-callout");
      if (call) {
        tl.fromTo(call,
          { clipPath: "inset(0 100% 0 0)", opacity: 1 },
          { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "steps(28)" },
          at + 0.55
        );
        [0.55, 0.65, 0.75, 0.85].forEach(function (dt) {
          queueSFX("tick", at + dt, { vol: 0.35 });
        });
      }
      if (el.querySelector(".code-sub")) fade(el.querySelector(".code-sub"), at + 0.75, { dur: 0.6 });
    },

    diff: function (el, s, at, dur) {
      var ghost = el.querySelector(".diff-ghost");
      if (ghost) {
        fade(ghost, at, { dur: 0.8, y: 10 });
        amb(ghost, dur, at);
      }
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      if (el.querySelector(".diff-head-title")) {
        words(el.querySelector(".diff-head-title"), at + 0.05, { dur: 0.65, stagger: 0.035, y: 16 });
      }
      queueSFX("whoosh", at + 0.05, { vol: 0.4 });
      tl.fromTo(el.querySelector(".diff-shell"),
        { y: 34, opacity: 0, scale: 0.985, rotateX: 3, rotateY: -1.5 },
        { y: 0, opacity: 1, scale: 1, rotateX: 0, rotateY: 0, duration: 0.85, ease: E.expo, transformPerspective: 1200 },
        at + 0.08
      );
      var lines = q(el, ".df-line");
      tl.fromTo(lines, { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: E.soft }, at + 0.22);

      // Deleted lines (red) strike in first
      var del = q(el, ".df-del");
      if (del.length) {
        var delAt = at + 0.5;
        tl.fromTo(del,
          { backgroundColor: "rgba(255,59,92,0)", borderLeftColor: "transparent" },
          { backgroundColor: "rgba(255,59,92,0.18)", borderLeftColor: "#ff3b5c", duration: 0.4, stagger: 0.08 },
          delAt
        );
        var delTags = q(el, ".df-tag-del");
        if (delTags.length) {
          tl.fromTo(delTags, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }, delAt + 0.1);
        }
        queueSFX("thud", delAt, { vol: 0.85 });
      }

      // Added lines (green) reveal triumphantly
      var add = q(el, ".df-add");
      if (add.length) {
        var addAt = at + 0.9;
        tl.fromTo(add,
          { backgroundColor: "rgba(52,211,153,0)", borderLeftColor: "transparent" },
          { backgroundColor: "rgba(52,211,153,0.22)", borderLeftColor: "#34d399", duration: 0.45, stagger: 0.1 },
          addAt
        );
        var addTags = q(el, ".df-tag-add");
        if (addTags.length) {
          tl.fromTo(addTags, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.7)" }, addAt + 0.12);
          tl.to(addTags, { boxShadow: "0 0 24px rgba(52,211,153,0.8)", duration: 0.6, yoyo: true, repeat: repYoyo(dur - (addAt - at) - 0.5, 1.2), ease: "sine.inOut" }, addAt + 0.5);
        }

        // Strikethrough snaps across the deleted line when the fix lands
        var strikes = q(el, ".df-strike");
        if (strikes.length) {
          tl.fromTo(strikes,
            { scaleX: 0 },
            { scaleX: 1, duration: 0.35, ease: "power2.out" },
            addAt
          );
          if (del.length) tl.to(del, { opacity: 0.55, duration: 0.35 }, addAt + 0.1);
          queueSFX("swipe", addAt, { vol: 0.75 });
        }

        // Merge celebration sparkles burst around PR badge
        var spks = q(el, ".df-spk");
        if (spks.length) {
          tl.fromTo(spks,
            { scale: 0, opacity: 0, y: 0 },
            { scale: 1.4, opacity: 1, y: -8, duration: 0.45, stagger: 0.06, ease: "back.out(2)" },
            addAt + 0.15
          );
          tl.to(spks, { opacity: 0, y: -16, duration: 0.35, stagger: 0.05, ease: "power2.in" }, addAt + 0.65);
          var dfVer = el.querySelector(".df-ver");
          if (dfVer) {
            tl.fromTo(dfVer,
              { boxShadow: "0 0 0 rgba(52,211,153,0)" },
              { boxShadow: "0 0 25px 4px rgba(52,211,153,0.7)", borderColor: "#34d399", duration: 0.35, yoyo: true, repeat: 1 },
              addAt + 0.15
            );
          }
        }

        queueSFX("chime", addAt, { vol: 0.75 });
        queueSFX("flare", addAt + 0.1, { vol: 0.7 });
      }

      var call = el.querySelector(".diff-callout");
      if (call) {
        tl.fromTo(call,
          { clipPath: "inset(0 100% 0 0)", opacity: 1 },
          { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "steps(28)" },
          at + 0.6
        );
        [0.6, 0.7, 0.8, 0.9].forEach(function (dt) {
          queueSFX("tick", at + dt, { vol: 0.35 });
        });
      }
    },

    flow: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var nodes = q(el, ".flow-node");
      tl.fromTo(nodes, { y: 40, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.75, stagger: 0.14, ease: E.springSubtle }, at + 0.1);

      /* Reactive SVG circuit traces with glow pulses */
      var paths = q(el, ".fl-p");
      draw(paths, at + 0.45, { dur: 0.6, stagger: 0.12 });
      paths.forEach(function (p, i) {
        tl.fromTo(p,
          { stroke: "rgba(255,255,255,.15)", filter: "none" },
          { stroke: ac(s), filter: "drop-shadow(0 0 8px " + ac(s) + ")", duration: 0.4, yoyo: true, repeat: 3 },
          at + 0.7 + i * 0.12
        );
      });

      var arr = q(el, ".fl-a");
      arr.forEach(function (a, i) {
        tl.fromTo(a, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: E.spring }, at + 0.9 + i * 0.1);
      });
      var edgePackets = q(el, ".fl-packet");
      edgePackets.forEach(function (pkt, idx) {
        var cycle = Math.max(1.0, Math.min(2.0, dur * 0.28));
        tl.fromTo(pkt, { cx: 4, opacity: 0 }, { opacity: 1, duration: 0.15 }, at + 0.8 + idx * 0.16);
        // Snap back to the start with opacity off, so the wrap is invisible.
        tl.to(pkt, { opacity: 0, duration: 0.001 }, at + 0.85 + idx * 0.16 + cycle);
        tl.to(pkt, {
          cx: 104,
          duration: cycle,
          ease: "none",
          repeat: rep(dur - 0.9, cycle)
        }, at + 0.85 + idx * 0.16);
      });
      var badFlowNodes = q(el, ".flow-node.is-bad");
      badFlowNodes.forEach(function (bf) {
        var badAt = at + Math.min(dur * 0.45, 2.5);
        tl.to(bf, { borderColor: "#ff3b5c", boxShadow: "0 0 28px -2px rgba(255,59,92,0.85)", duration: 0.35 }, badAt);
        tl.fromTo(bf, { x: 4 }, { x: 0, duration: 0.2, ease: "power2.out" }, badAt);
        queueSFX("thud", badAt, { vol: 1.0 });
      });
      if (el.querySelector(".flow-cap")) words(el.querySelector(".flow-cap"), at + 0.55, { stagger: 0.04, dur: 0.7 }, s);
      if (el.querySelector(".flow-sub")) fade(el.querySelector(".flow-sub"), at + 0.7, { dur: 0.6 });
      var railEl = el.querySelector(".flow-rail");
      var packet = el.querySelector(".flow-packet");
      if (railEl && packet) {
        tl.fromTo(railEl, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.9, ease: E.expo }, at + 0.3);
        var cycleDur = Math.max(1.4, Math.min(3.2, dur * 0.35));
        tl.fromTo(packet, { x: 0, opacity: 0 }, { opacity: 1, duration: 0.2 }, at + 0.9);
        tl.to(packet, { x: 1660, duration: cycleDur, ease: "power2.inOut", repeat: rep(dur - 1.0, cycleDur) }, at + 1.0);
      }

    },

    ledger: function (el, s, at, dur) {
      tl.fromTo(el.querySelector(".lg-card"), { x: -46, opacity: 0, rotateY: 6 }, { x: 0, opacity: 1, rotateY: 0, duration: 0.95, ease: E.expo, transformPerspective: 1200 }, at);
      var rows = q(el, ".lg-row");
      tl.fromTo(rows, { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.11, ease: E.soft }, at + 0.25);
      fade(el.querySelector(".eyebrow"), at + 0.2, { y: 12, dur: 0.55 });
      words(el.querySelector(".lg-title"), at + 0.3, { stagger: 0.04, dur: 0.8 }, s);
      if (el.querySelector(".lg-sub")) fade(el.querySelector(".lg-sub"), at + 0.65, { dur: 0.7 });
      var pts = q(el, ".lg-pt");
      tl.fromTo(pts, { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.09, ease: E.soft }, at + 0.8);
      var badRows = q(el, ".lg-row .is-bad");
      if (badRows.length) {
        var rowAt = at + 0.6;
        tl.fromTo(badRows, { color: "rgba(255,255,255,0.7)" }, { color: "#ff3b5c", textShadow: "0 0 16px rgba(255,59,92,0.6)", duration: 0.3 }, rowAt);
        queueSFX("thud", rowAt, { vol: 0.85 });
      }
      var stamp = el.querySelector(".lg-stamp");
      if (stamp) {
        var stampTime = at + Math.min(dur * 0.55, 3.4);
        tl.fromTo(stamp, { opacity: 0, scale: 2.2, rotate: -15 }, { opacity: 1, scale: 1, rotate: -3, duration: 0.36, ease: E.soft }, stampTime);
        queueSFX("thud", stampTime, { vol: 1.1 });
      }

    },

    memory: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var cells = q(el, ".mc");
      var count = el.querySelector(".mem-n");
      var n = parseInt((count && count.getAttribute("data-n")) || "2", 10);
      tl.fromTo(el.querySelector(".mem-shell"), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: E.expo }, at + 0.04);
      tl.fromTo(cells, { scale: 0.86, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, stagger: 0.055, ease: E.soft }, at + 0.2);
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
        var badTime = at + Math.min(dur * 0.5, 3.2);
        tl.fromTo(bad, { opacity: 0.25 }, { opacity: 1, duration: 0.12, repeat: 4, yoyo: true }, badTime);
        tl.to(bad, { boxShadow: "0 0 34px -2px rgba(255,92,114,.85)", duration: 0.4 }, badTime + 0.7);
        queueSFX("thud", badTime, { vol: 1.1 });
        var shell = el.querySelector(".mem-shell");
        if (shell) {
          tl.fromTo(shell, { x: 5 }, { x: 0, duration: 0.25, ease: "power2.out" }, badTime);
        }
      }
      var ptr = el.querySelector(".mem-ptr");
      if (ptr) {
        tl.fromTo(ptr, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5 }, at + 1.0);
        draw(q(ptr, "path"), at + 1.05, { dur: 0.6 });
        queueSFX("click", at + 1.05, { vol: 0.75 });
      }
      tl.fromTo(el.querySelector(".mem-side"), { x: 36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.85, ease: E.expo }, at + 0.2);
      words(el.querySelector(".mem-title"), at + 0.35, { stagger: 0.04, dur: 0.8 }, s);
      if (el.querySelector(".mem-sub")) fade(el.querySelector(".mem-sub"), at + 0.7, { dur: 0.7 });
    },

    timeline: function (el, s, at, dur) {
      var stage = el.querySelector(".tl-stage");
      if (stage) {
        tl.fromTo(stage, { scale: 0.985 }, { scale: 1.015, duration: dur, ease: "none" }, at);
      }

      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      words(el.querySelector(".tl-head"), at + 0.05, { stagger: 0.04, dur: 0.8 }, s);
      if (el.querySelector(".tl-sub")) fade(el.querySelector(".tl-sub"), at + 0.35, { dur: 0.65 });

      var ghost = el.querySelector(".tl-ghost");
      if (ghost) {
        tl.fromTo(ghost, { opacity: 0, x: 45 }, { opacity: 0.85, x: 0, duration: 2, ease: E.expo }, at);
        amb(ghost, dur, at);
      }

      var tlLine = el.querySelector(".tl-line");
      if (tlLine) {
        tl.fromTo(tlLine, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.85, ease: E.expo }, at + 0.35);
      }

      var fill = el.querySelector(".tl-line-fill");
      var play = el.querySelector(".tl-play");
      var sweepDur = Math.min(2.6, Math.max(1.8, dur * 0.4));

      if (fill) {
        tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: sweepDur, ease: "power2.inOut" }, at + 0.4);
      }
      if (play) {
        tl.fromTo(play, { left: "0%" }, { left: "100%", duration: sweepDur, ease: "power2.inOut" }, at + 0.4);
      }

      var evs = q(el, ".tl-ev");
      evs.forEach(function (e, i) {
        var isHot = e.classList.contains("is-hot");
        var t = at + 0.4 + (i / Math.max(1, evs.length - 1)) * sweepDur;

        var dot = e.querySelector(".tl-dot");
        if (dot) {
          tl.fromTo(dot,
            { scale: 0, opacity: 0 },
            { scale: isHot ? 1.3 : 1.0, opacity: 1, duration: 0.35, ease: E.springSubtle },
            t
          );
          if (isHot) {
            tl.to(dot, { scale: 1.6, opacity: 0.7, yoyo: true, repeat: -1, duration: 0.5, ease: "sine.inOut" }, t + 0.4);
          }
        }

        // Radar ripple shockwaves for hot critical node
        if (isHot) {
          var r1 = e.querySelector(".tl-hot-ripple");
          var r2 = e.querySelector(".tl-hot-ripple-2");
          if (r1) {
            tl.fromTo(r1,
              { scale: 1, opacity: 0.95 },
              { scale: 5.5, opacity: 0, duration: 1.2, ease: "power2.out", repeat: -1, repeatDelay: 0.3 },
              t
            );
          }
          if (r2) {
            tl.fromTo(r2,
              { scale: 1, opacity: 0.85 },
              { scale: 4.2, opacity: 0, duration: 1.2, ease: "power2.out", repeat: -1, repeatDelay: 0.3 },
              t + 0.35
            );
          }
        }

        var stem = e.querySelector(".tl-stem");
        if (stem) {
          tl.fromTo(stem, { scaleY: 0 }, { scaleY: 1, duration: 0.25, ease: "power2.out" }, t + 0.05);
        }

        var card = e.querySelector(".tl-card");
        if (card) {
          var yOffset = i % 2 === 0 ? 18 : -18;
          tl.fromTo(card,
            { y: yOffset, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: E.soft },
            t + 0.08
          );
        }

        // Dynamic rail glow pulse
        if (fill) {
          if (isHot) {
            tl.to(fill, { filter: "drop-shadow(0 0 16px #ff3b5c) brightness(1.7)", duration: 0.3 }, t);
          } else {
            tl.fromTo(fill,
              { filter: "drop-shadow(0 0 12px var(--ac)) brightness(1.6)" },
              { filter: "drop-shadow(0 0 4px var(--ac)) brightness(1)", duration: 0.35, ease: "power2.out" },
              t
            );
          }
        }

        if (isHot) {
          queueSFX("thud", t, { vol: 0.95 });
          queueSFX("glitch", t + 0.08, { vol: 0.75 });
        } else {
          queueSFX("tick", t, { vol: 0.75 });
        }
      });

      // Delta badges pop in as playhead passes each segment
      var deltas = q(el, ".tl-delta");
      deltas.forEach(function (d, i) {
        var segT = at + 0.4 + ((i + 0.5) / Math.max(1, evs.length - 1)) * sweepDur;
        var pill = d.querySelector(".tl-delta-pill");
        if (pill) {
          tl.fromTo(pill,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.32, ease: E.springSubtle },
            segT
          );
          tl.fromTo(pill,
            { backgroundColor: "var(--ac)", color: "#000", borderColor: "#fff" },
            { backgroundColor: "rgba(10,14,26,.92)", color: "rgba(244,247,251,.7)", borderColor: "rgba(255,255,255,.16)", duration: 0.6, ease: "power2.out" },
            segT
          );
        }
      });
    },

    terminal: function (el, s, at, dur) {
      var ghost = el.querySelector(".tm-ghost");
      if (ghost) {
        fade(ghost, at, { dur: 0.8, y: 10 });
        amb(ghost, dur, at);
      }
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      if (el.querySelector(".tm-head-title")) {
        words(el.querySelector(".tm-head-title"), at + 0.05, { dur: 0.65, stagger: 0.035, y: 16 });
      }
      queueSFX("whoosh", at + 0.05, { vol: 0.4 });
      tl.fromTo(el.querySelector(".tm-shell"),
        { y: 34, opacity: 0, scale: 0.985, rotateX: 2.5 },
        { y: 0, opacity: 1, scale: 1, rotateX: 0, duration: 0.85, ease: E.expo, transformPerspective: 1200 },
        at + 0.08
      );
      var shell = el.querySelector(".tm-shell");
      var scanlines = el.querySelector(".tm-scanlines");
      if (scanlines) {
        tl.fromTo(scanlines, { opacity: 0 }, { opacity: 0.55, duration: 0.5 }, at + 0.1);
      }

      var lines = q(el, ".tm-line");
      var curTime = at + 0.28;
      lines.forEach(function (l, i) {
        var isCmd = l.classList.contains("tm-cmd");
        var isErr = l.classList.contains("tm-err") || l.classList.contains("tm-bad");
        var textNode = l.querySelector(".tm-t");
        var textLen = (textNode && textNode.textContent ? textNode.textContent.length : 16);
        var isDeadlock = textNode && textNode.textContent && textNode.textContent.indexOf("DEADLOCK") !== -1;
        var typeDur = isCmd ? Math.max(0.28, Math.min(0.65, textLen * 0.022)) : 0.12;
        var stepsCount = isCmd ? Math.max(6, Math.min(30, textLen)) : 1;

        tl.fromTo(l, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.12, ease: "power2.out" }, curTime);
        tl.fromTo(textNode,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: typeDur, ease: isCmd ? "steps(" + stepsCount + ")" : "none" },
          curTime
        );

        if (isCmd) {
          queueSFX("click", curTime, { vol: 0.85 });
          queueSFX("tick", curTime + typeDur * 0.5, { vol: 0.4 });
        } else if (isDeadlock) {
          // Critical deadlock hit: shell shudder + crimson alarm flare + scanline burst
          if (shell) {
            tl.to(shell, {
              x: 10,
              duration: 0.035,
              yoyo: true,
              repeat: 7,
              ease: "power2.inOut"
            }, curTime);
            tl.fromTo(shell,
              { borderColor: "rgba(255,59,92,0.95)", boxShadow: "0 0 75px rgba(255,59,92,0.65), inset 0 0 35px rgba(255,59,92,0.3)" },
              { borderColor: "rgba(255,59,92,0.45)", boxShadow: "0 40px 120px rgba(0,0,0,.65), 0 0 25px rgba(255,59,92,0.2)", duration: 0.8, ease: "power2.out" },
              curTime
            );
          }
          if (scanlines) {
            tl.to(scanlines, { opacity: 0.95, duration: 0.05, yoyo: true, repeat: 5 }, curTime);
          }
          // Sympathetic panic reaction on mascot & speech bubble
          var mOv = el.querySelector(".m-ov");
          if (mOv) {
            tl.to(mOv, { x: -8, duration: 0.035, yoyo: true, repeat: 5, ease: "power2.inOut" }, curTime + 0.02);
            var bubble = mOv.querySelector(".m-ov-bubble");
            if (bubble) {
              tl.to(bubble, {
                scale: 1.08,
                borderColor: "#ff3b5c",
                boxShadow: "0 16px 45px rgba(255,59,92,0.4)",
                duration: 0.12,
                yoyo: true,
                repeat: 1,
                ease: E.springSubtle
              }, curTime + 0.04);
            }
          }
          queueSFX("thud", curTime, { vol: 1.25 });
          queueSFX("glitch", curTime + 0.04, { vol: 0.85 });
        } else if (isErr) {
          queueSFX("thud", curTime, { vol: 0.9 });
          queueSFX("glitch", curTime + 0.04, { vol: 0.6 });
        } else {
          queueSFX("click", curTime, { vol: 0.5 });
        }

        curTime += typeDur + (isCmd ? 0.22 : 0.14);
      });

      // Terminal blinking block cursor
      var cur = el.querySelector(".tm-cursor");
      if (cur) {
        var start = at + 0.3;
        tl.fromTo(cur, { opacity: 0 }, { opacity: 1, duration: 0.16, repeat: repYoyo(Math.max(1.2, dur - 0.4), 0.5), yoyo: true }, start);
      }

      // Blinking / pulsing LED
      var led = el.querySelector(".tm-led");
      if (led) {
        tl.to(led, { opacity: 0.3, duration: 0.4, yoyo: true, repeat: repYoyo(dur, 0.8), ease: "steps(2)" }, at + 0.1);
      }

      var call = el.querySelector(".tm-callout");
      if (call) {
        tl.fromTo(call,
          { clipPath: "inset(0 100% 0 0)", opacity: 1 },
          { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "steps(28)" },
          at + 0.6
        );
        [0.6, 0.7, 0.8, 0.9].forEach(function (dt) {
          queueSFX("tick", at + dt, { vol: 0.35 });
        });
      }
    },

    compare: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var left = el.querySelector(".cmp-left");
      var right = el.querySelector(".cmp-right");
      var mid = el.querySelector(".cmp-mid");

      tl.fromTo(left, { x: -48, opacity: 0 }, { x: 0, opacity: 0.72, duration: 0.75, ease: E.expo }, at + 0.02);
      if (mid) {
        tl.fromTo(mid, { scale: 0, opacity: 0, rotate: -60 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.55, ease: E.soft }, at + 0.22);
        queueSFX("click", at + 0.25, { vol: 0.7 });
      }

      var slamTime = at + 0.32;
      tl.fromTo(right, { y: 36, opacity: 0, scale: 1.04 }, { y: 0, opacity: 1, scale: 1, duration: 0.65, ease: E.springSubtle }, slamTime);
      tl.to(right, { borderColor: ac(s), boxShadow: "0 0 32px -4px " + ac(s), duration: 0.4 }, slamTime + 0.18);
      queueSFX("thud", slamTime + 0.05, { vol: 0.95 });
      if (left) {
        tl.fromTo(left, { x: 0 }, { x: -12, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, slamTime + 0.05);
      }

      tl.fromTo(q(el, ".cmp-p"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.09, ease: E.soft }, at + 0.6);
      if (el.querySelector(".cmp-cap")) words(el.querySelector(".cmp-cap"), at + 0.7, { stagger: 0.04, dur: 0.7 }, s);
      if (el.querySelector(".cmp-sub")) fade(el.querySelector(".cmp-sub"), at + 0.82, { dur: 0.65 });
    },

    stack: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      words(el.querySelector(".stk-title"), at + 0.08, { stagger: 0.04, dur: 0.82 }, s);
      if (el.querySelector(".stk-sub")) fade(el.querySelector(".stk-sub"), at + 0.5, { dur: 0.7 });

      var spine = el.querySelector(".stk-spine");
      if (spine) {
        tl.fromTo(spine, { scaleY: 0, transformOrigin: "top center", opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.85, ease: E.expo }, at + 0.15);
      }
      var packet = el.querySelector(".stk-packet");
      if (packet) {
        tl.fromTo(packet, { top: "0%", opacity: 0 }, { top: "96%", opacity: 1, duration: 1.8, repeat: -1, ease: "power1.inOut" }, at + 0.5);
      }

      var layers = q(el, ".stk-layer");
      tl.fromTo(layers, 
        { x: 28, opacity: 0 }, 
        { x: 0, opacity: 1, duration: 0.65, stagger: 0.11, ease: E.expo }, 
        at + 0.2
      );

      var hotLayers = q(el, ".stk-layer.is-hot");
      hotLayers.forEach(function (hot, idx) {
        var hotAt = at + 0.9 + idx * 0.15;
        tl.fromTo(hot, { borderColor: "rgba(255,255,255,.08)" }, { borderColor: "rgba(245,158,11,.7)", boxShadow: "0 0 35px -8px rgba(245,158,11,.45)", duration: 0.4 }, hotAt);
      });

      var badLayers = q(el, ".stk-layer.is-bad");
      badLayers.forEach(function (bad, idx) {
        var badAt = at + 1.05 + idx * 0.16;
        tl.fromTo(bad, { borderColor: "rgba(255,255,255,.08)" }, { borderColor: "rgba(255,90,110,.7)", boxShadow: "0 0 35px -8px rgba(255,90,110,.5)", duration: 0.35 }, badAt);
        tl.fromTo(bad, { x: 5 }, { x: 0, duration: 0.2, ease: "power2.out" }, badAt);
      });

      if (badLayers.length) {
        queueSFX("thud", at + 1.1, { vol: 0.95 });
      }
    },

    quote: function (el, s, at, dur) {
      var stage = el.querySelector(".q-stage");
      if (stage) {
        tl.fromTo(stage, { scale: 0.985 }, { scale: 1.015, duration: dur, ease: "none" }, at);
      }

      if (el.querySelector(".eyebrow")) fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.5 });
      
      var qMark = el.querySelector(".q-mark");
      if (qMark) {
        tl.fromTo(qMark, { opacity: 0, scale: 0.75, y: 30, rotation: -4 }, { opacity: 0.12, scale: 1, y: 0, rotation: 0, duration: 1.3, ease: E.expo }, at);
        tl.to(qMark, { y: -12, rotation: 1.2, opacity: 0.15, duration: dur * 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, at + 1.3);
      }

      words(el.querySelector(".q-text"), at + 0.08, { stagger: 0.035, dur: 0.85 }, s);

      var avatar = el.querySelector(".q-avatar");
      if (avatar) {
        tl.fromTo(avatar, { scale: 0, opacity: 0, rotation: -20 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.6, ease: E.springSubtle }, at + 0.48);
      }

      fade(el.querySelector(".q-by"), at + 0.52, { dur: 0.65 });

      var lineBar = el.querySelector(".q-line-bar");
      if (lineBar) {
        tl.fromTo(lineBar, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: E.expo }, at + 0.55);
      }
      var lineDot = el.querySelector(".q-line-dot");
      if (lineDot) {
        tl.fromTo(lineDot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: E.spring }, at + 0.9);
        tl.to(lineDot, { opacity: 0.4, scale: 0.8, yoyo: true, repeat: -1, duration: 0.8, ease: "sine.inOut" }, at + 1.3);
      }

      queueSFX("whoosh", at + 0.45, { vol: 0.45 });
      queueSFX("click", at + 0.9, { vol: 0.5 });
    },

    matrix: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      words(el.querySelector(".mx-title"), at + 0.05, { stagger: 0.038, dur: 0.8 }, s);
      if (el.querySelector(".mx-sub")) fade(el.querySelector(".mx-sub"), at + 0.45, { dur: 0.7 });
      fade(el.querySelector(".mx-legend"), at + 0.6, { dur: 0.6 });

      var cellsWrap = el.querySelector(".mx-cells");
      var totalCells = parseInt((cellsWrap && cellsWrap.getAttribute("data-total")) || "64", 10);
      var targetBad = parseInt((cellsWrap && cellsWrap.getAttribute("data-bad")) || "60", 10);

      var cells = q(el, ".mx-c");
      var bad = cells.filter(function (c) {
        return c.getAttribute("data-bad") === "1";
      });

      // Initial cell reveal: all cells pop into grid
      tl.fromTo(cells, 
        { opacity: 0, scale: 0.45 }, 
        { opacity: 1, scale: 1, duration: 0.5, stagger: { each: 0.005, from: "center", grid: [4, 16] }, ease: "power2.out" }, 
        at + 0.15
      );

      // Deadlock saturation cascade: 60 bad nodes turn crimson red
      var cascadeStart = at + 0.95;
      tl.to(bad, {
        backgroundColor: "#ff3b5c",
        borderColor: "rgba(255, 59, 92, 0.75)",
        boxShadow: "0 0 16px rgba(255, 59, 92, 0.75), inset 0 0 6px rgba(255, 255, 255, 0.35)",
        duration: 0.28,
        stagger: { each: 0.012, from: "start" },
        ease: "power2.in"
      }, cascadeStart);

      if (bad.length) {
        queueSFX("thud", cascadeStart + 0.1, { vol: 0.95 });
      }

      // Dynamic counter: tick up in real time from 0 to targetBad down!
      var countEl = el.querySelector(".mx-count");
      if (countEl) {
        fade(countEl, at + 0.5, { dur: 0.4 });
        var cp = { val: 0 };
        tl.to(cp, {
          val: targetBad,
          duration: 0.9,
          ease: "power2.out",
          onUpdate: function () {
            var curr = Math.round(cp.val);
            countEl.textContent = curr + " / " + totalCells + " NODES DOWN";
          }
        }, cascadeStart);
      }
    },

    webref: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var ghost = el.querySelector(".web-ghost");
      if (ghost) {
        fade(ghost, at, { dur: 0.8, y: 10 });
        amb(ghost, dur, at);
      }
      if (el.querySelector(".web-head-title")) {
        words(el.querySelector(".web-head-title"), at + 0.05, { dur: 0.65, stagger: 0.035, y: 16 });
      }
      var shell = el.querySelector(".web-shell");
      if (shell) {
        tl.fromTo(shell,
          { y: 35, opacity: 0, scale: 0.97, rotateX: 2.2 },
          { y: 0, opacity: 1, scale: 1, rotateX: 0, duration: 0.85, ease: E.expo, transformPerspective: 1200 },
          at + 0.08
        );
      }
      var urlNode = el.querySelector(".web-url");
      if (urlNode) {
        var urlText = urlNode.textContent || "";
        var typeSteps = Math.max(12, Math.min(40, urlText.length));
        tl.fromTo(urlNode,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 0.65, ease: "steps(" + typeSteps + ")" },
          at + 0.16
        );
        queueSFX("click", at + 0.16, { vol: 0.7 });
        queueSFX("tick", at + 0.42, { vol: 0.4 });
      }
      var docHeader = el.querySelector(".web-doc-header");
      if (docHeader) {
        tl.fromTo(docHeader, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: E.soft }, at + 0.28);
      }
      var ps = q(el, ".web-p");
      if (ps.length) {
        tl.fromTo(ps, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.12, ease: E.soft }, at + 0.38);
      }
      var callout = el.querySelector(".web-callout");
      if (callout) {
        tl.fromTo(callout, { opacity: 0, scale: 0.95, x: -12 }, { opacity: 1, scale: 1, x: 0, duration: 0.6, ease: E.soft }, at + 0.58);
        queueSFX("unmask", at + 0.58, { vol: 0.75 });
      }

      // Smooth document scroll & scrollbar thumb motion
      var scrollWrap = el.querySelector(".web-doc-scroll");
      var thumb = el.querySelector(".web-scroll-thumb");
      if (scrollWrap) {
        tl.fromTo(scrollWrap, { y: 0 }, { y: -36, duration: 1.1, ease: "power2.inOut" }, at + 0.85);
      }
      if (thumb) {
        tl.fromTo(thumb, { y: 0 }, { y: 46, duration: 1.1, ease: "power2.inOut" }, at + 0.85);
      }

      var cursorWrap = el.querySelector(".web-cursor-wrap");
      var cursor = el.querySelector(".web-cursor");
      var ripple = el.querySelector(".web-click-ripple");
      if (cursorWrap) {
        tl.fromTo(cursorWrap, { opacity: 0, x: 150, y: 100 }, { opacity: 1, x: 0, y: 0, duration: 0.9, ease: "power2.out" }, at + 0.45);
        if (cursor) {
          tl.to(cursor, { scale: 0.75, duration: 0.12, ease: "power2.inOut", yoyo: true, repeat: 1 }, at + 1.25);
        }
        if (ripple) {
          tl.fromTo(ripple,
            { scale: 0.5, opacity: 0.95 },
            { scale: 3.2, opacity: 0, duration: 0.45, ease: "power2.out" },
            at + 1.25
          );
        }
        queueSFX("click", at + 1.25, { vol: 0.9 });
        if (callout) {
          tl.to(callout, {
            borderColor: ac(s),
            boxShadow: "0 0 50px rgba(56,189,248,0.5), inset 0 0 25px rgba(56,189,248,0.2)",
            duration: 0.45,
            ease: "power2.out"
          }, at + 1.28);
          queueSFX("flare", at + 1.28, { vol: 0.85 });
        }
        var mOv = el.querySelector(".m-ov");
        if (mOv) {
          var avatar = mOv.querySelector(".m-ov-avatar");
          if (avatar) {
            tl.to(avatar, { rotate: 3, duration: 0.2, yoyo: true, repeat: 1, ease: E.springSubtle }, at + 1.3);
          }
        }
      }
      if (el.querySelector(".web-foot-sub")) fade(el.querySelector(".web-foot-sub"), at + 0.75, { dur: 0.65 });
    },

    meme: function (el, s, at, dur) {
      amb(el.querySelector(".meme-ghost"), dur, at);
      fade(el.querySelector(".meme-badge"), at, { y: 10, dur: 0.4 });
      var card = el.querySelector(".meme-card");
      if (card) {
        tl.fromTo(card, { scale: 0.82, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.42, ease: E.soft }, at + 0.05);
        queueSFX("thud", at + 0.08, { vol: 1.1 });
      }
      var chassis = el.querySelector(".meme-media-chassis");
      if (chassis) {
        tl.fromTo(chassis, { x: -6 }, { x: 6, duration: 0.05, repeat: 4, yoyo: true, ease: "sine.inOut" }, at + 0.08);
      }
      var glitch = el.querySelector(".meme-glitch-bar");
      if (glitch) {
        tl.fromTo(glitch, { y: 0, opacity: 0 }, { y: 320, opacity: 0.8, duration: 0.7, ease: "none", repeat: rep(dur, 0.7) }, at + 0.1);
        queueSFX("decrypt", at + 0.1, { vol: 0.75 });
      }
      var bubble = el.querySelector(".meme-bubble");
      if (bubble) {
        tl.fromTo(bubble,
          { scale: 0, opacity: 0, y: 15 },
          { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: E.springSubtle },
          at + 0.6
        );
        queueSFX("click", at + 0.62, { vol: 0.6 });
      }
      var stamp = el.querySelector(".meme-stamp");
      if (stamp) {
        tl.fromTo(stamp,
          { scale: 2.8, opacity: 0, rotate: -28 },
          { scale: 1, opacity: 1, rotate: -14, duration: 0.28, ease: E.expo },
          at + 1.1
        );
        queueSFX("thud", at + 1.12, { vol: 1.2 });
      }
      words(el.querySelector(".meme-caption"), at + 0.18, { stagger: 0.038, dur: 0.65 }, s);
      if (el.querySelector(".meme-sub")) fade(el.querySelector(".meme-sub"), at + 0.5, { dur: 0.6 });
    },

    cloud: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var ghost = el.querySelector(".cloud-ghost");
      if (ghost) {
        fade(ghost, at, { dur: 0.8, y: 10 });
        amb(ghost, dur, at);
      }
      if (el.querySelector(".cloud-head-title")) {
        words(el.querySelector(".cloud-head-title"), at + 0.05, { dur: 0.65, stagger: 0.035, y: 16 });
      }
      var canvas = el.querySelector(".cloud-canvas");
      if (canvas) {
        tl.fromTo(canvas,
          { y: 35, opacity: 0, scale: 0.97, rotateX: 2.0 },
          { y: 0, opacity: 1, scale: 1, rotateX: 0, duration: 0.85, ease: E.expo, transformPerspective: 1200 },
          at + 0.08
        );
      }
      fade(el.querySelector(".cloud-header"), at + 0.12, { y: 10, dur: 0.5 });
      var nodes = q(el, ".cloud-node");
      tl.fromTo(nodes, { y: 30, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.12, ease: E.springSubtle }, at + 0.18);
      nodes.forEach(function (n, idx) {
        queueSFX("tick", at + 0.2 + idx * 0.12, { vol: 0.45 });
      });

      var edgeChips = q(el, ".cloud-edge-chip");
      if (edgeChips.length) {
        tl.fromTo(edgeChips, { scale: 0.75, opacity: 0, y: -8 }, { scale: 1, opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: E.springSubtle }, at + 0.32);
      }

      var telems = q(el, ".cld-telem");
      if (telems.length) {
        tl.fromTo(telems, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: E.soft }, at + 0.38);
      }

      var breaker = el.querySelector(".cld-breaker-beacon");
      if (breaker) {
        tl.fromTo(breaker, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: E.springSubtle }, at + 0.45);
      }

      var paths = q(el, ".cld-path");
      draw(paths, at + 0.38, { stagger: 0.15, dur: 0.6 });

      var edgePackets = q(el, ".cld-packet");
      edgePackets.forEach(function (pkt, idx) {
        var cycle = Math.max(0.8, Math.min(1.8, dur * 0.22));
        tl.fromTo(pkt, { cx: 4, opacity: 0 }, { opacity: 1, duration: 0.15 }, at + 0.6 + idx * 0.16);
        tl.to(pkt, {
          cx: 90,
          duration: cycle,
          ease: "none",
          repeat: rep(dur - 0.7, cycle)
        }, at + 0.65 + idx * 0.16);
      });

      var hotNodes = q(el, ".cloud-node.is-hot");
      hotNodes.forEach(function (hn) {
        tl.fromTo(hn,
          { boxShadow: "0 0 10px rgba(74,222,128,0.2)" },
          { boxShadow: "0 0 35px var(--ac), inset 0 0 15px rgba(74,222,128,0.15)", duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" },
          at + 0.5
        );
        // Simulated fast-fail circuit shed event at 1.2s
        tl.to(hn, {
          boxShadow: "0 0 45px #fbbf24, inset 0 0 20px rgba(251,191,36,0.3)",
          duration: 0.35,
          yoyo: true,
          repeat: 1,
          ease: "power2.out"
        }, at + 1.2);
      });

      var shedPkt = el.querySelector(".cld-packet-shed");
      if (shedPkt) {
        tl.fromTo(shedPkt, { opacity: 1, cy: 12, r: 3 }, { opacity: 0, cy: 22, r: 0.5, duration: 0.5, ease: "power2.in" }, at + 1.2);
        queueSFX("click", at + 1.2, { vol: 0.65 });
      }

      var mOv = el.querySelector(".m-ov");
      if (mOv) {
        var avatar = mOv.querySelector(".m-ov-avatar");
        if (avatar) {
          tl.to(avatar, { rotate: -4, duration: 0.22, yoyo: true, repeat: 1, ease: E.springSubtle }, at + 1.35);
        }
      }

      var badCloudNodes = q(el, ".cloud-node.is-bad");
      badCloudNodes.forEach(function (bn) {
        var badAt = at + Math.min(dur * 0.45, 2.5);
        tl.to(bn, { borderColor: "#ff3b5c", boxShadow: "0 0 28px -2px rgba(255,59,92,0.85)", duration: 0.35 }, badAt);
        tl.fromTo(bn, { x: 4 }, { x: 0, duration: 0.2, ease: "power2.out" }, badAt);
        queueSFX("thud", badAt, { vol: 1.0 });
      });

      var packet = el.querySelector(".cloud-packet");
      if (packet) {
        tl.fromTo(packet, { x: 0, opacity: 0 }, { opacity: 1, duration: 0.2 }, at + 0.35);
        tl.to(packet, { x: 1540, duration: 1.8, ease: "none", repeat: rep(dur, 1.8) }, at + 0.4);
      }
      if (el.querySelector(".cloud-title")) {
        words(el.querySelector(".cloud-title"), at + 0.2, { stagger: 0.038, dur: 0.8 }, s);
      }
      if (el.querySelector(".cloud-sub")) fade(el.querySelector(".cloud-sub"), at + 0.6, { dur: 0.65 });
      if (el.querySelector(".cloud-foot-sub")) fade(el.querySelector(".cloud-foot-sub"), at + 0.75, { dur: 0.65 });
    },

    mascot: function (el, s, at, dur) {
      amb(el.querySelector(".mascot-ghost"), dur, at);
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var hud = el.querySelector(".mascot-hud-frame");
      if (hud) {
        tl.fromTo(hud, { x: -40, opacity: 0, scale: 0.92 }, { x: 0, opacity: 1, scale: 1, duration: 0.85, ease: E.expo }, at + 0.05);
        tl.to(hud, { y: -8, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: repYoyo(dur, 4.4), force3D: true }, at + 0.8);
        var img = hud.querySelector(".mascot-img");
        if (img) {
          tl.fromTo(img, { scale: 1.05 }, { scale: 1.0, duration: 1.2, ease: E.smooth }, at + 0.1);
          tl.to(img, { y: -5, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: repYoyo(dur, 4.8), force3D: true }, at + 0.8);
        }
        var glare = hud.querySelector(".mascot-hud-glare");
        if (glare) {
          tl.fromTo(glare, { opacity: 0.3 }, { opacity: 0.7, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: repYoyo(dur, 3.6) }, at + 0.2);
        }
        var emitter = hud.querySelector(".mascot-emitter");
        if (emitter) {
          tl.fromTo(emitter, { opacity: 0, scale: 0.8 }, { opacity: 0.75, scale: 1, duration: 0.8, ease: E.expo }, at + 0.1);
          tl.to(emitter, { opacity: 0.45, scale: 0.95, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: repYoyo(dur, 4.4) }, at + 0.8);
        }
      }
      var bubble = el.querySelector(".mascot-bubble-box");
      if (bubble) {
        tl.fromTo(bubble, { scale: 0.88, opacity: 0, x: 20 }, { scale: 1, opacity: 1, x: 0, duration: 0.6, ease: E.soft }, at + 0.2);
      }
      words(el.querySelector(".mascot-bubble-text"), at + 0.3, { stagger: 0.04, dur: 0.75 }, s);
      if (el.querySelector(".mascot-sub")) fade(el.querySelector(".mascot-sub"), at + 0.65, { dur: 0.65 });
      var statItems = q(el, ".mst-item");
      if (statItems.length) {
        tl.fromTo(statItems, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: E.soft }, at + 0.6);
        queueSFX("click", at + 0.6, { vol: 0.7 });
      }
    },

    split: function (el, s, at, dur) {
      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      var ghost = el.querySelector(".split-ghost");
      if (ghost) {
        fade(ghost, at, { dur: 0.8, y: 10 });
        amb(ghost, dur, at);
      }
      if (el.querySelector(".split-head-title")) {
        words(el.querySelector(".split-head-title"), at + 0.05, { dur: 0.65, stagger: 0.035, y: 16 });
      } else if (el.querySelector(".split-title")) {
        words(el.querySelector(".split-title"), at + 0.35, { stagger: 0.04, dur: 0.8 }, s);
      }
      fade(el.querySelector(".split-header"), at + 0.08, { y: 10, dur: 0.5 });
      var leftPane = el.querySelector(".split-left");
      var rightPane = el.querySelector(".split-right");
      var curT = at + 0.22;
      if (leftPane) {
        tl.fromTo(leftPane, { x: -40, opacity: 0, scale: 0.96 }, { x: 0, opacity: 1, scale: 1, duration: 0.75, ease: E.expo }, at + 0.1);
        var lines = q(leftPane, ".sp-line");
        lines.forEach(function (l) {
          tl.fromTo(l, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.25, ease: E.soft }, curT);
          queueSFX("click", curT, { vol: 0.75 });
          curT += 0.2;
        });
      }
      var pkt = el.querySelector(".sp-conn-pkt");
      var head = el.querySelector(".sp-conn-head");
      var chip = el.querySelector(".split-conn-chip");
      var shootAt = Math.max(at + 0.45, curT - 0.1);

      if (chip) {
        tl.fromTo(chip, { scale: 0.75, opacity: 0, y: -6 }, { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: E.springSubtle }, shootAt);
      }

      var cycle = 0.65;
      var transitRepeats = rep(dur - (shootAt - at), cycle + 0.15);

      if (pkt) {
        tl.to(pkt, {
          keyframes: [
            { cx: 2, opacity: 0, duration: 0 },
            { cx: 14, opacity: 1, duration: cycle * 0.15, ease: "power1.out" },
            { cx: 78, opacity: 1, duration: cycle * 0.7, ease: "none" },
            { cx: 90, opacity: 0, duration: cycle * 0.15, ease: "power1.in" }
          ],
          repeat: transitRepeats,
          duration: cycle,
          repeatDelay: 0.15,
          ease: "none"
        }, shootAt + 0.05);
        queueSFX("unmask", shootAt + 0.05, { vol: 0.75 });
      }

      if (head) {
        tl.fromTo(head,
          { opacity: 0.75, scale: 0.95 },
          { opacity: 1, scale: 1.15, duration: 0.25, yoyo: true, repeat: repYoyo(dur - (shootAt - at), 0.5), ease: "sine.inOut" },
          shootAt + 0.2
        );
      }
      if (rightPane) {
        tl.fromTo(rightPane, { x: 40, opacity: 0, scale: 0.96 }, { x: 0, opacity: 1, scale: 1, duration: 0.75, ease: E.expo }, at + 0.18);
        var isBad = rightPane.classList.contains("is-bad");
        var impactT = shootAt + 0.38;
        if (isBad) {
          queueSFX("thud", impactT, { vol: 1.15 });
          tl.fromTo(rightPane,
            { boxShadow: "0 0 0px rgba(0,0,0,0)" },
            { boxShadow: "0 0 38px -4px rgba(255,90,110,0.85)", duration: 0.4, yoyo: true, repeat: 3 },
            impactT
          );
          tl.fromTo(rightPane, { x: 8 }, { x: 0, duration: 0.22, ease: "power2.out" }, impactT);
          var mOv = el.querySelector(".m-ov");
          if (mOv) {
            var avatar = mOv.querySelector(".m-ov-avatar");
            if (avatar) {
              tl.to(avatar, { rotate: 5, scale: 1.05, duration: 0.22, yoyo: true, repeat: 1, ease: E.springSubtle }, impactT);
            }
          }
        }
        var pts = q(rightPane, ".sp-pt");
        tl.fromTo(pts, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.1, ease: E.soft }, impactT + 0.12);
      }
      if (el.querySelector(".split-foot-sub")) {
        fade(el.querySelector(".split-foot-sub"), at + 0.65, { dur: 0.65 });
      } else if (el.querySelector(".split-sub")) {
        fade(el.querySelector(".split-sub"), at + 0.65, { dur: 0.65 });
      }
    },

    outro: function (el, s, at, dur) {
      var wrap = el.querySelector(".out-wrap");
      if (wrap) {
        tl.fromTo(wrap, { scale: 0.985 }, { scale: 1.015, duration: dur, ease: "none" }, at);
      }

      var ghost = el.querySelector(".out-ghost");
      if (ghost) {
        tl.fromTo(ghost, { opacity: 0, scale: 1.08, x: 40 }, { opacity: 1, scale: 1, x: 0, duration: 2.2, ease: E.expo }, at);
        var laser = el.querySelector(".out-ghost-laser");
        if (laser) {
          tl.fromTo(laser, { left: "-150px" }, { left: "100%", duration: 1.8, ease: "power2.inOut" }, at + 0.6);
        }
      }

      fade(el.querySelector(".eyebrow"), at, { y: 12, dur: 0.55 });
      words(el.querySelector(".out-title"), at + 0.1, { stagger: 0.05, dur: 0.9 }, s);
      if (el.querySelector(".out-sub")) fade(el.querySelector(".out-sub"), at + 0.45, { dur: 0.7 });

      var pill = el.querySelector(".out-btn-pill");
      if (pill) {
        tl.fromTo(pill, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: E.springSubtle }, at + 0.7);
      }

      var badges = q(el, ".out-social-badge");
      if (badges.length) {
        tl.fromTo(badges, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.12, ease: E.soft }, at + 0.85);
      }

      queueSFX("thud", at, { vol: 0.75 });
      queueSFX("chime", at + 0.75, { vol: 0.85 });
    },
  };

  /* ---------------------------------------------------------- build */
  gsap.set(".sc-in", { transformOrigin: "50% 48%" });

  SCENES.forEach(function (s, i) {
    var el = document.getElementById("s" + String(i + 1).padStart(3, "0"));
    if (!el) return;
    var at = s.start;
    var dur = s.end - s.start;
    var scIn = el.querySelector(".sc-in");
    var ambEl = el.querySelector(".amb");
    var evidenceVideo = document.getElementById("evidence-video-" + (i + 1));
    var evidenceViewport = el.querySelector(".evidence-viewport");
    if (evidenceVideo && evidenceViewport) {
      // Media has one timing owner at the root, but follows its scene's layout.
      var rootBox = document.getElementById("root").getBoundingClientRect();
      var box = evidenceViewport.getBoundingClientRect();
      var renderScale = rootBox.width / document.getElementById("root").clientWidth;
      gsap.set(evidenceVideo, {
        left: (box.left - rootBox.left) / renderScale,
        top: (box.top - rootBox.top) / renderScale,
        width: box.width / renderScale,
        height: box.height / renderScale
      });
    }

    /* accent for shared bloom & dynamic CSS variable */
    tl.to(":root", { "--ac": s.accent || "#38bdf8", duration: 1.0, ease: "sine.inOut" }, at);

    /* One owner per transform. Data stays still; punch cuts get a short push. */
    // Headline scenes used to creep to scale 1.012 across the whole scene. That
    // resamples every glyph each frame, so large text visibly shimmers while it
    // holds. The push now finishes early and lands exactly on 1.
    var isPunch = Boolean(s.punch || s.type === "meme");
    if (scIn) {
      tl.fromTo(scIn,
        { scale: isPunch ? 1.025 : 1, x: 0, y: 0, rotate: 0 },
        { scale: 1, duration: isPunch ? Math.min(0.6, dur) : 0.001, ease: E.soft }, at);
    }
    tl.to("#bg-bloom", {
      opacity: s.type === "stat" ? 0.16 : 0.13,
      duration: Math.min(1, dur), ease: "sine.inOut"
    }, at);
    if (ambEl) {
      tl.fromTo(ambEl, { opacity: 0.07 },
        { opacity: 0.11, duration: dur, ease: "sine.inOut" }, at);
    }

    /* Universal Mascot Overlay with Living Emotion & Telemetry */
    var mOv = el.querySelector(".m-ov");
    if (mOv) {
      var expr = mOv.getAttribute("data-expr") || "neutral";
      var isShock = expr === "shocked" || expr === "panic";
      var isThink = expr === "thinking" || expr === "skeptical";

      /* Emotion-aware entrance physics */
      var enterScale = 0.96;
      var enterEase = E.soft;
      tl.fromTo(mOv,
        { y: 24, opacity: 0, scale: enterScale },
        { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: enterEase },
        at + 0.12
      );
      queueSFX(isShock ? "thud" : "chime", at + 0.15, { vol: 0.8 });

      /* Living head-tilt & micro-bobbing */
      var avatar = mOv.querySelector(".m-ov-avatar");
      if (avatar) {
        var tiltDeg = isThink ? -1 : (isShock ? 0.8 : 0.4);
        tl.to(avatar, {
          rotate: tiltDeg,
          duration: 2.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: repYoyo(dur, 4.8)
        }, at + 0.7);
      }

      /* Visor Glare Pulse & Telemetry Glow */
      var mGlare = mOv.querySelector(".m-ov-glare");
      if (mGlare) {
        tl.fromTo(mGlare, { opacity: 0.2 }, { opacity: 0.65, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: repYoyo(dur, 3.0) }, at + 0.3);
      }

      /* Holographic Emitter & Light Beam */
      var mEmitter = mOv.querySelector(".m-ov-emitter");
      var mBeam = mOv.querySelector(".m-ov-beam");
      if (mEmitter) {
        tl.fromTo(mEmitter, { opacity: 0, scale: 0.8 }, { opacity: 0.75, scale: 1, duration: 0.6, ease: E.soft }, at + 0.15);
        tl.to(mEmitter, { opacity: 0.45, scale: 0.95, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: repYoyo(dur, 3.2) }, at + 0.7);
      }
      if (mBeam) {
        tl.fromTo(mBeam, { opacity: 0 }, { opacity: 0.45, duration: 0.8, ease: E.soft }, at + 0.18);
        tl.to(mBeam, { opacity: 0.25, duration: 2.0, ease: "sine.inOut", yoyo: true, repeat: repYoyo(dur, 4.0) }, at + 0.8);
      }

      /* Inward Gaze Auto-Mirroring for Left-Anchored Overlays */
      var isLeft = mOv.classList.contains("pos-bl");
      if (isLeft && avatar) {
        tl.set(avatar, { scaleX: -1 });
      }

      /* Reactive Flinch on Critical System Errors */
      if (isShock) {
        tl.fromTo(mOv, { y: -8, scale: 0.98 }, { y: 0, scale: 1, duration: 0.3, ease: "bounce.out" }, at + 0.35);
      }

      var mBubble = mOv.querySelector(".m-ov-bubble");
      if (mBubble) {
        tl.fromTo(mBubble, { scale: 0.82, opacity: 0, y: 12 }, { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: E.spring }, at + 0.28);
        queueSFX("chime", at + 0.3, { vol: 0.5 });
      }
      var mHud = mOv.querySelector(".m-ov-hud");
      if (mHud) {
        tl.fromTo(mHud, { scale: 0.72, opacity: 0, y: 12 }, { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: E.springSubtle }, at + 0.28);
        queueSFX("unmask", at + 0.28, { vol: 0.65 });
        tl.to(mHud, { y: -3, duration: 2.0, ease: "sine.inOut", yoyo: true, repeat: repYoyo(dur, 4.0), force3D: true }, at + 0.75);
      }
      var mRing = mOv.querySelector(".m-ov-ring");
      if (mRing) {
        tl.to(mRing, { opacity: 0.85, scale: 1.12, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: repYoyo(dur, 1.6) }, at + 0.2);
      }

      /* Directional Pointing Angle */
      if (expr === "pointing") {
        tl.to(mOv, { rotate: isLeft ? 3.5 : -3.5, duration: 0.6, ease: E.soft }, at + 0.35);
      }

      /* Audio-Synced Visor Telemetry Pulse on Spoken Words */
      if (s.wordTimings && s.wordTimings.length && mRing) {
        s.wordTimings.forEach(function (wt, wIdx) {
          if (wIdx % 2 === 0 && wt.t < dur - 0.25) {
            var wordAt = at + Math.max(0.1, wt.t);
            tl.to(mRing, { opacity: 0.95, scale: 1.16, duration: 0.12, ease: "power1.out", yoyo: true, repeat: 1 }, wordAt);
          }
        });
      }

      /* Multi-State Mascot Timeline Flips */
      if (s.mascotTimeline && Array.isArray(s.mascotTimeline)) {
        s.mascotTimeline.forEach(function (step, sIdx) {
          var stepAt = at + Math.min(Math.max(0.2, step.at || 1.0), dur - 0.2);
          var stepImg = mOv.querySelector('.m-ov-avatar-step[data-step-idx="' + sIdx + '"]');
          var stepExpr = step.expression || "neutral";
          var isStepShock = stepExpr === "shocked" || stepExpr === "panic";

          if (stepImg) {
            tl.to(stepImg, { opacity: 1, duration: 0.2, ease: "power2.out" }, stepAt);
          }

          if (isStepShock || stepExpr === "facepalm") {
            tl.fromTo(mOv, { scale: 0.95, y: 6 }, { scale: 1.0, y: 0, duration: 0.35, ease: E.spring }, stepAt);
            queueSFX(isStepShock ? "thud" : "chime", stepAt, { vol: 0.85 });
          }

          if (step.bubble) {
            var bText = mOv.querySelector(".m-ov-btext");
            var bBox = mOv.querySelector(".m-ov-bubble");
            if (bBox && bText) {
              tl.set(bText, { textContent: step.bubble }, stepAt);
              tl.fromTo(bBox, { display: "block", scale: 0.85, opacity: 0, y: 8 }, { display: "block", scale: 1, opacity: 1, y: 0, duration: 0.4, ease: E.spring }, stepAt);
            }
          }
        });
      }
    }

    /* Contextual Scene Transition */
    var previousS = SCENES[i - 1];
    cutTransition(s, previousS, at, i, dur);

    /* Execute scene type animation */
    var fn = ANIM[s.type] || ANIM.statement;
    fn(el, s, at, dur);

    var evidence = el.querySelector(".evidence-frame, .brand-grid");
    if (evidence) {
      tl.fromTo(evidence, { x: 32, opacity: 0 }, { x: 0, opacity: 1, duration: 0.65, ease: E.soft }, at + 0.1);
      // Hold text-heavy evidence at a stable pixel size once it lands.
    }
    if (evidenceVideo) {
      tl.fromTo(evidenceVideo, { x: 32, opacity: 0 }, { x: 0, opacity: 1, duration: 0.65, ease: E.soft }, at + 0.1);
    }

    /* Forensic Redactions & Live Highlighting */
    forensicAnimations(el, at, dur, s);

    /* Smooth Scene Exit: dissolve outgoing contents slightly before the incoming scene cut */
    if (i < SCENES.length - 1 && dur > 1.2 && scIn) {
      tl.to(scIn, { opacity: 0.1, duration: 0.12, ease: "power1.in" }, at + dur - 0.12);
    }
  });

  /* Retention Subtitle Rail synchronization */
  var subRail = document.getElementById("retention-subtitles");
  if (subRail) {
    var subTrack = subRail.querySelector(".retention-sub-track");
    SCENES.forEach(function (s) {
      if (!s.wordTimings || !s.wordTimings.length) return;
      var at = s.start;
      var dur = s.end - s.start;
      var chunk = document.createElement("div");
      chunk.className = "retention-sub-chunk";
      s.wordTimings.forEach(function (wt) {
        var span = document.createElement("span");
        span.className = "sub-w";
        span.textContent = wt.w + " ";
        chunk.appendChild(span);
      });
      subTrack.appendChild(chunk);
      gsap.set(chunk, { display: "none", opacity: 0 });
      tl.set(chunk, { display: "flex", opacity: 1 }, at);
      tl.set(chunk, { display: "none", opacity: 0 }, at + dur);

      var wordsSpans = chunk.querySelectorAll(".sub-w");
      s.wordTimings.forEach(function (wt, wIdx) {
        var wSpan = wordsSpans[wIdx];
        if (!wSpan) return;
        var wTime = at + wt.t;
        var wDur = Math.max(0.12, wt.d || 0.25);
        tl.fromTo(wSpan,
          { color: "rgba(255,255,255,0.45)", textShadow: "none" },
          { color: ac(s), textShadow: "0 0 10px " + ac(s), duration: 0.08, ease: "none" },
          wTime
        );
        tl.to(wSpan,
          { color: "rgba(255,255,255,0.9)", textShadow: "none", duration: 0.15, ease: "none" },
          wTime + wDur
        );
      });
    });
  }

  /* Background music bed with automated sidechain ducking */
  var bgmEl = document.getElementById("bgm");
  if (bgmEl) {
    tl.set(bgmEl, { volume: 0.22 }, 0);
    SCENES.forEach(function (s) {
      var speechStart = s.speechStart != null ? s.speechStart : s.start;
      var speechEnd = s.speechEnd != null ? s.speechEnd : s.end;
      if (speechEnd > speechStart) {
        tl.to(bgmEl, { volume: 0.06, duration: 0.15, ease: "power1.out" }, speechStart);
        tl.to(bgmEl, { volume: 0.22, duration: 0.35, ease: "power1.inOut" }, speechEnd);
      }
    });
  }

  /* final fade at the very end */
  tl.to("#bg-vignette", { opacity: 1, duration: 0.6 }, Math.max(0, TOTAL - 0.8));

  window.__timelines = window.__timelines || {};
  window.__timelines["__COMPOSITION_ID__"] = tl;
  });
})();
