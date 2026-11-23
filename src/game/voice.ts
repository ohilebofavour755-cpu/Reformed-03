// Speech with Google voices when the browser has them (Chrome / Android).
import type { Gender } from "./store";
let voices: SpeechSynthesisVoice[] = [];
function load() {
  if (typeof speechSynthesis === "undefined") return;
  voices = speechSynthesis.getVoices();
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  load();
  speechSynthesis.onvoiceschanged = load;
}
export function selectNaturalVoice(available: SpeechSynthesisVoice[], g: Gender) {
  const natural = available.filter((v) => /google|natural|enhanced|premium|neural|online/i.test(v.name) && /^en/i.test(v.lang));
  const google = natural.filter((v) => /google/i.test(v.name));
  const pref = g === "male" ? /male|uk english male/i : /female|us english/i;
  return google.find((v) => (g === "male" ? /male/i.test(v.name) && !/female/i.test(v.name) : pref.test(v.name)))
    ?? google[0] ?? natural.find((v) => pref.test(v.name)) ?? natural[0] ?? null;
}
export function say(text: string, g: Gender, muted = false) {
  if (muted || typeof speechSynthesis === "undefined") return;
  load();
  const v = selectNaturalVoice(voices, g);
  // Google voices depend on the device. Do not substitute a robotic voice if none is available.
  if (!v) return;
  const u = new SpeechSynthesisUtterance(text);
  if (v) u.voice = v;
  u.pitch = 1;
  u.rate = 1;
  speechSynthesis.speak(u);
}
export const LINES = {
  warmMe: ["Hey! How's your day going?", "Looking sharp today!", "How far! Good to see you."],
  warmThem: ["All good, thanks! See you around.", "You too! Enjoy the city.", "I dey alright. Thanks for asking!", "Nice one! I love this city."],
  coldThem: ["Sorry, I'm in a hurry.", "Not now, please.", "Abeg, give me a minute."],
  clapMe: ["Could you move? You're blocking the whole street.", "Your attitude needs a wardrobe change.", "Abeg, don't start with me."],
  clapThem: ["Who asked you? Mind your business!", "Seriously? Take a walk.", "You must be joking. Keep moving.", "Abeg, leave me alone!"],
  flirtMe: ["You've got a really great smile.", "Can I take you out sometime?", "Your vibe is something else. Dinner later?"],
  flirtYes: ["You're making me blush!", "Maybe. I like your confidence.", "Okay, I like your vibe too."],
  flirtNo: ["No thanks, not interested.", "Not today, sorry.", "I'm already seeing someone."],
  pushThem: ["Hey! What the hell?!", "Watch it!", "Abeg! What did I do to you?"],
  crash: ["What the hell! Watch the paint!", "Damn! Look where you're going!", "Abeg, you wan wreck my ride?"],
  partner: ["Love you! Let's go home soon.", "I'm happy we found each other.", "You mean everything to me."],
};
export const pickLine = (a: string[]) => a[Math.floor(Math.random() * a.length)] ?? "";

export function speakSubtitle(name: string, text: string, gender: Gender, muted: boolean, notify: (text: string) => void) {
  notify(`${name}: “${text}”`);
  say(text, gender, muted);
}
