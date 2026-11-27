/* ============================================================================
 * Dedicated Digital Motion-Explainer Acoustic SFX Synthesizer
 * Crisp, modern UI/motion-graphics cues modeled after clean explainer tracks:
 *   pop (UI pill/node pop), ding (clean glass chime), whoosh (air glide),
 *   swipe (panel slide), click (mechanical key/tab tap), tick (counter pulse),
 *   thud (low damped settle), alert (subtle warning ping), chime (double chime)
 * ========================================================================== */
(function () {
  function noiseSample(index) {
    var n = Math.imul(index + 1, 374761393);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 2147483648 - 1;
  }

  function playMotionSFX(type, opt, ctx) {
    var t = 0;
    opt = opt || {};
    var vol = opt.vol == null ? 1 : opt.vol;

    if (type === "pop") {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(380, t);
      o.frequency.exponentialRampToValueAtTime(860, t + 0.036);
      o.frequency.exponentialRampToValueAtTime(320, t + 0.082);
      g.gain.setValueAtTime(0.085 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.095);
      return;
    }

    if (type === "ding" || type === "chime") {
      var o1 = ctx.createOscillator();
      var g1 = ctx.createGain();
      o1.type = "sine";
      o1.frequency.setValueAtTime(659.25, t);
      o1.frequency.setValueAtTime(type === "chime" ? 987.77 : 880.0, t + 0.055);
      g1.gain.setValueAtTime(0.068 * vol, t);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      o1.connect(g1); g1.connect(ctx.destination);
      o1.start(t); o1.stop(t + 0.27);
      return;
    }

    if (type === "alert") {
      var oa = ctx.createOscillator();
      var ga = ctx.createGain();
      oa.type = "triangle";
      oa.frequency.setValueAtTime(520, t);
      oa.frequency.setValueAtTime(390, t + 0.075);
      ga.gain.setValueAtTime(0.075 * vol, t);
      ga.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
      oa.connect(ga); ga.connect(ctx.destination);
      oa.start(t); oa.stop(t + 0.21);
      return;
    }

    if (type === "whoosh" || type === "swipe") {
      var len = Math.floor(ctx.sampleRate * 0.19);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = noiseSample(i + 131) * 0.58;
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var flt = ctx.createBiquadFilter();
      flt.type = "bandpass";
      flt.Q.setValueAtTime(2.0, t);
      flt.frequency.setValueAtTime(type === "swipe" ? 1100 : 380, t);
      flt.frequency.exponentialRampToValueAtTime(type === "swipe" ? 2400 : 1200, t + 0.085);
      flt.frequency.exponentialRampToValueAtTime(280, t + 0.185);
      var gw = ctx.createGain();
      gw.gain.setValueAtTime(0.001, t);
      gw.gain.linearRampToValueAtTime(0.08 * vol, t + 0.055);
      gw.gain.exponentialRampToValueAtTime(0.001, t + 0.185);
      src.connect(flt); flt.connect(gw); gw.connect(ctx.destination);
      src.start(t);
      return;
    }

    if (type === "thud") {
      var ot = ctx.createOscillator();
      var gt = ctx.createGain();
      ot.type = "sine";
      ot.frequency.setValueAtTime(110, t);
      ot.frequency.exponentialRampToValueAtTime(44, t + 0.16);
      gt.gain.setValueAtTime(0.14 * vol, t);
      gt.gain.exponentialRampToValueAtTime(0.001, t + 0.175);
      ot.connect(gt); gt.connect(ctx.destination);
      ot.start(t); ot.stop(t + 0.18);
      return;
    }

    if (type === "click" || type === "tick") {
      var oc = ctx.createOscillator();
      var gc = ctx.createGain();
      oc.type = "triangle";
      oc.frequency.setValueAtTime(type === "click" ? 1320 : 880, t);
      oc.frequency.exponentialRampToValueAtTime(260, t + 0.022);
      gc.gain.setValueAtTime((type === "click" ? 0.055 : 0.038) * vol, t);
      gc.gain.exponentialRampToValueAtTime(0.001, t + 0.024);
      oc.connect(gc); gc.connect(ctx.destination);
      oc.start(t); oc.stop(t + 0.028);
      return;
    }
  }

  window.__ME_PLAY_SFX__ = playMotionSFX;
})();
