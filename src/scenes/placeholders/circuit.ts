import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { CIRCUIT } from '../../data/circuit';

// Strom-Werkstatt: Lochplatte, Batterie, Lampe (aus/an, mit Gesicht), Kippschalter (aus/an),
// Pflaster (Schalter klemmt), Logikgatter (UND blau, ODER orange, NICHT lila – mit Bildzeichen statt
// Text), gestrichelter Gatter-Platz, Ablage, Holzschild zurück. Ohne Text.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const BATTERY_SIZE = { width: 170, height: 250 };
export const LAMP_SIZE = { width: 230, height: 300 };
export const SWITCH_SIZE = { width: 200, height: 120 };
export const GATE_SIZE = { width: 230, height: 170 };
export const BANDAID_SIZE = { width: 110, height: 44 };
export const GLOW_SIZE = 256;
export const TRAY_SIZE = { width: 1000, height: 170 };

/** Lochplatte (Hartfaser) mit Holzrahmen. */
export function drawBoard(g: G): void {
  g.fillStyle(0x8a5a2b);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  g.fillStyle(0xd2a679);
  g.fillRect(24, 24, GAME_WIDTH - 48, GAME_HEIGHT - 48);
  g.fillStyle(0xc49567, 0.6);
  for (let y = 40; y < GAME_HEIGHT - 40; y += 7) g.fillRect(24, y, GAME_WIDTH - 48, 1);
  g.fillStyle(0x6b4423);
  const h = CIRCUIT.hole;
  for (let y = 24 + h / 2; y < GAME_HEIGHT - 24; y += h) {
    for (let x = 24 + h / 2; x < GAME_WIDTH - 24; x += h) g.fillCircle(x, y, 5);
  }
}

/** Dicke Batterie (steht), Pluspol oben rechts mit Blitz. */
export function drawBattery(g: G): void {
  const { width: w, height: h } = BATTERY_SIZE;
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(14, 30, w - 20, h - 30, 24);
  g.fillStyle(0x2b2d42);
  g.fillRoundedRect(6, 22, w - 24, h - 28, 22);
  g.fillStyle(0xf4a261);
  g.fillRoundedRect(6, 22, w - 24, (h - 28) * 0.42, { tl: 22, tr: 22, bl: 0, br: 0 });
  g.fillStyle(0xadb5bd);
  g.fillRoundedRect(w / 2 - 34, 6, 44, 22, 6);
  // Blitz
  g.fillStyle(0xffd60a);
  const cx = w / 2 - 12;
  const cy = h / 2 + 30;
  g.fillPoints([v(cx + 10, cy - 50), v(cx - 22, cy + 6), v(cx - 2, cy + 6), v(cx - 12, cy + 50), v(cx + 22, cy - 10), v(cx + 2, cy - 10)], true);
  // Glanz
  g.fillStyle(0xffffff, 0.18);
  g.fillRoundedRect(18, 34, 16, h - 60, 8);
}

/** Glühbirne mit Gesicht und Fassung. on: leuchtet gelb und lacht, sonst schläft sie. */
export function drawLamp(g: G, on: boolean): void {
  const { width: w } = LAMP_SIZE;
  const cx = w / 2;
  // Glas
  g.fillStyle(on ? 0xffe066 : 0xdee2e6);
  g.fillCircle(cx, 100, 92);
  g.fillPoints([v(cx - 62, 160), v(cx + 62, 160), v(cx + 46, 210), v(cx - 46, 210)], true);
  g.fillStyle(0xffffff, on ? 0.55 : 0.6);
  g.fillEllipse(cx - 40, 58, 30, 50);
  // Fassung
  g.fillStyle(0x868e96);
  for (let i = 0; i < 4; i++) g.fillRoundedRect(cx - 50, 208 + i * 18, 100, 16, 6);
  g.fillStyle(0x495057);
  g.fillRoundedRect(cx - 26, 280, 52, 18, 8);
  // Gesicht
  g.lineStyle(6, 0x343a40);
  if (on) {
    g.fillStyle(0x343a40);
    g.fillCircle(cx - 30, 92, 9);
    g.fillCircle(cx + 30, 92, 9);
    g.beginPath();
    g.arc(cx, 112, 34, 0.25, Math.PI - 0.25, false);
    g.strokePath();
    g.fillStyle(0xff8fab, 0.7);
    g.fillCircle(cx - 52, 118, 11);
    g.fillCircle(cx + 52, 118, 11);
  } else {
    g.beginPath();
    g.arc(cx - 30, 92, 11, 0.2, Math.PI - 0.2, false);
    g.strokePath();
    g.beginPath();
    g.arc(cx + 30, 92, 11, 0.2, Math.PI - 0.2, false);
    g.strokePath();
    g.lineBetween(cx - 12, 128, cx + 12, 128);
  }
}

/** Weicher Lichtschein der Lampe (wird gelb eingefärbt). */
export function drawGlow(g: G): void {
  const c = GLOW_SIZE / 2;
  for (let r = c; r > 0; r -= 4) {
    g.fillStyle(0xffffff, 0.05);
    g.fillCircle(c, c, r);
  }
}

/** Kippschalter auf einer Platte; on: Hebel rechts, grüner Punkt; aus: links, roter Punkt. */
export function drawSwitch(g: G, on: boolean): void {
  const { width: w, height: h } = SWITCH_SIZE;
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(8, 14, w - 10, h - 14, 18);
  g.fillStyle(0xf8f9fa);
  g.fillRoundedRect(2, 6, w - 10, h - 14, 18);
  g.fillStyle(0xced4da);
  g.fillRoundedRect(w / 2 - 50, h / 2 - 8, 92, 30, 15);
  // Hebel
  const base = v(w / 2 - 4, h / 2 + 8);
  const tip = v(base.x + (on ? 52 : -52), base.y - 46);
  g.lineStyle(16, 0x495057);
  g.lineBetween(base.x, base.y, tip.x, tip.y);
  g.fillStyle(on ? 0x2b9348 : 0xd62828);
  g.fillCircle(tip.x, tip.y, 18);
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(tip.x - 5, tip.y - 5, 5);
  // Lämpchen: an grün, aus rot
  g.fillStyle(on ? 0x52b788 : 0xe5383b);
  g.fillCircle(w - 30, 26, 8);
}

/** Pflaster quer über einem Schalter: der klemmt. */
export function drawBandaid(g: G): void {
  const { width: w, height: h } = BANDAID_SIZE;
  g.fillStyle(0xf1c27d);
  g.fillRoundedRect(0, 0, w, h, h / 2);
  g.fillStyle(0xe0a96d);
  g.fillRoundedRect(w / 2 - 22, 4, 44, h - 8, 8);
  g.fillStyle(0xc68642);
  for (const [x, y] of [[w / 2 - 12, 14], [w / 2, 14], [w / 2 + 12, 14], [w / 2 - 12, 28], [w / 2, 28], [w / 2 + 12, 28]]) g.fillCircle(x, y, 2);
}

/** Körper eines Logikgatters in der gewohnten Form (Eingänge links, Ausgang rechts). */
function gateBody(g: G, kind: 'and' | 'or' | 'not', fill: number, alpha = 1): void {
  const { width: w, height: h } = GATE_SIZE;
  const cy = h / 2;
  g.fillStyle(fill, alpha);
  if (kind === 'and') {
    g.fillRect(30, 20, 80, h - 40);
    g.fillCircle(110, cy, cy - 20);
  } else if (kind === 'or') {
    const pts: Phaser.Math.Vector2[] = [];
    for (let t = 0; t <= 1; t += 0.05) pts.push(v(24 + 150 * t + 40 * t * t, 20 + (cy - 20) * t * t)); // oben
    pts.push(v(w - 18, cy));
    for (let t = 1; t >= 0; t -= 0.05) pts.push(v(24 + 150 * t + 40 * t * t, h - 20 - (cy - 20) * t * t)); // unten
    for (let t = 1; t >= 0; t -= 0.1) pts.push(v(24 + Math.sin(Math.PI * t) * 28, h - 20 - (h - 40) * (1 - t))); // hinten gewölbt
    g.fillPoints(pts, true);
  } else {
    g.fillTriangle(34, 22, 34, h - 22, w - 52, cy);
    g.fillCircle(w - 40, cy, 15);
  }
}

/** Logikgatter mit Bildzeichen: UND = zwei volle Punkte, ODER = ein voller, ein leerer, NICHT = Umkehrpfeil. */
export function drawGate(g: G, kind: 'and' | 'or' | 'not'): void {
  const { height: h } = GATE_SIZE;
  const cy = h / 2;
  const color = { and: 0x3a86ff, or: 0xfb8500, not: 0x9b5de5 }[kind];
  g.save();
  g.translateCanvas(5, 7);
  gateBody(g, kind, 0x000000, 0.2);
  g.restore();
  gateBody(g, kind, color);
  // Kontaktbeinchen
  g.fillStyle(0xadb5bd);
  if (kind === 'not') g.fillRect(0, cy - 5, 36, 10);
  else {
    g.fillRect(0, cy - 51, 34, 10);
    g.fillRect(0, cy + 41, 34, 10);
  }
  g.fillRect(GATE_SIZE.width - 30, cy - 5, 30, 10);
  // Bildzeichen
  const ix = kind === 'not' ? 84 : 92;
  g.fillStyle(0xffffff);
  g.lineStyle(5, 0xffffff);
  if (kind === 'and') {
    g.fillCircle(ix - 16, cy, 14);
    g.fillCircle(ix + 20, cy, 14);
  } else if (kind === 'or') {
    g.fillCircle(ix - 12, cy, 14);
    g.strokeCircle(ix + 24, cy, 12);
  } else {
    g.beginPath();
    g.arc(ix, cy, 20, -Math.PI * 0.8, Math.PI * 0.6, false);
    g.strokePath();
    g.fillTriangle(ix - 26, cy - 2, ix - 6, cy - 2, ix - 16, cy - 20);
  }
}

/** Gestrichelter Platz, auf den ein Gatter gehört (Umriss eines Gatters, blass). */
export function drawSlot(g: G, inputs: 1 | 2): void {
  const { width: w, height: h } = GATE_SIZE;
  g.lineStyle(5, 0xffffff, 0.85);
  const dash = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    for (let d = 0; d < len; d += 22) {
      const a = d / len;
      const b = Math.min(1, (d + 12) / len);
      g.lineBetween(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b);
    }
  };
  dash(26, 14, w - 26, 14);
  dash(w - 26, 14, w - 26, h - 14);
  dash(w - 26, h - 14, 26, h - 14);
  dash(26, h - 14, 26, 14);
  g.fillStyle(0xffffff, 0.25);
  g.fillRoundedRect(28, 16, w - 56, h - 32, 10);
  g.fillStyle(0xadb5bd);
  if (inputs === 1) g.fillRect(0, h / 2 - 5, 30, 10);
  else {
    g.fillRect(0, h / 2 - 51, 30, 10);
    g.fillRect(0, h / 2 + 41, 30, 10);
  }
  g.fillRect(w - 28, h / 2 - 5, 28, 10);
}

/** Ablage unten (Holzkiste, vorn offen). */
export function drawTray(g: G): void {
  const { width: w, height: h } = TRAY_SIZE;
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(10, 14, w - 10, h - 14, 20);
  g.fillStyle(0x9c6644);
  g.fillRoundedRect(0, 0, w - 10, h - 14, 20);
  g.fillStyle(0xb08968);
  g.fillRoundedRect(14, 14, w - 38, h - 42, 14);
}

/** Holzschild mit gemaltem Pfeil nach links (zurück auf die Wiese). */
export function drawCircuitSign(g: G): void {
  const { w, h } = CIRCUIT.exit;
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(8, 10, w, h, 14);
  g.fillStyle(0x7a5536);
  g.fillRoundedRect(4, 6, w, h, 14);
  g.fillStyle(0xb07f47);
  g.fillRoundedRect(0, 0, w, h, 14);
  g.lineStyle(2, 0x8a5a2b, 0.7);
  for (let y = 22; y < h - 10; y += 22) g.lineBetween(12, y, w - 12, y);
  g.fillStyle(0x2d6a4f);
  const cy = h / 2;
  g.fillPoints([v(26, cy), v(86, cy - 38), v(86, cy - 16), v(w - 26, cy - 16), v(w - 26, cy + 16), v(86, cy + 16), v(86, cy + 38)], true);
}
