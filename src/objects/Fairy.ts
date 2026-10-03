import Phaser from 'phaser';
import { FAIRY_DEFS, type FairyId } from '../data/brew';
import { WORLD_WIDTH } from '../config';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import { sparkBurst } from './sparks';

/** Höhe, in der die Fee über ihrem Platz schwebt (px). */
const HOVER = 130;

/**
 * Eine Fee auf der Wiese (aus dem Zaubertrank): schwebt über ihrem Platz, streut Funken in ihrer Farbe,
 * Antippen = sie wirbelt und funkelt. Position = Punkt am Boden unter ihr (y bestimmt die Tiefe).
 */
export class Fairy extends Phaser.GameObjects.Sprite {
  readonly fairyId: FairyId;
  private home: { x: number; y: number };
  private t = Math.random() * 10;
  private sparkAt = 0;

  constructor(scene: PlaygroundScene, id: FairyId, x: number, y: number) {
    super(scene, x, y - HOVER, `fairy-${id}`);
    this.fairyId = id;
    this.home = { x, y };
    this.setOrigin(0.5, 1).setScale(0.8).setDepth(y);
    scene.add.existing(this);
    this.setInteractive({ useHandCursor: true });
    this.setData('onTap', () => this.twirl());
  }

  /** Platz am Boden (für Speichern). */
  restPosition(): { x: number; y: number } {
    return { x: Math.round(this.home.x), y: Math.round(this.home.y) };
  }

  /** Antippen: einmal um sich drehen, Funken, Kichern-Ton. */
  twirl(): void {
    if (this.scene.tweens.isTweening(this)) return;
    this.scene.tweens.add({ targets: this, scaleX: { from: 0.8, to: -0.8 }, duration: 260, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => this.setScale(0.8) });
    sparkBurst(this.scene, this.x, this.y - 80, FAIRY_DEFS[this.fairyId].spark, 14, this.depth + 1);
    this.scene.events.emit('sound', { kind: 'brew-fairy', x: this.x });
  }

  /** Sie verschwindet mit Glitzer (zu viele Feen). */
  vanish(): void {
    sparkBurst(this.scene, this.x, this.y - 80, FAIRY_DEFS[this.fairyId].spark, 24, this.depth + 1, 1.6);
    this.scene.tweens.add({ targets: this, alpha: 0, y: this.y - 80, duration: 600, onComplete: () => this.destroy() });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.t += delta / 1000;
    // Sanftes Schweben und Kreisen um den Platz
    this.setPosition(this.home.x + Math.sin(this.t * 0.8) * 26, this.home.y - HOVER + Math.sin(this.t * 1.7) * 12);
    this.setAngle(Math.sin(this.t * 1.3) * 5);
    this.setDepth(this.home.y);
    if (time > this.sparkAt && !this.scene.tweens.isTweening(this)) {
      this.sparkAt = time + 600 + Math.random() * 700;
      sparkBurst(this.scene, this.x + 40, this.y - 120, FAIRY_DEFS[this.fairyId].spark, 1, this.depth + 1, 0.4);
    }
  }
}

/** Platz für eine neue Fee neben einem Punkt, innerhalb der Welt. */
export function fairySpot(x: number, y: number): { x: number; y: number } {
  const dx = (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 120);
  return { x: Phaser.Math.Clamp(x + dx, 120, WORLD_WIDTH - 120), y };
}
