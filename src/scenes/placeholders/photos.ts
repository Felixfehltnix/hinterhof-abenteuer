import type Phaser from 'phaser';
import { PHOTO_LINE } from '../../data/photos';

// Fotoleine (Schnur mit Haken an beiden Enden, hängt leicht durch) und Wäscheklammer aus Holz.

type G = Phaser.GameObjects.Graphics;

export const PHOTO_LINE_SIZE = { width: PHOTO_LINE.right - PHOTO_LINE.left + 20, height: PHOTO_LINE.sag + 30 };
export const PHOTO_PEG_SIZE = { width: 16, height: 30 };

/** Schnur von Haken zu Haken (Textur beginnt 10 px links vom Leinenanfang, 12 px darüber). */
export function drawPhotoLine(g: G): void {
  const { width: w } = PHOTO_LINE_SIZE;
  const top = 12;
  g.lineStyle(3, 0xf1e3c8);
  g.beginPath();
  g.moveTo(10, top);
  for (let x = 10; x <= w - 10; x += 6) {
    const t = (x - 10) / (w - 20);
    g.lineTo(x, top + Math.sin(Math.PI * t) * PHOTO_LINE.sag);
  }
  g.strokePath();
  // Haken
  g.fillStyle(0x6c757d);
  g.fillCircle(10, top, 6);
  g.fillCircle(w - 10, top, 6);
}

/** Holzklammer (Unterkante = Rand des Fotos). */
export function drawPhotoPeg(g: G): void {
  const { width: w, height: h } = PHOTO_PEG_SIZE;
  g.fillStyle(0xd4a373);
  g.fillRoundedRect(0, 0, w, h, 4);
  g.fillStyle(0xb07f47);
  g.fillRect(w / 2 - 1, 2, 2, h - 4);
  g.fillStyle(0xadb5bd);
  g.fillRect(1, h * 0.35, w - 2, 4);
}
