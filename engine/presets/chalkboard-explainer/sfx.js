/* ============================================================================
 * Dedicated Soft Chalkboard Acoustic SFX Synthesizer
 * Modeled after the 11 reference sounds extracted by rea-video:
 *   pop (bubble reveal), ding (warm marimba), whoosh (chalk wipe),
 *   click (soft wooden/chalk tap), tick (gentle odometer), thud (felt tap)
 * ========================================================================== */
(function () {
  function noiseSample(index) {
    var n = Math.imul(index + 1, 374761393);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 2147483648 - 1;
  }

  function playChalkSFX(type, opt, ctx) {
    var t = 0;
    opt = opt || {};
    var vol = opt.vol == null ? 1 : opt.vol;

    if (type === "pop" || type === "unmask" || type === "flare") {
      // Soft rounded bubble pop on pill / card reveal
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(340, t);
      o.frequency.exponentialRampToValueAtTime(720, t + 0.042);
      o.frequency.exponentialRampToValueAtTime(280, t + 0.088);
      g.gain.setValueAtTime(0.08 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.10);
      return;
    }

    if (type === "ding" || type === "chime") {
      // Warm gentle marimba/bell ding on stat payoff or threshold hit
      var od = ctx.createOscillator();
      var gd = ctx.createGain();
      od.type = "sine";
      od.frequency.setValueAtTime(587.33, t);
      od.frequency.setValueAtTime(880.0, t + 0.055);
      gd.gain.setValueAtTime(0.065 * vol, t);
      gd.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      od.connect(gd); gd.connect(ctx.destination);
      od.start(t); od.stop(t + 0.25);
      return;
    }

    if (type === "whoosh" || type === "swipe") {
      // Airy chalk-wipe / stroke sweep
      var len = Math.floor(ctx.sampleRate * 0.18);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = noiseSample(i + 71) * 0.6;
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var flt = ctx.createBiquadFilter();
      flt.type = "bandpass";
      flt.Q.setValueAtTime(1.8, t);
      flt.frequency.setValueAtTime(type === "swipe" ? 950 : 340, t);
      flt.frequency.exponentialRampToValueAtTime(type === "swipe" ? 2100 : 980, t + 0.09);
      flt.frequency.exponentialRampToValueAtTime(260, t + 0.18);
      var gw = ctx.createGain();
      gw.gain.setValueAtTime(0.001, t);
      gw.gain.linearRampToValueAtTime(0.075 * vol, t + 0.06);
      gw.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      src.connect(flt); flt.connect(gw); gw.connect(ctx.destination);
      src.start(t);
      return;
    }

    if (type === "thud") {
      // Muted felt-pad tap on red X or rejection
      var ot = ctx.createOscillator();
      var gt = ctx.createGain();
      ot.type = "sine";
      ot.frequency.setValueAtTime(98, t);
      ot.frequency.exponentialRampToValueAtTime(42, t + 0.17);
      gt.gain.setValueAtTime(0.15 * vol, t);
      gt.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      ot.connect(gt); gt.connect(ctx.destination);
      ot.start(t); ot.stop(t + 0.19);
      return;
    }

    if (type === "click" || type === "tick") {
      // Crisp soft wooden/chalk tap
      var oc = ctx.createOscillator();
      var gc = ctx.createGain();
      oc.type = "triangle";
      oc.frequency.setValueAtTime(type === "click" ? 1120 : 760, t);
      oc.frequency.exponentialRampToValueAtTime(240, t + 0.024);
      gc.gain.setValueAtTime((type === "click" ? 0.055 : 0.035) * vol, t);
      gc.gain.exponentialRampToValueAtTime(0.001, t + 0.026);
      oc.connect(gc); gc.connect(ctx.destination);
      oc.start(t); oc.stop(t + 0.03);
      return;
    }
  }

  window.__CB_PLAY_SFX__ = playChalkSFX;
})();
