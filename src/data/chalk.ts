// Steinterrasse hinter dem grauen Gartentor und das Kreide-Malspiel (Straßenmalkreide).

import { GROUND_TOP } from '../config';

/** Tor zur Steinterrasse im Zaun (Weltkoordinaten, Fußpunkt auf der Zaunlinie), zwischen Sandkasten und Felix' Garten. */
export const TERRACE_GATE = { x: 4085, y: GROUND_TOP + 4 };

/** Kreidefarben in der Schachtel (von links nach rechts); 'rainbow' wechselt beim Malen die Farbe. */
export const CHALK_COLORS = [0xffffff, 0xffe066, 0xffa94d, 0xff6b6b, 0xf783ac, 0xb197fc, 0x74c0fc, 0x8ce99a, 'rainbow'] as const;
export type ChalkColor = (typeof CHALK_COLORS)[number];

export const CHALK = {
  /** Strichbreite (px, Durchmesser des Kreidetupfers). */
  brush: 30,
  /** Abstand der Tupfer entlang des Strichs (px). */
  spacing: 5,
  /** Regenbogenkreide: Farbton-Änderung je px Strich. */
  rainbowPerPx: 0.0016,
  /** Der Schwamm wischt in diesem Umkreis (px). */
  sponge: 75,
  /** Gespeichert wird als WebP (kleiner als PNG), diese Qualität. */
  quality: 0.85,
};
