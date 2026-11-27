/* ============================================================================
 * Dedicated GSAP Choreography: motion-explainer
 * Kinetic, word-synced progressive reveals: synchronous paused GSAP timeline,
 * spoken-word cue matcher (with number-word & revealOn/cue support), monotonic
 * beat spreading across each scene's speech window, isometric cube & orbital
 * ring motion, bar-grow & delta-cap reveals, and deterministic digital SFX.
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
    var minGap = opts.minGap != null ? opts.minGap : 0.24;
    var tStart = clamp(opts.start != null ? opts.start : 0.14, 0.05, Math.max(0.1, dur - 0.6));
    var tEnd = clamp(opts.end != null ? opts.end : Math.max(tStart + 0.3, dur - 0.72), tStart + 0.2, Math.max(tStart + 0.25, dur - 0.4));
    var span = Math.max(0.25, tEnd - tStart);
    var step = span / Math.max(1, n);
    if (n > 1 && step < minGap) {
      minGap = Math.max(0.12, span / n);
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
      for (var j = 0; j < raw.length; j++) raw[j] = Math.max(tStart + j * 0.1, raw[j] - excess);
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
      duration: opts.dur || 0.34,
      ease: opts.ease || "power3.out",
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
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
      tl.to(p, { strokeDashoffset: 0, duration: dur, ease: "power2.out" }, at + idx * (opts.stagger || 0.05));
      var head = p.parentNode && p.parentNode.querySelector(".me-arrow-head");
      if (head) {
        gsap.set(head, { opacity: 0, scale: 0.6, transformOrigin: "center" });
        tl.to(head, { opacity: 1, scale: 1, duration: 0.16, ease: "power2.out" }, at + idx * (opts.stagger || 0.05) + dur * 0.68);
      }
    });
  }

  function animateBottomPill(el, s, at, dur, minRel) {
    var pill = el.querySelector(".me-bottom-pill");
    if (!pill) return;
    var tRel = clamp(Math.max(minRel || dur * 0.65, 0.4), 0.3, Math.max(0.4, dur - 0.5));
    popIn(pill, at + tRel, { y: 10, scale: 0.92, dur: 0.34, ease: "back.out(1.4)" });
    queueSFX("ding", at + tRel + 0.04, { vol: 0.78 });
  }

  var ANIM = {
    me_title: function (el, s, at, dur) {
      var m = s.meta || {};
      var pills = q(el, ".me-title-pills .me-pill");
      var specs = [
        { hint: m.badge || s.eyebrow || "" },
        { hint: s.headline || "" },
        { hint: m.highlight || s.subline || "", cue: m.revealOn }
      ].concat(pills.map(function (p) { return { hint: p.textContent || "" }; }));
      var beats = scheduleBeats(s, dur, specs, { start: 0.12, end: Math.max(0.9, dur - 0.55) });

      if (at === 0) {
        gsap.set([el.querySelector(".me-eyebrow"), el.querySelector(".me-logo-badge") || el.querySelector(".me-title-wrap > .me-pill"), el.querySelector(".me-title-core"), el.querySelector(".me-hero-headline")], { opacity: 1, y: 0, scale: 1 });
      } else {
        popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.28 });
        popIn(el.querySelector(".me-logo-badge") || el.querySelector(".me-title-wrap > .me-pill"), at + 0.02, { y: 8, dur: 0.28 });
        popIn(el.querySelector(".me-title-core"), at + 0.04, { scale: 0.92, dur: 0.32, ease: "back.out(1.2)" });
        popIn(el.querySelector(".me-hero-headline"), at + 0.06, { y: 12, scale: 0.98, dur: 0.34 });
      }
      queueSFX("pop", at + 0.08, { vol: 0.72 });
      popIn(el.querySelector(".me-hero-highlight"), at + beats[2], { y: 8, scale: 0.94, dur: 0.34, ease: "back.out(1.5)" });
      popIn(el.querySelector(".me-hero-sub"), at + Math.min(beats[2] + 0.06, Math.max(0.35, dur * 0.28)), { y: 8, dur: 0.32 });
      if (el.querySelector(".me-hero-highlight")) queueSFX("ding", at + beats[2], { vol: 0.82 });

      pills.forEach(function (p, k) {
        var pt = at + (beats[3 + k] || beats[2] + 0.25 + k * 0.2);
        popIn(p, pt, { y: 10, scale: 0.92, dur: 0.3, ease: "back.out(1.4)" });
        queueSFX("pop", pt, { vol: 0.65 });
      });
    },

    me_core_orbit: function (el, s, at, dur) {
      var m = s.meta || {};
      var nodes = q(el, ".me-orbit-node");
      var specs = [
        { hint: m.topPill || s.headline || "" },
        { hint: m.arrowLabel || m.targetLabel || (m.modal && m.modal.title) || "", cue: m.revealOn }
      ].concat(nodes.map(function (n, idx) {
        var cfg = (m.orbitNodes || [])[idx] || {};
        return { hint: n.textContent || "", cue: cfg.revealOn || cfg.cue };
      }));
      var beats = scheduleBeats(s, dur, specs, { start: 0.24, end: Math.max(1.0, dur - 0.55) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.28 });
      var stages = q(el, ".me-orbit-stage");
      if (stages[0]) {
        popIn(stages[0].querySelector(".me-iso-cube"), at, { scale: 0.92, dur: 0.34, ease: "back.out(1.2)" });
        var arc = stages[0].querySelector(".me-ring-arc");
        if (arc) {
          gsap.set(arc, { rotation: -28, transformOrigin: "50% 50%", opacity: 0.35 });
          tl.to(arc, { rotation: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, at);
        }
        queueSFX("whoosh", at + 0.05, { vol: 0.65 });
      }
      popIn(el.querySelector(".me-orbit-top"), at + 0.04, { y: 6, dur: 0.28 });

      nodes.forEach(function (nd, k) {
        var nt = at + (beats[2 + k] || beats[0] + 0.35 + k * 0.24);
        popIn(nd, nt, { y: 8, scale: 0.88, dur: 0.3, ease: "back.out(1.5)" });
        queueSFX("pop", nt, { vol: 0.7 });
      });

      var arrowWrap = el.querySelector(".me-orbit-arrow-wrap");
      if (arrowWrap) {
        var atArrow = at + beats[1];
        drawPaths(q(arrowWrap, ".me-draw-path"), atArrow, { dur: 0.45 });
        popIn(arrowWrap.querySelector(".me-orbit-arrow-label"), atArrow + 0.14, { scale: 0.9, dur: 0.3 });
        queueSFX("swipe", atArrow, { vol: 0.72 });
      }
      popIn(el.querySelector(".me-modal-card") || el.querySelector(".me-orbit-side") || el.querySelector(".me-deck-wrap"), at + beats[1] + 0.16, { y: 12, scale: 0.95, dur: 0.38 });
      popIn(el.querySelector(".me-orbit-bottom"), at + Math.max(beats[1] + 0.2, dur * 0.68), { y: 8, dur: 0.3 });
    },

    me_bar_compare: function (el, s, at, dur) {
      var m = s.meta || {};
      var cols = q(el, ".me-groups-grid").length ? q(el, ".me-group-box") : q(el, ".me-bar-col");
      var specs = [{ hint: m.header || s.headline || "" }].concat(cols.map(function (c, idx) {
        var cfg = (m.groups || m.bars || [])[idx] || {};
        return { hint: c.textContent || "", cue: cfg.revealOn || cfg.cue };
      }));
      var beats = scheduleBeats(s, dur, specs, { start: 0.14, end: Math.max(1.0, dur - 0.6) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.28 });
      popIn(el.querySelector(".me-bar-head"), at, { y: 8, dur: 0.28 });
      popIn(el.querySelector(".me-chart-panel") || el.querySelector(".me-groups-grid"), at + 0.03, { y: 8, dur: 0.3 });

      cols.forEach(function (col, idx) {
        var ct = at + (beats[1 + idx] || beats[0] + 0.3 + idx * 0.28);
        if (col.classList.contains("me-group-box")) {
          popIn(col, idx === 0 ? at + 0.04 : ct, { y: 12, scale: 0.96, dur: 0.34 });
          q(col, ".me-bar-fill").forEach(function (fill, fi) {
            gsap.set(fill, { scaleY: 0 });
            tl.to(fill, { scaleY: 1, duration: 0.45, ease: "power3.out" }, ct + 0.12 + fi * 0.08);
          });
          queueSFX("pop", ct + 0.05, { vol: 0.72 });
        } else {
          popIn(col, ct, { y: 8, dur: 0.26 });
          var fill = col.querySelector(".me-bar-fill");
          if (fill) {
            gsap.set(fill, { scaleY: 0 });
            tl.to(fill, { scaleY: 1, duration: 0.5, ease: "power3.out" }, ct + 0.06);
          }
          popIn(col.querySelector(".me-bar-cap"), ct + 0.36, { y: 6, dur: 0.26 });
          popIn(col.querySelector(".me-bar-delta"), ct + 0.4, { y: 6, scale: 0.9, dur: 0.26 });
          queueSFX(idx === cols.length - 1 ? "ding" : "tick", ct + 0.18, { vol: 0.76 });
        }
      });

      var thr = el.querySelector(".me-threshold-line");
      if (thr) {
        gsap.set(thr, { scaleX: 0, transformOrigin: "left center" });
        tl.to(thr, { scaleX: 1, duration: 0.45, ease: "power2.out" }, at + Math.max(0.4, dur * 0.55));
      }
      animateBottomPill(el, s, at, dur, (beats[beats.length - 1] || dur * 0.65) + 0.25);
    },

    me_stat_split: function (el, s, at, dur) {
      var m = s.meta || {};
      var sideCols = q(el, ".me-split-card:last-child .me-bar-col");
      var specs = [
        { hint: m.model || s.headline || "" },
        { hint: (m.value || "") + " " + (m.delta || ""), cue: m.revealOn }
      ].concat(sideCols.map(function (c, idx) {
        var cfg = (m.sideBars || [])[idx] || {};
        return { hint: c.textContent || "", cue: cfg.revealOn || cfg.cue };
      }));
      var beats = scheduleBeats(s, dur, specs, { start: 0.14, end: Math.max(1.0, dur - 0.55) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.28 });
      var cards = q(el, ".me-split-card");
      if (cards[0]) {
        popIn(cards[0], at, { y: 10, dur: 0.32 });
        var vbar = cards[0].querySelector(".me-stat-vbar-fill");
        if (vbar) {
          gsap.set(vbar, { scaleY: 0 });
          tl.to(vbar, { scaleY: 1, duration: 0.55, ease: "power3.out" }, at + beats[1]);
        }
        popIn(cards[0].querySelector(".me-stat-big"), at + beats[1], { y: 10, scale: 0.94, dur: 0.36 });
        popIn(cards[0].querySelector(".me-delta-chip"), at + beats[1] + 0.22, { scale: 0.88, dur: 0.3, ease: "back.out(1.4)" });
        queueSFX("ding", at + beats[1] + 0.1, { vol: 0.82 });
      }
      if (cards[1]) {
        popIn(cards[1], at + 0.06, { y: 10, dur: 0.32 });
        sideCols.forEach(function (col, idx) {
          var ct = at + (beats[2 + idx] || beats[1] + 0.3 + idx * 0.25);
          popIn(col, ct, { y: 8, dur: 0.26 });
          var fill = col.querySelector(".me-bar-fill");
          if (fill) {
            gsap.set(fill, { scaleY: 0 });
            tl.to(fill, { scaleY: 1, duration: 0.45, ease: "power3.out" }, ct + 0.06);
          }
          queueSFX("pop", ct + 0.1, { vol: 0.72 });
        });
      }
    },

    me_evidence_card: function (el, s, at, dur) {
      var m = s.meta || {};
      var pts = q(el, ".me-paper-card .me-schema-row");
      var specs = [
        { hint: (m.source || "") + " " + (m.title || "") },
        { hint: m.highlight || m.callout || m.body || "", cue: m.revealOn }
      ].concat(pts.map(function (p) { return { hint: p.textContent || "" }; }));
      var beats = scheduleBeats(s, dur, specs, { start: 0.14, end: Math.max(1.0, dur - 0.55) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.28 });
      popIn(el.querySelector(".me-paper-card"), at, { y: 10, scale: 0.98, dur: 0.34 });
      queueSFX("swipe", at + beats[0], { vol: 0.65 });

      var hl = el.querySelector(".me-highlight-box");
      if (hl) {
        gsap.set(hl, { opacity: 0.45 });
        tl.to(hl, { opacity: 1, duration: 0.32, ease: "power2.out" }, at + beats[1]);
        queueSFX("pop", at + beats[1], { vol: 0.75 });
      }
      pts.forEach(function (pt, idx) {
        var ptt = at + (beats[2 + idx] || beats[1] + 0.24 + idx * 0.22);
        popIn(pt, ptt, { y: 8, dur: 0.3 });
        queueSFX("click", ptt, { vol: 0.62 });
      });
      popIn(el.querySelector(".me-evidence-wrap > .me-pill"), at + Math.max(beats[1] + 0.25, dur * 0.65), { y: 10, scale: 0.92, dur: 0.32 });
    },

    me_pipeline_flow: function (el, s, at, dur) {
      var m = s.meta || {};
      var steps = q(el, ".me-step-pill");
      var nodes = q(el, ".me-pipe-node");
      var specs = steps.map(function (st, idx) {
        var cfg = (m.steps || [])[idx] || {};
        return { hint: st.textContent || "", cue: cfg.revealOn || cfg.cue };
      }).concat(nodes.length
        ? nodes.map(function (nd, idx) {
            var cfg = (m.nodes || [])[idx] || {};
            return { hint: nd.textContent || "", cue: cfg.revealOn || cfg.cue };
          })
        : [{ hint: m.centerTitle || s.headline || "", cue: m.revealOn }, { hint: m.rightTitle || "SIM" }]
      );
      var beats = scheduleBeats(s, dur, specs, { start: 0.14, end: Math.max(1.0, dur - 0.6) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.28 });
      var bi = 0;
      steps.forEach(function (st) {
        var stAt = at + (beats[bi++] || 0.15);
        popIn(st, stAt, { y: 6, scale: 0.92, dur: 0.26 });
        queueSFX("click", stAt, { vol: 0.58 });
      });

      if (nodes.length) {
        var arrows = q(el, ".me-nodes-row .me-draw-path");
        nodes.forEach(function (nd, idx) {
          var nt = idx === 0 ? at + 0.04 : (at + (beats[bi++] || 0.4 + idx * 0.28));
          if (idx === 0) bi++;
          popIn(nd, nt, { y: 12, scale: 0.94, dur: 0.34 });
          if (idx > 0 && arrows[idx - 1]) drawPaths([arrows[idx - 1]], nt - 0.1, { dur: 0.3 });
          queueSFX(nd.classList.contains("is-active") ? "ding" : "pop", nt + 0.04, { vol: 0.72 });
        });
      } else {
        var cAt = at + 0.04;
        var rAt = at + (beats[bi + 1] || 0.7);
        popIn(el.querySelector(".me-dot-matrix"), cAt, { scale: 0.94, dur: 0.32 });
        popIn(el.querySelector(".me-c3-card"), cAt + 0.04, { y: 10, dur: 0.32 });
        queueSFX("pop", cAt + 0.06, { vol: 0.72 });
        q(el, ".me-sim-row").forEach(function (rw, ri) {
          popIn(rw, rAt + ri * 0.12, { y: 8, dur: 0.26 });
        });
        queueSFX("tick", rAt, { vol: 0.68 });
      }
      animateBottomPill(el, s, at, dur, (beats[beats.length - 1] || dur * 0.7) + 0.25);
    },

    me_schema_card: function (el, s, at, dur) {
      var m = s.meta || {};
      var rows = q(el, ".me-schema-row");
      var specs = [{ hint: m.title || s.headline || "" }].concat(rows.map(function (r, idx) {
        var cfg = (m.fields || [])[idx] || {};
        return { hint: r.textContent || "", cue: cfg.revealOn || cfg.cue };
      }));
      if (m.attempt) specs.push({ hint: m.attempt.value || m.attempt.label || "", cue: m.attempt.revealOn || m.attempt.cue });
      var beats = scheduleBeats(s, dur, specs, { start: 0.14, end: Math.max(1.0, dur - 0.55) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.28 });
      popIn(el.querySelector(".me-schema-box"), at, { y: 10, scale: 0.98, dur: 0.34 });
      queueSFX("swipe", at + beats[0], { vol: 0.64 });

      rows.forEach(function (rw, idx) {
        var rt = at + (beats[1 + idx] || beats[0] + 0.25 + idx * 0.2);
        popIn(rw, rt, { y: 8, dur: 0.28 });
        queueSFX(rw.classList.contains("is-highlight") ? "alert" : "tick", rt, { vol: 0.68 });
      });

      var att = el.querySelector(".me-attempt-card");
      if (att) {
        var aAt = at + (beats[1 + rows.length] || dur * 0.65);
        popIn(att, aAt, { y: 10, scale: 0.95, dur: 0.34 });
        queueSFX("pop", aAt + 0.05, { vol: 0.75 });
      }
      var deck = el.querySelector(".me-deck-col");
      if (deck) {
        var dAt = at + Math.max(0.45, dur * 0.55);
        drawPaths(q(el, ".me-deck-arrow .me-draw-path"), dAt, { dur: 0.42 });
        popIn(deck, dAt + 0.12, { scale: 0.92, dur: 0.34 });
      }
    },

    me_editor_window: function (el, s, at, dur) {
      var m = s.meta || {};
      var lines = q(el, ".me-editor-line");
      var specs = [{ hint: m.filename || s.headline || "" }].concat(lines.map(function (ln, idx) {
        var cfg = (m.lines || [])[idx] || {};
        return { hint: ln.textContent || "", cue: cfg.revealOn || cfg.cue };
      }));
      var beats = scheduleBeats(s, dur, specs, { start: 0.14, end: Math.max(1.0, dur - 0.55) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.28 });
      popIn(el.querySelector(".me-editor-win"), at, { y: 10, scale: 0.98, dur: 0.32 });
      lines.forEach(function (ln, idx) {
        var lt = at + (beats[1 + idx] || beats[0] + 0.22 + idx * 0.2);
        popIn(ln, lt, { y: 6, dur: 0.24 });
        queueSFX(ln.classList.contains("is-del") ? "alert" : "click", lt, { vol: 0.62 });
      });
      popIn(el.querySelector(".me-editor-layout > .me-pill"), at + Math.max(0.45, dur * 0.72), { y: 8, dur: 0.3 });
    },

    me_decision_gate: function (el, s, at, dur) {
      var m = s.meta || {};
      var choices = q(el, ".me-gate-choice");
      var gates = q(el, ".me-gate-box");
      var specs = [
        { hint: m.question || s.headline || "" }
      ].concat(choices.map(function (c) { return { hint: c.textContent || "" }; }))
       .concat(gates.map(function (g) { return { hint: g.textContent || "" }; }));
      var beats = scheduleBeats(s, dur, specs, { start: 0.14, end: Math.max(1.0, dur - 0.55) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.28 });
      popIn(el.querySelector(".me-orbit-stage"), at, { scale: 0.94, dur: 0.34 });
      popIn(el.querySelector(".me-modal-card"), at + 0.04, { y: 8, dur: 0.32 });
      var bi = 1;
      choices.forEach(function (ch) {
        var ct = at + (beats[bi++] || 0.5);
        popIn(ch, ct, { scale: 0.88, dur: 0.26, ease: "back.out(1.4)" });
        queueSFX("pop", ct, { vol: 0.72 });
      });
      gates.forEach(function (gt) {
        var gtt = at + (beats[bi++] || 0.9);
        popIn(gt, gtt, { y: 10, dur: 0.32 });
        queueSFX("ding", gtt + 0.05, { vol: 0.74 });
      });
      popIn(el.querySelector(".me-gate-layout > div:first-child > .me-pill"), at + Math.max(0.5, dur * 0.72), { scale: 0.9, dur: 0.3 });
    },

    me_timeline: function (el, s, at, dur) {
      var m = s.meta || {};
      var nodes = q(el, ".me-tl-node");
      var specs = nodes.map(function (nd, idx) {
        var cfg = (m.events || [])[idx] || {};
        return { hint: nd.textContent || "", cue: cfg.revealOn || cfg.cue };
      });
      var beats = scheduleBeats(s, dur, specs, { start: 0.18, end: Math.max(1.0, dur - 0.6) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.28 });
      var axis = el.querySelector(".me-tl-axis");
      if (axis) {
        gsap.set(axis, { scaleX: 0, transformOrigin: "left center" });
        tl.to(axis, { scaleX: 1, duration: 0.5, ease: "power2.out" }, at + 0.12);
      }
      nodes.forEach(function (nd, idx) {
        var nt = at + (beats[idx] || 0.3 + idx * 0.3);
        popIn(nd, nt, { y: 10, scale: 0.92, dur: 0.34 });
        queueSFX("pop", nt + 0.04, { vol: 0.72 });
      });
      animateBottomPill(el, s, at, dur, (beats[beats.length - 1] || dur * 0.7) + 0.25);
    },

    me_outro: function (el, s, at, dur) {
      var m = s.meta || {};
      var beats = scheduleBeats(s, dur, [
        { hint: s.headline || "thanks" },
        { hint: m.ctaSub || s.subline || "" },
        { hint: (m.cta || "Subscribe") + " " + (m.channel || "") }
      ], { start: 0.16, end: Math.max(0.8, dur - 0.5) });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.28 });
      popIn(el.querySelector(".me-hero-headline"), at + beats[0], { y: 14, scale: 0.96, dur: 0.42 });
      popIn(el.querySelector(".me-hero-sub"), at + beats[1], { y: 10, dur: 0.36 });
      popIn(el.querySelector(".me-outro-cta"), at + beats[2], { y: 10, scale: 0.92, dur: 0.34, ease: "back.out(1.4)" });
      queueSFX("chime", at + beats[2], { vol: 0.8 });
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
    }
    if (i < SCENES.length - 1) {
      tl.set(el, { autoAlpha: 0 }, at + dur);
    }

    var key = ANIM[s.type] ? s.type : (FALLBACK_MAP[s.type] || "me_title");
    ANIM[key](el, s, at, dur);

    if (i < SCENES.length - 1 && dur > 1.0 && scIn) {
      tl.to(scIn, { opacity: 0.08, duration: 0.12, ease: "power1.in" }, at + dur - 0.12);
    }
  });

  window.__timelines = window.__timelines || {};
  window.__timelines["__COMPOSITION_ID__"] = tl;
})();
