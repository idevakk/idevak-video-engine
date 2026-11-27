/* ============================================================================
 * Dedicated GSAP Choreography: motion-explainer (v2 - Studio Motion Graphics)
 * Fixes blank-card pacing while delivering continuous studio motion life:
 *   - Primary structural elements enter swiftly within 0.05s-2.6s (zero empty boxes)
 *   - Payoff badges, delta caps, stamps, and highlights snap onto exact spoken cues
 *   - Segmented outer/inner orbital rings rotate smoothly across each scene
 *   - Bezier flow packets glide along connector wires
 *   - Tabular odometer counters (`data-count-target`) roll cleanly without jitter
 *   - Sequential spotlight focus keeps long scenes (10-18s) visually alive
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
    var play = window.__ME_PLAY_SFX__;
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
    it: 1, as: 1, be: 1, your: 1
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
      if (/^\d+$/.test(tok)) pushNumberWords(out, tok);
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
    if (!cueTokens.length && hintText) cueTokens = expandCueTokens(hintText, true);
    if (!cueTokens.length) return null;

    if (hasExplicit) {
      var seq = normRawTokens(explicitCue);
      if (seq.length >= 2) {
        for (var i = 0; i <= stream.length - seq.length; i++) {
          var ok = true;
          for (var k = 0; k < seq.length; k++) {
            if (stream[i + k].tok !== seq[k]) { ok = false; break; }
          }
          if (ok && stream[i].t <= maxRel + 0.35) return clamp(stream[i].t, minRel, maxRel);
        }
      }
    }

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
        if (cueSet[tok]) score += (w === 0 ? 1.5 : 1.0) + (tok.length >= 5 ? 0.5 : 0);
      }
      if (score > bestScore) { bestScore = score; bestTime = wt; }
    }
    return bestScore >= 1.0 && bestTime !== null ? clamp(bestTime, minRel, maxRel) : null;
  }

  function scheduleBeats(s, dur, items, opts) {
    opts = opts || {};
    var n = items.length;
    if (!n) return [];
    var minGap = opts.minGap != null ? opts.minGap : 0.20;
    var tStart = clamp(opts.start != null ? opts.start : 0.12, 0.04, Math.max(0.1, dur - 0.6));
    var tEnd = clamp(opts.end != null ? opts.end : Math.max(tStart + 0.3, dur - 0.65), tStart + 0.2, Math.max(tStart + 0.25, dur - 0.35));
    var span = Math.max(0.25, tEnd - tStart);
    var step = span / Math.max(1, n);
    if (n > 1 && step < minGap) {
      minGap = Math.max(0.10, span / n);
    }

    var stream = buildWordStream(s);
    var raw = items.map(function (it, idx) {
      var fallback = tStart + idx * step;
      var matched = findSpokenOffset(s, stream, it.hint || "", it.cue, tStart, tEnd);
      if (matched !== null) return matched;
      if (idx === 0 && typeof s.revealTime === "number" && Number.isFinite(s.revealTime)) {
        return clamp(s.revealTime, tStart, tEnd);
      }
      return fallback;
    });

    for (var i = 1; i < raw.length; i++) {
      if (raw[i] < raw[i - 1] + minGap) raw[i] = raw[i - 1] + minGap;
    }
    if (raw[raw.length - 1] > tEnd) {
      var excess = raw[raw.length - 1] - tEnd;
      for (var j = 0; j < raw.length; j++) raw[j] = Math.max(tStart + j * 0.08, raw[j] - excess);
    }
    return raw;
  }

  function popIn(target, at, opts) {
    if (!target) return;
    opts = opts || {};
    gsap.set(target, { opacity: 0, y: opts.y != null ? opts.y : 14, scale: opts.scale != null ? opts.scale : 0.94 });
    tl.to(target, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: opts.dur || 0.32,
      ease: opts.ease || "power3.out",
    }, at);
  }

  function focusPulse(target, at) {
    if (!target) return;
    tl.to(target, { scale: 1.022, duration: 0.16, ease: "power2.out" }, at);
    tl.to(target, { scale: 1, duration: 0.22, ease: "power2.inOut" }, at + 0.16);
  }

  function countTo(el, at, dur) {
    if (!el) return;
    var target = Number(el.getAttribute("data-count-target"));
    if (!Number.isFinite(target)) return;
    var sign = el.getAttribute("data-count-sign") || "";
    var dec = Number(el.getAttribute("data-count-dec") || 0);
    var suffix = el.getAttribute("data-count-suffix") || "";
    var state = { v: 0 };
    el.textContent = sign + (0).toFixed(dec) + suffix;
    tl.to(state, {
      v: target,
      duration: dur || 0.55,
      ease: "power3.out",
      onUpdate: function () {
        el.textContent = sign + state.v.toFixed(dec) + suffix;
      },
    }, at);
  }

  function drawPaths(paths, at, opts) {
    if (!paths || !paths.length) return;
    opts = opts || {};
    var dur = opts.dur || 0.45;
    paths.forEach(function (p, idx) {
      var len = 260;
      try {
        if (typeof p.getTotalLength === "function") len = Math.max(12, Math.ceil(p.getTotalLength()) + 4);
      } catch (_e) {}
      var t0 = at + idx * (opts.stagger || 0.05);
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
      tl.to(p, { strokeDashoffset: 0, duration: dur, ease: "power2.out" }, t0);
      var parent = p.parentNode;
      if (parent) {
        var head = parent.querySelector(".me-arrow-head");
        if (head) {
          gsap.set(head, { opacity: 0, scale: 0.6, transformOrigin: "center" });
          tl.to(head, { opacity: 1, scale: 1, duration: 0.16, ease: "power2.out" }, t0 + dur * 0.68);
        }
        var dot = parent.querySelector(".me-arrow-dot");
        if (dot && typeof p.getPointAtLength === "function" && typeof p.getTotalLength === "function") {
          var totalLen = p.getTotalLength();
          var obj = { p: 0 };
          gsap.set(dot, { opacity: 0 });
          tl.set(dot, { opacity: 1 }, t0);
          tl.to(obj, {
            p: 1,
            duration: dur * 1.15,
            ease: "power2.inOut",
            onUpdate: function () {
              var pt = p.getPointAtLength(obj.p * totalLen);
              dot.setAttribute("cx", pt.x.toFixed(1));
              dot.setAttribute("cy", pt.y.toFixed(1));
            },
          }, t0);
          tl.to(dot, { opacity: 0, duration: 0.18 }, t0 + dur * 1.05);
        }
      }
    });
  }

  function spinOrbitRings(stageEl, at, dur) {
    if (!stageEl) return;
    var arc = stageEl.querySelector(".me-ring-arc");
    var inner = stageEl.querySelector(".me-ring-inner");
    var glow = stageEl.querySelector(".me-orbit-glow");
    if (arc) {
      gsap.set(arc, { rotation: -24, transformOrigin: "50% 50%", opacity: 0.4 });
      tl.to(arc, { rotation: 0, opacity: 1, duration: 0.42, ease: "power3.out" }, at);
      tl.to(arc, { rotation: 36, duration: Math.max(0.5, dur - 0.55), ease: "none" }, at + 0.42);
    }
    if (inner) {
      gsap.set(inner, { rotation: 16, transformOrigin: "50% 50%", opacity: 0.25 });
      tl.to(inner, { rotation: -20, opacity: 0.65, duration: Math.max(0.6, dur - 0.2), ease: "none" }, at);
    }
    if (glow) {
      gsap.set(glow, { opacity: 0.1 });
      tl.to(glow, { opacity: 0.24, duration: 0.6, ease: "power2.out" }, at);
    }
  }

  function animateBottomPill(el, s, at, dur, minRel) {
    var pill = el.querySelector(".me-bottom-pill");
    if (!pill) return;
    var tRel = clamp(Math.max(minRel || dur * 0.55, 0.38), 0.3, Math.max(0.4, dur - 0.5));
    popIn(pill, at + tRel, { y: 10, scale: 0.92, dur: 0.32, ease: "back.out(1.4)" });
    queueSFX("ding", at + tRel + 0.04, { vol: 0.78 });
  }

  var ANIM = {
    me_title: function (el, s, at, dur) {
      var m = s.meta || {};
      var pills = q(el, ".me-title-pills .me-pill");
      var specs = [
        { hint: m.highlight || s.subline || "", cue: m.revealOn }
      ].concat(pills.map(function (p, idx) {
        var cfg = (m.pills || [])[idx] || {};
        return { hint: p.textContent || "", cue: cfg.revealOn || cfg.cue };
      }));
      var beats = scheduleBeats(s, dur, specs, { start: 0.28, end: Math.max(1.0, Math.min(dur - 0.55, 4.5)) });

      if (at === 0) {
        gsap.set([el.querySelector(".me-eyebrow"), el.querySelector(".me-logo-badge") || el.querySelector(".me-title-wrap > .me-pill"), el.querySelector(".me-title-core"), el.querySelector(".me-hero-headline")], { opacity: 1, y: 0, scale: 1 });
      } else {
        popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
        popIn(el.querySelector(".me-logo-badge") || el.querySelector(".me-title-wrap > .me-pill"), at + 0.02, { y: 8, dur: 0.28 });
        popIn(el.querySelector(".me-title-core"), at + 0.04, { scale: 0.92, dur: 0.32, ease: "back.out(1.2)" });
        popIn(el.querySelector(".me-hero-headline"), at + 0.04, { y: 12, scale: 0.98, dur: 0.32 });
      }
      queueSFX("pop", at + 0.08, { vol: 0.72 });
      popIn(el.querySelector(".me-hero-sub"), at + 0.22, { y: 8, dur: 0.32 });
      popIn(el.querySelector(".me-hero-highlight"), at + beats[0], { y: 8, scale: 0.94, dur: 0.34, ease: "back.out(1.5)" });
      if (el.querySelector(".me-hero-highlight")) queueSFX("ding", at + beats[0], { vol: 0.82 });

      pills.forEach(function (p, k) {
        var pt = at + (beats[1 + k] || 0.45 + k * 0.22);
        popIn(p, pt, { y: 10, scale: 0.92, dur: 0.3, ease: "back.out(1.4)" });
        queueSFX("pop", pt, { vol: 0.65 });
      });
    },

    me_core_orbit: function (el, s, at, dur) {
      var m = s.meta || {};
      var nodes = q(el, ".me-orbit-node");
      var earlyEnd = Math.min(Math.max(1.2, dur * 0.5), 3.6);
      var nodeSpecs = nodes.map(function (n, idx) {
        var cfg = (m.orbitNodes || [])[idx] || {};
        return { hint: n.textContent || "", cue: cfg.revealOn || cfg.cue };
      });
      var nodeBeats = scheduleBeats(s, dur, nodeSpecs, { start: 0.22, end: earlyEnd });
      var payoffTime = findSpokenOffset(s, buildWordStream(s), m.arrowLabel || m.targetLabel || (m.modal && m.modal.title) || "", m.revealOn, 0.4, Math.max(0.8, dur - 0.6));
      if (payoffTime === null) payoffTime = Math.min(earlyEnd + 0.3, Math.max(0.8, dur * 0.48));

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
      var stages = q(el, ".me-orbit-stage");
      if (stages[0]) {
        popIn(stages[0].querySelector(".me-iso-cube"), at, { scale: 0.92, dur: 0.34, ease: "back.out(1.2)" });
        spinOrbitRings(stages[0], at, dur);
        queueSFX("whoosh", at + 0.05, { vol: 0.65 });
      }
      popIn(el.querySelector(".me-orbit-top"), at + 0.04, { y: 6, dur: 0.28 });

      nodes.forEach(function (nd, k) {
        var nt = at + (nodeBeats[k] || 0.28 + k * 0.22);
        popIn(nd, nt, { y: 8, scale: 0.88, dur: 0.3, ease: "back.out(1.5)" });
        queueSFX("pop", nt, { vol: 0.7 });
      });

      var arrowWrap = el.querySelector(".me-orbit-arrow-wrap");
      if (arrowWrap) {
        var atArrow = at + payoffTime;
        drawPaths(q(arrowWrap, ".me-draw-path"), atArrow, { dur: 0.48 });
        popIn(arrowWrap.querySelector(".me-orbit-arrow-label"), atArrow + 0.14, { scale: 0.9, dur: 0.3 });
        queueSFX("swipe", atArrow, { vol: 0.72 });
      }
      var side = el.querySelector(".me-modal-card") || el.querySelector(".me-orbit-side") || el.querySelector(".me-deck-wrap");
      if (side) {
        popIn(side, at + payoffTime + 0.14, { y: 12, scale: 0.95, dur: 0.36 });
        var tbFill = side.querySelector(".me-bar-fill");
        if (tbFill) {
          gsap.set(tbFill, { scaleY: 0 });
          tl.to(tbFill, { scaleY: 1, duration: 0.5, ease: "power3.out" }, at + payoffTime + 0.2);
          q(side, ".me-count").forEach(function (cn) { countTo(cn, at + payoffTime + 0.2, 0.5); });
        }
        if (stages[1]) spinOrbitRings(stages[1], at + payoffTime + 0.14, Math.max(1.0, dur - payoffTime));
      }
      popIn(el.querySelector(".me-orbit-bottom"), at + Math.min(dur * 0.55, earlyEnd + 0.35), { y: 8, dur: 0.3 });
    },

    me_bar_compare: function (el, s, at, dur) {
      var m = s.meta || {};
      var cols = q(el, ".me-groups-grid").length ? q(el, ".me-group-box") : q(el, ".me-bar-col");
      // Primary bars enter rapidly in first 0.2s-2.6s so charts NEVER sit empty!
      var earlyEnd = Math.min(Math.max(1.0, dur * 0.42), 2.8);
      var barBeats = scheduleBeats(s, dur, cols.map(function (c, idx) {
        return { hint: c.textContent || "", cue: null };
      }), { start: 0.16, end: earlyEnd });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
      popIn(el.querySelector(".me-bar-head"), at, { y: 8, dur: 0.28 });
      popIn(el.querySelector(".me-chart-panel") || el.querySelector(".me-groups-grid"), at + 0.02, { y: 8, dur: 0.28 });
      popIn(el.querySelector(".me-bracket-bar"), at + 0.35, { y: 6, dur: 0.3 });

      var stream = buildWordStream(s);
      cols.forEach(function (col, idx) {
        var ct = at + (barBeats[idx] || 0.18 + idx * 0.26);
        var cfg = (m.groups || m.bars || [])[idx] || {};
        if (col.classList.contains("me-group-box")) {
          popIn(col, idx === 0 ? at + 0.03 : ct, { y: 10, scale: 0.96, dur: 0.32 });
          q(col, ".me-bar-fill").forEach(function (fill, fi) {
            gsap.set(fill, { scaleY: 0 });
            tl.to(fill, { scaleY: 1, duration: 0.46, ease: "power3.out" }, ct + 0.1 + fi * 0.07);
          });
          q(col, ".me-count").forEach(function (cn) { countTo(cn, ct + 0.1, 0.46); });
          queueSFX("pop", ct + 0.05, { vol: 0.72 });
        } else {
          popIn(col, ct, { y: 8, dur: 0.26 });
          var fill = col.querySelector(".me-bar-fill");
          if (fill) {
            gsap.set(fill, { scaleY: 0 });
            tl.to(fill, { scaleY: 1, duration: 0.5, ease: "power3.out" }, ct + 0.06);
          }
          q(col, ".me-count").forEach(function (cn) { countTo(cn, ct + 0.06, 0.5); });
          // Payoff cap/delta/check can fire on spoken revealOn (or right after bar grows)
          var payoffRel = cfg.revealOn ? findSpokenOffset(s, stream, cfg.delta || cfg.label, cfg.revealOn, 0.45, dur - 0.5) : null;
          var capAt = payoffRel !== null ? at + Math.max(0.45, payoffRel) : ct + 0.36;
          popIn(col.querySelector(".me-bar-cap"), capAt, { y: 6, dur: 0.26 });
          popIn(col.querySelector(".me-bar-delta"), capAt + 0.04, { y: 6, scale: 0.9, dur: 0.26 });
          popIn(col.querySelector(".me-bar-check"), capAt + 0.08, { scale: 0.6, dur: 0.24, ease: "back.out(1.7)" });
          queueSFX(idx === cols.length - 1 ? "ding" : "tick", ct + 0.16, { vol: 0.76 });
          if (payoffRel !== null && dur > 5.0) focusPulse(col, at + payoffRel);
        }
      });

      var thr = el.querySelector(".me-threshold-line");
      if (thr) {
        gsap.set(thr, { scaleX: 0, transformOrigin: "left center" });
        tl.to(thr, { scaleX: 1, duration: 0.45, ease: "power2.out" }, at + Math.min(1.6, dur * 0.38));
      }
      animateBottomPill(el, s, at, dur, (barBeats[barBeats.length - 1] || 1.2) + 0.4);
    },

    me_line_chart: function (el, s, at, dur) {
      var m = s.meta || {};
      var series = q(el, ".me-line-series");
      var beats = scheduleBeats(s, dur, series.map(function (sr) { return { hint: sr.textContent || "" }; }), { start: 0.25, end: Math.min(2.6, Math.max(1.0, dur * 0.48)) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
      popIn(el.querySelector(".me-bar-head"), at, { y: 8, dur: 0.28 });
      popIn(el.querySelector(".me-line-wrap"), at + 0.04, { y: 10, dur: 0.3 });

      series.forEach(function (sr, idx) {
        var st = at + (beats[idx] || 0.25 + idx * 0.45);
        drawPaths(q(sr, ".me-line-path"), st, { dur: 0.75 });
        q(sr, ".me-line-dot").forEach(function (d, di) {
          popIn(d, st + di * 0.22, { y: 0, scale: 0.4, dur: 0.22, ease: "back.out(1.6)" });
        });
        q(sr, ".me-line-val, .me-line-tag").forEach(function (tx) {
          popIn(tx, st + 0.35, { y: 6, dur: 0.28 });
        });
        queueSFX(idx === 0 ? "whoosh" : "ding", st + 0.25, { vol: 0.72 });
      });
      animateBottomPill(el, s, at, dur, (beats[beats.length - 1] || 1.2) + 0.55);
    },

    me_stat_split: function (el, s, at, dur) {
      var m = s.meta || {};
      var sideCols = q(el, ".me-split-card:last-child .me-bar-col");
      var sideBeats = scheduleBeats(s, dur, sideCols.map(function (c) { return { hint: c.textContent || "" }; }), { start: 0.45, end: Math.min(2.6, Math.max(1.1, dur * 0.48)) });
      var payoffRel = m.revealOn ? findSpokenOffset(s, buildWordStream(s), (m.value || "") + " " + (m.delta || ""), m.revealOn, 0.35, Math.max(0.8, dur - 0.6)) : null;

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
      var cards = q(el, ".me-split-card");
      if (cards[0]) {
        popIn(cards[0], at, { y: 10, dur: 0.3 });
        // Hero stat & meter ALWAYS enter promptly at +0.25s; delta chip pops on revealOn!
        var statAt = at + 0.22;
        var vbar = cards[0].querySelector(".me-stat-vbar-fill");
        if (vbar) {
          gsap.set(vbar, { scaleY: 0 });
          tl.to(vbar, { scaleY: 1, duration: 0.55, ease: "power3.out" }, statAt);
        }
        popIn(cards[0].querySelector(".me-stat-big"), statAt, { y: 8, scale: 0.95, dur: 0.34 });
        q(cards[0], ".me-count").forEach(function (cn) { countTo(cn, statAt, 0.55); });
        var deltaAt = payoffRel !== null ? at + Math.max(0.45, payoffRel) : statAt + 0.28;
        popIn(cards[0].querySelector(".me-delta-chip"), deltaAt, { scale: 0.88, dur: 0.3, ease: "back.out(1.5)" });
        popIn(cards[0].querySelector(".me-mini-term"), statAt + 0.32, { y: 8, dur: 0.28 });
        queueSFX("ding", deltaAt, { vol: 0.82 });
        if (payoffRel !== null && dur > 4.5) focusPulse(cards[0].querySelector(".me-stat-big"), at + payoffRel);
      }
      if (cards[1]) {
        popIn(cards[1], at + 0.08, { y: 10, dur: 0.3 });
        sideCols.forEach(function (col, idx) {
          var ct = at + (sideBeats[idx] || 0.45 + idx * 0.28);
          popIn(col, ct, { y: 8, dur: 0.26 });
          var fill = col.querySelector(".me-bar-fill");
          if (fill) {
            gsap.set(fill, { scaleY: 0 });
            tl.to(fill, { scaleY: 1, duration: 0.46, ease: "power3.out" }, ct + 0.06);
          }
          q(col, ".me-count").forEach(function (cn) { countTo(cn, ct + 0.06, 0.46); });
          queueSFX("pop", ct + 0.1, { vol: 0.72 });
        });
      }
    },

    me_evidence_card: function (el, s, at, dur) {
      var m = s.meta || {};
      var pts = q(el, ".me-paper-card .me-schema-row");
      var beats = scheduleBeats(s, dur, [
        { hint: m.highlight || m.callout || m.body || "", cue: m.revealOn }
      ].concat(pts.map(function (p, idx) {
        var cfg = (m.points || [])[idx] || {};
        return { hint: p.textContent || "", cue: cfg.revealOn || cfg.cue };
      })), { start: 0.35, end: Math.max(1.2, Math.min(dur - 0.55, 4.5)) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
      popIn(el.querySelector(".me-paper-card"), at, { y: 10, scale: 0.98, dur: 0.34 });
      queueSFX("swipe", at + 0.06, { vol: 0.65 });

      var hl = el.querySelector(".me-highlight-box");
      if (hl) {
        gsap.set(hl, { opacity: 0.55 });
        tl.to(hl, { opacity: 1, duration: 0.32, ease: "power2.out" }, at + beats[0]);
        queueSFX("pop", at + beats[0], { vol: 0.75 });
      }
      pts.forEach(function (pt, idx) {
        var ptt = at + (beats[1 + idx] || 0.55 + idx * 0.24);
        popIn(pt, ptt, { y: 8, dur: 0.28 });
        queueSFX("click", ptt, { vol: 0.62 });
      });
      popIn(el.querySelector(".me-evidence-wrap > .me-pill"), at + Math.min(dur * 0.6, (beats[beats.length - 1] || 1.2) + 0.35), { y: 10, scale: 0.92, dur: 0.32 });
    },

    me_pipeline_flow: function (el, s, at, dur) {
      var m = s.meta || {};
      var steps = q(el, ".me-step-pill");
      var nodes = q(el, ".me-pipe-node");
      var earlyEnd = Math.min(Math.max(1.2, dur * 0.45), 3.0);
      var stepBeats = scheduleBeats(s, dur, steps.map(function (st, idx) {
        var cfg = (m.steps || [])[idx] || {};
        return { hint: st.textContent || "", cue: cfg.revealOn || cfg.cue };
      }), { start: 0.1, end: Math.min(earlyEnd, 1.8) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
      steps.forEach(function (st, idx) {
        var stAt = at + (stepBeats[idx] || 0.08 + idx * 0.16);
        popIn(st, stAt, { y: 6, scale: 0.94, dur: 0.24 });
        queueSFX("click", stAt, { vol: 0.55 });
      });

      if (nodes.length) {
        var nodeBeats = scheduleBeats(s, dur, nodes.map(function (nd, idx) {
          var cfg = (m.nodes || [])[idx] || {};
          return { hint: nd.textContent || "", cue: cfg.revealOn || cfg.cue };
        }), { start: 0.18, end: earlyEnd });
        var arrows = q(el, ".me-nodes-row .me-draw-path");
        nodes.forEach(function (nd, idx) {
          var nt = idx === 0 ? at + 0.04 : (at + (nodeBeats[idx] || 0.32 + idx * 0.28));
          popIn(nd, nt, { y: 10, scale: 0.95, dur: 0.32 });
          if (idx > 0 && arrows[idx - 1]) drawPaths([arrows[idx - 1]], nt - 0.12, { dur: 0.32 });
          queueSFX(nd.classList.contains("is-active") ? "ding" : "pop", nt + 0.04, { vol: 0.72 });
        });
      } else {
        var cAt = at + 0.04;
        var rAt = at + 0.42;
        popIn(el.querySelector(".me-dot-matrix"), cAt, { scale: 0.94, dur: 0.32 });
        popIn(el.querySelector(".me-c3-card"), cAt + 0.04, { y: 10, dur: 0.32 });
        queueSFX("pop", cAt + 0.06, { vol: 0.72 });
        q(el, ".me-sim-row").forEach(function (rw, ri) {
          popIn(rw, rAt + ri * 0.12, { y: 8, dur: 0.26 });
        });
        queueSFX("tick", rAt, { vol: 0.68 });
      }
      animateBottomPill(el, s, at, dur, earlyEnd + 0.2);
    },

    me_schema_card: function (el, s, at, dur) {
      var m = s.meta || {};
      var rows = q(el, ".me-schema-row");
      var earlyEnd = Math.min(Math.max(1.2, dur * 0.45), 2.8);
      var beats = scheduleBeats(s, dur, rows.map(function (r, idx) {
        var cfg = (m.fields || [])[idx] || {};
        return { hint: r.textContent || "", cue: cfg.revealOn || cfg.cue };
      }), { start: 0.16, end: earlyEnd });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
      popIn(el.querySelector(".me-schema-box"), at, { y: 10, scale: 0.98, dur: 0.32 });
      queueSFX("swipe", at + 0.05, { vol: 0.64 });

      rows.forEach(function (rw, idx) {
        var rt = at + (beats[idx] || 0.18 + idx * 0.22);
        popIn(rw, rt, { y: 8, dur: 0.26 });
        queueSFX(rw.classList.contains("is-highlight") ? "alert" : "tick", rt, { vol: 0.68 });
      });

      var att = el.querySelector(".me-attempt-card");
      if (att) {
        var aAt = at + Math.min(dur - 0.65, Math.max(earlyEnd * 0.8, 1.4));
        popIn(att, aAt, { y: 10, scale: 0.95, dur: 0.32 });
        queueSFX("pop", aAt + 0.05, { vol: 0.75 });
      }
      var deck = el.querySelector(".me-deck-col");
      if (deck) {
        var dAt = at + 0.35;
        drawPaths(q(el, ".me-deck-arrow .me-draw-path"), dAt, { dur: 0.42 });
        popIn(deck, dAt + 0.12, { scale: 0.92, dur: 0.32 });
      }
    },

    me_editor_window: function (el, s, at, dur) {
      var m = s.meta || {};
      var lines = q(el, ".me-editor-line");
      var earlyEnd = Math.min(Math.max(1.0, dur * 0.4), 2.4);
      var beats = scheduleBeats(s, dur, lines.map(function (ln) {
        return { hint: ln.textContent || "" };
      }), { start: 0.14, end: earlyEnd });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
      popIn(el.querySelector(".me-editor-win"), at, { y: 10, scale: 0.98, dur: 0.32 });
      lines.forEach(function (ln, idx) {
        var lt = at + (beats[idx] || 0.14 + idx * 0.2);
        popIn(ln, lt, { y: 6, dur: 0.24 });
        queueSFX(ln.classList.contains("is-del") ? "alert" : "click", lt, { vol: 0.62 });
      });

      var stamp = el.querySelector(".me-editor-stamp");
      if (stamp) {
        var stAt = at + Math.min(dur - 0.8, earlyEnd + 0.25);
        gsap.set(stamp, { opacity: 0, scale: 1.4, rotation: -6 });
        tl.to(stamp, { opacity: 1, scale: 1, rotation: -4, duration: 0.24, ease: "power3.out" }, stAt);
        queueSFX("thud", stAt, { vol: 0.85 });
      }
      var summary = el.querySelector(".me-editor-summary");
      if (summary) popIn(summary, at + Math.min(dur - 0.6, earlyEnd + 0.4), { y: 10, dur: 0.3 });

      var scrubFill = el.querySelector(".me-editor-scrub-fill");
      if (scrubFill) {
        popIn(el.querySelector(".me-editor-scrub"), at + 0.3, { y: 6, dur: 0.28 });
        gsap.set(scrubFill, { scaleX: 0 });
        tl.to(scrubFill, { scaleX: 1, duration: Math.max(0.8, dur * 0.45), ease: "power2.out" }, at + 0.55);
      }
      popIn(el.querySelector(".me-editor-layout > .me-pill"), at + Math.min(dur - 0.5, earlyEnd + 0.3), { y: 8, dur: 0.3 });
    },

    me_decision_gate: function (el, s, at, dur) {
      var m = s.meta || {};
      var choices = q(el, ".me-gate-choice");
      var gates = q(el, ".me-gate-box");
      var earlyEnd = Math.min(Math.max(1.2, dur * 0.45), 2.8);
      var beats = scheduleBeats(s, dur, choices.map(function (c) { return { hint: c.textContent || "" }; })
        .concat(gates.map(function (g) { return { hint: g.textContent || "" }; })), { start: 0.24, end: earlyEnd });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
      var stage = el.querySelector(".me-orbit-stage");
      popIn(stage, at, { scale: 0.94, dur: 0.32 });
      spinOrbitRings(stage, at, dur);
      popIn(el.querySelector(".me-modal-card"), at + 0.04, { y: 8, dur: 0.32 });

      var bi = 0;
      choices.forEach(function (ch) {
        var ct = at + (beats[bi++] || 0.4);
        popIn(ch, ct, { scale: 0.88, dur: 0.24, ease: "back.out(1.4)" });
        queueSFX("pop", ct, { vol: 0.72 });
      });
      gates.forEach(function (gt) {
        var gtt = at + (beats[bi++] || 0.85);
        popIn(gt, gtt, { y: 10, dur: 0.3 });
        queueSFX("ding", gtt + 0.05, { vol: 0.74 });
      });
      popIn(el.querySelector(".me-gate-layout > div:first-child > .me-pill"), at + Math.min(dur * 0.55, earlyEnd + 0.15), { scale: 0.9, dur: 0.3 });
    },

    me_timeline: function (el, s, at, dur) {
      var nodes = q(el, ".me-tl-node");
      var beats = scheduleBeats(s, dur, nodes.map(function (nd) { return { hint: nd.textContent || "" }; }), { start: 0.16, end: Math.min(2.6, Math.max(1.0, dur * 0.48)) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
      var axis = el.querySelector(".me-tl-axis");
      if (axis) {
        gsap.set(axis, { scaleX: 0, transformOrigin: "left center" });
        tl.to(axis, { scaleX: 1, duration: 0.45, ease: "power2.out" }, at + 0.06);
      }
      nodes.forEach(function (nd, idx) {
        var nt = idx === 0 ? at + 0.12 : (at + (beats[idx] || 0.25 + idx * 0.28));
        popIn(nd, nt, { y: 10, scale: 0.92, dur: 0.32 });
        queueSFX("pop", nt + 0.04, { vol: 0.72 });
      });
      animateBottomPill(el, s, at, dur, (beats[beats.length - 1] || 1.2) + 0.3);
    },

    me_outro: function (el, s, at, dur) {
      var m = s.meta || {};
      var beats = scheduleBeats(s, dur, [
        { hint: m.ctaSub || s.subline || "" },
        { hint: (m.cta || "Subscribe") + " " + (m.channel || "") }
      ], { start: 0.25, end: Math.min(2.2, Math.max(0.8, dur - 0.5)) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.26 });
      popIn(el.querySelector(".me-hero-headline"), at + 0.04, { y: 12, scale: 0.97, dur: 0.36 });
      popIn(el.querySelector(".me-hero-sub"), at + (beats[0] || 0.3), { y: 10, dur: 0.34 });
      popIn(el.querySelector(".me-outro-cta"), at + (beats[1] || 0.65), { y: 10, scale: 0.92, dur: 0.34, ease: "back.out(1.4)" });
      queueSFX("chime", at + (beats[1] || 0.65), { vol: 0.8 });
    },
  };

  var FALLBACK_MAP = {
    cold: "me_title",
    hero: "me_evidence_card",
    statement: "me_title",
    stat: "me_stat_split",
    compare: "me_bar_compare",
    code: "me_editor_window",
    diff: "me_editor_window",
    terminal: "me_editor_window",
    flow: "me_pipeline_flow",
    stack: "me_pipeline_flow",
    ledger: "me_schema_card",
    memory: "me_schema_card",
    timeline: "me_timeline",
    dateline: "me_title",
    quote: "me_evidence_card",
    matrix: "me_pipeline_flow",
    split: "me_evidence_card",
    webref: "me_evidence_card",
    cloud: "me_core_orbit",
    mascot: "me_title",
    meme: "me_title",
    outro: "me_outro",
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
      if (scIn) {
        gsap.set(scIn, { scale: 0.985 });
        tl.to(scIn, { scale: 1, duration: 0.3, ease: "power2.out" }, at);
      }
    }
    if (i < SCENES.length - 1) {
      tl.set(el, { autoAlpha: 0 }, at + dur);
    }

    var key = ANIM[s.type] ? s.type : (FALLBACK_MAP[s.type] || "me_title");
    ANIM[key](el, s, at, dur);

    if (i < SCENES.length - 1 && dur > 1.0 && scIn) {
      tl.to(scIn, { opacity: 0.06, scale: 1.012, duration: 0.14, ease: "power1.in" }, at + dur - 0.14);
    }
  });

  window.__timelines = window.__timelines || {};
  window.__timelines["__COMPOSITION_ID__"] = tl;
})();
