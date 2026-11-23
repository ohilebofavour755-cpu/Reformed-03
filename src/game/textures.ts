import * as THREE from "three";
function canvas(w: number, h: number) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
}
const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
export function groundTexture() {
  const [c, g] = canvas(256, 256); // one tile = one block (32 units), tile edges are road centres
  g.fillStyle = "#3a3b3f"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  g.fillStyle = "#c2b9aa"; g.fillRect(40, 40, 176, 176);
  g.strokeStyle = "#a89f90"; g.lineWidth = 1;
  for (let i = 40; i <= 216; i += 12) { g.beginPath(); g.moveTo(i, 40); g.lineTo(i, 216); g.moveTo(40, i); g.lineTo(216, i); g.stroke(); }
  g.fillStyle = "#9c9486"; g.fillRect(52, 52, 152, 152);
  g.fillStyle = "#e8cf6a";
  for (let i = 4; i < 256; i += 26) { g.fillRect(i, 0, 13, 2); g.fillRect(i, 254, 13, 2); g.fillRect(0, i, 2, 13); g.fillRect(254, i, 2, 13); }
  g.fillStyle = "#e9e6df";
  for (let k = 0; k < 6; k++) { g.fillRect(60 + k * 22, 220, 10, 30); g.fillRect(220, 60 + k * 22, 30, 10); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function facadeTextures() {
  const [c, g] = canvas(128, 256), [e, ge] = canvas(128, 256);
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 256);
  ge.fillStyle = "#000"; ge.fillRect(0, 0, 128, 256);
  for (let r = 0; r < 10; r++) for (let k = 0; k < 4; k++) {
    const x = 10 + k * 29, y = 12 + r * 24;
    g.fillStyle = "#33404c"; g.fillRect(x, y, 20, 15);
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x, y, 20, 3);
    if (Math.random() < 0.45) { ge.fillStyle = Math.random() < 0.7 ? "#ffd58a" : "#bfe3ff"; ge.fillRect(x, y, 20, 15); }
  }
  g.fillStyle = "rgba(0,0,0,0.08)"; for (let r = 0; r < 10; r++) g.fillRect(0, 30 + r * 24, 128, 3);
  return { map: tex(c), emissive: tex(e) };
}
export function signTexture(text: string, bg: string, fg: string) {
  const [c, g] = canvas(512, 128);
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg; g.font = "800 58px 'Bricolage Grotesque', system-ui, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, 68, 480);
  return tex(c);
}
