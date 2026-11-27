/* ============================================================================
 * Dedicated GSAP Choreography: motion-explainer (v2.1 - Word-Synced Studio)
 * Synchronizes every SFX cue, visual micro-animation, micro-motion, and scene
 * transition directly to spoken word timestamps (`wordTimings`, `speechStart`,
 * `speechEnd`):
 *   - Scene transitions & opening SFX anchor to actual voiceover onset/end
 *   - Structural elements appear promptly (zero blank holds); spoken elements
 *     and payoff badges/stamps/deltas land ~45ms ahead of their spoken word
 *     so visual settle and SFX peak right on the spoken syllable
 *   - Stemmed + numeric-word matching (`68.41` -> `sixty eight point four one`,
 *     `27x` -> `twenty seven times`, `rounds` <-> `round`)
 *   - Ordered vs unordered beat scheduling so parallel items never get forced
 *     out of speech order while sequential steps/choices advance monotonically
 *   - Micro-motions (orbit rings, glow breathe, spotlight pulses, caret blink)
 *     follow the active speech window and already-revealed elements only
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

  /* ---------------------------------------------------------- SFX cue queue */
  var sfxEvents = [];
  window.__SFX_EVENTS__ = sfxEvents;
  var SFX_DEDUPE_WINDOW = 0.075;
  function queueSFX(type, at, opt) {
    if (!Number.isFinite(at) || at < 0 || at >= TOTAL) return;
    var vol = opt && opt.vol != null ? opt.vol : 1;
    var dedupe = !opt || opt.dedupe !== false;
    if (dedupe) {
      for (var i = sfxEvents.length - 1; i >= 0; i--) {
        var prev = sfxEvents[i];
        if (Math.abs(prev.at - at) < SFX_DEDUPE_WINDOW) {
          if (vol > prev.vol + 0.05) {
            sfxEvents[i] = { type: type, at: at, vol: vol };
          }
          return;
        }
      }
    }
    sfxEvents.push({ type: type, at: at, vol: vol });
  }

  window.__synthesizeSFX = async function () {
    sfxEvents.sort(function (a, b) { return a.at - b.at; });
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
  var UNIT_WORDS = {
    s: "seconds", sec: "seconds", secs: "seconds", ms: "milliseconds",
    x: "times", k: "thousand", m: "million", b: "billion",
    pct: "percent", h: "hours", hr: "hours", hrs: "hours", min: "minutes"
  };

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

  function pushNumberTokens(out, rawNum, unit) {
    var numStr = rawNum.replace(/,/g, "");
    if (numStr.indexOf(".") >= 0) {
      var segs = numStr.split(".");
      var whole = segs[0];
      var frac = segs[1];
      if (whole !== "") {
        out.push(whole);
        pushNumberWords(out, whole);
      }
      out.push("point");
      if (frac) {
        out.push(frac);
        if (frac.length <= 2) pushNumberWords(out, frac);
        for (var fi = 0; fi < frac.length; fi++) {
          var d = parseInt(frac[fi], 10);
          if (Number.isFinite(d)) out.push(ONES[d]);
        }
      }
    } else {
      out.push(numStr);
      pushNumberWords(out, numStr);
    }
    if (unit && UNIT_WORDS[unit]) out.push(UNIT_WORDS[unit]);
  }

  function stemToken(tok) {
    if (!tok || tok.length < 4 || /^\d+$/.test(tok)) return tok;
    if (tok.length > 5 && tok.slice(-4) === "tion") return tok.slice(0, -4);
    if (tok.length > 5 && tok.slice(-3) === "ing") return tok.slice(0, -3);
    if (tok.length > 4 && tok.slice(-2) === "ed") return tok.slice(0, -2);
    if (tok.length > 4 && tok.slice(-2) === "es") return tok.slice(0, -2);
    if (tok.length > 3 && tok.slice(-1) === "s" && tok.slice(-2) !== "ss") return tok.slice(0, -1);
    return tok;
  }

  function tokenMatchWeight(cueTok, streamTok) {
    if (cueTok === streamTok) return 1.0;
    if (/^\d+$/.test(cueTok) || /^\d+$/.test(streamTok)) return 0;
    if (cueTok.length < 3 || streamTok.length < 3) return 0;
    var cs = stemToken(cueTok);
    var ss = stemToken(streamTok);
    if (cs.length >= 3 && cs === ss) return 0.9;
    var minLen = Math.min(cueTok.length, streamTok.length);
    var maxLen = Math.max(cueTok.length, streamTok.length);
    if (minLen >= 4 && minLen / maxLen >= 0.6 && (cueTok.indexOf(streamTok) === 0 || streamTok.indexOf(cueTok) === 0)) {
      return 0.8;
    }
    return 0;
  }

  function normRawTokens(text) {
    var raw = String(text || "").toLowerCase().replace(/(\d),(\d{3})/g, "$1$2");
    var matches = raw.match(/\d+(?:\.\d+)?(?:[a-z%]+)?|[a-z0-9]+/g) || [];
    var out = [];
    for (var i = 0; i < matches.length; i++) {
      var tok = matches[i];
      var m = tok.match(/^(\d+(?:\.\d+)?)([a-z%]+)?$/);
      if (m) {
        var parts = m[1].split(".");
        for (var p = 0; p < parts.length; p++) {
          if (parts[p]) out.push(parts[p]);
        }
        if (m[2] && m[2] !== "%") out.push(m[2]);
      } else {
        out.push(tok);
      }
    }
    return out;
  }

  function expandCueTokens(text, keepStop) {
    var raw = String(text || "").toLowerCase().replace(/(\d),(\d{3})/g, "$1$2");
    var parts = raw.match(/\d+(?:\.\d+)?(?:[a-z%]+)?|[a-z0-9]+/g) || [];
    var out = [];
    var prevWasNum = false;
    parts.forEach(function (tok) {
      var nm = tok.match(/^(\d+(?:\.\d+)?)([a-z%]+)?$/);
      if (nm) {
        var unit = nm[2] === "%" ? "pct" : (nm[2] || "");
        pushNumberTokens(out, nm[1], unit);
        if (nm[2] && nm[2] !== "%") out.push(nm[2]);
        prevWasNum = true;
        return;
      }
      if (prevWasNum && UNIT_WORDS[tok]) {
        out.push(UNIT_WORDS[tok]);
      }
      prevWasNum = false;
      if (!keepStop && STOP[tok]) return;
      out.push(tok);
    });
    return Array.from(new Set(out));
  }

  function buildWordStream(s) {
    if (s && s.__wordStream) return s.__wordStream;
    var list = [];
    var wts = Array.isArray(s.wordTimings) ? s.wordTimings : [];
    for (var i = 0; i < wts.length; i++) {
      var wt = Number(wts[i].t) || 0;
      var wd = Number(wts[i].d) || 0;
      var toks = normRawTokens(wts[i].w);
      for (var j = 0; j < toks.length; j++) {
        list.push({ tok: toks[j], t: wt, d: wd });
      }
    }
    if (s) s.__wordStream = list;
    return list;
  }

  function getSpeechWindow(s, dur) {
    var stream = buildWordStream(s);
    var startRel = 0;
    if (s && s.speechStart != null && Number.isFinite(Number(s.speechStart))) {
      startRel = clamp(Number(s.speechStart) - Number(s.start || 0), 0, Math.max(0, dur - 0.5));
    } else if (stream.length) {
      startRel = clamp(stream[0].t, 0, Math.max(0, dur - 0.5));
    }
    var endRel = dur;
    if (s && s.speechEnd != null && Number.isFinite(Number(s.speechEnd))) {
      endRel = clamp(Number(s.speechEnd) - Number(s.start || 0), startRel, dur);
    } else if (stream.length) {
      var last = stream[stream.length - 1];
      endRel = clamp(last.t + (last.d || 0.25), startRel, dur);
    }
    var onset = clamp(startRel, 0.02, Math.min(0.42, Math.max(0.04, dur * 0.22)));
    return { startRel: startRel, endRel: endRel, onset: onset };
  }

  function findSpokenOffset(s, stream, hintText, explicitCue, minRel, maxRel, strictMin) {
    if (typeof explicitCue === "number" && Number.isFinite(explicitCue)) {
      return clamp(explicitCue, minRel, maxRel);
    }
    if (!stream || !stream.length) return null;

    var hasExplicit = typeof explicitCue === "string" && explicitCue.trim().length > 0;
    var cueTokens = hasExplicit
      ? expandCueTokens(explicitCue, true)
      : expandCueTokens(hintText, false);
    if (!cueTokens.length && hintText) cueTokens = expandCueTokens(hintText, true);
    if (!cueTokens.length) return null;

    var lo = strictMin ? minRel : (minRel - 0.22);
    var hi = maxRel + 0.25;

    if (hasExplicit) {
      var seq = normRawTokens(explicitCue);
      if (seq.length >= 2) {
        for (var i = 0; i <= stream.length - seq.length; i++) {
          if (stream[i].t < lo || stream[i].t > hi) continue;
          var ok = true;
          for (var k = 0; k < seq.length; k++) {
            if (tokenMatchWeight(seq[k], stream[i + k].tok) < 0.8) { ok = false; break; }
          }
          if (ok) return clamp(stream[i].t, minRel, maxRel);
        }
      }
    }

    var bestScore = 0;
    var bestTime = null;

    for (var idx = 0; idx < stream.length; idx++) {
      var wt = stream[idx].t;
      if (wt < lo || wt > hi) continue;
      var score = 0;
      var used = {};
      for (var w = 0; w < 4 && idx + w < stream.length; w++) {
        var stok = stream[idx + w].tok;
        var bestW = 0;
        var matchedCue = null;
        for (var c = 0; c < cueTokens.length; c++) {
          var ctok = cueTokens[c];
          if (used[ctok]) continue;
          var mw = tokenMatchWeight(ctok, stok);
          if (mw > bestW) { bestW = mw; matchedCue = ctok; }
        }
        if (bestW > 0 && matchedCue) {
          used[matchedCue] = 1;
          var isNum = /^\d+$/.test(stok);
          score += bestW * ((w === 0 ? 1.6 : 1.0) + (stok.length >= 5 ? 0.5 : 0) + (isNum ? 0.6 : 0));
        }
      }
      if (score > bestScore) { bestScore = score; bestTime = wt; }
    }
    return bestScore >= 0.9 && bestTime !== null ? clamp(bestTime, minRel, maxRel) : null;
  }

  function spokenOrFallback(s, stream, hintText, explicitCue, fallbackRel, minRel, maxRel) {
    var rel = findSpokenOffset(s, stream, hintText, explicitCue, minRel, maxRel);
    return rel !== null ? rel : clamp(fallbackRel, minRel, maxRel);
  }

  function visLead(at, rel, lead) {
    return Math.max(at + 0.02, at + rel - (lead != null ? lead : 0.045));
  }

  function earliestBeat(beats) {
    var m = Infinity;
    for (var i = 0; i < beats.length; i++) {
      if (beats[i] != null && Number.isFinite(beats[i]) && beats[i] < m) m = beats[i];
    }
    return m;
  }

  function safeSceneEnd(dur, sw) {
    var byDur = Math.max(0.75, dur - 0.62);
    if (sw && sw.endRel > 0.8) {
      return clamp(Math.min(byDur, sw.endRel), 0.75, Math.max(0.8, dur - 0.55));
    }
    return byDur;
  }

  function scheduleBeats(s, dur, items, opts) {
    opts = opts || {};
    var n = items.length;
    if (!n) return [];
    var minGap = opts.minGap != null ? opts.minGap : 0.18;
    var tStart = clamp(opts.start != null ? opts.start : 0.14, 0.04, Math.max(0.1, dur - 0.65));
    var tEnd = clamp(opts.end != null ? opts.end : Math.max(tStart + 0.25, dur - 0.62), tStart + 0.2, Math.max(tStart + 0.25, dur - 0.52));
    var span = Math.max(0.25, tEnd - tStart);
    if (n > 1 && span / n < minGap) {
      minGap = Math.max(0.08, span / n);
    }

    var stream = buildWordStream(s);
    var ordered = Boolean(opts.ordered);
    var matched = new Array(n);

    if (ordered) {
      var cursor = tStart;
      for (var i = 0; i < n; i++) {
        var it = items[i];
        var m = findSpokenOffset(s, stream, it.hint || "", it.cue, cursor, tEnd, i > 0);
        if (m === null && i === 0 && typeof s.revealTime === "number" && Number.isFinite(s.revealTime)) {
          m = clamp(s.revealTime, tStart, tEnd);
        }
        matched[i] = m;
        if (m !== null) cursor = Math.min(tEnd, m + Math.max(minGap, 0.22));
      }
      // Interpolate unmatched items between neighboring matched anchors
      var out = matched.slice();
      var prevAnchor = -1;
      for (var k = 0; k <= n; k++) {
        if (k === n || out[k] !== null) {
          var gapCount = k - prevAnchor - 1;
          if (gapCount > 0) {
            var aT = prevAnchor >= 0 ? out[prevAnchor] + minGap : tStart;
            var bT = k < n ? Math.max(aT + 0.06, out[k] - minGap) : Math.min(tEnd, aT + gapCount * 0.42);
            var segStep = gapCount > 1 ? (bT - aT) / gapCount : 0;
            for (var g = 1; g <= gapCount; g++) {
              out[prevAnchor + g] = clamp(aT + (g - 1) * Math.min(0.45, Math.max(minGap, segStep)), tStart, tEnd);
            }
          }
          prevAnchor = k;
        }
      }
      for (var p = 1; p < out.length; p++) {
        if (out[p] < out[p - 1] + minGap) out[p] = out[p - 1] + minGap;
      }
      if (out[out.length - 1] > tEnd) {
        var excess = out[out.length - 1] - tEnd;
        for (var qIdx = 0; qIdx < out.length; qIdx++) {
          out[qIdx] = Math.max(tStart + qIdx * 0.06, out[qIdx] - excess);
        }
      }
      return out;
    }

    // Unordered / parallel beats: keep exact spoken timestamps regardless of array order!
    var placed = [];
    for (var ui = 0; ui < n; ui++) {
      var uItem = items[ui];
      var uMatch = findSpokenOffset(s, stream, uItem.hint || "", uItem.cue, tStart, tEnd);
      if (uMatch === null && ui === 0 && typeof s.revealTime === "number" && Number.isFinite(s.revealTime)) {
        uMatch = clamp(s.revealTime, tStart, tEnd);
      }
      matched[ui] = uMatch;
      if (uMatch !== null) placed.push(uMatch);
    }

    var compactSpan = Math.min(span, Math.max(0.4, n * 0.48));
    var rawStep = compactSpan / Math.max(1, n);
    var res = new Array(n);
    var usedTimes = [];

    for (var r1 = 0; r1 < n; r1++) {
      if (matched[r1] !== null) {
        var t = matched[r1];
        for (var u1 = 0; u1 < usedTimes.length; u1++) {
          if (Math.abs(t - usedTimes[u1]) < 0.08) t = clamp(usedTimes[u1] + 0.09, tStart, tEnd);
        }
        res[r1] = t;
        usedTimes.push(t);
      }
    }
    for (var r2 = 0; r2 < n; r2++) {
      if (matched[r2] === null) {
        var ft = clamp(tStart + r2 * rawStep, tStart, tEnd);
        for (var u2 = 0; u2 < usedTimes.length; u2++) {
          if (Math.abs(ft - usedTimes[u2]) < 0.10) ft = clamp(usedTimes[u2] + 0.14, tStart, tEnd);
        }
        res[r2] = ft;
        usedTimes.push(ft);
      }
    }
    return res;
  }

  /* ---------------------------------------------------------- motion primitives */
  function markReveal(target, at) {
    if (!target) return;
    if (Array.isArray(target)) {
      target.forEach(function (t) { if (t) t.__meRevealAt = at; });
    } else {
      target.__meRevealAt = at;
    }
  }

  function popIn(target, at, opts) {
    if (!target) return;
    opts = opts || {};
    markReveal(target, at);
    gsap.set(target, { opacity: 0, y: opts.y != null ? opts.y : 12, scale: opts.scale != null ? opts.scale : 0.95 });
    tl.to(target, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: opts.dur || 0.28,
      ease: opts.ease || "power3.out",
    }, at);
  }

  function focusPulse(target, at) {
    if (!target) return;
    target.__mePulsed = true;
    tl.to(target, { scale: 1.024, duration: 0.15, ease: "power2.out" }, at);
    tl.to(target, { scale: 1, duration: 0.21, ease: "power2.inOut" }, at + 0.15);
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
      duration: dur || 0.48,
      ease: "power3.out",
      onUpdate: function () {
        el.textContent = sign + state.v.toFixed(dec) + suffix;
      },
    }, at);
  }

  function drawPaths(paths, at, opts) {
    if (!paths || !paths.length) return;
    opts = opts || {};
    var dur = opts.dur || 0.42;
    paths.forEach(function (p, idx) {
      var len = 260;
      try {
        if (typeof p.getTotalLength === "function") len = Math.max(12, Math.ceil(p.getTotalLength()) + 4);
      } catch (_e) {}
      var t0 = at + idx * (opts.stagger || 0.045);
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
      tl.to(p, { strokeDashoffset: 0, duration: dur, ease: "power2.out" }, t0);
      var parent = p.parentNode;
      if (parent) {
        var head = parent.querySelector(".me-arrow-head");
        if (head) {
          gsap.set(head, { opacity: 0, scale: 0.6, transformOrigin: "center" });
          tl.to(head, { opacity: 1, scale: 1, duration: 0.15, ease: "power2.out" }, t0 + dur * 0.68);
        }
        var dot = parent.querySelector(".me-arrow-dot");
        if (dot && typeof p.getPointAtLength === "function" && typeof p.getTotalLength === "function") {
          var totalLen = p.getTotalLength();
          var obj = { p: 0 };
          gsap.set(dot, { opacity: 0 });
          tl.set(dot, { opacity: 1 }, t0);
          tl.to(obj, {
            p: 1,
            duration: dur * 1.12,
            ease: "power2.inOut",
            onUpdate: function () {
              var pt = p.getPointAtLength(obj.p * totalLen);
              dot.setAttribute("cx", pt.x.toFixed(1));
              dot.setAttribute("cy", pt.y.toFixed(1));
            },
          }, t0);
          tl.to(dot, { opacity: 0, duration: 0.16 }, t0 + dur * 1.02);
        }
      }
    });
  }

  function spinOrbitRings(stageEl, at, dur, sw) {
    if (!stageEl) return;
    var activeStart = sw ? sw.onset : 0;
    var activeEnd = sw ? Math.max(activeStart + 0.6, sw.endRel) : dur;
    var spinDur = Math.max(0.5, activeEnd - activeStart - 0.35);
    var arc = stageEl.querySelector(".me-ring-arc");
    var inner = stageEl.querySelector(".me-ring-inner");
    var glow = stageEl.querySelector(".me-orbit-glow");
    if (arc) {
      gsap.set(arc, { rotation: -24, transformOrigin: "50% 50%", opacity: 0.4 });
      tl.to(arc, { rotation: 0, opacity: 1, duration: 0.36, ease: "power3.out" }, at + activeStart);
      tl.to(arc, { rotation: 34, duration: spinDur, ease: "power1.out" }, at + activeStart + 0.36);
    }
    if (inner) {
      gsap.set(inner, { rotation: 14, transformOrigin: "50% 50%", opacity: 0.25 });
      tl.to(inner, { rotation: -18, opacity: 0.65, duration: Math.max(0.5, activeEnd - activeStart), ease: "power1.out" }, at + activeStart);
    }
    if (glow) {
      gsap.set(glow, { opacity: 0.1 });
      tl.to(glow, { opacity: 0.26, duration: 0.45, ease: "power2.out" }, at + activeStart);
    }
  }

  function animateBottomPill(el, s, at, dur, minRel) {
    var pill = el.querySelector(".me-bottom-pill");
    if (!pill) return;
    var m = s.meta || {};
    var sw = getSpeechWindow(s, dur);
    var stream = buildWordStream(s);
    var maxRel = safeSceneEnd(dur, sw);
    var floorRel = Math.max(0.32, Math.min(minRel || dur * 0.45, maxRel - 0.15));
    var tRel = spokenOrFallback(
      s,
      stream,
      pill.textContent || "",
      m.pillRevealOn,
      clamp(Math.max(minRel || dur * 0.5, 0.38), floorRel, maxRel),
      0.32,
      maxRel
    );
    popIn(pill, visLead(at, tRel), { y: 10, scale: 0.92, dur: 0.28, ease: "back.out(1.4)" });
    queueSFX("ding", at + tRel, { vol: 0.78 });
  }

  /* ---------------------------------------------------------- scene animators */
  var ANIM = {
    me_title: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var sceneEnd = safeSceneEnd(dur, sw);
      var pills = q(el, ".me-title-pills .me-pill");
      var specs = [
        { hint: m.highlight || s.subline || "", cue: m.revealOn }
      ].concat(pills.map(function (p, idx) {
        var cfg = (m.pills || [])[idx] || {};
        return { hint: p.textContent || "", cue: cfg.revealOn || cfg.cue };
      }));
      var beats = scheduleBeats(s, dur, specs, { start: Math.max(0.22, sw.onset + 0.12), end: sceneEnd });

      if (at === 0) {
        var headGroup = [
          el.querySelector(".me-eyebrow"),
          el.querySelector(".me-logos-strip") || el.querySelector(".me-logo-badge") || el.querySelector(".me-title-wrap > .me-pill"),
          el.querySelector(".me-title-core"),
          el.querySelector(".me-hero-headline")
        ];
        gsap.set(headGroup, { opacity: 1, y: 0, scale: 1 });
        markReveal(headGroup, 0);
      } else {
        var enterAt = visLead(at, sw.onset, 0.03);
        popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
        popIn(el.querySelector(".me-logos-strip") || el.querySelector(".me-logo-badge") || el.querySelector(".me-title-wrap > .me-pill"), enterAt, { y: 8, dur: 0.24 });
        popIn(el.querySelector(".me-title-core"), enterAt + 0.02, { scale: 0.92, dur: 0.28, ease: "back.out(1.2)" });
        popIn(el.querySelector(".me-hero-headline"), enterAt + 0.02, { y: 10, scale: 0.98, dur: 0.28 });
      }
      queueSFX("pop", at + sw.onset, { vol: 0.68 });
      popIn(el.querySelector(".me-hero-sub"), visLead(at, Math.min(sceneEnd, sw.onset + 0.18)), { y: 8, dur: 0.28 });

      var hlRel = beats[0] != null ? beats[0] : 0.35;
      var hlEl = el.querySelector(".me-hero-highlight");
      if (hlEl) {
        popIn(hlEl, visLead(at, hlRel), { y: 8, scale: 0.94, dur: 0.3, ease: "back.out(1.5)" });
        queueSFX("ding", at + hlRel, { vol: 0.82 });
      }

      pills.forEach(function (p, k) {
        var pRel = beats[1 + k] != null ? beats[1 + k] : (0.42 + k * 0.22);
        popIn(p, visLead(at, pRel), { y: 10, scale: 0.92, dur: 0.26, ease: "back.out(1.4)" });
        queueSFX("pop", at + pRel, { vol: 0.65 });
      });
    },

    me_core_orbit: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var stream = buildWordStream(s);
      var nodes = q(el, ".me-orbit-node");
      var sceneEnd = safeSceneEnd(dur, sw);
      var nodeSpecs = nodes.map(function (n, idx) {
        var cfg = (m.orbitNodes || [])[idx] || {};
        return { hint: (cfg.label || n.textContent || ""), cue: cfg.revealOn || cfg.cue };
      });
      var nodeBeats = scheduleBeats(s, dur, nodeSpecs, { start: Math.max(0.18, sw.onset), end: sceneEnd });
      var payoffMatched = findSpokenOffset(s, stream, [m.arrowLabel, m.targetLabel, m.targetSub, m.modal && m.modal.title].filter(Boolean).join(" "), m.revealOn, 0.34, sceneEnd);
      var sideMaxRel = Math.min(2.15, Math.max(0.55, dur * 0.35));
      var payoffTime = payoffMatched !== null ? Math.min(payoffMatched, sideMaxRel) : Math.min(1.75, Math.max(0.58, dur * 0.26));

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
      var stages = q(el, ".me-orbit-stage");
      if (stages[0]) {
        popIn(stages[0].querySelector(".me-iso-cube") || stages[0].querySelector(".me-orbit-hub"), visLead(at, sw.onset, 0.03), { scale: 0.92, dur: 0.3, ease: "back.out(1.2)" });
        spinOrbitRings(stages[0], at, dur, sw);
        queueSFX("whoosh", at + sw.onset, { vol: 0.62 });
      }
      popIn(el.querySelector(".me-orbit-top"), visLead(at, sw.onset + 0.04, 0.03), { y: 6, dur: 0.26 });

      var minNodeBeat = earliestBeat(nodeBeats);
      nodes.forEach(function (nd, k) {
        var nRel = nodeBeats[k] != null ? nodeBeats[k] : (0.28 + k * 0.22);
        var preEnter = k === 0 && minNodeBeat > 2.0;
        var nt = preEnter ? at + 0.22 : visLead(at, nRel);
        popIn(nd, nt, { y: 8, scale: 0.88, dur: 0.26, ease: "back.out(1.5)" });
        if (preEnter) focusPulse(nd, visLead(at, nRel));
        queueSFX("pop", at + nRel, { vol: 0.7 });
      });

      var arrowWrap = el.querySelector(".me-orbit-arrow-wrap");
      if (arrowWrap) {
        var arrowRel = payoffMatched !== null ? payoffMatched : payoffTime;
        var clampedArrowRel = Math.min(arrowRel, sceneEnd);
        var atArrow = visLead(at, clampedArrowRel, 0.08);
        drawPaths(q(arrowWrap, ".me-draw-path"), atArrow, { dur: 0.42 });
        popIn(arrowWrap.querySelector(".me-orbit-arrow-label"), atArrow + 0.08, { scale: 0.9, dur: 0.26 });
        queueSFX("swipe", at + clampedArrowRel, { vol: 0.72 });
      }
      var side = el.querySelector(".me-modal-card") || el.querySelector(".me-orbit-side") || el.querySelector(".me-deck-wrap");
      if (side) {
        var sideAt = visLead(at, payoffTime);
        popIn(side, sideAt, { y: 12, scale: 0.95, dur: 0.32 });
        var tbFill = side.querySelector(".me-bar-fill");
        if (tbFill) {
          gsap.set(tbFill, { scaleY: 0 });
          tl.to(tbFill, { scaleY: 1, duration: 0.48, ease: "power3.out" }, sideAt + 0.06);
          q(side, ".me-count").forEach(function (cn) { countTo(cn, sideAt + 0.06, 0.48); });
        }
        if (payoffMatched !== null && payoffMatched > sideMaxRel + 0.35 && dur > 4.2) {
          focusPulse(side, visLead(at, payoffMatched));
          queueSFX("ding", at + payoffMatched, { vol: 0.78 });
        }
        if (stages[1]) spinOrbitRings(stages[1], sideAt, Math.max(0.8, dur - payoffTime), sw);
      }
      var bottomPill = el.querySelector(".me-orbit-bottom");
      if (bottomPill) {
        var bRel = spokenOrFallback(s, stream, bottomPill.textContent || "", m.pillRevealOn, Math.min(dur * 0.55, 2.8), 0.4, sceneEnd);
        popIn(bottomPill, visLead(at, bRel), { y: 8, dur: 0.28 });
        queueSFX("tick", at + bRel, { vol: 0.62 });
      }
    },

    me_bar_compare: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var stream = buildWordStream(s);
      var sceneEnd = safeSceneEnd(dur, sw);

      var hRows = q(el, ".me-hbar-row");
      if (hRows.length) {
        var hBeats = scheduleBeats(s, dur, hRows.map(function (r, idx) {
          var cfg = (m.bars || m.rows || [])[idx] || {};
          return {
            hint: [cfg.label, cfg.value, cfg.delta, r.textContent].filter(Boolean).join(" "),
            cue: cfg.revealOn || cfg.cue
          };
        }), { start: Math.max(0.18, sw.onset), end: sceneEnd });

        popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
        popIn(el.querySelector(".me-paper-table") || el.querySelector(".me-bar-head"), visLead(at, sw.onset, 0.03), { y: 8, dur: 0.28 });

        var ptRows = q(el, ".me-pt-row");
        if (ptRows.length) {
          var ptCfg = (m.paperTable && m.paperTable.rows) || [];
          var ptBeats = scheduleBeats(s, dur, ptRows.map(function (pr, pri) {
            var rc = ptCfg[pri] || {};
            return { hint: [rc.step, rc.time, pr.textContent].filter(Boolean).join(" "), cue: rc.revealOn || rc.cue };
          }), { start: Math.max(0.16, sw.onset + 0.08), end: sceneEnd, ordered: true });
          ptRows.forEach(function (pr, pri) {
            var pRel = ptBeats[pri] != null ? ptBeats[pri] : (0.16 + pri * 0.16);
            popIn(pr, visLead(at, pRel), { y: 6, dur: 0.24 });
            queueSFX(pr.classList.contains("is-hot") ? "pop" : "tick", at + pRel, { vol: 0.56 });
          });
        }

        var ratioEl = el.querySelector(".me-hero-ratio");
        if (ratioEl) {
          var ratioHint = [m.heroDelta, m.heroUnit, m.ratio, m.heroRatio].filter(Boolean).join(" ");
          var ratioRel = findSpokenOffset(s, stream, ratioHint, m.revealOn, 0.18, sceneEnd);
          var ratioAt = ratioRel !== null ? visLead(at, ratioRel) : visLead(at, sw.onset + 0.15);
          popIn(ratioEl, ratioAt, { y: 10, scale: 0.94, dur: 0.3, ease: "back.out(1.4)" });
          if (ratioRel !== null) queueSFX("ding", at + ratioRel, { vol: 0.8 });
        }

        var minHBeat = earliestBeat(hBeats);
        hRows.forEach(function (hr, idx) {
          var hRel = hBeats[idx] != null ? hBeats[idx] : (0.22 + idx * 0.35);
          var preEnter = idx === 0 && minHBeat > 2.2;
          var ht = preEnter ? at + 0.22 : visLead(at, hRel);
          popIn(hr, ht, { y: 8, dur: 0.26 });
          var wrap = hr.querySelector(".me-hbar-fill-wrap");
          if (wrap) {
            gsap.set(wrap, { scaleX: 0 });
            tl.to(wrap, { scaleX: 1, duration: 0.48, ease: "power3.out" }, ht + 0.03);
          }
          q(hr, ".me-count").forEach(function (cn) { countTo(cn, ht + 0.04, 0.46); });
          popIn(hr.querySelector(".me-hbar-dashed"), ht + 0.34, { scale: 0.96, dur: 0.24 });
          popIn(hr.querySelector(".me-hbar-val-out"), ht + 0.26, { y: 4, dur: 0.24 });
          if (preEnter) focusPulse(hr, visLead(at, hRel));
          queueSFX(idx > 0 || hRows.length === 1 ? "ding" : "whoosh", at + hRel, { vol: 0.76 });
        });
        animateBottomPill(el, s, at, dur, (hBeats[hBeats.length - 1] || 1.2) + 0.35);
        return;
      }

      var sRows = q(el, ".me-score-row");
      if (sRows.length) {
        var sBeats = scheduleBeats(s, dur, sRows.map(function (r, idx) {
          var cfg = (m.scoreRows || m.rows || m.scores || [])[idx] || {};
          return {
            hint: [cfg.label, cfg.score, r.textContent].filter(Boolean).join(" "),
            cue: cfg.revealOn || cfg.cue
          };
        }), { start: Math.max(0.16, sw.onset), end: sceneEnd });
        popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
        popIn(el.querySelector(".me-bar-head"), visLead(at, sw.onset, 0.03), { y: 8, dur: 0.26 });
        var minSBeat = earliestBeat(sBeats);
        sRows.forEach(function (sr, idx) {
          var sRel = sBeats[idx] != null ? sBeats[idx] : (0.18 + idx * 0.24);
          var preEnter = idx === 0 && minSBeat > 2.2;
          var st = preEnter ? at + 0.22 : visLead(at, sRel);
          popIn(sr, st, { y: 8, dur: 0.26 });
          if (preEnter) focusPulse(sr, visLead(at, sRel));
          queueSFX(sr.classList.contains("is-active") ? "ding" : "tick", at + sRel, { vol: 0.72 });
        });
        var ctxMeter = el.querySelector(".me-ctx-meter");
        if (ctxMeter) {
          var cm = m.contextMeter || {};
          var cmHint = [cm.label, cm.badge].concat(cm.ticks || []).filter(Boolean).join(" ");
          var cmRel = spokenOrFallback(s, stream, cmHint, cm.revealOn, Math.min(sceneEnd, 0.45 + sRows.length * 0.25), 0.32, sceneEnd);
          var cmAt = visLead(at, cmRel);
          popIn(ctxMeter, cmAt, { y: 10, scale: 0.96, dur: 0.3 });
          queueSFX("swipe", at + cmRel, { vol: 0.66 });
          var tiles = q(ctxMeter, ".me-ctx-tile:not(.is-empty)");
          tiles.forEach(function (tlEl, ti) {
            gsap.set(tlEl, { opacity: 0.15, scale: 0.75 });
            tl.to(tlEl, { opacity: 1, scale: 1, duration: 0.14, ease: "power2.out" }, cmAt + 0.08 + Math.min(0.95, ti * 0.015));
          });
        }
        animateBottomPill(el, s, at, dur, (sBeats[sBeats.length - 1] || 1.2) + 0.35);
        return;
      }

      var cols = q(el, ".me-groups-grid").length ? q(el, ".me-group-box") : q(el, ".me-bar-col");
      var barBeats = scheduleBeats(s, dur, cols.map(function (c, idx) {
        var cfg = (m.groups || m.bars || [])[idx] || {};
        return {
          hint: [cfg.title, cfg.label, cfg.value, cfg.delta, c.textContent].filter(Boolean).join(" "),
          cue: cfg.revealOn || cfg.cue
        };
      }), { start: Math.max(0.16, sw.onset), end: sceneEnd });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
      popIn(el.querySelector(".me-bar-head"), visLead(at, sw.onset, 0.03), { y: 8, dur: 0.26 });
      popIn(el.querySelector(".me-chart-panel") || el.querySelector(".me-groups-grid"), visLead(at, sw.onset, 0.02), { y: 8, dur: 0.26 });
      var brk = el.querySelector(".me-bracket-bar");
      if (brk) {
        var brkRel = spokenOrFallback(s, stream, m.bracketLabel || brk.textContent || "", m.bracketRevealOn, 0.32, 0.2, sceneEnd);
        popIn(brk, visLead(at, brkRel), { y: 6, dur: 0.26 });
      }

      var minBarBeat = earliestBeat(barBeats);
      cols.forEach(function (col, idx) {
        var bRel = barBeats[idx] != null ? barBeats[idx] : (0.18 + idx * 0.26);
        var preEnter = idx === 0 && minBarBeat > 2.2;
        var ct = preEnter ? at + 0.2 : visLead(at, bRel);
        var cfg = (m.groups || m.bars || [])[idx] || {};
        if (col.classList.contains("me-group-box")) {
          popIn(col, idx === 0 && minBarBeat > 2.2 ? at + 0.03 : ct, { y: 10, scale: 0.96, dur: 0.28 });
          q(col, ".me-bar-fill").forEach(function (fill, fi) {
            gsap.set(fill, { scaleY: 0 });
            tl.to(fill, { scaleY: 1, duration: 0.44, ease: "power3.out" }, ct + 0.03 + fi * 0.05);
          });
          q(col, ".me-count").forEach(function (cn) { countTo(cn, ct + 0.03, 0.44); });
          if (preEnter) focusPulse(col, visLead(at, bRel));
          queueSFX(cfg.active ? "ding" : "pop", at + bRel, { vol: 0.72 });
        } else {
          popIn(col, ct, { y: 8, dur: 0.26 });
          var fill = col.querySelector(".me-bar-fill");
          if (fill) {
            gsap.set(fill, { scaleY: 0 });
            tl.to(fill, { scaleY: 1, duration: 0.46, ease: "power3.out" }, ct + 0.03);
          }
          q(col, ".me-count").forEach(function (cn) { countTo(cn, ct + 0.03, 0.46); });
          var payoffRel = cfg.revealOn ? findSpokenOffset(s, stream, [cfg.delta, cfg.label, cfg.value].filter(Boolean).join(" "), cfg.revealOn, 0.3, sceneEnd) : null;
          var capRel = payoffRel !== null ? payoffRel : Math.min(sceneEnd, bRel + 0.30);
          var capAt = visLead(at, capRel);
          popIn(col.querySelector(".me-bar-cap"), capAt, { y: 6, dur: 0.24 });
          popIn(col.querySelector(".me-bar-delta"), capAt + 0.03, { y: 6, scale: 0.9, dur: 0.24 });
          popIn(col.querySelector(".me-bar-check"), capAt + 0.06, { scale: 0.6, dur: 0.22, ease: "back.out(1.7)" });
          if (preEnter) focusPulse(col, visLead(at, bRel));
          queueSFX(idx === cols.length - 1 ? "ding" : "tick", at + (payoffRel !== null ? payoffRel : bRel), { vol: 0.76 });
          if (payoffRel !== null && dur > 4.5 && Math.abs(payoffRel - bRel) > 0.35) focusPulse(col, visLead(at, payoffRel));
        }
      });

      var thr = el.querySelector(".me-threshold-line");
      if (thr) {
        var thrRel = spokenOrFallback(s, stream, m.thresholdLabel || "threshold", m.thresholdRevealOn, Math.min(1.6, dur * 0.38), 0.32, sceneEnd);
        gsap.set(thr, { scaleX: 0, transformOrigin: "left center" });
        tl.to(thr, { scaleX: 1, duration: 0.4, ease: "power2.out" }, visLead(at, thrRel));
        var thrLbl = el.querySelector(".me-threshold-label");
        if (thrLbl) popIn(thrLbl, visLead(at, thrRel) + 0.06, { y: 4, dur: 0.24 });
        queueSFX("tick", at + thrRel, { vol: 0.65 });
      }
      animateBottomPill(el, s, at, dur, (barBeats[barBeats.length - 1] || 1.2) + 0.35);
    },

    me_line_chart: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var stream = buildWordStream(s);
      var sceneEnd = safeSceneEnd(dur, sw);
      var series = q(el, ".me-line-series");
      var beats = scheduleBeats(s, dur, series.map(function (sr, idx) {
        var cfg = (m.series || [])[idx] || {};
        return { hint: (cfg.label || "") + " " + (sr.textContent || ""), cue: cfg.revealOn || cfg.cue };
      }), { start: Math.max(0.18, sw.onset), end: sceneEnd });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
      popIn(el.querySelector(".me-bar-head"), visLead(at, sw.onset, 0.03), { y: 8, dur: 0.26 });
      popIn(el.querySelector(".me-line-wrap"), visLead(at, sw.onset, 0.02), { y: 10, dur: 0.28 });

      var minLineBeat = earliestBeat(beats);
      series.forEach(function (sr, idx) {
        var cfg = (m.series || [])[idx] || {};
        var sRel = beats[idx] != null ? beats[idx] : (0.25 + idx * 0.45);
        var st = (idx === 0 && minLineBeat > 2.2) ? at + 0.22 : visLead(at, sRel);
        drawPaths(q(sr, ".me-line-path"), st, { dur: 0.62 });
        var pts = cfg.points || [];
        q(sr, ".me-line-dot").forEach(function (d, di) {
          var pCfg = pts[di];
          var yVal = typeof pCfg === "number" ? String(pCfg) : (pCfg && pCfg.y != null ? String(pCfg.y) : (pCfg && pCfg.v != null ? String(pCfg.v) : ""));
          var pCue = (pCfg && (pCfg.revealOn || pCfg.cue || pCfg.label)) || yVal;
          var dRel = pCue ? findSpokenOffset(s, stream, pCue, pCfg && (pCfg.revealOn || pCfg.cue), Math.max(0.2, sRel), sceneEnd) : null;
          var dt = dRel !== null ? visLead(at, dRel) : (st + Math.min(0.55, di * 0.2));
          popIn(d, dt, { y: 0, scale: 0.4, dur: 0.22, ease: "back.out(1.6)" });
          if (dRel !== null && Math.abs(dRel - sRel) > 0.35) queueSFX("tick", at + dRel, { vol: 0.6 });
        });
        q(sr, ".me-line-val, .me-line-tag").forEach(function (tx) {
          var txRel = findSpokenOffset(s, stream, tx.textContent || "", null, Math.max(0.2, sRel), sceneEnd);
          popIn(tx, txRel !== null ? visLead(at, txRel) : st + 0.3, { y: 6, dur: 0.24 });
        });
        queueSFX(idx === 0 ? "whoosh" : "ding", at + sRel, { vol: 0.72 });
      });
      animateBottomPill(el, s, at, dur, (beats[beats.length - 1] || 1.2) + 0.45);
    },

    me_stat_split: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var stream = buildWordStream(s);
      var sceneEnd = safeSceneEnd(dur, sw);
      var dialArc = el.querySelector(".me-dial-arc");
      if (dialArc) {
        var dialValHint = [m.dialSeconds != null ? String(m.dialSeconds) + " seconds" : "", m.value, m.label].filter(Boolean).join(" ");
        var dialRel = spokenOrFallback(s, stream, dialValHint, m.revealOn, 0.24, 0.18, sceneEnd);
        var queueHint = [m.queueTitle, m.queueBadge, m.baseline].filter(Boolean).join(" ");
        var queueRel = spokenOrFallback(s, stream, queueHint, m.queueRevealOn, sw.onset + 0.06, 0.1, Math.min(sceneEnd, 1.8));
        var qAt = visLead(at, queueRel);

        popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
        popIn(el.querySelector(".me-badge-strip"), visLead(at, sw.onset, 0.03), { y: 6, dur: 0.24 });
        popIn(el.querySelector(".me-queue-box"), qAt, { y: 10, dur: 0.28 });
        q(el, ".me-queue-chip").forEach(function (ch, ci) {
          gsap.set(ch, { opacity: 0, x: -10 });
          tl.to(ch, { opacity: 1, x: 0, duration: 0.18, ease: "power2.out" }, qAt + 0.06 + Math.min(1.2, ci * 0.028));
        });
        popIn(el.querySelector(".me-dial-wrap"), visLead(at, Math.min(dialRel, 1.6)), { scale: 0.94, dur: 0.3 });
        var circ = Number(dialArc.getAttribute("data-circ") || 880);
        var dash = Number(dialArc.getAttribute("data-dash") || 440);
        var dialStart = dialRel <= 1.8 ? visLead(at, dialRel) : at + 0.24;
        var dialDur = Math.min(1.6, Math.max(0.65, dur * 0.34));
        gsap.set(dialArc, { strokeDasharray: circ, strokeDashoffset: circ });
        tl.to(dialArc, { strokeDashoffset: Math.max(0, circ - dash), duration: dialDur, ease: "power2.out" }, dialStart);
        q(el, ".me-dial-num .me-count").forEach(function (cn) { countTo(cn, dialStart, dialDur * 0.92); });
        queueSFX("whoosh", at + dialRel, { vol: 0.72 });
        if (dialRel > 1.8) {
          focusPulse(el.querySelector(".me-dial-wrap"), visLead(at, dialRel));
          queueSFX("ding", at + dialRel, { vol: 0.76 });
        }
        animateBottomPill(el, s, at, dur, Math.max(1.2, dialRel + 0.4));
        return;
      }

      var sideCols = q(el, ".me-split-card:last-child .me-bar-col");
      var sideBeats = scheduleBeats(s, dur, sideCols.map(function (c, idx) {
        var cfg = (m.sideBars || m.bars || [])[idx] || {};
        return { hint: [cfg.label, cfg.value, c.textContent].filter(Boolean).join(" "), cue: cfg.revealOn || cfg.cue };
      }), { start: 0.32, end: sceneEnd });
      var payoffRel = findSpokenOffset(s, stream, [m.value, m.delta, m.baseline].filter(Boolean).join(" "), m.revealOn, 0.28, sceneEnd);

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
      var cards = q(el, ".me-split-card");
      if (cards[0]) {
        popIn(cards[0], visLead(at, sw.onset, 0.03), { y: 10, dur: 0.28 });
        var statAt = at + 0.22;
        var vbar = cards[0].querySelector(".me-stat-vbar-fill");
        if (vbar) {
          gsap.set(vbar, { scaleY: 0 });
          tl.to(vbar, { scaleY: 1, duration: 0.52, ease: "power3.out" }, statAt);
        }
        popIn(cards[0].querySelector(".me-stat-big"), statAt, { y: 8, scale: 0.95, dur: 0.3 });
        q(cards[0], ".me-count").forEach(function (cn) { countTo(cn, statAt, 0.52); });
        var deltaRel = payoffRel !== null ? payoffRel : 0.48;
        popIn(cards[0].querySelector(".me-delta-chip"), visLead(at, deltaRel), { scale: 0.88, dur: 0.28, ease: "back.out(1.5)" });
        popIn(cards[0].querySelector(".me-mini-term"), statAt + 0.26, { y: 8, dur: 0.26 });
        queueSFX("ding", at + deltaRel, { vol: 0.82 });
        if (payoffRel !== null && payoffRel > 0.65 && dur > 4.2) focusPulse(cards[0].querySelector(".me-stat-big"), visLead(at, payoffRel));
      }
      if (cards[1]) {
        popIn(cards[1], visLead(at, sw.onset + 0.06, 0.03), { y: 10, dur: 0.28 });
        sideCols.forEach(function (col, idx) {
          var sRel = sideBeats[idx] != null ? sideBeats[idx] : (0.42 + idx * 0.26);
          var ct = visLead(at, sRel);
          popIn(col, ct, { y: 8, dur: 0.26 });
          var fill = col.querySelector(".me-bar-fill");
          if (fill) {
            gsap.set(fill, { scaleY: 0 });
            tl.to(fill, { scaleY: 1, duration: 0.44, ease: "power3.out" }, ct + 0.03);
          }
          q(col, ".me-count").forEach(function (cn) { countTo(cn, ct + 0.03, 0.44); });
          queueSFX("pop", at + sRel, { vol: 0.72 });
        });
      }
    },

    me_evidence_card: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var stream = buildWordStream(s);
      var sceneEnd = safeSceneEnd(dur, sw);

      if (el.querySelector(".me-quote-split")) {
        var sp = m.speaker || {};
        var quoteRel = spokenOrFallback(s, stream, [sp.quote, sp.name, sp.attribution].filter(Boolean).join(" "), m.revealOn, sw.onset + 0.1, 0.1, Math.min(sceneEnd, 2.0));
        var dotsRel = spokenOrFallback(s, stream, [sp.dotsFrom, "to", sp.dotsTo].filter(Boolean).join(" "), sp.revealOn, Math.min(sceneEnd, quoteRel + 0.4), 0.35, sceneEnd);
        var qAt = visLead(at, quoteRel);
        var dAt = visLead(at, dotsRel);

        popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
        popIn(el.querySelector(".me-avatar-col"), visLead(at, sw.onset, 0.03), { scale: 0.9, dur: 0.3, ease: "back.out(1.4)" });
        popIn(el.querySelector(".me-quote-card"), qAt, { y: 10, scale: 0.97, dur: 0.3 });
        queueSFX("swipe", at + quoteRel, { vol: 0.7 });
        popIn(el.querySelector(".me-dots-delta"), dAt, { y: 8, dur: 0.28 });
        q(el, ".me-dot-cyan").forEach(function (dt, di) {
          gsap.set(dt, { scale: 0.3, opacity: 0 });
          tl.to(dt, { scale: 1, opacity: dt.classList.contains("is-dim") ? 0.38 : 1, duration: 0.18, ease: "back.out(1.6)" }, dAt + 0.06 + Math.min(0.85, di * 0.04));
        });
        queueSFX("pop", at + dotsRel, { vol: 0.76 });
        return;
      }

      if (el.querySelector(".me-claim-split")) {
        var cl = m.claim || {};
        var winRel = spokenOrFallback(s, stream, [m.title, m.source].filter(Boolean).join(" "), m.revealOn, sw.onset + 0.1, 0.1, Math.min(sceneEnd, 2.0));
        var checkEls = q(el, ".me-check-circle");
        var checkStart = spokenOrFallback(s, stream, [cl.checks ? String(cl.checks) : "", cl.statement, cl.footLabel].filter(Boolean).join(" "), cl.revealOn, Math.min(sceneEnd, 0.42), 0.28, Math.max(0.4, sceneEnd - 0.55));
        var checkSpan = Math.min(0.9, Math.max(0.25, sceneEnd - checkStart));
        var checkStep = checkEls.length > 1 ? checkSpan / checkEls.length : 0;

        popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
        popIn(el.querySelector(".me-claim-card"), visLead(at, sw.onset, 0.03), { y: 10, scale: 0.97, dur: 0.3 });
        popIn(el.querySelector(".me-browser-win") || el.querySelector(".me-paper-card"), visLead(at, winRel), { y: 12, scale: 0.98, dur: 0.32 });
        queueSFX("swipe", at + winRel, { vol: 0.7 });
        checkEls.forEach(function (ck, ci) {
          var cRel = clamp(checkStart + ci * Math.min(0.16, Math.max(0.08, checkStep)), 0.25, sceneEnd);
          popIn(ck, visLead(at, cRel), { scale: 0.5, dur: 0.22, ease: "back.out(1.7)" });
          queueSFX(ci === checkEls.length - 1 ? "ding" : "tick", at + cRel, { vol: ci === checkEls.length - 1 ? 0.74 : 0.62 });
        });
        return;
      }

      var pts = q(el, ".me-paper-card .me-schema-row");
      var beats = scheduleBeats(s, dur, [
        { hint: m.highlight || m.body || "", cue: m.revealOn }
      ].concat(pts.map(function (p, idx) {
        var cfg = (m.points || [])[idx] || {};
        return { hint: (cfg.text || p.textContent || ""), cue: cfg.revealOn || cfg.cue };
      })), { start: Math.max(0.28, sw.onset + 0.14), end: sceneEnd, ordered: true });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
      popIn(el.querySelector(".me-paper-card"), visLead(at, sw.onset, 0.03), { y: 10, scale: 0.98, dur: 0.3 });
      queueSFX("swipe", at + sw.onset, { vol: 0.65 });

      var hl = el.querySelector(".me-highlight-box");
      if (hl) {
        var hlRel = beats[0] != null ? beats[0] : 0.42;
        gsap.set(hl, { opacity: 0.45 });
        tl.to(hl, { opacity: 1, duration: 0.28, ease: "power2.out" }, visLead(at, hlRel));
        focusPulse(hl, visLead(at, hlRel));
        queueSFX("pop", at + hlRel, { vol: 0.76 });
      }
      pts.forEach(function (pt, idx) {
        var pRel = beats[1 + idx] != null ? beats[1 + idx] : (0.55 + idx * 0.24);
        popIn(pt, visLead(at, pRel), { y: 8, dur: 0.26 });
        queueSFX("click", at + pRel, { vol: 0.62 });
      });

      var calloutEl = el.querySelector(".me-evidence-wrap > .me-pill");
      if (calloutEl) {
        var lastPt = beats[beats.length - 1] || 1.0;
        var cRel = spokenOrFallback(s, stream, m.callout || calloutEl.textContent || "", m.calloutRevealOn || m.pillRevealOn, Math.min(sceneEnd, lastPt + 0.32), 0.4, sceneEnd);
        popIn(calloutEl, visLead(at, cRel), { y: 10, scale: 0.92, dur: 0.28, ease: "back.out(1.4)" });
        queueSFX("ding", at + cRel, { vol: 0.76 });
      }
    },

    me_pipeline_flow: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var stream = buildWordStream(s);
      var sceneEnd = safeSceneEnd(dur, sw);
      var steps = q(el, ".me-step-pill");
      var stepLines = q(el, ".me-step-line");
      var nodes = q(el, ".me-pipe-node");

      var stepBeats = scheduleBeats(s, dur, steps.map(function (st, idx) {
        var cfg = (m.steps || [])[idx] || {};
        return { hint: (cfg.label || st.textContent || ""), cue: cfg.revealOn || cfg.cue };
      }), { start: Math.max(0.12, sw.onset), end: sceneEnd, ordered: true });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
      steps.forEach(function (st, idx) {
        var stRel = stepBeats[idx] != null ? stepBeats[idx] : (0.12 + idx * 0.18);
        var stAt = visLead(at, stRel);
        if (idx > 0 && stepLines[idx - 1]) {
          gsap.set(stepLines[idx - 1], { scaleX: 0, transformOrigin: "left center" });
          tl.to(stepLines[idx - 1], { scaleX: 1, duration: 0.16, ease: "power2.out" }, Math.max(at + 0.04, stAt - 0.1));
        }
        popIn(st, stAt, { y: 6, scale: 0.94, dur: 0.24 });
        queueSFX(st.classList.contains("is-active") ? "ding" : "click", at + stRel, { vol: st.classList.contains("is-active") ? 0.72 : 0.56 });
      });

      var lastBeat = stepBeats[stepBeats.length - 1] || 0.8;
      if (nodes.length) {
        var nodeBeats = scheduleBeats(s, dur, nodes.map(function (nd, idx) {
          var cfg = (m.nodes || [])[idx] || {};
          return { hint: [cfg.title, cfg.sub, nd.textContent].filter(Boolean).join(" "), cue: cfg.revealOn || cfg.cue };
        }), { start: Math.max(0.18, sw.onset + 0.05), end: sceneEnd, ordered: true });
        var arrows = q(el, ".me-nodes-row .me-draw-path");
        var minPipeBeat = earliestBeat(nodeBeats);
        nodes.forEach(function (nd, idx) {
          var nRel = nodeBeats[idx] != null ? nodeBeats[idx] : (0.3 + idx * 0.28);
          var preEnter = idx === 0 && minPipeBeat > 2.0;
          var nt = preEnter ? at + 0.2 : visLead(at, nRel);
          popIn(nd, nt, { y: 10, scale: 0.95, dur: 0.28 });
          if (idx > 0 && arrows[idx - 1]) drawPaths([arrows[idx - 1]], Math.max(at + 0.04, nt - 0.14), { dur: 0.3 });
          if (preEnter) focusPulse(nd, visLead(at, nRel));
          queueSFX(nd.classList.contains("is-active") ? "ding" : "pop", at + nRel, { vol: 0.72 });
        });
        lastBeat = Math.max(lastBeat, nodeBeats[nodeBeats.length - 1] || 1.0);
      } else {
        var rolloutRel = spokenOrFallback(s, stream, m.roundLabel || "rollouts", m.roundRevealOn, sw.onset + 0.05, 0.08, Math.min(sceneEnd, 2.2));
        var c3Rel = spokenOrFallback(s, stream, [m.centerTitle, m.centerBadge].filter(Boolean).join(" "), m.revealOn, Math.min(sceneEnd, rolloutRel + 0.35), 0.25, sceneEnd);
        var c3VisAt = c3Rel > 2.2 ? at + 0.24 : visLead(at, c3Rel);
        var rAt = visLead(at, rolloutRel);

        popIn(el.querySelector(".me-dot-matrix"), rAt, { scale: 0.94, dur: 0.28 });
        q(el, ".me-matrix-dot").forEach(function (md, mi) {
          gsap.set(md, { scale: 0.35, opacity: 0.2 });
          tl.to(md, { scale: 1, opacity: 1, duration: 0.16, ease: "power2.out" }, rAt + 0.04 + Math.min(0.6, mi * 0.02));
        });
        popIn(el.querySelector(".me-c3-card"), c3VisAt, { y: 10, dur: 0.28 });
        if (c3Rel > 2.2) focusPulse(el.querySelector(".me-c3-card"), visLead(at, c3Rel));
        queueSFX("pop", at + c3Rel, { vol: 0.72 });

        var simRows = q(el, ".me-sim-row");
        var simCfg = m.rightRows || [];
        var simBeats = scheduleBeats(s, dur, simRows.map(function (rw, ri) {
          var rc = simCfg[ri] || {};
          return { hint: [m.rightTitle, rc.label, rw.textContent].filter(Boolean).join(" "), cue: rc.revealOn || rc.cue };
        }), { start: Math.max(0.32, Math.min(sceneEnd - 0.3, c3Rel + 0.12)), end: sceneEnd, ordered: true });
        simRows.forEach(function (rw, ri) {
          var srRel = simBeats[ri] != null ? simBeats[ri] : (c3Rel + 0.2 + ri * 0.14);
          popIn(rw, visLead(at, srRel), { y: 8, dur: 0.24 });
          queueSFX("tick", at + srRel, { vol: 0.64 });
        });
        lastBeat = Math.max(lastBeat, simBeats[simBeats.length - 1] || c3Rel + 0.3);
      }
      animateBottomPill(el, s, at, dur, lastBeat + 0.25);
    },

    me_schema_card: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var stream = buildWordStream(s);
      var sceneEnd = safeSceneEnd(dur, sw);
      var rows = q(el, ".me-schema-row");
      var beats = scheduleBeats(s, dur, rows.map(function (r, idx) {
        var cfg = (m.fields || [])[idx] || {};
        return { hint: [cfg.key, cfg.val, cfg.status].filter(Boolean).join(" "), cue: cfg.revealOn || cfg.cue };
      }), { start: Math.max(0.16, sw.onset), end: sceneEnd, ordered: true });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
      popIn(el.querySelector(".me-schema-box"), visLead(at, sw.onset, 0.03), { y: 10, scale: 0.98, dur: 0.28 });
      queueSFX("swipe", at + sw.onset, { vol: 0.64 });

      var minSchemaBeat = earliestBeat(beats);
      rows.forEach(function (rw, idx) {
        var rRel = beats[idx] != null ? beats[idx] : (0.18 + idx * 0.22);
        var preEnter = idx === 0 && minSchemaBeat > 2.2;
        var rt = preEnter ? at + 0.22 : visLead(at, rRel);
        popIn(rw, rt, { y: 8, dur: 0.24 });
        if (preEnter) focusPulse(rw, visLead(at, rRel));
        queueSFX(rw.classList.contains("is-highlight") ? "alert" : "tick", at + rRel, { vol: 0.68 });
      });

      var att = el.querySelector(".me-attempt-card");
      if (att) {
        var attObj = m.attempt || {};
        var lastRowRel = beats[beats.length - 1] || 0.8;
        var aRel = spokenOrFallback(s, stream, [attObj.label, attObj.value].filter(Boolean).join(" "), attObj.revealOn || m.revealOn, Math.min(sceneEnd, lastRowRel + 0.35), 0.3, sceneEnd);
        popIn(att, visLead(at, aRel), { y: 10, scale: 0.95, dur: 0.28 });
        queueSFX("pop", at + aRel, { vol: 0.76 });
      }
      var deck = el.querySelector(".me-deck-col");
      if (deck) {
        var dRel = spokenOrFallback(s, stream, [m.deckLabel, m.deckTag].filter(Boolean).join(" "), m.deckRevealOn, Math.min(sceneEnd, 0.55), 0.3, sceneEnd);
        var dAt = visLead(at, dRel);
        drawPaths(q(el, ".me-deck-arrow .me-draw-path"), Math.max(at + 0.05, dAt - 0.12), { dur: 0.38 });
        popIn(deck, dAt, { scale: 0.92, dur: 0.28 });
        queueSFX("swipe", at + dRel, { vol: 0.64 });
      }
    },

    me_editor_window: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var stream = buildWordStream(s);
      var sceneEnd = safeSceneEnd(dur, sw);
      var lines = q(el, ".me-editor-line");
      var beats = scheduleBeats(s, dur, lines.map(function (ln, idx) {
        var cfg = (m.lines || [])[idx];
        var txt = typeof cfg === "string" ? cfg : (cfg && cfg.text) || ln.textContent || "";
        return { hint: txt, cue: cfg && (cfg.revealOn || cfg.cue) };
      }), { start: Math.max(0.14, sw.onset), end: sceneEnd, ordered: true });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
      popIn(el.querySelector(".me-editor-win"), visLead(at, sw.onset, 0.03), { y: 10, scale: 0.98, dur: 0.28 });
      queueSFX("swipe", at + sw.onset, { vol: 0.58 });

      lines.forEach(function (ln, idx) {
        var lRel = beats[idx] != null ? beats[idx] : (0.16 + idx * 0.2);
        popIn(ln, visLead(at, lRel), { y: 6, dur: 0.22 });
        queueSFX(ln.classList.contains("is-del") ? "alert" : "click", at + lRel, { vol: 0.62 });
      });

      var caret = el.querySelector(".me-editor-caret");
      if (caret && sw.endRel - sw.onset > 1.2) {
        var blinkCount = Math.max(1, Math.floor((sw.endRel - sw.onset) / 0.45));
        tl.to(caret, { opacity: 0.15, duration: 0.22, yoyo: true, repeat: Math.min(12, blinkCount) }, at + sw.onset + 0.3);
      }

      var lastLineRel = beats[beats.length - 1] || 0.9;
      var stamp = el.querySelector(".me-editor-stamp");
      if (stamp) {
        var stRel = spokenOrFallback(s, stream, m.stamp || "", m.stampRevealOn || m.revealOn, Math.min(sceneEnd, lastLineRel + 0.3), 0.35, sceneEnd);
        var stAt = visLead(at, stRel);
        markReveal(stamp, stAt);
        gsap.set(stamp, { opacity: 0, scale: 1.38, rotation: -6 });
        tl.to(stamp, { opacity: 1, scale: 1, rotation: -4, duration: 0.22, ease: "power3.out" }, stAt);
        queueSFX("thud", at + stRel, { vol: 0.84 });
      }
      var summary = el.querySelector(".me-editor-summary");
      if (summary) {
        var sumObj = m.summaryCard || {};
        var sumRel = spokenOrFallback(s, stream, [sumObj.tag, sumObj.badge].filter(Boolean).join(" "), sumObj.revealOn, Math.min(sceneEnd, lastLineRel + 0.4), 0.35, sceneEnd);
        popIn(summary, visLead(at, sumRel), { y: 10, dur: 0.28 });
        queueSFX("pop", at + sumRel, { vol: 0.72 });
      }

      var scrubFill = el.querySelector(".me-editor-scrub-fill");
      if (scrubFill) {
        var tlMeta = m.timeline || {};
        var scrubStart = spokenOrFallback(s, stream, tlMeta.startLabel || "written", null, Math.max(0.3, sw.onset + 0.25), 0.25, Math.max(0.4, sceneEnd - 0.6));
        var scrubEnd = spokenOrFallback(s, stream, tlMeta.endLabel || "eval", null, Math.min(sceneEnd, scrubStart + Math.max(0.8, dur * 0.4)), scrubStart + 0.35, sceneEnd);
        popIn(el.querySelector(".me-editor-scrub"), visLead(at, scrubStart), { y: 6, dur: 0.26 });
        gsap.set(scrubFill, { scaleX: 0 });
        tl.to(scrubFill, { scaleX: 1, duration: Math.max(0.5, scrubEnd - scrubStart), ease: "power2.out" }, visLead(at, scrubStart) + 0.08);
      }

      var footerPill = el.querySelector(".me-editor-layout > .me-pill");
      if (footerPill) {
        var fRel = spokenOrFallback(s, stream, m.footerLabel || footerPill.textContent || "", m.pillRevealOn, Math.min(sceneEnd, lastLineRel + 0.35), 0.4, sceneEnd);
        popIn(footerPill, visLead(at, fRel), { y: 8, dur: 0.26 });
        queueSFX("ding", at + fRel, { vol: 0.74 });
      }
    },

    me_decision_gate: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var stream = buildWordStream(s);
      var sceneEnd = safeSceneEnd(dur, sw);
      var tierRows = q(el, ".me-tier-row");
      if (tierRows.length) {
        var tBeats = scheduleBeats(s, dur, tierRows.map(function (r, idx) {
          var cfg = (m.tiers || [])[idx] || {};
          return { hint: [cfg.label, cfg.detail].filter(Boolean).join(" "), cue: cfg.revealOn || cfg.cue };
        }), { start: Math.max(0.18, sw.onset), end: sceneEnd, ordered: true });
        popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
        drawPaths(q(el, ".me-tier-brace .me-draw-path"), visLead(at, sw.onset + 0.04, 0.03), { dur: 0.48 });
        tierRows.forEach(function (tr, idx) {
          var tRel = tBeats[idx] != null ? tBeats[idx] : (0.2 + idx * 0.24);
          popIn(tr, visLead(at, tRel), { y: 10, scale: 0.97, dur: 0.28 });
          queueSFX(tr.classList.contains("is-active") ? "ding" : "pop", at + tRel, { vol: 0.72 });
        });
        animateBottomPill(el, s, at, dur, (tBeats[tBeats.length - 1] || 1.2) + 0.35);
        return;
      }

      var choices = q(el, ".me-gate-choice");
      var gates = q(el, ".me-gate-box");
      var choiceBeats = scheduleBeats(s, dur, choices.map(function (c, idx) {
        var cfg = (m.choices || [])[idx];
        var txt = typeof cfg === "string" ? cfg : (cfg && cfg.text) || c.textContent || "";
        return { hint: txt, cue: cfg && (cfg.revealOn || cfg.cue) };
      }), { start: Math.max(0.22, sw.onset + 0.08), end: Math.max(0.5, sceneEnd - (gates.length ? 0.45 : 0)), ordered: true });

      var gateStart = choices.length ? Math.min(sceneEnd - 0.2, (choiceBeats[choiceBeats.length - 1] || 0.6) + 0.22) : Math.max(0.26, sw.onset + 0.12);
      var gateBeats = scheduleBeats(s, dur, gates.map(function (g, idx) {
        var cfg = (m.gates || [])[idx] || {};
        return { hint: [cfg.label, cfg.badge].filter(Boolean).join(" "), cue: cfg.revealOn || cfg.cue };
      }), { start: gateStart, end: sceneEnd });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
      var sideBrand = el.querySelector(".me-gate-side-brand");
      if (sideBrand) {
        popIn(sideBrand, visLead(at, sw.onset, 0.03), { scale: 0.94, dur: 0.28 });
        spinOrbitRings(el.querySelector(".me-orbit-stage"), at, dur, sw);
        var sqs = q(sideBrand, ".me-rollout-sq");
        if (sqs.length) {
          var rRel = spokenOrFallback(s, stream, m.rolloutLabel || "rollouts", null, sw.onset + 0.06, 0.1, sceneEnd);
          sqs.forEach(function (sq, si) {
            popIn(sq, visLead(at, rRel) + si * 0.055, { scale: 0.65, dur: 0.2 });
          });
        }
      }
      popIn(el.querySelector(".me-modal-card"), visLead(at, sw.onset + 0.03, 0.03), { y: 8, dur: 0.28 });
      queueSFX("swipe", at + sw.onset, { vol: 0.58 });

      choices.forEach(function (ch, idx) {
        var cRel = choiceBeats[idx] != null ? choiceBeats[idx] : (0.35 + idx * 0.22);
        popIn(ch, visLead(at, cRel), { scale: 0.88, dur: 0.22, ease: "back.out(1.4)" });
        queueSFX("pop", at + cRel, { vol: 0.7 });
      });
      gates.forEach(function (gt, idx) {
        var gRel = gateBeats[idx] != null ? gateBeats[idx] : (0.75 + idx * 0.28);
        popIn(gt, visLead(at, gRel), { y: 10, dur: 0.28 });
        queueSFX("ding", at + gRel, { vol: 0.74 });
      });

      var resPill = el.querySelector(".me-gate-side-brand > .me-pill") || el.querySelector(".me-gate-panel > div > .me-pill");
      if (resPill) {
        var lastG = gateBeats.length ? gateBeats[gateBeats.length - 1] : (choiceBeats[choiceBeats.length - 1] || 0.8);
        var pRel = spokenOrFallback(s, stream, m.resultPill || resPill.textContent || "", m.pillRevealOn || m.revealOn, Math.min(sceneEnd, lastG + 0.3), 0.35, sceneEnd);
        popIn(resPill, visLead(at, pRel), { scale: 0.9, dur: 0.28, ease: "back.out(1.4)" });
        queueSFX("ding", at + pRel, { vol: 0.78 });
      }
    },

    me_token_grid: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var stream = buildWordStream(s);
      var sceneEnd = safeSceneEnd(dur, sw);
      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });

      var busFrame = el.querySelector(".me-bus-frame");
      if (busFrame) {
        popIn(busFrame, visLead(at, sw.onset, 0.03), { y: 10, scale: 0.98, dur: 0.28 });
        var layers = q(el, ".me-layer-row");
        if (layers.length) {
          var lBeats = scheduleBeats(s, dur, layers.map(function (ly, idx) {
            var cfg = (m.layers || [])[idx] || {};
            return { hint: [cfg.label, m.frozenBadge, m.boxTitle].filter(Boolean).join(" "), cue: cfg.revealOn || cfg.cue };
          }), { start: Math.max(0.16, sw.onset + 0.06), end: sceneEnd, ordered: true });
          layers.forEach(function (ly, idx) {
            var lRel = lBeats[idx] != null ? lBeats[idx] : (0.16 + idx * 0.14);
            var lt = visLead(at, lRel);
            popIn(ly, lt, { y: 6, dur: 0.24 });
            drawPaths(q(ly, ".me-attn-arc"), lt + 0.04, { dur: 0.34, stagger: 0.018 });
            queueSFX(idx === 0 ? "swipe" : "tick", at + lRel, { vol: idx === 0 ? 0.68 : 0.56 });
          });
          var frzRel = findSpokenOffset(s, stream, [m.frozenBadge, "frozen", "unchanged", "locked"].filter(Boolean).join(" "), m.revealOn, 0.35, sceneEnd);
          if (frzRel !== null) queueSFX("ding", at + frzRel, { vol: 0.72 });
        } else {
          var brkHint = [m.bracketLabel, m.tokenCount ? String(m.tokenCount) + " tokens" : "", "prefix", "vectors"].filter(Boolean).join(" ");
          var brkRel = spokenOrFallback(s, stream, brkHint, m.revealOn, Math.min(sceneEnd, 0.75), 0.3, sceneEnd);
          var tileEnd = Math.max(0.35, brkRel - 0.12);
          var tiles = q(el, ".me-bus-tile");
          var tileStep = tiles.length > 1 ? Math.min(0.045, Math.max(0.018, (tileEnd - sw.onset) / tiles.length)) : 0;
          tiles.forEach(function (bt, idx) {
            popIn(bt, visLead(at, sw.onset) + 0.04 + idx * tileStep, { scale: 0.7, dur: 0.2, ease: "back.out(1.4)" });
          });
          popIn(el.querySelector(".me-bus-bracket"), visLead(at, brkRel), { y: 6, dur: 0.26 });
          queueSFX("pop", at + brkRel, { vol: 0.68 });

          var popEl = el.querySelector(".me-predict-pop");
          if (popEl) {
            var cObj = m.callout || {};
            var popHint = [cObj.title, cObj.input, cObj.output].filter(Boolean).join(" ");
            var popRel = spokenOrFallback(s, stream, popHint, cObj.revealOn, Math.min(sceneEnd, brkRel + 0.35), Math.min(sceneEnd - 0.15, brkRel + 0.15), sceneEnd);
            popIn(popEl, visLead(at, popRel), { scale: 0.9, dur: 0.3, ease: "back.out(1.5)" });
            queueSFX("ding", at + popRel, { vol: 0.78 });
          }
        }
        animateBottomPill(el, s, at, dur, 1.2);
        return;
      }

      var statsText = (m.stats || []).map(function (st) { return [st.value, st.label].filter(Boolean).join(" "); }).join(" ");
      var srcRel = spokenOrFallback(s, stream, [m.sourceLabel, statsText].filter(Boolean).join(" "), null, sw.onset + 0.06, 0.08, Math.min(sceneEnd, 1.8));
      var srcAt = visLead(at, srcRel);
      q(el, ".me-glyph-cell").forEach(function (gc, idx) {
        gsap.set(gc, { opacity: 0, scale: 0.7 });
        tl.to(gc, { opacity: 1, scale: 1, duration: 0.16, ease: "power2.out" }, srcAt + Math.min(0.85, idx * 0.014));
      });
      q(el, ".me-tok-compress .me-count").forEach(function (cn) { countTo(cn, srcAt + 0.06, 0.5); });

      var tgtRel = spokenOrFallback(s, stream, [m.targetLabel, m.targetCount ? String(m.targetCount) : "", "compress", "shrink"].filter(Boolean).join(" "), m.revealOn, Math.min(sceneEnd, srcRel + 0.65), Math.min(sceneEnd - 0.15, srcRel + 0.25), sceneEnd);
      var tgtAt = visLead(at, tgtRel);
      drawPaths(q(el, ".me-tok-compress .me-draw-path"), Math.max(at + 0.08, tgtAt - 0.18), { dur: 0.4 });
      queueSFX("whoosh", Math.max(at + 0.08, at + tgtRel - 0.14), { vol: 0.64 });
      popIn(el.querySelector(".me-prompt-box"), tgtAt, { scale: 0.93, dur: 0.3, ease: "back.out(1.3)" });
      q(el, ".me-amber-cell").forEach(function (ac, idx) {
        popIn(ac, tgtAt + 0.05 + idx * 0.025, { scale: 0.65, dur: 0.2, ease: "back.out(1.5)" });
      });
      queueSFX("pop", at + tgtRel, { vol: 0.78 });
      animateBottomPill(el, s, at, dur, tgtRel + 0.35);
    },

    me_timeline: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var sceneEnd = safeSceneEnd(dur, sw);
      var nodes = q(el, ".me-tl-node");
      var beats = scheduleBeats(s, dur, nodes.map(function (nd, idx) {
        var cfg = (m.events || [])[idx] || {};
        return { hint: [cfg.label, cfg.value, cfg.sub].filter(Boolean).join(" "), cue: cfg.revealOn || cfg.cue };
      }), { start: Math.max(0.16, sw.onset), end: sceneEnd, ordered: true });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
      var axis = el.querySelector(".me-tl-axis");
      if (axis) {
        gsap.set(axis, { scaleX: 0, transformOrigin: "left center" });
        tl.to(axis, { scaleX: 1, duration: 0.42, ease: "power2.out" }, visLead(at, sw.onset, 0.03));
      }
      var minTlBeat = earliestBeat(beats);
      nodes.forEach(function (nd, idx) {
        var cfg = (m.events || [])[idx] || {};
        var nRel = beats[idx] != null ? beats[idx] : (0.2 + idx * 0.26);
        var preEnter = idx === 0 && minTlBeat > 2.0;
        var nt = preEnter ? at + 0.18 : visLead(at, nRel);
        popIn(nd, nt, { y: 10, scale: 0.92, dur: 0.28 });
        if (preEnter) focusPulse(nd, visLead(at, nRel));
        queueSFX(cfg.active ? "ding" : "pop", at + nRel, { vol: 0.72 });
      });
      animateBottomPill(el, s, at, dur, (beats[beats.length - 1] || 1.2) + 0.3);
    },

    me_outro: function (el, s, at, dur, sw) {
      var m = s.meta || {};
      var sceneEnd = safeSceneEnd(dur, sw);
      var beats = scheduleBeats(s, dur, [
        { hint: m.ctaSub || s.subline || "", cue: m.revealOn },
        { hint: (m.cta || "Subscribe") + " " + (m.channel || ""), cue: m.ctaRevealOn }
      ], { start: Math.max(0.2, sw.onset + 0.1), end: sceneEnd, ordered: true });

      popIn(el.querySelector(".me-eyebrow"), at, { y: 8, dur: 0.22 });
      popIn(el.querySelector(".me-hero-headline"), visLead(at, sw.onset, 0.03), { y: 12, scale: 0.97, dur: 0.32 });
      var subRel = beats[0] != null ? beats[0] : 0.3;
      popIn(el.querySelector(".me-hero-sub"), visLead(at, subRel), { y: 10, dur: 0.3 });
      var ctaRel = beats[1] != null ? beats[1] : 0.6;
      popIn(el.querySelector(".me-outro-cta"), visLead(at, ctaRel), { y: 10, scale: 0.92, dur: 0.3, ease: "back.out(1.4)" });
      queueSFX("chime", at + ctaRel, { vol: 0.8 });
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
    matrix: "me_token_grid",
    split: "me_evidence_card",
    webref: "me_evidence_card",
    cloud: "me_core_orbit",
    mascot: "me_title",
    meme: "me_title",
    outro: "me_outro",
  };

  function nearestContentWordTime(s, targetRel, minRel, maxRel) {
    var stream = buildWordStream(s);
    var bestT = targetRel;
    var bestScore = -1;
    for (var i = 0; i < stream.length; i++) {
      var wt = stream[i].t;
      if (wt < minRel || wt > maxRel) continue;
      var tok = stream[i].tok;
      var dist = Math.abs(wt - targetRel);
      if (dist > 0.8) continue;
      var sc = (STOP[tok] ? 0 : 1.0) + (tok.length >= 5 ? 0.5 : 0) - dist * 0.6;
      if (sc > bestScore) { bestScore = sc; bestT = wt; }
    }
    return clamp(bestT, minRel, maxRel);
  }

  function addMidSceneLife(el, s, at, dur, sw) {
    if (dur < 4.5) return;
    var glows = q(el, ".me-orbit-glow");
    if (glows.length) {
      var breathDur = Math.max(0.8, (sw.endRel - sw.onset - 0.5) * 0.5);
      tl.to(glows, { opacity: 0.32, scale: 1.06, duration: breathDur, yoyo: true, repeat: 1, ease: "sine.inOut" }, at + sw.onset + 0.5);
    }
    var spotlightItems = q(el, ".me-schema-row, .me-pipe-node, .me-score-row, .me-tier-row, .me-gate-box");
    if (spotlightItems.length >= 2 && dur >= 5.2) {
      var winStart = Math.max(sw.onset + 1.2, Math.min(2.9, dur * 0.36));
      var winEnd = Math.min(dur - 0.68, sw.endRel);
      var winSpan = winEnd - winStart;
      if (winSpan < 0.8) return;
      var gap = winSpan / spotlightItems.length;
      spotlightItems.forEach(function (item, idx) {
        if (item.__mePulsed) return;
        var revealAt = item.__meRevealAt != null ? item.__meRevealAt : at;
        var stRel = nearestContentWordTime(s, winStart + idx * gap, winStart, winEnd - 0.42);
        var st = at + stRel;
        // Never pulse an invisible/just-revealed item, and settle before the cut
        if (st > revealAt + 0.72 && st + 0.42 < at + dur - 0.62) {
          focusPulse(item, st);
        }
      });
    }
  }

  SCENES.forEach(function (s, i) {
    var el = document.getElementById("s" + String(i + 1).padStart(3, "0"));
    if (!el) return;
    var at = s.start;
    var dur = s.end - s.start;
    var sw = getSpeechWindow(s, dur);
    var scIn = el.querySelector(".sc-in");

    if (i === 0) {
      gsap.set(el, { autoAlpha: 1 });
    } else {
      gsap.set(el, { autoAlpha: 0 });
      tl.set(el, { autoAlpha: 1 }, at);
      if (scIn) {
        gsap.set(scIn, { scale: 0.99, opacity: 0.92 });
        tl.to(scIn, { scale: 1, opacity: 1, duration: 0.22, ease: "power3.out" }, at);
      }
      // Subtle transition whoosh aligned to voiceover onset (deduped if scene opens with a louder cue)
      queueSFX("whoosh", at + Math.min(0.16, sw.onset), { vol: 0.44 });
    }
    if (i < SCENES.length - 1) {
      tl.set(el, { autoAlpha: 0 }, at + dur);
    }

    var key = ANIM[s.type] ? s.type : (FALLBACK_MAP[s.type] || "me_title");
    ANIM[key](el, s, at, dur, sw);
    addMidSceneLife(el, s, at, dur, sw);

    if (i < SCENES.length - 1 && dur > 1.0 && scIn) {
      var exitStart = clamp(sw.endRel, dur - 0.14, dur - 0.08);
      var exitDur = Math.max(0.08, dur - exitStart);
      tl.to(scIn, { opacity: 0.08, scale: 1.01, duration: exitDur, ease: "power1.in" }, at + exitStart);
    }
  });

  window.__timelines = window.__timelines || {};
  window.__timelines["__COMPOSITION_ID__"] = tl;
})();
