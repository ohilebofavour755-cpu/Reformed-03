// Natural human neural voice playback using preloaded audio clips (no robotic speechSynthesis).
import type { Gender } from "./store";
import { VOICE_CLIPS } from "./voiceManifest";

interface VoiceJob {
  url: string;
  ms: number;
  onStart?: (ms: number) => void;
}

const queue: VoiceJob[] = [];
const audioCache = new Map<string, HTMLAudioElement>();
let playing = false;
let currentAudio: HTMLAudioElement | null = null;
let globalMuted = false;

function getClip(url: string): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  let a = audioCache.get(url);
  if (!a) {
    a = new Audio(url);
    a.preload = "auto";
    audioCache.set(url, a);
  }
  return a;
}

function playNext() {
  if (globalMuted) {
    queue.length = 0;
    playing = false;
    return;
  }
  const next = queue.shift();
  if (!next) {
    playing = false;
    return;
  }
  playing = true;
  next.onStart?.(next.ms);
  const clip = getClip(next.url);
  if (!clip) {
    playing = false;
    return;
  }
  currentAudio = clip;
  clip.currentTime = 0;
  clip.volume = 0.92;
  const finish = () => {
    clip.onended = null;
    clip.onerror = null;
    if (currentAudio === clip) currentAudio = null;
    playNext();
  };
  clip.onended = finish;
  clip.onerror = finish;
  try {
    const p = clip.play();
    if (p && typeof p.catch === "function") p.catch(finish);
  } catch {
    finish();
  }
}

export function setVoiceMuted(muted: boolean) {
  globalMuted = muted;
  if (muted) {
    queue.length = 0;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    playing = false;
  }
}

export function clearVoiceQueue() {
  queue.length = 0;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  playing = false;
}

export function resolveVoiceClip(text: string, g: Gender): { url: string; ms: number } | null {
  return VOICE_CLIPS[`${g}:${text}`] ?? null;
}

export function say(
  text: string,
  g: Gender,
  muted = false,
  onStart?: (durationMs: number) => void,
): { url: string; ms: number } | null {
  globalMuted = muted;
  const clip = resolveVoiceClip(text, g);
  if (muted || !clip) return clip;
  // Preload immediately and enqueue sequential playback
  getClip(clip.url);
  queue.push({ url: clip.url, ms: clip.ms, onStart });
  if (!playing) playNext();
  return clip;
}

export const LINES = {
  warmMe: ["Hey! How's your day going?", "Looking sharp today!", "How far! Good to see you."],
  warmThem: [
    "All good, thanks! See you around.",
    "You too! Enjoy the city.",
    "I dey alright. Thanks for asking!",
    "Nice one! I love this city.",
  ],
  coldThem: ["Sorry, I'm in a hurry.", "Not now, please.", "Abeg, give me a minute."],
  clapMe: [
    "Could you move? You're blocking the whole street.",
    "Your attitude needs a wardrobe change.",
    "Abeg, don't start with me.",
  ],
  clapThem: [
    "Who asked you? Mind your business!",
    "Seriously? Take a walk.",
    "You must be joking. Keep moving.",
    "Abeg, leave me alone!",
  ],
  flirtMe: [
    "You've got a really great smile.",
    "Can I take you out sometime?",
    "Your vibe is something else. Dinner later?",
  ],
  flirtYes: [
    "You're making me blush!",
    "Maybe. I like your confidence.",
    "Okay, I like your vibe too.",
  ],
  flirtNo: ["No thanks, not interested.", "Not today, sorry.", "I'm already seeing someone."],
  pushThem: ["Hey! What the hell?!", "Watch it!", "Abeg! What did I do to you?"],
  crash: [
    "What the hell! Watch the paint!",
    "Damn! Look where you're going!",
    "Abeg, you wan wreck my ride?",
  ],
  partner: [
    "Love you! Let's go home soon.",
    "I'm happy we found each other.",
    "You mean everything to me.",
  ],
};

export const pickLine = (a: string[]) => a[Math.floor(Math.random() * a.length)] ?? "";

export function speakSubtitle(
  name: string,
  text: string,
  gender: Gender,
  muted: boolean,
  notify: (text: string) => void,
  onStart?: (durationMs: number) => void,
) {
  notify(`${name}: “${text}”`);
  return say(text, gender, muted, onStart);
}
