import Phaser from 'phaser';
import { GROUND_MAX_Y, GROUND_MIN_Y } from '../config';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';

// Obergrenzen (Tablet-Leistung und Übersicht). Zu viele Blumen: die ältesten verschwinden.
const MAX_FLOWERS = 30;
const MAX_CAKES = 5;
const FLOWER_COLORS = 4;
// Neue Blumen wachsen nicht direkt auf anderen.
const FLOWER_SPACING = 38;

interface Flower {
  img: Phaser.GameObjects.Image;
  color: number;
}

/**
 * Was auf der Wiese wächst und gebaut wird: gegossene Blumen und Sandkuchen.
 * Wird als Weltzustand „garden“ mitgespeichert.
 */
export class Garden {
  private flowers: Flower[] = [];
  private cakes: Phaser.GameObjects.Image[] = [];

  constructor(private readonly scene: PlaygroundScene) {
    scene.registerWorldState('garden', {
      save: () => ({
        flowers: this.flowers.map((f) => [Math.round(f.img.x), Math.round(f.img.y), f.color]),
        cakes: this.cakes.map((c) => [Math.round(c.x), Math.round(c.y)]),
      }),
      load: (value) => this.load(value),
    });
  }

  get flowerCount(): number {
    return this.flowers.length;
  }

  get cakeCount(): number {
    return this.cakes.length;
  }

  /** Lässt an (x, y) eine Blume wachsen. false, wenn dort schon eine steht. */
  growFlower(x: number, y: number, color = Phaser.Math.Between(0, FLOWER_COLORS - 1), animate = true): boolean {
    y = Phaser.Math.Clamp(y, GROUND_MIN_Y, GROUND_MAX_Y);
    if (this.flowers.some((f) => Phaser.Math.Distance.Between(f.img.x, f.img.y, x, y) < FLOWER_SPACING)) return false;
    if (this.flowers.length >= MAX_FLOWERS) {
      const oldest = this.flowers.shift()!;
      this.scene.tweens.add({ targets: oldest.img, scale: 0, duration: 300, onComplete: () => oldest.img.destroy() });
    }
    const img = this.scene.add.image(x, y, `flower-${color}`).setOrigin(0.5, 1).setDepth(y - 0.5);
    if (animate) {
      img.setScale(0, 0);
      this.scene.tweens.add({ targets: img, scaleX: 1, scaleY: 1, duration: 500, ease: 'Back.easeOut' });
    }
    this.flowers.push({ img, color });
    return true;
  }

  /** Ein Sandkuchen erscheint. Sind es zu viele, zerbröselt der älteste. */
  addCake(x: number, y: number, animate = true): void {
    if (this.cakes.length >= MAX_CAKES) this.crumble(this.cakes[0]);
    const cake = this.scene.add.image(x, y, 'sandcake').setOrigin(0.5, 1).setDepth(y);
    const pad = 35;
    cake.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-pad, -pad, cake.width + 2 * pad, cake.height + 2 * pad),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    cake.setData('onTap', () => this.crumble(cake));
    if (animate) {
      cake.setScale(1.2, 0.2);
      this.scene.tweens.add({ targets: cake, scaleX: 1, scaleY: 1, duration: 350, ease: 'Back.easeOut' });
    }
    this.cakes.push(cake);
  }

  /** Sandkuchen zerbröselt. */
  crumble(cake: Phaser.GameObjects.Image): void {
    const i = this.cakes.indexOf(cake);
    if (i < 0) return;
    this.cakes.splice(i, 1);
    cake.disableInteractive();
    sandSpray(this.scene, cake.x, cake.y - 15, 14);
    this.scene.tweens.add({ targets: cake, scaleY: 0, scaleX: 1.3, alpha: 0, duration: 300, onComplete: () => cake.destroy() });
  }

  private load(value: unknown): void {
    if (typeof value !== 'object' || value === null) return;
    const v = value as { flowers?: unknown; cakes?: unknown };
    const isNums = (a: unknown, n: number): a is number[] =>
      Array.isArray(a) && a.length >= n && a.slice(0, n).every((x) => typeof x === 'number' && Number.isFinite(x));
    if (Array.isArray(v.flowers)) {
      for (const f of v.flowers.slice(-MAX_FLOWERS)) {
        if (isNums(f, 3)) this.growFlower(f[0], f[1], Phaser.Math.Clamp(Math.round(f[2]), 0, FLOWER_COLORS - 1), false);
      }
    }
    if (Array.isArray(v.cakes)) {
      for (const c of v.cakes.slice(-MAX_CAKES)) if (isNums(c, 2)) this.addCake(c[0], c[1], false);
    }
  }
}

/** Sand fliegt in kleinen Körnchen auf (Buddeln, Zerbröseln, Ausschütten). color: z. B. Erde statt Sand. */
export function sandSpray(scene: Phaser.Scene, x: number, y: number, count = 6, color = 0xe9c46a): void {
  for (let i = 0; i < count; i++) {
    const grain = scene.add.circle(x, y, Phaser.Math.Between(3, 6), color).setDepth(y + 1);
    const a = -Math.PI / 2 + Phaser.Math.FloatBetween(-1.2, 1.2);
    const r = Phaser.Math.Between(30, 90);
    scene.tweens.add({
      targets: grain,
      x: x + Math.cos(a) * r,
      y: y + Math.sin(a) * r * 0.7 + 40,
      alpha: 0,
      duration: Phaser.Math.Between(350, 600),
      ease: 'Quad.easeOut',
      onComplete: () => grain.destroy(),
    });
  }
}
