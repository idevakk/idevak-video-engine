/* ============================================================================
 * Dedicated GSAP Choreography: chalkboard-explainer
 * Calm hold-heavy timing: progressive SVG stroke drawing, sequential card
 * illuminates, red chalk X rejections, bar fills, and clean static holds.
 * ========================================================================== */
(function () {
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    var SCENES = window.__SCENES__ || [];
    var TOTAL = window.__TOTAL__ || 1;
    var tl = gsap.timeline({ paused: true });
    gsap.config({ nullTargetWarn: false });

    function q(el, sel) {
      return el ? Array.prototype.slice.call(el.querySelectorAll(sel)) : [];
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

    function drawPaths(paths, at, opts) {
      opts = opts || {};
      var dur = opts.dur || 0.55;
      var stagger = opts.stagger || 0.08;
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
      tl.fromTo(
        el,
        { opacity: 0, y: opts.y == null ? 14 : opts.y },
        { opacity: 1, y: 0, duration: opts.dur || 0.45, ease: "power2.out" },
        at
      );
    }

    function drawX(el, at) {
      var strokes = q(el, ".cb-x-stroke");
      if (!strokes.length) return;
      drawPaths(strokes, at, { dur: 0.24, stagger: 0.14 });
      queueSFX("thud", at, { vol: 0.85 });
      queueSFX("swipe", at + 0.12, { vol: 0.7 });
    }

    var ANIM = {
      cb_title: function (el, s, at, dur) {
        var eyebrow = el.querySelector(".cb-eyebrow");
        var hero = el.querySelector(".cb-hero-row");
        var barWrap = el.querySelector(".cb-bar-wrap");
        var fill = el.querySelector(".cb-sketch-bar-fill");
        var barMeta = el.querySelector(".cb-bar-meta");
        var payoff = el.querySelector(".cb-payoff-row");
        var pill = el.querySelector(".cb-title-pill");
        var sub = el.querySelector(".cb-sub-center");

        if (at === 0) {
          // Frame 0 reads cleanly immediately
          gsap.set([eyebrow, hero].filter(Boolean), { opacity: 1, y: 0 });
        } else {
          fadeIn(eyebrow, at, { y: 6, dur: 0.35 });
          fadeIn(hero, at + 0.08, { y: 12, dur: 0.45 });
        }

        if (barWrap) {
          drawPaths(q(barWrap, ".cb-draw"), at + 0.25, { dur: 0.45, stagger: 0.05 });
          if (fill) {
            gsap.set(fill, { scaleX: 0, opacity: 0 });
            tl.to(fill, { scaleX: 1, opacity: 1, duration: 0.65, ease: "power2.out" }, at + 0.45);
            queueSFX("swipe", at + 0.45, { vol: 0.75 });
          }
          fadeIn(barMeta, at + 0.65, { y: 8, dur: 0.4 });
        }

        var payoffAt = at + Math.min(dur * 0.45, typeof s.revealTime === "number" ? s.revealTime : 1.05);
        if (payoff) {
          fadeIn(payoff, payoffAt, { y: 12, dur: 0.45 });
          if (pill) {
            drawPaths(q(pill, ".cb-draw"), payoffAt, { dur: 0.35 });
            queueSFX("pop", payoffAt, { vol: 0.8 });
          }
          queueSFX("ding", payoffAt + 0.12, { vol: 0.75 });
          drawPaths(q(el, ".cb-trend-overlay .cb-draw"), payoffAt + 0.25, { dur: 0.35 });
        }
        if (sub) fadeIn(sub, at + 0.4, { y: 10, dur: 0.45 });
      },

      cb_cards: function (el, s, at, dur) {
        fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.35 });
        var cards = q(el, ".cb-card");
        var span = Math.max(0.8, Math.min(dur * 0.65, cards.length * 0.75));
        var step = span / Math.max(1, cards.length);

        cards.forEach(function (c, k) {
          var t = at + 0.15 + k * step;
          gsap.set(c, { opacity: 0.32 });
          drawPaths(q(c, ".cb-box-svg .cb-draw"), t, { dur: 0.45, stagger: 0.04 });
          drawPaths(q(c, ".cb-icon .cb-draw"), t + 0.1, { dur: 0.4, stagger: 0.04 });
          tl.to(c, { opacity: 1, duration: 0.35, ease: "power2.out" }, t + 0.08);
          queueSFX("pop", t + 0.1, { vol: 0.75 });
          if (c.classList.contains("is-xout")) {
            drawX(c, Math.min(at + dur - 0.65, t + step * 0.7));
          }
        });

        var bottom = el.querySelector(".cb-bottom-pill");
        if (bottom) {
          var bt = at + Math.min(dur - 0.75, 0.25 + cards.length * step);
          fadeIn(bottom, bt, { y: 10, dur: 0.4 });
          drawPaths(q(bottom, ".cb-draw"), bt, { dur: 0.35 });
          queueSFX("pop", bt, { vol: 0.85 });
        }
      },

      cb_formula: function (el, s, at, dur) {
        fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.35 });
        var box = el.querySelector(".cb-formula-box");
        drawPaths(q(box, ".cb-draw"), at + 0.1, { dur: 0.55, stagger: 0.05 });

        var factors = q(el, ".cb-factor, .cb-op");
        var step = Math.min(0.32, (dur * 0.45) / Math.max(1, factors.length));
        factors.forEach(function (f, k) {
          var ft = at + 0.25 + k * step;
          fadeIn(f, ft, { y: 8, dur: 0.3 });
          if (f.classList.contains("cb-factor")) queueSFX("click", ft, { vol: 0.7 });
        });

        var res = el.querySelector(".cb-formula-result");
        var resAt = at + Math.min(dur - 0.85, 0.4 + factors.length * step);
        if (res) {
          fadeIn(res, resAt, { y: 12, dur: 0.45 });
          drawPaths(q(res, ".cb-draw"), resAt, { dur: 0.35 });
          queueSFX("ding", resAt + 0.08, { vol: 0.85 });
        }
      },

      cb_stat_bar: function (el, s, at, dur) {
        fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.35 });
        var convCard = el.querySelector(".cb-conv-card");
        if (convCard) {
          drawPaths(q(convCard, ".cb-draw"), at + 0.12, { dur: 0.5, stagger: 0.05 });
          fadeIn(convCard.querySelector(".cb-card-in"), at + 0.22, { y: 8, dur: 0.4 });
          drawPaths(q(el, ".cb-conv-arrow .cb-draw"), at + 0.45, { dur: 0.4, stagger: 0.08 });
          queueSFX("whoosh", at + 0.45, { vol: 0.65 });
          fadeIn(el.querySelector(".cb-conv-right"), at + 0.7, { y: 10, dur: 0.45 });
          queueSFX("ding", at + 0.75, { vol: 0.8 });
        }

        var metricHero = el.querySelector(".cb-metric-hero");
        if (metricHero) {
          fadeIn(metricHero, at + 0.15, { y: 10, dur: 0.45 });
          drawPaths(q(metricHero, ".cb-icon .cb-draw"), at + 0.18, { dur: 0.4, stagger: 0.05 });
          queueSFX("ding", at + 0.2, { vol: 0.8 });
          if (metricHero.classList.contains("is-xout")) {
            drawX(metricHero, at + Math.min(dur * 0.45, 1.1));
          }
        }

        var fills = q(el, ".cb-sketch-bar-fill, .cb-hrow-fill");
        var hrows = q(el, ".cb-hrow");
        if (hrows.length) {
          hrows.forEach(function (row, k) {
            var rt = at + 0.25 + k * 0.35;
            fadeIn(row, rt, { y: 8, dur: 0.35 });
            drawPaths(q(row, ".cb-draw"), rt, { dur: 0.35 });
            var f = row.querySelector(".cb-hrow-fill");
            if (f) {
              gsap.set(f, { scaleX: 0 });
              tl.to(f, { scaleX: 1, duration: 0.55, ease: "power2.out" }, rt + 0.15);
              queueSFX("swipe", rt + 0.15, { vol: 0.6 });
            }
          });
        } else if (fills.length) {
          drawPaths(q(el, ".cb-bar-wrap .cb-draw, .cb-pinned-row .cb-draw"), at + 0.5, { dur: 0.45, stagger: 0.05 });
          fills.forEach(function (f, k) {
            gsap.set(f, { scaleX: 0 });
            tl.to(f, { scaleX: 1, duration: 0.7, ease: "power2.out" }, at + 0.75 + k * 0.2);
            queueSFX("swipe", at + 0.75 + k * 0.2, { vol: 0.65 });
          });
          fadeIn(el.querySelector(".cb-bar-meta"), at + 0.9, { y: 6, dur: 0.35 });
          fadeIn(el.querySelector(".cb-pinned-val"), at + 1.0, { y: 6, dur: 0.35 });
        }

        var bottom = el.querySelector(".cb-bottom-pill");
        if (bottom) {
          var bt = at + Math.min(dur - 0.7, 1.45);
          fadeIn(bottom, bt, { y: 8, dur: 0.4 });
          drawPaths(q(bottom, ".cb-draw"), bt, { dur: 0.35 });
          queueSFX("pop", bt, { vol: 0.85 });
        }
      },

      cb_vram_stack: function (el, s, at, dur) {
        fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.35 });
        drawPaths(q(el, ".cb-vram-tank-frame > .cb-box-svg .cb-draw"), at + 0.1, { dur: 0.55, stagger: 0.06 });
        var ceil = el.querySelector(".cb-vram-ceiling");
        if (ceil) fadeIn(ceil, at + 0.35, { y: 0, dur: 0.4 });

        // Stack renders bottom-to-top visually: reverse DOM order for sequential bottom-up animation
        var rows = q(el, ".cb-vram-row").reverse();
        var step = Math.min(0.55, (dur * 0.65) / Math.max(1, rows.length));
        rows.forEach(function (row, k) {
          var rt = at + 0.4 + k * step;
          var blk = row.querySelector(".cb-vram-block");
          var lbl = row.querySelector(".cb-vram-lbl");
          if (blk) {
            gsap.set(blk, { scaleY: 0, opacity: 0 });
            tl.to(blk, { scaleY: 1, opacity: 1, duration: 0.45, ease: "power2.out" }, rt);
          }
          fadeIn(lbl, rt + 0.08, { y: 6, dur: 0.35 });
          queueSFX("pop", rt + 0.05, { vol: 0.7 });
        });
      },

      cb_layer_grid: function (el, s, at, dur) {
        fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.35 });
        var cells = q(el, ".cb-grid-cell");
        var lit = q(el, ".cb-grid-cell.is-lit");
        tl.fromTo(cells, { opacity: 0 }, { opacity: 1, duration: 0.35, stagger: 0.004 }, at + 0.12);
        if (lit.length) {
          tl.fromTo(lit, { scale: 0.88 }, { scale: 1, duration: 0.3, stagger: 0.015, ease: "power2.out" }, at + 0.45);
          queueSFX("tick", at + 0.45, { vol: 0.65 });
        }
        var specs = q(el, ".cb-spec-row");
        specs.forEach(function (sp, k) {
          var st = at + 0.7 + k * 0.35;
          fadeIn(sp, st, { y: 8, dur: 0.35 });
          var ldr = sp.querySelector(".cb-spec-leader");
          if (ldr) tl.fromTo(ldr, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power2.out" }, st + 0.08);
          queueSFX("click", st + 0.1, { vol: 0.6 });
        });
      },

      cb_wiring: function (el, s, at, dur) {
        fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.35 });
        var nodes = q(el, ".cb-wire-node");
        nodes.forEach(function (n, k) {
          var nt = at + 0.15 + k * 0.22;
          fadeIn(n, nt, { y: 8, dur: 0.35 });
          drawPaths(q(n, ".cb-draw"), nt, { dur: 0.4 });
        });
        drawPaths(q(el, ".cb-wire-edge"), at + 0.35, { dur: 0.45, stagger: 0.14 });
        q(el, ".cb-wire-ribbon").forEach(function (rb) {
          tl.fromTo(rb, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" }, at + 0.38);
        });
        q(el, ".cb-wire-dot").forEach(function (dot) {
          fadeIn(dot, at + 0.65, { y: 0, dur: 0.25 });
        });
        queueSFX("whoosh", at + 0.38, { vol: 0.65 });

        var pills = q(el, ".cb-pills-row .cb-pill");
        pills.forEach(function (p, k) {
          var pt = at + Math.min(dur - 0.7, 1.35 + k * 0.35);
          fadeIn(p, pt, { y: 8, dur: 0.35 });
          drawPaths(q(p, ".cb-draw"), pt, { dur: 0.3 });
          queueSFX("pop", pt, { vol: 0.8 });
        });
      },

      cb_gpu_spec: function (el, s, at, dur) {
        fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.35 });
        var cmpCards = q(el, ".cb-gpu-cmp-card");
        if (cmpCards.length) {
          cmpCards.forEach(function (c, k) {
            var ct = at + 0.18 + k * 0.45;
            drawPaths(q(c, ".cb-box-svg .cb-draw"), ct, { dur: 0.55, stagger: 0.05 });
            fadeIn(c.querySelector(".cb-gpu-cmp-in"), ct + 0.15, { y: 10, dur: 0.45 });
            queueSFX("pop", ct + 0.18, { vol: 0.75 });
          });
          return;
        }
        var bp = el.querySelector(".cb-bp-box");
        if (bp) {
          fadeIn(bp.querySelector(".cb-bp-brand"), at + 0.12, { y: 6, dur: 0.35 });
          drawPaths(q(bp, ".cb-gpu-blueprint .cb-draw"), at + 0.2, { dur: 0.55, stagger: 0.04 });
          fadeIn(bp.querySelector(".cb-bp-model"), at + 0.55, { y: 8, dur: 0.4 });
          fadeIn(bp.querySelector(".cb-bp-sub"), at + 0.7, { y: 6, dur: 0.35 });
          if (bp.classList.contains("is-xout")) {
            drawX(bp, at + Math.min(dur * 0.5, 1.25));
          }
        }
        var footer = el.querySelector(".cb-bp-footer");
        if (footer) {
          fadeIn(footer, at + 0.85, { y: 8, dur: 0.4 });
          drawPaths(q(footer, ".cb-draw"), at + 0.85, { dur: 0.35 });
          queueSFX("ding", at + 0.95, { vol: 0.8 });
        }
      },

      cb_timeline_split: function (el, s, at, dur) {
        fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.35 });
        var cells = q(el, ".cb-tri-cell");
        if (cells.length) {
          drawPaths(q(el, ".cb-tri-prompt .cb-draw"), at + 0.15, { dur: 0.4 });
          var pf = el.querySelector(".cb-tri-prompt .cb-sketch-bar-fill");
          if (pf) {
            gsap.set(pf, { scaleX: 0 });
            tl.to(pf, { scaleX: 1, duration: 0.45, ease: "power2.out" }, at + 0.25);
          }
          tl.fromTo(cells, { opacity: 0 }, { opacity: 1, duration: 0.25, stagger: 0.01 }, at + 0.45);
          fadeIn(el.querySelector(".cb-tri-note"), at + 0.85, { y: 8, dur: 0.4 });
        } else {
          drawPaths(q(el, ".cb-draw"), at + 0.15, { dur: 0.45, stagger: 0.05 });
          var pre = el.querySelector(".cb-split-prefill");
          var dec = el.querySelector(".cb-split-decode");
          var div = el.querySelector(".cb-split-divider");
          if (pre) {
            gsap.set(pre, { scaleX: 0 });
            tl.to(pre, { scaleX: 1, duration: 0.9, ease: "power1.inOut" }, at + 0.4);
          }
          if (div) {
            fadeIn(div, at + 1.25, { y: 0, dur: 0.25 });
            queueSFX("ding", at + 1.25, { vol: 0.85 });
          }
          if (dec) {
            gsap.set(dec, { scaleX: 0 });
            tl.to(dec, { scaleX: 1, duration: 0.35, ease: "power2.out" }, at + 1.32);
          }
          fadeIn(el.querySelector(".cb-splitbar-labels"), at + 0.7, { y: 6, dur: 0.35 });
        }
        var bottom = el.querySelector(".cb-bottom-pill");
        if (bottom) {
          var bt = at + Math.min(dur - 0.65, 1.5);
          fadeIn(bottom, bt, { y: 8, dur: 0.4 });
          drawPaths(q(bottom, ".cb-draw"), bt, { dur: 0.35 });
          queueSFX("pop", bt, { vol: 0.85 });
        }
      },

      cb_checklist: function (el, s, at, dur) {
        fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.35 });
        fadeIn(el.querySelector(".cb-chk-header"), at + 0.12, { y: 8, dur: 0.4 });
        drawPaths(q(el, ".cb-chk-header .cb-draw"), at + 0.12, { dur: 0.35 });
        q(el, ".cb-pills-row .cb-pill").forEach(function (p, k) {
          fadeIn(p, at + 0.3 + k * 0.2, { y: 8, dur: 0.35 });
          drawPaths(q(p, ".cb-draw"), at + 0.3 + k * 0.2, { dur: 0.3 });
          queueSFX("pop", at + 0.3 + k * 0.2, { vol: 0.7 });
        });
        q(el, ".cb-chk-row").forEach(function (row, k) {
          var rt = at + 0.6 + k * 0.32;
          fadeIn(row, rt, { y: 8, dur: 0.35 });
          drawPaths(q(row, ".cb-draw"), rt, { dur: 0.3 });
          queueSFX("click", rt + 0.05, { vol: 0.75 });
        });
        var bottom = el.querySelector(".cb-bottom-pill");
        if (bottom) {
          var bt = at + Math.min(dur - 0.65, 1.35);
          fadeIn(bottom, bt, { y: 8, dur: 0.35 });
          drawPaths(q(bottom, ".cb-draw"), bt, { dur: 0.3 });
          queueSFX("pop", bt, { vol: 0.85 });
        }
      },

      cb_outro: function (el, s, at) {
        fadeIn(el.querySelector(".cb-eyebrow"), at, { y: 6, dur: 0.35 });
        fadeIn(el.querySelector(".cb-outro-title"), at + 0.12, { y: 12, dur: 0.5 });
        fadeIn(el.querySelector(".cb-outro-sub"), at + 0.32, { y: 8, dur: 0.45 });
        q(el, ".cb-pills-row .cb-pill").forEach(function (p, k) {
          var pt = at + 0.52 + k * 0.18;
          fadeIn(p, pt, { y: 8, dur: 0.35 });
          drawPaths(q(p, ".cb-draw"), pt, { dur: 0.35 });
          queueSFX("ding", pt + 0.05, { vol: 0.8 });
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
  });
})();
