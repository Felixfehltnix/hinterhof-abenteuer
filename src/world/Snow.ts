import Phaser from 'phaser';
import { DEPTH_TINT, GAME_HEIGHT, GAME_WIDTH, GROUND_MAX_Y, GROUND_MIN_Y, GROUND_TOP, WORLD_WIDTH } from '../config';
import { getToyDef } from '../data/toys';
import type { Kid } from '../objects/Kid';
import type { Toy } from '../objects/toys/Toy';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import { environment } from './environment';

const COVER_GROW = 1 / 25; // pro Sekunde: in 25 s ganz weiß
const COVER_MELT = 1 / 30; // pro Sekunde: in 30 s geschmolzen
const MELT_TIME = 25; // s, bis ein Schneemann ganz zusammengesackt ist
const MIN_COVER_FOR_SNOWBALLS = 0.3;

/**
 * Schnee: Flocken fallen, die Wiese wird langsam weiß, die Kinder tragen Mützen.
 * Auf die Schneedecke tippen → Schneeball. Hört es auf zu schneien, schmilzt alles langsam.
 */
export class Snow {
  private active = false;
  private cover = 0;
  private readonly blanket: Phaser.GameObjects.Rectangle;
  private readonly flakes: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly hats = new Map<Kid, Phaser.GameObjects.Image>();
  private readonly melt = new Map<Toy, number>();

  constructor(private readonly scene: PlaygroundScene) {
    // Schneedecke über der Wiese (unter allen Objekten)
    this.blanket = scene.add
      .rectangle(0, GROUND_TOP, WORLD_WIDTH, GAME_HEIGHT - GROUND_TOP, 0xf5f9ff)
      .setOrigin(0)
      .setDepth(-984)
      .setAlpha(0);

    this.flakes = scene.add.particles(0, -20, 'snowflake', {
      x: { min: -100, max: GAME_WIDTH + 100 },
      speedY: { min: 60, max: 130 },
      speedX: { onEmit: () => Phaser.Math.Between(-25, 25) + environment.wind * 0.3 },
      lifespan: 11000,
      frequency: 45,
      quantity: 1,
      scale: { min: 0.5, max: 1.2 },
      alpha: { min: 0.7, max: 1 },
      emitting: false,
    });
    this.flakes.setDepth(DEPTH_TINT - 15).setScrollFactor(0);
  }

  get coverAmount(): number {
    return this.cover;
  }

  setCover(value: number): void {
    this.cover = Phaser.Math.Clamp(value, 0, 1);
  }

  setActive(snowing: boolean): void {
    this.active = snowing;
    if (snowing) this.flakes.start();
    else this.flakes.stop();
  }

  /** Tippen auf eine freie Stelle: Liegt genug Schnee, entsteht dort ein Schneeball. */
  onFreeTap(x: number, y: number): void {
    if (this.cover < MIN_COVER_FOR_SNOWBALLS || y < GROUND_MIN_Y - 30) return;
    const ball = this.scene.spawnToy(getToyDef('snowball'), x, Phaser.Math.Clamp(y + 30, GROUND_MIN_Y, GROUND_MAX_Y));
    if (!ball) return;
    ball.setScale(0.2);
    this.scene.tweens.add({ targets: ball, scale: 1, duration: 300, ease: 'Back.easeOut' });
  }

  update(dt: number): void {
    this.cover = Phaser.Math.Clamp(this.cover + (this.active ? COVER_GROW : -COVER_MELT) * dt, 0, 1);
    this.blanket.setAlpha(this.cover * 0.85);
    this.updateHats();
    this.updateMelting(dt);
  }

  /** Bei Schnee tragen die Kinder Mützen (in der Farbe ihres Pullis). */
  private updateHats(): void {
    const wear = this.active || this.cover > 0.2;
    const kids = new Set(this.scene.kidsOnMeadow());
    for (const [kid, hat] of this.hats) {
      if (!kids.has(kid) || !kid.active) {
        hat.destroy();
        this.hats.delete(kid);
      }
    }
    for (const kid of kids) {
      let hat = this.hats.get(kid);
      if (!hat) {
        hat = this.scene.add.image(kid.x, kid.y, 'beanie').setOrigin(0.5, 1).setTint(kid.def.shirt).setAlpha(0);
        this.hats.set(kid, hat);
      }
      // Wer schon einen Hut der Verkleidung trägt (#70), braucht keine Mütze
      const on = wear && !kid.outfit.head;
      hat.setAlpha(Phaser.Math.Clamp(hat.alpha + (on ? 0.05 : -0.05), 0, 1));
      // Mütze sitzt auf dem Kopf und folgt ihm (Sitzen, Kopf neigen, Salto)
      const s = kid.def.size * kid.scaleY;
      const top = kid.headTop();
      hat
        .setPosition(top.x, top.y)
        .setRotation(top.rotation)
        .setScale(s)
        .setFlipX(kid.flipX)
        .setVisible(kid.visible && hat.alpha > 0.01)
        .setDepth(kid.depth + 0.05);
    }
  }

  /** Ohne Schnee sacken Schneebälle und Schneemänner langsam zusammen und verschwinden. */
  private updateMelting(dt: number): void {
    const snowToys = this.scene.toysOnMeadow().filter((t) => t.def.tags?.includes('snow'));
    for (const toy of this.melt.keys()) if (!toy.active) this.melt.delete(toy);
    for (const toy of snowToys) {
      let m = this.melt.get(toy) ?? 0;
      m = this.active ? Math.max(0, m - dt / 5) : m + dt / MELT_TIME;
      this.melt.set(toy, m);
      // Nur wenn wirklich etwas geschmolzen ist (sonst würden Plopp-Animationen überschrieben)
      if (toy.isDragging || m <= 0) continue;
      toy.setScale(1 + m * 0.25, Math.max(0.15, 1 - m * 0.75)).setAlpha(m > 0.7 ? 1 - (m - 0.7) / 0.3 : 1);
      if (m >= 1) this.scene.removeToy(toy);
    }
  }
}
