// Live amapiano groove (log drum, shakers, jazzy chords) synthesized in WebAudio + SFX.
let ctx: AudioContext | null = null;
let master: GainNode, club: GainNode, filter: BiquadFilterNode, sfx: GainNode, noise: AudioBuffer;
let next = 0,
  step = 0,
  siren: { o: OscillatorNode; l: OscillatorNode; g: GainNode } | null = null;
const BPM = 113,
  SD = 60 / BPM / 4;
const mf = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [
  [53, 56, 60, 63, 67],
  [49, 53, 56, 60],
  [51, 55, 58, 65],
  [48, 51, 55, 58],
];
const LOG = [
  [0, 41],
  [3, 41],
  [6, 44],
  [10, 41],
  [11, 39],
  [14, 36],
];

export function initAudio() {
  if (ctx) {
    void ctx.resume();
    return;
  }
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  club = ctx.createGain();
  club.gain.value = 0;
  filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  club.connect(filter).connect(master);
  sfx = ctx.createGain();
  sfx.gain.value = 0.6;
  sfx.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  next = ctx.currentTime + 0.1;
  setInterval(tick, 25);
}
export function setMuted(m: boolean) {
  if (ctx) master.gain.value = m ? 0 : 1;
}
export function setClubMix(vol: number, inside: boolean) {
  if (!ctx) return;
  club.gain.setTargetAtTime(vol, ctx.currentTime, 0.3);
  filter.frequency.setTargetAtTime(inside ? 16000 : 700, ctx.currentTime, 0.3);
}
function env(g: GainNode, t: number, peak: number, dec: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
}
function osc(
  type: OscillatorType,
  f: number,
  t: number,
  dur: number,
  peak: number,
  out: AudioNode,
  slideTo?: number,
) {
  const c = ctx!,
    o = c.createOscillator(),
    g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur * 0.4);
  env(g, t, peak, dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function hit(
  t: number,
  type: BiquadFilterType,
  f: number,
  dur: number,
  peak: number,
  out: AudioNode,
) {
  const c = ctx!,
    s = c.createBufferSource(),
    bf = c.createBiquadFilter(),
    g = c.createGain();
  s.buffer = noise;
  bf.type = type;
  bf.frequency.value = f;
  env(g, t, peak, dur);
  s.connect(bf).connect(g).connect(out);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}
function play(s: number, t: number) {
  const b = s % 16,
    bar = Math.floor(s / 16) % 4;
  if (b % 4 === 0) osc("sine", 140, t, 0.3, 0.9, club, 45);
  if (b === 4 || b === 12) hit(t, "bandpass", 1600, 0.16, 0.5, club);
  hit(t, "highpass", 7500, 0.045, b % 2 ? 0.12 : 0.22, club);
  for (const [p, m] of LOG) if (p === b) osc("sine", mf(m!) * 1.6, t, 0.42, 0.8, club, mf(m!));
  if (b === 2 || b === 7 || b === 11)
    for (const m of CHORDS[bar]!) {
      osc("triangle", mf(m), t, 0.35, 0.06, club);
      osc("sine", mf(m + 12), t, 0.25, 0.03, club);
    }
  if (bar === 3 && b === 15) hit(t, "lowpass", 400, 0.3, 0.4, club);
}
function tick() {
  if (!ctx) return;
  while (next < ctx.currentTime + 0.12) {
    play(step, next);
    next += SD;
    step = (step + 1) % 64;
  }
}
export const fx = {
  splash() {
    if (ctx) hit(ctx.currentTime, "lowpass", 1200, 0.6, 0.7, sfx);
  },
  cash() {
    if (ctx) {
      osc("sine", 1320, ctx.currentTime, 0.12, 0.3, sfx);
      osc("sine", 1760, ctx.currentTime + 0.08, 0.25, 0.3, sfx);
    }
  },
  pop() {
    if (ctx) osc("sine", 600, ctx.currentTime, 0.12, 0.3, sfx, 300);
  },
  siren(on: boolean) {
    if (!ctx) return;
    if (on && !siren) {
      const o = ctx.createOscillator(),
        l = ctx.createOscillator(),
        lg = ctx.createGain(),
        g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = 750;
      l.frequency.value = 1.6;
      lg.gain.value = 200;
      l.connect(lg).connect(o.frequency);
      g.gain.value = 0.05;
      o.connect(g).connect(sfx);
      o.start();
      l.start();
      siren = { o, l, g };
    } else if (!on && siren) {
      siren.o.stop();
      siren.l.stop();
      siren = null;
    }
  },
};
