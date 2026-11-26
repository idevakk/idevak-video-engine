/* ============================================================================
 * Dedicated GSAP Choreography: chalkboard-explainer
 * Kinetic, word-synced progressive reveals: synchronous paused GSAP timeline,
 * spoken-word cue matcher (with number-word & revealOn/cue support), monotonic
 * beat spreading across each scene's speech window, SVG stroke-draw, highlight
 * sweeps, and deterministic soft SFX triggers.
 * ========================================================================== */
(function () {
  var SCENES = window.__SCENES__ || [];
  var TOTAL = window.__TOTAL__ || 1;
  var tl = gsap.timeline({ paused: true });
  gsap.config({ nullTargetWarn: false });

  function q(el, sel) {
    return el ? Array.prototype.slice.call(el.querySelectorAll(sel)) : [];
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  var sfxEvents = [];
  window.__SFX_EVENTS__ = sfxEvents;
  function queueSFX(type, at, opt) {
    if (Number.isFinite(at) && at >= 0 && at < TOTAL) {
      sfxEvents.push({ type: type, at: at, vol: opt && opt.vol != null ? opt.vol : 1 });
    }
  }

  window.__synthesizeSFX = async function () {
    var clips = {};
    var play = window.__CB_PLAY_SFX__;
    var types = Array.from(new Set(sfxEvents.map(function (e) { return e.type; })));
    for (var k = 0; k < types.length; k++) {
      var type = types[k];
      var ctx = new OfflineAudioContext(1, 16800, 48000);
      if (typeof play === "function") play(type, { vol: 1 }, ctx);
      var buf = await ctx.startRendering();
      clips[type] = Array.from(buf.getChannelData(0));
    }
    return { events: sfxEvents, clips: clips };
  };

  /* ---------------------------------------------------------- word-sync engine */
  var STOP = {
    the: 1, a: 1, an: 1, and: 1, or: 1, of: 1, to: 1, in: 1, on: 1, for: 1,
    is: 1, are: 1, at: 1, by: 1, via: 1, with: 1, from: 1, only: 1, just: 1,
    it: 1, as: 1, be: 1, your: 1, local: 1, fast: 1, full: 1, open: 1
  };
  var ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function pushNumberWords(out, numStr) {
    var clean = numStr.replace(/,/g, "");
    var n = parseInt(clean, 10);
    if (!Number.isFinite(n) || n < 0 || n > 999999) return;
    if (n >= 1000) {
      var th = Math.floor(n / 1000);
      if (th < 20) out.push(ONES[th]);
      else {
        var ht = Math.floor(th / 100);
        if (ht > 0 && ht < 20) { out.push(ONES[ht]); out.push("hundred"); }
        var rt = th % 100;
        if (rt >= 20) { out.push(TENS[Math.floor(rt / 10)]); if (rt % 10) out.push(ONES[rt % 10]); }
        else if (rt > 0) out.push(ONES[rt]);
      }
      out.push("thousand");
      n = n % 1000;
      if (n === 0) return;
    }
    var h = Math.floor(n / 100);
    if (h > 0 && h < 20) { out.push(ONES[h]); out.push("hundred"); }
    var r = n % 100;
    if (r >= 20) {
      out.push(TENS[Math.floor(r / 10)]);
      if (r % 10) out.push(ONES[r % 10]);
    } else if (r > 0 || (h === 0 && clean === "0")) {
      out.push(ONES[r]);
    }
  }

  function normRawTokens(text) {
    return String(text || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  }

  function expandCueTokens(text, keepStop) {
    var raw = String(text || "").toLowerCase();
    var parts = raw.replace(/(\d),(\d{3})/g, "$1$2").match(/[a-z0-9]+/g) || [];
    var out = [];
    parts.forEach(function (tok) {
      if (!keepStop && STOP[tok]) return;
      out.push(tok);
      if (/^\d+$/.test(tok)) {
        pushNumberWords(out, tok);
      }
    });
    return Array.from(new Set(out));
  }

  function buildWordStream(s) {
    var list = [];
    var wts = Array.isArray(s.wordTimings) ? s.wordTimings : [];
    for (var i = 0; i < wts.length; i++) {
      var toks = normRawTokens(wts[i].w);
      for (var j = 0; j < toks.length; j++) {
        list.push({ tok: toks[j], t: Number(wts[i].t) || 0 });
      }
    }
    return list;
  }

  function findSpokenOffset(s, stream, hintText, explicitCue, minRel, maxRel) {
    if (typeof explicitCue === "number" && Number.isFinite(explicitCue)) {
      return clamp(explicitCue, minRel, maxRel);
    }
    if (!stream.length) return null;

    var hasExplicit = typeof explicitCue === "string" && explicitCue.trim().length > 0;
    var cueTokens = hasExplicit
      ? expandCueTokens(explicitCue, true)
      : expandCueTokens(hintText, false);
    if (!cueTokens.length && hintText) {
      cueTokens = expandCueTokens(hintText, true);
    }
    if (!cueTokens.length) return null;

    if (hasExplicit) {
      var seq = normRawTokens(explicitCue);
      if (seq.length >= 2) {
        for (var i = 0; i <= stream.length - seq.length; i++) {
          var ok = true;
          for (var k = 0; k < seq.length; k++) {
            if (stream[i + k].tok !== seq[k]) { ok = false; break; }
          }
          if (ok && stream[i].t <= maxRel + 0.35) {
            return clamp(stream[i].t, minRel, maxRel);
          }
        }
      }
    }

    // Score each window of 4 spoken tokens against cueTokens to locate the exact beat.
    var bestScore = 0;
    var bestTime = null;
    var cueSet = {};
    cueTokens.forEach(function (ct) { cueSet[ct] = 1; });

    for (var idx = 0; idx < stream.length; idx++) {
      var wt = stream[idx].t;
      if (wt < minRel - 0.35 || wt > maxRel + 0.35) continue;
      var score = 0;
      var seen = {};
      for (var w = 0; w < 4 && idx + w < stream.length; w++) {
        var tok = stream[idx + w].tok;
        if (seen[tok]) continue;
        seen[tok] = 1;
        if (cueSet[tok]) {
          score += (w === 0 ? 1.5 : 1.0) + (tok.length >= 5 ? 0.5 : 0);
        } else if (tok.length >= 4) {
          for (var c = 0; c < cueTokens.length; c++) {
            if (cueTokens[c].length >= 4 && (tok.indexOf(cueTokens[c]) === 0 || cueTokens[c].indexOf(tok) === 0)) {
              score += 0.7;
              break;
            }
          }
        }
      }
      if (score > bestScore + 0.05) {
        bestScore = score;
        bestTime = wt;
      }
    }

    if (bestTime != null && bestScore >= 1.2) {
      return clamp(bestTime, minRel, maxRel);
    }
    return null;
  }

  function scheduleBeats(s, dur, specs, opt) {
    opt = opt || {};
    var n = specs.length;
    if (!n) return [];
    var speechLen = (typeof s.speechEnd === "number" && typeof s.speechStart === "number")
      ? Math.max(1.8, s.speechEnd - s.start)
      : Math.max(1.8, dur * 0.88);
    var winStart = clamp(opt.start != null ? opt.start : Math.min(0.45, dur * 0.08), 0.12, Math.max(0.2, dur - 1.2));
    var winEnd = clamp(opt.end != null ? opt.end : Math.min(dur - 0.58, speechLen * 0.92), winStart + 0.5, dur - 0.45);
    var minGap = opt.minGap != null ? opt.minGap : Math.min(0.48, Math.max(0.2, (winEnd - winStart) / Math.max(1, n * 1.45)));

    var stream = buildWordStream(s);
    var raw = specs.map(function (sp, idx) {
      var defaultT = winStart + (n === 1 ? 0 : (idx / Math.max(1, n - 1)) * (winEnd - winStart) * 0.88);
      var hit = findSpokenOffset(
        s,
        stream,
        sp && sp.hint ? sp.hint : "",
        sp ? (sp.cue != null ? sp.cue : sp.revealOn) : null,
        winStart,
        winEnd
      );
      return { hit: hit, fallback: defaultT };
    });

    // Anchor unmatched slots smoothly between matched neighbors so beats flow across speech.
    var times = new Array(n);
    var cursor = winStart;
    for (var i = 0; i < n; i++) {
      var candidate = raw[i].hit;
      if (candidate == null) {
        var prevIdx = -1;
        for (var p = i - 1; p >= 0; p--) {
          if (raw[p].hit != null) { prevIdx = p; break; }
        }
        var nextIdx = -1;
        for (var nx = i + 1; nx < n; nx++) {
          if (raw[nx].hit != null) { nextIdx = nx; break; }
        }
        if (prevIdx !== -1 && nextIdx !== -1) {
          var frac = (i - prevIdx) / (nextIdx - prevIdx);
          candidate = times[prevIdx] + frac * Math.max(minGap * (nextIdx - prevIdx), raw[nextIdx].hit - times[prevIdx]);
        } else if (prevIdx !== -1) {
          var rem = Math.max(1, n - 1 - prevIdx);
          candidate = times[prevIdx] + ((i - prevIdx) / rem) * Math.max(minGap * rem, winEnd - times[prevIdx]);
        } else if (nextIdx !== -1) {
          candidate = winStart + (i / Math.max(1, nextIdx)) * Math.max(minGap * nextIdx, raw[nextIdx].hit - winStart);
        } else {
          candidate = raw[i].fallback;
        }
      }
      var placed = Math.max(cursor, candidate);
      var maxAllowed = winEnd - (n - 1 - i) * Math.min(0.22, minGap * 0.6);
      placed = clamp(placed, winStart, Math.max(winStart, maxAllowed));
      times[i] = placed;
      cursor = placed + minGap;
    }
    return times;
  }

  /* ---------------------------------------------------------- motion primitives */
  function drawPaths(paths, at, opts) {
    opts = opts || {};
    var dur = opts.dur || 0.5;
    var stagger = opts.stagger || 0.06;
    paths.forEach(function (p, idx) {
      var len = 300;
      try { len = Math.max(10, p.getTotalLength()); } catch (e) {}
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(p, { strokeDashoffset: 0, duration: dur, ease: "power2.inOut" }, at + idx * stagger);
    });
  }

  function fadeIn(el, at, opts) {
    if (!el) return;
    opts = opts || {};
    var fromVars = { opacity: 0, y: opts.y == null ? 14 : opts.y };
    var toVars = { opacity: 1, y: 0, duration: opts.dur || 0.42, ease: opts.ease || "power2.out" };
    if (opts.scale != null) {
      fromVars.scale = opts.scale;
      toVars.scale = 1;
    }
    tl.fromTo(el, fromVars, toVars, at);
  }

  function popBox(boxEl, at, opts) {
    if (!boxEl) return;
    opts = opts || {};
    fadeIn(boxEl, at, { y: opts.y == null ? 16 : opts.y, scale: opts.scale == null ? 0.94 : opts.scale, dur: opts.dur || 0.42, ease: "back.out(1.25)" });
    drawPaths(q(boxEl, ".cb-box-svg .cb-draw"), at, { dur: opts.drawDur || 0.42, stagger: 0.03 });
    drawPaths(q(boxEl, ".cb-icon .cb-draw"), at + 0.08, { dur: 0.36, stagger: 0.03 });
  }

  function drawX(el, at) {
    var strokes = q(el, ".cb-x-stroke");
    if (!strokes.length) return;
    drawPaths(strokes, at, { dur: 0.24, stagger: 0.14 });
    queueSFX("thud", at, { vol: 0.85 });
    queueSFX("swipe", at + 0.12, { vol: 0.7 });
  }

  function animateBottomPill(el, s, at, dur, fallbackT) {
    var bottom = el.querySelector(".cb-bottom-pill");
    if (!bottom) return;
    var m = s.meta || {};
    var stream = buildWordStream(s);
    var hit = findSpokenOffset(s, stream, m.bottomPill || "", m.bottomCue, at + 0.6 - at, dur - 0.55);
    var bt = at + (hit != null ? clamp(hit, 0.5, dur - 0.55) : Math.min(dur - 0.6, fallbackT));
    fadeIn(bottom, bt, { y: 12, scale: 0.92, dur: 0.4, ease: "back.out(1.3)" });
    drawPaths(q(bottom, ".cb-draw"), bt, { dur: 0.35 });
    queueSFX("pop", bt, { vol: 0.85 });
  }

  var ANIM = {
    cb_title: function (el, s, at, dur) {
      var m = s.meta || {};
      var eyebrow = el.querySelector(".cb-eyebrow");
      var hero = el.querySelector(".cb-hero-row");
      var barWrap = el.querySelector(".cb-bar-wrap");
      var fill = el.querySelector(".cb-sketch-bar-fill");
      var barMeta = el.querySelector(".cb-bar-meta");
      var payoff = el.querySelector(".cb-payoff-row");
      var pill = el.querySelector(".cb-title-pill");
      var sub = el.querySelector(".cb-sub-center");

      if (at === 0) {
        gsap.set([eyebrow, hero].filter(Boolean), { opacity: 1, y: 0 });
      } else {
        fadeIn(eyebrow, at, { y: 6, dur: 0.32 });
        fadeIn(hero, at + 0.08, { y: 14, scale: 0.96, dur: 0.45, ease: "back.out(1.2)" });
      }

      var beats = scheduleBeats(s, dur, [
        { hint: (m.barLabel || "") + " " + (m.barValue || "") + " context window", cue: m.barCue },
        { hint: (m.stat || "") + " " + (m.statUnit || "") + " " + (m.statLabel || "") + " " + (m.pill || ""), cue: typeof s.revealTime === "number" ? s.revealTime : m.revealOn }
      ], { start: at === 0 ? Math.min(dur * 0.25, 1.4) : 0.6, end: dur - 0.8 });

      if (barWrap) {
        var bt = at + beats[0];
        drawPaths(q(barWrap, ".cb-draw"), Math.max(at + 0.2, bt - 0.2), { dur: 0.42, stagger: 0.04 });
        if (fill) {
          gsap.set(fill, { scaleX: 0, opacity: 0 });
          tl.to(fill, { scaleX: 1, opacity: 1, duration: 0.72, ease: "power2.out" }, bt);
          queueSFX("swipe", bt, { vol: 0.75 });
        }
        fadeIn(barMeta, bt + 0.16, { y: 8, dur: 0.38 });
      }

      var payoffAt = at + (beats[1] || Math.min(dur * 0.58, 2.2));
      if (payoff) {
        fadeIn(payoff, payoffAt, { y: 14, scale: 0.92, dur: 0.45, ease: "back.out(1.3)" });
        if (pill) {
          drawPaths(q(pill, ".cb-draw"), payoffAt, { dur: 0.35 });
          queueSFX("pop", payoffAt, { vol: 0.8 });
        }
        queueSFX("ding", payoffAt + 0.12, { vol: 0.8 });
        drawPaths(q(el, ".cb-trend-overlay .cb-draw"), payoffAt + 0.22, { dur: 0.35 });
      }
      if (sub) fadeIn(sub, at + Math.min(dur * 0.4, 1.2), { y: 10, dur: 0.42 });
    },

    cb_cards: function (el, s, at, dur) {
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      var cards = q(el, ".cb-card");
      var metaCards = (s.meta && s.meta.cards) || [];
      var beats = scheduleBeats(s, dur, cards.map(function (c, k) {
        var mc = metaCards[k] || {};
        return { hint: (mc.title || "") + " " + (mc.sub || ""), cue: mc.revealOn || mc.cue };
      }), { start: 0.35, end: (s.meta && s.meta.bottomPill) ? dur * 0.78 : dur - 0.7 });

      cards.forEach(function (c, k) {
        var t = at + (beats[k] || 0.3 + k * 0.6);
        popBox(c, t, { y: 18, scale: 0.93, dur: 0.44 });
        queueSFX("pop", t + 0.04, { vol: 0.75 });
        if (c.classList.contains("is-xout")) {
          var nextGap = k + 1 < beats.length ? Math.min(0.65, (beats[k + 1] - beats[k]) * 0.65) : 0.55;
          var xAt = Math.min(at + dur - 0.55, t + Math.max(0.45, nextGap));
          drawX(c, xAt);
          tl.to(c, { opacity: 0.62, duration: 0.3, ease: "power1.out" }, xAt + 0.26);
        }
      });

      var lastBeat = beats.length ? beats[beats.length - 1] + 0.65 : dur * 0.75;
      animateBottomPill(el, s, at, dur, lastBeat);
    },

    cb_formula: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      var box = el.querySelector(".cb-formula-box");
      if (box) {
        drawPaths(q(box, ".cb-draw"), at + 0.1, { dur: 0.55, stagger: 0.05 });
      }

      var factors = q(el, ".cb-factor");
      var ops = q(el, ".cb-op");
      var metaFactors = m.factors || [];
      var beats = scheduleBeats(s, dur, metaFactors.map(function (f) {
        return { hint: (f.val || "") + " " + (f.label || ""), cue: f.revealOn || f.cue };
      }), { start: 0.45, end: dur * 0.68 });

      factors.forEach(function (f, k) {
        var ft = at + (beats[k] || 0.45 + k * 0.6);
        if (k > 0 && ops[k - 1]) {
          fadeIn(ops[k - 1], Math.max(at + 0.25, ft - 0.12), { y: 6, scale: 0.85, dur: 0.26 });
        }
        fadeIn(f, ft, { y: 10, scale: 0.9, dur: 0.34, ease: "back.out(1.3)" });
        queueSFX("click", ft, { vol: 0.72 });
      });

      var res = el.querySelector(".cb-formula-result");
      if (res) {
        var resBeats = scheduleBeats(s, dur, [
          { hint: (m.result || "") + " " + (m.resultLabel || ""), cue: typeof s.revealTime === "number" ? s.revealTime : m.revealOn }
        ], { start: Math.max(0.8, (beats[beats.length - 1] || 1.2) + 0.5), end: dur - 0.6 });
        var resAt = at + resBeats[0];
        fadeIn(res, resAt, { y: 14, scale: 0.9, dur: 0.45, ease: "back.out(1.35)" });
        drawPaths(q(res, ".cb-draw"), resAt, { dur: 0.35 });
        queueSFX("ding", resAt + 0.08, { vol: 0.88 });
      }
    },

    cb_stat_bar: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });

      var hrows = q(el, ".cb-hrow");
      if (hrows.length) {
        var metaBars = m.bars || [];
        var barBeats = scheduleBeats(s, dur, metaBars.map(function (b) {
          return { hint: (b.label || "") + " " + (b.value || "") + " " + (b.status || ""), cue: b.revealOn || b.cue };
        }), { start: 0.4, end: m.bottomPill ? dur * 0.78 : dur - 0.65 });

        hrows.forEach(function (row, k) {
          var rt = at + (barBeats[k] || 0.4 + k * 0.8);
          fadeIn(row, rt, { y: 10, dur: 0.34 });
          drawPaths(q(row, ".cb-draw"), rt, { dur: 0.34 });
          var f = row.querySelector(".cb-hrow-fill");
          if (f) {
            gsap.set(f, { scaleX: 0 });
            tl.to(f, { scaleX: 1, duration: 0.55, ease: "power2.out" }, rt + 0.14);
            queueSFX("swipe", rt + 0.14, { vol: 0.65 });
          }
          var badge = row.querySelector(".cb-hrow-badge");
          if (badge) {
            fadeIn(badge, rt + 0.38, { y: 4, scale: 0.88, dur: 0.28, ease: "back.out(1.4)" });
            queueSFX("pop", rt + 0.38, { vol: 0.6 });
          }
        });
        animateBottomPill(el, s, at, dur, (barBeats[barBeats.length - 1] || 1.5) + 0.6);
        return;
      }

      var convCard = el.querySelector(".cb-conv-card");
      if (convCard) {
        var convBeats = scheduleBeats(s, dur, [
          { hint: m.sourceCard || "dense model" },
          { hint: (m.value || "") + " " + (m.unit || "") + " " + (m.label || ""), cue: typeof s.revealTime === "number" ? s.revealTime : m.revealOn },
          { hint: (m.barLabel || "") + " " + (m.barValue || "") + " context", cue: m.barCue }
        ], { start: 0.3, end: dur - 0.75 });

        popBox(convCard, at + convBeats[0], { y: 12, scale: 0.94, dur: 0.42 });
        queueSFX("pop", at + convBeats[0], { vol: 0.7 });

        var arrowAt = at + Math.max(convBeats[0] + 0.32, (convBeats[0] + convBeats[1]) * 0.5);
        drawPaths(q(el, ".cb-conv-arrow .cb-draw"), arrowAt, { dur: 0.38, stagger: 0.08 });
        queueSFX("whoosh", arrowAt, { vol: 0.65 });

        fadeIn(el.querySelector(".cb-conv-right"), at + convBeats[1], { y: 12, scale: 0.9, dur: 0.44, ease: "back.out(1.3)" });
        drawPaths(q(el, ".cb-conv-right .cb-icon .cb-draw"), at + convBeats[1], { dur: 0.36 });
        queueSFX("ding", at + convBeats[1] + 0.06, { vol: 0.82 });

        var barFill = el.querySelector(".cb-sketch-bar-fill");
        if (barFill) {
          var bt = at + convBeats[2];
          drawPaths(q(el, ".cb-bar-wrap .cb-draw"), bt - 0.15, { dur: 0.38, stagger: 0.04 });
          gsap.set(barFill, { scaleX: 0 });
          tl.to(barFill, { scaleX: 1, duration: 0.65, ease: "power2.out" }, bt);
          queueSFX("swipe", bt, { vol: 0.65 });
          fadeIn(el.querySelector(".cb-bar-meta"), bt + 0.18, { y: 6, dur: 0.34 });
        }
        animateBottomPill(el, s, at, dur, convBeats[2] + 0.65);
        return;
      }

      var metricHero = el.querySelector(".cb-metric-hero");
      var mBeats = scheduleBeats(s, dur, [
        { hint: (m.value || "") + " " + (m.unit || "") + " " + (m.label || ""), cue: typeof s.revealTime === "number" ? s.revealTime : m.revealOn },
        { hint: (m.barLabel || "") + " " + (m.barRight || ""), cue: m.barCue }
      ], { start: 0.3, end: dur - 0.75 });

      if (metricHero) {
        fadeIn(metricHero, at + mBeats[0], { y: 12, scale: 0.92, dur: 0.44, ease: "back.out(1.3)" });
        drawPaths(q(metricHero, ".cb-icon .cb-draw"), at + mBeats[0], { dur: 0.38, stagger: 0.04 });
        queueSFX("ding", at + mBeats[0] + 0.06, { vol: 0.8 });
        if (metricHero.classList.contains("is-xout")) {
          drawX(metricHero, Math.min(at + dur - 0.6, at + mBeats[0] + 0.75));
        }
      }
      var pinnedFill = el.querySelector(".cb-pinned-row .cb-sketch-bar-fill");
      if (pinnedFill) {
        var pt = at + mBeats[1];
        drawPaths(q(el, ".cb-pinned-row .cb-draw"), pt - 0.15, { dur: 0.38, stagger: 0.04 });
        gsap.set(pinnedFill, { scaleX: 0 });
        tl.to(pinnedFill, { scaleX: 1, duration: 0.65, ease: "power2.out" }, pt);
        queueSFX("swipe", pt, { vol: 0.65 });
        fadeIn(el.querySelector(".cb-pinned-lbl"), pt, { y: 6, dur: 0.32 });
        fadeIn(el.querySelector(".cb-pinned-val"), pt + 0.2, { y: 6, scale: 0.92, dur: 0.34 });
      }
      animateBottomPill(el, s, at, dur, mBeats[1] + 0.65);
    },

    cb_vram_stack: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      drawPaths(q(el, ".cb-vram-tank-frame > .cb-box-svg .cb-draw"), at + 0.12, { dur: 0.55, stagger: 0.05 });

      // Bottom-to-top stacking synced directly to spoken weights -> KV cache -> runtime order
      var metaLayers = (m.layers || []).slice().reverse();
      var rows = q(el, ".cb-vram-row").reverse();
      var beats = scheduleBeats(s, dur, metaLayers.map(function (ly) {
        return { hint: (ly.size || "") + " " + (ly.title || ""), cue: ly.revealOn || ly.cue };
      }), { start: 0.45, end: m.ceiling ? dur * 0.78 : dur - 0.65 });

      rows.forEach(function (row, k) {
        var rt = at + (beats[k] || 0.45 + k * 0.8);
        var blk = row.querySelector(".cb-vram-block");
        var lbl = row.querySelector(".cb-vram-lbl");
        if (blk) {
          gsap.set(blk, { scaleY: 0, opacity: 0 });
          tl.to(blk, { scaleY: 1, opacity: 1, duration: 0.48, ease: "power2.out" }, rt);
        }
        fadeIn(lbl, rt + 0.08, { y: 8, dur: 0.36 });
        queueSFX("pop", rt + 0.05, { vol: 0.72 });
      });

      var ceil = el.querySelector(".cb-vram-ceiling");
      if (ceil) {
        var ceilBeats = scheduleBeats(s, dur, [
          { hint: m.ceiling || "32 GB card", cue: m.ceilingCue }
        ], { start: Math.max(0.6, (beats[beats.length - 1] || 1.2) + 0.35), end: dur - 0.55 });
        fadeIn(ceil, at + ceilBeats[0], { y: 0, scale: 0.96, dur: 0.38 });
        queueSFX("ding", at + ceilBeats[0], { vol: 0.78 });
      }
    },

    cb_layer_grid: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      var cells = q(el, ".cb-grid-cell");
      var lit = q(el, ".cb-grid-cell.is-lit");
      tl.fromTo(cells, { opacity: 0 }, { opacity: 1, duration: 0.35, stagger: 0.004 }, at + 0.14);

      var specs = q(el, ".cb-spec-row");
      var metaSpecs = m.specs || [];
      var beatList = [{ hint: "full attention layers carry" }].concat(metaSpecs.map(function (sp) {
        return { hint: (sp.label || "") + " " + (sp.value || ""), cue: sp.revealOn || sp.cue };
      }));
      var beats = scheduleBeats(s, dur, beatList, { start: 0.45, end: dur - 0.65 });

      if (lit.length) {
        tl.fromTo(lit, { scale: 0.82 }, { scale: 1, duration: 0.34, stagger: 0.014, ease: "back.out(1.4)" }, at + beats[0]);
        queueSFX("tick", at + beats[0], { vol: 0.72 });
      }
      specs.forEach(function (sp, k) {
        var st = at + (beats[k + 1] || 0.7 + k * 0.75);
        fadeIn(sp, st, { y: 8, dur: 0.36 });
        drawPaths(q(sp, ".cb-icon .cb-draw"), st, { dur: 0.3 });
        var ldr = sp.querySelector(".cb-spec-leader");
        if (ldr) tl.fromTo(ldr, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power2.out" }, st + 0.08);
        queueSFX("click", st + 0.1, { vol: 0.65 });
      });
    },

    cb_wiring: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      var nodes = q(el, ".cb-wire-node");
      var metaNodes = m.nodes || [];
      var nodeBeats = scheduleBeats(s, dur, metaNodes.map(function (n) {
        return { hint: (n.title || "") + " " + (n.sub || ""), cue: n.revealOn || n.cue };
      }), { start: 0.35, end: (m.pills && m.pills.length) ? dur * 0.72 : dur - 0.7 });

      nodes.forEach(function (n, k) {
        var nt = at + (nodeBeats[k] || 0.3 + k * 0.6);
        popBox(n, nt, { y: 10, scale: 0.94, dur: 0.38 });
        queueSFX("pop", nt + 0.04, { vol: 0.68 });
      });

      var edges = q(el, ".cb-wire-edge");
      var ribbons = q(el, ".cb-wire-ribbon");
      var edgeAt = at + Math.min(dur - 1.4, (nodeBeats[Math.min(1, nodeBeats.length - 1)] || 0.6) + 0.2);
      edges.forEach(function (edge, k) {
        drawPaths([edge], edgeAt + k * 0.45, { dur: 0.45 });
      });
      ribbons.forEach(function (rb, k) {
        tl.fromTo(rb, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" }, edgeAt + k * 0.35);
      });
      q(el, ".cb-wire-dot").forEach(function (dot) {
        fadeIn(dot, edgeAt + 0.6, { y: 0, scale: 0.5, dur: 0.28, ease: "back.out(1.6)" });
      });
      queueSFX("whoosh", edgeAt, { vol: 0.65 });

      var pills = q(el, ".cb-pills-row .cb-pill");
      var pillBeats = scheduleBeats(s, dur, (m.pills || []).map(function (p) {
        return { hint: typeof p === "string" ? p : (p.text || "") };
      }), { start: Math.max(0.8, (nodeBeats[nodeBeats.length - 1] || 1.2) + 0.45), end: dur - 0.55 });

      pills.forEach(function (p, k) {
        var pt = at + (pillBeats[k] || dur - 1.0);
        fadeIn(p, pt, { y: 10, scale: 0.92, dur: 0.36, ease: "back.out(1.3)" });
        drawPaths(q(p, ".cb-draw"), pt, { dur: 0.3 });
        queueSFX("pop", pt, { vol: 0.8 });
      });
    },

    cb_gpu_spec: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      var cmpCards = q(el, ".cb-gpu-cmp-card");
      if (cmpCards.length) {
        var metaCards = m.cards || [];
        var cBeats = scheduleBeats(s, dur, metaCards.map(function (c) {
          return { hint: (c.brand || "") + " " + (c.title || "") + " " + (c.price || ""), cue: c.revealOn || c.cue };
        }), { start: 0.35, end: dur * 0.72 });

        cmpCards.forEach(function (c, k) {
          var ct = at + (cBeats[k] || 0.35 + k * 1.4);
          drawPaths(q(c, ".cb-box-svg .cb-draw"), ct, { dur: 0.5, stagger: 0.04 });
          fadeIn(c.querySelector(".cb-gpu-cmp-in"), ct + 0.12, { y: 12, scale: 0.96, dur: 0.42 });
          var bullets = q(c, ".cb-cmp-bullet");
          bullets.forEach(function (b, bk) {
            fadeIn(b, ct + 0.38 + bk * 0.26, { y: 6, dur: 0.3 });
          });
          var price = c.querySelector(".cb-gpu-price");
          if (price) {
            fadeIn(price, Math.min(at + dur - 0.55, ct + 0.55 + bullets.length * 0.24), { y: 8, scale: 0.92, dur: 0.36, ease: "back.out(1.3)" });
          }
          queueSFX("pop", ct + 0.15, { vol: 0.75 });
        });
        return;
      }

      var bpBeats = scheduleBeats(s, dur, [
        { hint: (m.brand || "") + " " + (m.model || "") },
        { hint: (m.badge || "") + " " + (m.price || "") + " " + (m.priceSub || ""), cue: m.revealOn }
      ], { start: 0.25, end: dur - 0.65 });

      var bp = el.querySelector(".cb-bp-box");
      if (bp) {
        var bt0 = at + bpBeats[0];
        fadeIn(bp.querySelector(".cb-bp-brand"), bt0, { y: 6, dur: 0.35 });
        drawPaths(q(bp, ".cb-gpu-blueprint .cb-draw"), bt0 + 0.1, { dur: 0.55, stagger: 0.04 });
        fadeIn(bp.querySelector(".cb-bp-model"), bt0 + 0.45, { y: 8, dur: 0.38 });
        fadeIn(bp.querySelector(".cb-bp-sub"), bt0 + 0.62, { y: 6, dur: 0.35 });
        if (bp.classList.contains("is-xout")) {
          drawX(bp, Math.min(at + dur - 0.6, bt0 + 1.15));
        }
      }
      var footer = el.querySelector(".cb-bp-footer");
      if (footer) {
        var ft = at + bpBeats[1];
        fadeIn(footer, ft, { y: 10, scale: 0.94, dur: 0.4, ease: "back.out(1.25)" });
        drawPaths(q(footer, ".cb-draw"), ft, { dur: 0.35 });
        queueSFX("ding", ft + 0.08, { vol: 0.82 });
      }
    },

    cb_timeline_split: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      var cells = q(el, ".cb-tri-cell");
      if (cells.length) {
        var triBeats = scheduleBeats(s, dur, [
          { hint: (m.promptLabel || "") + " " + (m.promptVal || "") },
          { hint: m.sideNote || "attention matrix" }
        ], { start: 0.3, end: dur * 0.72 });

        drawPaths(q(el, ".cb-tri-prompt .cb-draw"), at + triBeats[0], { dur: 0.38 });
        var pf = el.querySelector(".cb-tri-prompt .cb-sketch-bar-fill");
        if (pf) {
          gsap.set(pf, { scaleX: 0 });
          tl.to(pf, { scaleX: 1, duration: 0.5, ease: "power2.out" }, at + triBeats[0] + 0.12);
        }
        tl.fromTo(cells, { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.012 }, at + triBeats[0] + 0.32);
        fadeIn(el.querySelector(".cb-tri-note"), at + triBeats[1], { y: 10, scale: 0.94, dur: 0.4 });
        queueSFX("ding", at + triBeats[1], { vol: 0.75 });
      } else {
        var spBeats = scheduleBeats(s, dur, [
          { hint: (m.topLabel || "") + " " + (m.topValue || "") + " window" },
          { hint: (m.prefillLabel || "") + " prefill" },
          { hint: (m.markerLabel || "first token") + " " + (m.decodeLabel || "decode"), cue: m.revealOn }
        ], { start: 0.3, end: m.bottomPill ? dur * 0.78 : dur - 0.65 });

        drawPaths(q(el, ".cb-draw"), at + 0.14, { dur: 0.45, stagger: 0.04 });
        var pre = el.querySelector(".cb-split-prefill");
        var dec = el.querySelector(".cb-split-decode");
        var div = el.querySelector(".cb-split-divider");
        var topFill = el.querySelector(".cb-bar-wrap .cb-sketch-bar-fill");
        if (topFill) {
          gsap.set(topFill, { scaleX: 0 });
          tl.to(topFill, { scaleX: 1, duration: 0.55, ease: "power2.out" }, at + spBeats[0]);
          fadeIn(el.querySelector(".cb-bar-meta"), at + spBeats[0] + 0.14, { y: 6, dur: 0.32 });
        }
        if (pre) {
          var preDur = Math.max(0.7, Math.min(2.2, spBeats[2] - spBeats[1]));
          gsap.set(pre, { scaleX: 0 });
          tl.to(pre, { scaleX: 1, duration: preDur, ease: "power1.inOut" }, at + spBeats[1]);
          queueSFX("swipe", at + spBeats[1], { vol: 0.6 });
        }
        if (div) {
          fadeIn(div, at + spBeats[2], { y: 0, scale: 0.9, dur: 0.25 });
          queueSFX("ding", at + spBeats[2], { vol: 0.85 });
        }
        if (dec) {
          gsap.set(dec, { scaleX: 0 });
          tl.to(dec, { scaleX: 1, duration: 0.4, ease: "power2.out" }, at + spBeats[2] + 0.08);
        }
        fadeIn(el.querySelector(".cb-splitbar-labels"), at + spBeats[1] + 0.25, { y: 6, dur: 0.35 });
      }
      animateBottomPill(el, s, at, dur, dur * 0.78);
    },

    cb_checklist: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      fadeIn(el.querySelector(".cb-chk-header"), at + 0.12, { y: 8, dur: 0.36 });
      drawPaths(q(el, ".cb-chk-header .cb-draw"), at + 0.12, { dur: 0.34 });

      var pills = q(el, ".cb-pills-row .cb-pill");
      var rows = q(el, ".cb-chk-row");
      var allSpecs = (m.pills || []).map(function (p) {
        return { hint: p.text || "", cue: p.revealOn || p.cue };
      }).concat((m.items || []).map(function (it) {
        return { hint: it.text || "", cue: it.revealOn || it.cue };
      }));
      var beats = scheduleBeats(s, dur, allSpecs, { start: 0.38, end: m.bottomPill ? dur * 0.8 : dur - 0.6 });

      pills.forEach(function (p, k) {
        var pt = at + (beats[k] || 0.35 + k * 0.4);
        fadeIn(p, pt, { y: 8, scale: 0.92, dur: 0.34, ease: "back.out(1.25)" });
        drawPaths(q(p, ".cb-draw"), pt, { dur: 0.3 });
        queueSFX("pop", pt, { vol: 0.7 });
      });
      rows.forEach(function (row, k) {
        var rt = at + (beats[pills.length + k] || 0.8 + k * 0.6);
        fadeIn(row, rt, { y: 10, dur: 0.36 });
        drawPaths(q(row, ".cb-draw"), rt, { dur: 0.3 });
        queueSFX("click", rt + 0.05, { vol: 0.78 });
      });
      animateBottomPill(el, s, at, dur, (beats[beats.length - 1] || 1.5) + 0.6);
    },

    cb_sandbox: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });

      var chainSteps = q(el, ".cb-chain-step-col");
      if (chainSteps.length) {
        var arrows = q(el, ".cb-chain-arrow");
        var metaSteps = m.steps || [];
        var sBeats = scheduleBeats(s, dur, metaSteps.map(function (st) {
          return { hint: (st.title || "") + " " + (st.sub || "") + " " + (st.subCallout || ""), cue: st.revealOn || st.cue };
        }), { start: 0.35, end: (m.bottomPill || m.shield) ? dur * 0.76 : dur - 0.65 });

        chainSteps.forEach(function (stCol, k) {
          var t = at + (sBeats[k] || 0.35 + k * 0.8);
          if (k > 0 && arrows[k - 1]) {
            drawPaths(q(arrows[k - 1], ".cb-draw"), Math.max(at + 0.2, t - 0.24), { dur: 0.28, stagger: 0.04 });
          }
          popBox(stCol.querySelector(".cb-chain-node"), t, { y: 12, scale: 0.93, dur: 0.38 });
          queueSFX("pop", t + 0.05, { vol: 0.72 });
          var sub = stCol.querySelector(".cb-sub-callout");
          if (sub) {
            fadeIn(sub, t + 0.22, { y: 8, dur: 0.32 });
            drawPaths(q(sub, ".cb-draw"), t + 0.22, { dur: 0.28 });
          }
          q(stCol, ".cb-lasso-stroke").forEach(function (ls) {
            var lt = Math.min(at + dur - 0.55, t + 0.35);
            drawPaths([ls], lt, { dur: 0.42 });
            queueSFX("swipe", lt, { vol: 0.68 });
          });
        });

        var sh = el.querySelector(".cb-sb-shield-row .cb-pill");
        if (sh) {
          var sht = at + Math.min(dur - 0.65, (sBeats[sBeats.length - 1] || 1.5) + 0.55);
          fadeIn(sh, sht, { y: 8, scale: 0.92, dur: 0.36 });
          drawPaths(q(sh, ".cb-draw"), sht, { dur: 0.3 });
          queueSFX("ding", sht + 0.05, { vol: 0.78 });
        }
        animateBottomPill(el, s, at, dur, (sBeats[sBeats.length - 1] || 1.8) + 0.75);
        return;
      }

      // capture mode
      var hostBadge = el.querySelector(".cb-host-badge");
      if (hostBadge) {
        fadeIn(hostBadge, at + 0.14, { y: 8, dur: 0.34 });
        drawPaths(q(hostBadge, ".cb-draw"), at + 0.14, { dur: 0.3 });
      }
      var srcNodes = q(el, ".cb-sb-col:first-child .cb-sb-node");
      var tgtNodes = q(el, ".cb-sb-col:last-child .cb-sb-node");
      var capSpecs = (m.sources || []).map(function (src) {
        return { hint: (src.title || "") + " " + (src.sub || ""), cue: src.revealOn || src.cue };
      }).concat((m.targets || []).map(function (tgt) {
        return { hint: (tgt.title || "") + " " + (tgt.sub || "") + " " + (tgt.recSub || ""), cue: tgt.revealOn || tgt.cue };
      })).concat(m.meter ? [{ hint: (m.meter.label || "") + " " + (m.meter.value || "") + " " + (m.meter.targetValue || ""), cue: m.meter.revealOn }] : []);

      var cBeats = scheduleBeats(s, dur, capSpecs, { start: 0.38, end: (m.shield || m.bottomPill) ? dur * 0.8 : dur - 0.6 });

      srcNodes.forEach(function (n, k) {
        var nt = at + (cBeats[k] || 0.35 + k * 0.65);
        popBox(n, nt, { y: 10, scale: 0.94, dur: 0.38 });
        queueSFX("pop", nt + 0.04, { vol: 0.7 });
        if (n.classList.contains("is-xout")) {
          drawX(n, Math.min(at + dur - 0.6, nt + 0.5));
        }
        q(n, ".cb-lasso-stroke").forEach(function (ls) {
          drawPaths([ls], Math.min(at + dur - 0.55, nt + 0.35), { dur: 0.42 });
          queueSFX("swipe", Math.min(at + dur - 0.55, nt + 0.35), { vol: 0.65 });
        });
      });

      var pktStartAt = at + Math.min(dur - 1.6, (cBeats[Math.max(0, srcNodes.length - 1)] || 0.8) + 0.25);
      q(el, ".cb-sb-lanes .cb-x-stroke").forEach(function (xs, k) {
        drawPaths([xs], pktStartAt + 0.25 + k * 0.12, { dur: 0.22 });
        if (k === 0) queueSFX("thud", pktStartAt + 0.25, { vol: 0.8 });
      });
      q(el, ".cb-sb-pkt").forEach(function (pkt, k) {
        var pt = pktStartAt + k * 0.42;
        var y0 = 60 + k * 42;
        gsap.set(pkt, { x: 24, y: y0, opacity: 0, scale: 0.85 });
        tl.to(pkt, { opacity: 1, scale: 1, duration: 0.18, ease: "power1.out" }, pt);
        tl.to(pkt, { x: 222, y: 120, duration: 0.68, ease: "power1.inOut" }, pt + 0.12);
        tl.to(pkt, { opacity: 0.88, duration: 0.12 }, pt + 0.74);
        queueSFX("whoosh", pt + 0.12, { vol: 0.58 });
      });

      tgtNodes.forEach(function (n, k) {
        var nt = at + (cBeats[srcNodes.length + k] || 1.2 + k * 0.5);
        popBox(n, nt, { y: 10, scale: 0.94, dur: 0.4 });
        queueSFX("pop", nt + 0.05, { vol: 0.72 });
        q(n, ".cb-lasso-stroke").forEach(function (ls) {
          drawPaths([ls], Math.min(at + dur - 0.55, nt + 0.35), { dur: 0.42 });
        });
      });

      var hatchFill = el.querySelector(".cb-hatch-fill-svg");
      if (hatchFill) {
        var mt = at + (cBeats[srcNodes.length + tgtNodes.length] || dur * 0.62);
        drawPaths(q(el, ".cb-hatch-track .cb-draw"), mt - 0.16, { dur: 0.38 });
        gsap.set(hatchFill, { scaleX: 0, opacity: 0 });
        tl.to(hatchFill, { scaleX: 1, opacity: 1, duration: 0.78, ease: "power2.out" }, mt);
        queueSFX("swipe", mt, { vol: 0.65 });
        fadeIn(el.querySelector(".cb-bar-meta"), mt + 0.16, { y: 6, dur: 0.34 });
      }

      var shield = el.querySelector(".cb-sb-shield-row .cb-pill");
      if (shield) {
        var st = at + Math.min(dur - 0.6, (cBeats[cBeats.length - 1] || 1.8) + 0.55);
        fadeIn(shield, st, { y: 8, scale: 0.92, dur: 0.36 });
        drawPaths(q(shield, ".cb-draw"), st, { dur: 0.3 });
        queueSFX("ding", st + 0.05, { vol: 0.78 });
      }
      animateBottomPill(el, s, at, dur, (cBeats[cBeats.length - 1] || 2.0) + 0.7);
    },

    cb_log: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      var perm = el.querySelector(".cb-perm-header");
      if (perm) {
        fadeIn(perm, at + 0.14, { y: 8, dur: 0.36 });
        drawPaths(q(perm, ".cb-draw"), at + 0.14, { dur: 0.34, stagger: 0.04 });
      }
      var win = el.querySelector(".cb-term-win");
      drawPaths(q(win, ".cb-box-svg .cb-draw"), at + 0.18, { dur: 0.48, stagger: 0.04 });

      var lines = q(el, ".cb-term-line");
      var metaLines = m.lines || [];
      var lineSpecs = metaLines.map(function (ln) {
        return { hint: ln.text || "", cue: ln.revealOn || ln.cue };
      });
      var noteSpecs = (m.notes || []).map(function (nt) {
        return { hint: nt.text || "", cue: nt.revealOn || nt.cue };
      });
      var beats = scheduleBeats(s, dur, lineSpecs.concat(noteSpecs), { start: 0.45, end: m.bottomPill ? dur * 0.8 : dur - 0.55 });

      lines.forEach(function (ln, k) {
        var lt = at + (beats[k] || 0.45 + k * 0.7);
        fadeIn(ln, lt, { y: 6, dur: 0.3 });
        var lineHls = q(ln, ".cb-hl-bg");
        lineHls.forEach(function (bg, hIdx) {
          var ht = Math.min(at + dur - 0.55, lt + 0.24 + hIdx * 0.22);
          gsap.set(bg, { scaleX: 0, opacity: 0.2 });
          tl.to(bg, { scaleX: 1, opacity: 1, duration: 0.38, ease: "power2.out" }, ht);
          queueSFX("click", ht, { vol: 0.65 });
        });
        q(ln, ".cb-oval-ring .cb-draw").forEach(function (ov, oIdx) {
          var ot = Math.min(at + dur - 0.5, lt + 0.48 + oIdx * 0.2);
          drawPaths([ov], ot, { dur: 0.36 });
          queueSFX("pop", ot, { vol: 0.78 });
        });
      });

      q(el, ".cb-log-note").forEach(function (nt, k) {
        var ntt = at + (beats[lines.length + k] || dur * 0.72 + k * 0.4);
        fadeIn(nt, ntt, { y: 8, scale: 0.94, dur: 0.36 });
        drawPaths(q(nt, ".cb-draw"), ntt, { dur: 0.3 });
        queueSFX("pop", ntt + 0.04, { vol: 0.68 });
      });

      animateBottomPill(el, s, at, dur, (beats[beats.length - 1] || 2.0) + 0.6);
    },

    cb_issue: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      var beats = scheduleBeats(s, dur, [
        { hint: (m.repo || "") + " " + (m.issueTitle || m.title || "issue") },
        { hint: (m.dateLabel || "") + " " + (m.body || "") },
        { hint: (m.toggle ? (m.toggle.label + " " + (m.toggle.sub || "") + " switch off toggle") : (m.sideNote || "note")), cue: m.toggle && (m.toggle.revealOn || m.toggle.cue) }
      ], { start: 0.25, end: dur - 0.75 });

      var card = el.querySelector(".cb-issue-card");
      if (card) {
        var cAt = at + beats[0];
        drawPaths(q(card, ".cb-box-svg .cb-draw"), cAt, { dur: 0.48, stagger: 0.04 });
        fadeIn(card.querySelector(".cb-issue-top"), cAt + 0.08, { y: 6, dur: 0.32 });
        fadeIn(card.querySelector(".cb-issue-title"), cAt + 0.24, { y: 8, dur: 0.38 });
        queueSFX("pop", cAt + 0.1, { vol: 0.7 });
        fadeIn(card.querySelector(".cb-issue-body"), at + beats[1], { y: 8, dur: 0.36 });
        fadeIn(card.querySelector(".cb-issue-meta"), at + beats[1] + 0.18, { y: 6, dur: 0.32 });
      }

      var tbox = el.querySelector(".cb-toggle-box");
      if (tbox) {
        var tt = at + beats[2];
        drawPaths(q(tbox, ".cb-box-svg .cb-draw"), tt, { dur: 0.42 });
        fadeIn(tbox, tt, { y: 10, scale: 0.94, dur: 0.38 });
        var startOn = tbox.getAttribute("data-start-on") === "true";
        var endOn = tbox.getAttribute("data-end-on") === "true";
        var knob = tbox.querySelector(".cb-toggle-knob");
        var fill = tbox.querySelector(".cb-toggle-on-fill");
        if (knob) {
          gsap.set(knob, { x: startOn ? 70 : 0 });
          if (fill) gsap.set(fill, { opacity: startOn ? 1 : 0 });
          var flipAt = Math.min(at + dur - 0.55, tt + 0.45);
          tl.to(knob, { x: endOn ? 70 : 0, duration: 0.36, ease: "power2.inOut" }, flipAt);
          if (fill) tl.to(fill, { opacity: endOn ? 1 : 0, duration: 0.36 }, flipAt);
          queueSFX("click", flipAt, { vol: 0.88 });
        }
      }
      animateBottomPill(el, s, at, dur, beats[2] + 0.7);
    },

    cb_timeline: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      fadeIn(el.querySelector(".cb-tl-top-strip"), at + 0.16, { y: 8, dur: 0.36 });
      drawPaths(q(el, ".cb-tl-axis-line .cb-draw"), at + 0.22, { dur: 0.58, stagger: 0.08 });
      queueSFX("swipe", at + 0.22, { vol: 0.65 });

      var cols = q(el, ".cb-tl-col");
      var metaEvents = m.events || [];
      var beats = scheduleBeats(s, dur, metaEvents.map(function (ev) {
        return { hint: (ev.label || "") + " " + (ev.sub || ""), cue: ev.revealOn || ev.cue };
      }), { start: 0.48, end: m.bottomPill ? dur * 0.78 : dur - 0.6 });

      cols.forEach(function (col, k) {
        var ct = at + (beats[k] || 0.45 + k * 0.7);
        fadeIn(col, ct, { y: 10, scale: 0.94, dur: 0.34, ease: "back.out(1.25)" });
        drawPaths(q(col, ".cb-tl-stem .cb-draw, .cb-box-svg .cb-draw"), ct, { dur: 0.34 });
        queueSFX("click", ct + 0.05, { vol: 0.72 });
        if (col.querySelector(".is-xout")) {
          drawX(col, Math.min(at + dur - 0.55, ct + 0.42));
        }
        q(col, ".cb-lasso-stroke").forEach(function (ls) {
          var lt = Math.min(at + dur - 0.5, ct + 0.38);
          drawPaths([ls], lt, { dur: 0.38 });
          queueSFX("ding", lt, { vol: 0.78 });
        });
      });

      animateBottomPill(el, s, at, dur, (beats[beats.length - 1] || 2.0) + 0.6);
    },

    cb_stamp_card: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });

      var target = el.querySelector(".cb-stamp-target");
      var stamp = el.querySelector(".cb-stamp-badge");
      var rows = q(el, ".cb-spy-row");
      var specList = [];
      if (target) specList.push({ hint: (m.card && m.card.title) || "" });
      if (stamp) specList.push({ hint: (m.stamp && m.stamp.text) || "retired", cue: m.stamp && (m.stamp.revealOn || m.stamp.cue) });
      (m.rows || []).forEach(function (rw) {
        specList.push({ hint: (rw.tag || "") + " " + (rw.left || "") + " " + (rw.right || ""), cue: rw.revealOn || rw.cue });
      });

      var beats = scheduleBeats(s, dur, specList, { start: 0.28, end: m.bottomPill ? dur * 0.8 : dur - 0.6 });
      var bi = 0;

      if (target) {
        var tt = at + beats[bi++];
        popBox(target, tt, { y: 12, scale: 0.94, dur: 0.4 });
        var cal = el.querySelector(".cb-cal-card");
        if (cal) {
          fadeIn(cal, tt + 0.22, { y: 10, scale: 0.94, dur: 0.34 });
          drawPaths(q(cal, ".cb-box-svg .cb-draw"), tt + 0.22, { dur: 0.34 });
        }
      }
      if (stamp) {
        var angle = Number(stamp.getAttribute("data-angle") || -7);
        var stAt = at + beats[bi++];
        gsap.set(stamp, { opacity: 0, scale: 1.5, rotation: angle });
        tl.to(stamp, { opacity: 1, scale: 1, duration: 0.24, ease: "power3.out" }, stAt);
        queueSFX("thud", stAt, { vol: 0.92 });
      }
      rows.forEach(function (row) {
        var rt = at + (beats[bi++] || dur * 0.58);
        fadeIn(row, rt, { y: 10, dur: 0.34 });
        drawPaths(q(row, ".cb-spy-edge .cb-draw"), rt + 0.12, { dur: 0.28, stagger: 0.03 });
        queueSFX("pop", rt + 0.05, { vol: 0.72 });
      });
      animateBottomPill(el, s, at, dur, (beats[beats.length - 1] || 2.0) + 0.6);
    },

    cb_prompt_card: function (el, s, at, dur) {
      var m = s.meta || {};
      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      var mediaCard = el.querySelector(".cb-media-card");
      if (mediaCard) {
        var mBeats = scheduleBeats(s, dur, [
          { hint: (m.title || "") + " " + (m.platform || "") },
          { hint: (m.viewsStart || "") + " " + (m.viewsEnd || "") + " capture audit", cue: m.revealOn }
        ], { start: 0.28, end: dur - 0.7 });

        drawPaths(q(mediaCard, ".cb-box-svg .cb-draw"), at + mBeats[0], { dur: 0.48 });
        fadeIn(mediaCard, at + mBeats[0], { y: 10, scale: 0.96, dur: 0.4 });
        var scrubFill = mediaCard.querySelector(".cb-media-scrub-fill");
        var scrubDot = mediaCard.querySelector(".cb-media-scrub-dot");
        var scrubAt = at + Math.max(mBeats[0] + 0.35, mBeats[1] - 0.45);
        if (scrubFill) {
          gsap.set(scrubFill, { scaleX: 0 });
          tl.to(scrubFill, { scaleX: 1, duration: 0.68, ease: "power2.out" }, scrubAt);
          queueSFX("swipe", scrubAt, { vol: 0.62 });
        }
        if (scrubDot) {
          gsap.set(scrubDot, { scale: 0, opacity: 0 });
          tl.to(scrubDot, { scale: 1, opacity: 1, duration: 0.25, ease: "back.out(1.6)" }, scrubAt + 0.55);
        }
        q(mediaCard, ".cb-lasso-stroke").forEach(function (ls) {
          drawPaths([ls], Math.min(at + dur - 0.55, at + mBeats[1]), { dur: 0.44 });
          queueSFX("pop", Math.min(at + dur - 0.55, at + mBeats[1]), { vol: 0.8 });
        });
        animateBottomPill(el, s, at, dur, mBeats[1] + 0.65);
        return;
      }

      var sp = el.querySelector(".cb-speech-card");
      var choices = q(el, ".cb-choice-pill");
      var pSpecs = [
        { hint: m.question || "ever" },
        { hint: (m.codeToken || "") + " " + (m.subNote || ""), cue: m.revealOn }
      ].concat((m.choices || []).map(function (ch) {
        return { hint: typeof ch === "string" ? ch : (ch.text || "") };
      }));
      var pBeats = scheduleBeats(s, dur, pSpecs, { start: 0.25, end: Math.max(1.2, dur - 1.45) });

      if (sp) {
        drawPaths(q(sp, ".cb-box-svg .cb-draw"), at + pBeats[0], { dur: 0.48 });
        fadeIn(sp.querySelector(".cb-speech-q"), at + pBeats[0] + 0.08, { y: 8, dur: 0.38 });
        fadeIn(sp.querySelector(".cb-code-token"), at + pBeats[1], { y: 8, scale: 0.92, dur: 0.36, ease: "back.out(1.3)" });
        if (sp.querySelector(".cb-code-token")) queueSFX("click", at + pBeats[1], { vol: 0.72 });
        choices.forEach(function (ch, k) {
          var ct = at + (pBeats[2 + k] || pBeats[1] + 0.45 + k * 0.35);
          fadeIn(ch, ct, { y: 8, scale: 0.9, dur: 0.32, ease: "back.out(1.3)" });
          drawPaths(q(ch, ".cb-draw"), ct, { dur: 0.3 });
          queueSFX(ch.classList.contains("is-active") ? "ding" : "pop", ct + 0.06, { vol: 0.78 });
        });
      }
      var calAvatar = el.querySelector(".cb-cal-card");
      if (calAvatar) fadeIn(calAvatar, at + (pBeats[1] + 0.2), { y: 10, scale: 0.94, dur: 0.38 });
      animateBottomPill(el, s, at, dur, (pBeats[pBeats.length - 1] || 1.8) + 0.6);
    },

    cb_outro: function (el, s, at, dur) {
      var m = s.meta || {};
      var beats = scheduleBeats(s, dur, [
        { hint: s.headline || "measure" },
        { hint: m.ctaSub || s.subline || "" },
        { hint: (m.cta || "Subscribe") + " " + (m.channel || "") }
      ], { start: 0.2, end: dur - 0.65 });

      fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.32 });
      fadeIn(el.querySelector(".cb-outro-title"), at + beats[0], { y: 12, scale: 0.96, dur: 0.48 });
      fadeIn(el.querySelector(".cb-outro-sub"), at + beats[1], { y: 8, dur: 0.42 });
      q(el, ".cb-pills-row .cb-pill").forEach(function (p, k) {
        var pt = at + beats[2] + k * 0.22;
        fadeIn(p, pt, { y: 10, scale: 0.92, dur: 0.36, ease: "back.out(1.3)" });
        drawPaths(q(p, ".cb-draw"), pt, { dur: 0.34 });
        queueSFX("ding", pt + 0.05, { vol: 0.82 });
      });
    },
  };

  var FALLBACK_MAP = {
    cold: "cb_title",
    hero: "cb_title",
    stat: "cb_stat_bar",
    compare: "cb_gpu_spec",
    stack: "cb_vram_stack",
    flow: "cb_wiring",
    outro: "cb_outro",
  };

  SCENES.forEach(function (s, i) {
    var el = document.getElementById("s" + String(i + 1).padStart(3, "0"));
    if (!el) return;
    var at = s.start;
    var dur = s.end - s.start;
    var scIn = el.querySelector(".sc-in");

    if (i === 0) {
      gsap.set(el, { autoAlpha: 1 });
    } else {
      gsap.set(el, { autoAlpha: 0 });
      tl.set(el, { autoAlpha: 1 }, at);
    }
    if (i < SCENES.length - 1) {
      tl.set(el, { autoAlpha: 0 }, at + dur);
    }

    var key = ANIM[s.type] ? s.type : (FALLBACK_MAP[s.type] || "cb_title");
    ANIM[key](el, s, at, dur);

    if (i < SCENES.length - 1 && dur > 1.0 && scIn) {
      tl.to(scIn, { opacity: 0.08, duration: 0.12, ease: "power1.in" }, at + dur - 0.12);
    }
  });

  window.__timelines = window.__timelines || {};
  window.__timelines["__COMPOSITION_ID__"] = tl;
})();
