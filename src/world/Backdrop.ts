import Phaser from 'phaser';
import { GAME_WIDTH, GROUND_TOP } from '../config';
import {
  BACK_TREES,
  BACK_TREE_BASE_Y,
  BACK_TREE_PARALLAX,
  BUSHES,
  HOUSES,
  HOUSE_BASE_Y,
  HOUSE_PARALLAX,
  PERGOLAS,
} from '../data/backdrop';
import { FENCE_TILE_TOP, HOUSE_SPECS, houseKey, pergolaArea, TILE_COUNT } from '../scenes/placeholders/backdrop';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import { environment, windStrength } from './environment';

// Tiefen von hinten nach vorn (Himmel −1100, Sonne −1050, Wolken −1040, Mond −1030).
const HOUSE_DEPTH = -1020;
const WINDOW_LIGHT_DEPTH = HOUSE_DEPTH + 0.5;
const ROOF_SNOW_DEPTH = HOUSE_DEPTH + 1;
const SMOKE_DEPTH = HOUSE_DEPTH + 2;
const BACK_TREE_DEPTH = -1010;
const MEADOW_DEPTH = -1002;
const FENCE_DEPTH = -1000;
const PERGOLA_DEPTH = -999.5;
const FENCE_SNOW_DEPTH = -999;
const PERGOLA_SNOW_DEPTH = -998.9;
// Büsche stehen vor dem Zaun.
const BUSH_DEPTH = -994;

/** Abends glüht der Backstein etwas wärmer. */
const WARM_BRICK = 0xffc49e;
/** So lange braucht ein Fensterlicht zum An- oder Ausgehen (ms). */
const WINDOW_FADE_MS = 300;
const WINDOW_COLORS = [0xffcf70, 0xffe0a0, 0xffb85c];

interface WindowLight {
  img: Phaser.GameObjects.Image;
  /** Ab dieser Lichter-Stärke (Abend 0,5, Nacht 1) geht es an; > 1 = bleibt dunkel. */
  threshold: number;
  /** Jedes Fenster schaltet mit eigener Verzögerung (nicht alle gleichzeitig). */
  delay: number;
  on: boolean;
  pendingSince?: number;
}

interface Swaying {
  img: Phaser.GameObjects.Image;
  phase: number;
  /** Größter Ausschlag in Grad bei normalem Wind. */
  amount: number;
}

/**
 * Hintergrund wie der echte Hinterhof (#63): Häuser (Parallaxe 0,3), Bäume hinter dem Zaun (0,6),
 * Zaun mit Pergola und Efeu, Büsche, Wiese. Alles ist vorgezeichnet (BootScene); hier bewegt sich
 * nur, was sich bewegen soll: Fensterlichter nachts, wärmerer Backstein abends, Schnee auf Dächern
 * und Zaun, Rauch aus Schornsteinen bei Schnee, Bäume und Büsche im Wind.
 */
export class Backdrop {
  private readonly houses: Phaser.GameObjects.Image[] = [];
  private readonly snowCaps: Phaser.GameObjects.Image[] = [];
  private readonly windows: WindowLight[] = [];
  private readonly swaying: Swaying[] = [];
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(private readonly scene: PlaygroundScene) {
    const flagOccluder = (img: Phaser.GameObjects.Image) => img.setData('occludesLight', true);

    // Häuser und Säulenbäume, mit Schnee- und Fensterlicht-Ebene
    HOUSES.forEach((h, index) => {
      const spec = HOUSE_SPECS[h.kind];
      const key = houseKey(h.kind);
      const scale = h.scale ?? 1;
      const place = (img: Phaser.GameObjects.Image, depth: number) =>
        img.setOrigin(0.5, 1).setScale(scale).setScrollFactor(HOUSE_PARALLAX, 1).setDepth(depth);
      const house = place(scene.add.image(h.x, HOUSE_BASE_Y, key), HOUSE_DEPTH);
      house.setData('baseTint', h.tint ?? 0xffffff).setTint(h.tint ?? 0xffffff);
      this.houses.push(flagOccluder(house));
      this.snowCaps.push(flagOccluder(place(scene.add.image(h.x, HOUSE_BASE_Y, `${key}-snow`), ROOF_SNOW_DEPTH).setAlpha(0)));

      const left = h.x - (spec.width / 2) * scale;
      const top = HOUSE_BASE_Y - spec.height * scale;
      spec.windows.forEach((w, i) => {
        const seed = hash(index * 31 + i);
        const img = scene.add
          .image(left + w.x * scale, top + w.y * scale, 'window-glow')
          .setOrigin(0)
          .setDisplaySize(w.w * scale, w.h * scale)
          .setScrollFactor(HOUSE_PARALLAX, 1)
          .setTint(WINDOW_COLORS[i % WINDOW_COLORS.length])
          .setAlpha(0)
          .setVisible(false);
        // Etwa die Hälfte der Fenster wird hell, manche schon abends
        const lit = seed < 0.6;
        this.windows.push({ img, threshold: lit ? 0.35 + hash(seed * 1000) * 0.6 : 2, delay: hash(seed * 7919) * 5000, on: false });
      });

      const c = spec.chimneys[0];
      if (h.smoke && c) {
        const smoke = scene.add.particles(left + c.x * scale, top + c.y * scale, 'smoke', {
          speedY: { min: -40, max: -26 },
          speedX: { onEmit: () => Phaser.Math.Between(-4, 6) + environment.wind * 0.04 },
          scale: { start: 0.4, end: 1.3 },
          alpha: { start: 0.55, end: 0 },
          lifespan: 4200,
          frequency: 380,
          emitting: false,
        });
        smoke.setScrollFactor(HOUSE_PARALLAX, 1).setDepth(SMOKE_DEPTH);
        this.smoke.push(smoke);
      }
    });
    scene.lightLayer.add({
      objects: this.windows.map((w) => w.img),
      depth: () => WINDOW_LIGHT_DEPTH,
      active: () => this.windows.some((w) => w.img.visible),
    });

    // Bäume hinter dem Zaun
    BACK_TREES.forEach((t, i) => {
      const img = scene.add
        .image(t.x, BACK_TREE_BASE_Y, `bg-${t.kind}`)
        .setOrigin(0.5, 1)
        .setScale(t.scale ?? 1)
        .setScrollFactor(BACK_TREE_PARALLAX, 1)
        .setDepth(BACK_TREE_DEPTH);
      this.swaying.push({ img: flagOccluder(img), phase: i * 1.3, amount: t.kind === 'fir' ? 0.8 : 1.4 });
    });

    // Zaun (mit Pergola, Efeu, Bodendeckern) und Wiese in Kacheln von Bildschirmbreite
    for (let i = 0; i < TILE_COUNT; i++) {
      const x = i * GAME_WIDTH;
      scene.add.image(x, GROUND_TOP, `meadow-${i}`).setOrigin(0).setDepth(MEADOW_DEPTH);
      scene.add.image(x, FENCE_TILE_TOP, `fence-${i}`).setOrigin(0).setDepth(FENCE_DEPTH);
      this.snowCaps.push(scene.add.image(x, FENCE_TILE_TOP, `fence-snow-${i}`).setOrigin(0).setDepth(FENCE_SNOW_DEPTH).setAlpha(0));
    }

    // Pergola-Balken (eigene Bilder, damit die Zaun-Kacheln flach bleiben)
    PERGOLAS.forEach((_, i) => {
      const area = pergolaArea(i);
      scene.add.image(area.x, area.y, `pergola-${i}`).setOrigin(0).setDepth(PERGOLA_DEPTH);
      this.snowCaps.push(scene.add.image(area.x, area.y, `pergola-snow-${i}`).setOrigin(0).setDepth(PERGOLA_SNOW_DEPTH).setAlpha(0));
    });

    // Hecken und Büsche vor dem Zaun
    BUSHES.forEach((b, i) => {
      const img = scene.add
        .image(b.x, GROUND_TOP + 14, `bush-${b.kind}`)
        .setOrigin(0.5, 1)
        .setScale(b.scale ?? 1)
        .setDepth(BUSH_DEPTH);
      this.swaying.push({ img, phase: i * 0.9, amount: 2.2 });
    });

    scene.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, delta: number) => this.update(delta));
  }

  private update(delta: number): void {
    const now = this.scene.time.now;
    const day = this.scene.dayCycle;
    const weather = this.scene.weather;
    if (!day || !weather) return;

    // Abends glüht der Backstein wärmer
    const glow = day.brickGlow;
    for (const h of this.houses) h.setTint(glow > 0.01 ? mixColor(h.getData('baseTint') as number, WARM_BRICK, glow) : (h.getData('baseTint') as number));

    // Fensterlichter: gehen einzeln und mit Verzögerung an und aus
    const lights = day.lightsAmount;
    for (const w of this.windows) {
      const want = lights >= w.threshold;
      if (want !== w.on) {
        w.pendingSince ??= now;
        if (now - w.pendingSince >= (want ? w.delay : w.delay * 0.4)) {
          w.on = want;
          w.pendingSince = undefined;
        }
      } else w.pendingSince = undefined;
      const alpha = Phaser.Math.Clamp(w.img.alpha + ((w.on ? 1 : -1) * delta) / WINDOW_FADE_MS, 0, 1);
      w.img.setAlpha(alpha).setVisible(alpha > 0);
    }

    // Schnee auf Dächern und Zaun wächst und schmilzt mit der Schneedecke
    const cover = Math.min(1, weather.snow.coverAmount * 1.3);
    for (const s of this.snowCaps) s.setAlpha(cover).setVisible(cover > 0.01);
    const snowing = environment.weather === 'snow';
    for (const s of this.smoke) {
      if (snowing && !s.emitting) s.start();
      else if (!snowing && s.emitting) s.stop();
    }

    // Bäume und Büsche wiegen sich im Wind (um den Fuß)
    const wind = Math.min(1.6, windStrength());
    for (const s of this.swaying) {
      const target = wind > 0.01 ? s.amount * wind * (0.6 + Math.sin(now / 600 + s.phase)) : 0;
      s.img.angle += (target - s.img.angle) * 0.05;
    }
  }
}

/** Gleichmäßig verteilte Pseudo-Zufallszahl 0..1 aus einer Zahl (immer gleich). */
function hash(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function mixColor(a: number, b: number, t: number): number {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.ValueToColor(a),
    Phaser.Display.Color.ValueToColor(b),
    100,
    t * 100,
  );
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}
