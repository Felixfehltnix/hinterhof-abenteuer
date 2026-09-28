import Phaser from 'phaser';
import { DEPTH_LIGHTS, DEPTH_SKY_LIGHTS, DEPTH_TINT, GAME_HEIGHT, GAME_WIDTH, GROUND_TOP, WORLD_WIDTH } from '../config';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import { environment, type TimeOfDay } from './environment';

const ORDER: TimeOfDay[] = ['morning', 'noon', 'evening', 'night'];
const TRANSITION_MS = 2000;
/** Wolken bewegen sich beim Scrollen mit diesem Anteil mit (0 = fest, 1 = wie die Wiese). */
export const CLOUD_PARALLAX = 0.2;

/** Wie die Welt zu einer Tageszeit aussieht. Zwischen zwei Looks wird weich überblendet. */
interface Look {
  skyTop: number;
  skyBottom: number;
  /** Einfärbung aller Objekte (Multiplizieren; weiß = unverändert). */
  tint: number;
  sunX: number;
  sunY: number;
  sunColor: number;
  sunAlpha: number;
  moonAlpha: number;
  starsAlpha: number;
  dewAlpha: number;
  lightsAlpha: number;
  cloudTint: number;
}

const LOOKS: Record<TimeOfDay, Look> = {
  morning: {
    skyTop: 0xffa8a8,
    skyBottom: 0xffe0b0,
    tint: 0xfff0e4,
    sunX: 560,
    sunY: 410,
    sunColor: 0xffb347,
    sunAlpha: 1,
    moonAlpha: 0,
    starsAlpha: 0,
    dewAlpha: 1,
    lightsAlpha: 0,
    cloudTint: 0xffe0ea,
  },
  noon: {
    skyTop: 0x7ec8ff,
    skyBottom: 0xd6f0ff,
    tint: 0xffffff,
    sunX: 1720,
    sunY: 140,
    sunColor: 0xffe066,
    sunAlpha: 1,
    moonAlpha: 0,
    starsAlpha: 0,
    dewAlpha: 0,
    lightsAlpha: 0,
    cloudTint: 0xffffff,
  },
  evening: {
    skyTop: 0x8e6bbf,
    skyBottom: 0xffa060,
    tint: 0xffdcb8,
    sunX: 1450,
    sunY: 440,
    sunColor: 0xff7b39,
    sunAlpha: 1,
    moonAlpha: 0.25,
    starsAlpha: 0.2,
    dewAlpha: 0,
    lightsAlpha: 0.5,
    cloudTint: 0xffc2b0,
  },
  night: {
    skyTop: 0x1e2d5c,
    skyBottom: 0x46609e,
    // Deutlich abgedunkelt, aber hell genug, dass man die Kinder gut erkennt – nicht gruselig.
    tint: 0x8890d0,
    sunX: 1450,
    sunY: 640,
    sunColor: 0xff7b39,
    sunAlpha: 0,
    moonAlpha: 1,
    starsAlpha: 1,
    dewAlpha: 0,
    lightsAlpha: 1,
    cloudTint: 0x9ca8d8,
  },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpColor = (a: number, b: number, t: number) => {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.ValueToColor(a),
    Phaser.Display.Color.ValueToColor(b),
    100,
    t * 100,
  );
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

function mix(a: Look, b: Look, t: number): Look {
  return {
    skyTop: lerpColor(a.skyTop, b.skyTop, t),
    skyBottom: lerpColor(a.skyBottom, b.skyBottom, t),
    tint: lerpColor(a.tint, b.tint, t),
    sunX: lerp(a.sunX, b.sunX, t),
    sunY: lerp(a.sunY, b.sunY, t),
    sunColor: lerpColor(a.sunColor, b.sunColor, t),
    sunAlpha: lerp(a.sunAlpha, b.sunAlpha, t),
    moonAlpha: lerp(a.moonAlpha, b.moonAlpha, t),
    starsAlpha: lerp(a.starsAlpha, b.starsAlpha, t),
    dewAlpha: lerp(a.dewAlpha, b.dewAlpha, t),
    lightsAlpha: lerp(a.lightsAlpha, b.lightsAlpha, t),
    cloudTint: lerpColor(a.cloudTint, b.cloudTint, t),
  };
}

/**
 * Tageszeiten: Sonne bzw. Mond antippen → nächste Tageszeit, weich über 2 s.
 * Zuständig für Himmel, Sonne, Mond, Sterne, Wolken, Tau, Lichterkette und die
 * gemeinsame Einfärbung aller Objekte (damit auch echte Sprites automatisch passen).
 */
export class DayCycle {
  readonly clouds: Phaser.GameObjects.Image[] = [];
  private readonly sky: Phaser.GameObjects.Graphics;
  private readonly sun: Phaser.GameObjects.Image;
  private readonly moon: Phaser.GameObjects.Image;
  private readonly stars: Phaser.GameObjects.Image[] = [];
  private readonly dew: Phaser.GameObjects.Image[] = [];
  private readonly bulbs: Phaser.GameObjects.Image[] = [];
  private readonly wire: Phaser.GameObjects.Graphics;
  private readonly tint: Phaser.GameObjects.Rectangle;

  private target: TimeOfDay = 'noon';
  private from: Look = LOOKS.noon;
  private current: Look = LOOKS.noon;
  private progress = { t: 1 };
  private weatherGrey = 0;
  private nextYawn = 0;

  constructor(private readonly scene: PlaygroundScene) {
    // Himmel, Sonne, Mond, Sterne und Einfärbung stehen fest; Tau und Lichterkette gehören zur Welt.
    this.sky = scene.add.graphics().setDepth(-1100).setScrollFactor(0);

    // Sterne (nachts) und Mond leuchten über der Einfärbung
    for (let i = 0; i < 45; i++) {
      const x = (i * 331 + 70) % GAME_WIDTH;
      const y = 30 + ((i * 97) % 420);
      this.stars.push(scene.add.image(x, y, 'twinkle').setDepth(DEPTH_SKY_LIGHTS).setScale(0.5 + (i % 3) * 0.25).setScrollFactor(0));
    }
    this.moon = scene.add.image(1560, 170, 'moon').setDepth(DEPTH_SKY_LIGHTS).setScrollFactor(0);
    this.sun = scene.add.image(1720, 140, 'sun').setDepth(-1050).setScrollFactor(0);
    for (const body of [this.sun, this.moon]) {
      body.setInteractive({ hitArea: new Phaser.Geom.Circle(body.width / 2, body.height / 2, 130), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
      body.setData('onTap', () => this.next());
    }

    for (const [x, y] of [
      [340, 170],
      [960, 130],
      [1400, 240],
    ]) {
      // Wolken ziehen beim Scrollen nur leicht mit (Tiefenwirkung)
      this.clouds.push(scene.add.image(x, y, 'cloud').setDepth(-1040).setScrollFactor(CLOUD_PARALLAX, 0));
    }

    // Tau glitzert morgens auf der Wiese
    for (let i = 0; i < 36 * 3; i++) {
      const x = (i * 263 + 90) % WORLD_WIDTH;
      const y = GROUND_TOP + 40 + ((i * 71) % (GAME_HEIGHT - GROUND_TOP - 60));
      this.dew.push(scene.add.image(x, y, 'twinkle').setDepth(-990).setScale(0.45));
    }

    // Lichterkette am Zaun
    this.wire = scene.add.graphics().setDepth(-995);
    const colors = [0xff5d8f, 0xffd166, 0x06d6a0, 0x4cc9f0, 0xc77dff];
    const top = GROUND_TOP - 112;
    const points: Phaser.Math.Vector2[] = [];
    for (let x = 20; x <= WORLD_WIDTH - 20; x += 16) {
      const seg = ((x - 20) % 160) / 160; // durchhängend zwischen den Aufhängungen
      points.push(new Phaser.Math.Vector2(x, top + Math.sin(seg * Math.PI) * 26));
    }
    this.wire.lineStyle(3, 0x2b2d42, 1);
    this.wire.strokePoints(points);
    for (let i = 0; i < 24 * 3; i++) {
      const p = points[Math.min(points.length - 1, 5 + i * 5)];
      this.bulbs.push(
        scene.add
          .image(p.x, p.y + 10, 'bulb')
          .setTint(colors[i % colors.length])
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(DEPTH_LIGHTS),
      );
    }

    this.tint = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff)
      .setOrigin(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(DEPTH_TINT)
      .setScrollFactor(0);

    scene.registerWorldState('timeOfDay', {
      save: () => this.target,
      load: (v) => {
        if (typeof v === 'string' && (ORDER as string[]).includes(v)) this.jumpTo(v as TimeOfDay);
      },
    });
    scene.events.on(Phaser.Scenes.Events.UPDATE, () => this.update());
    this.apply(this.current);
  }

  get timeOfDay(): TimeOfDay {
    return this.target;
  }

  /** Nächste Tageszeit mit weichem Übergang (auch mitten in einem Übergang). */
  next(): void {
    this.from = this.current;
    this.target = ORDER[(ORDER.indexOf(this.target) + 1) % ORDER.length];
    environment.timeOfDay = this.target;
    this.scene.tweens.killTweensOf(this.progress);
    this.progress.t = 0;
    this.scene.tweens.add({ targets: this.progress, t: 1, duration: TRANSITION_MS, ease: 'Sine.easeInOut' });
    this.scene.events.emit('sound', { kind: 'daytime', x: this.sun.x });
  }

  /** Sofort auf eine Tageszeit springen (z. B. beim Laden). */
  jumpTo(time: TimeOfDay): void {
    this.scene.tweens.killTweensOf(this.progress);
    this.target = time;
    environment.timeOfDay = time;
    this.from = LOOKS[time];
    this.progress.t = 1;
  }

  /** Wetter macht den Himmel grauer und die Welt etwas dunkler (0 = gar nicht, 1 = stark). */
  setWeatherGrey(amount: number): void {
    this.weatherGrey = Phaser.Math.Clamp(amount, 0, 1);
  }

  private update(): void {
    let look = mix(this.from, LOOKS[this.target], this.progress.t);
    this.current = look;
    if (this.weatherGrey > 0) {
      const w = this.weatherGrey;
      look = {
        ...look,
        skyTop: lerpColor(look.skyTop, lerpColor(0x8a93a3, look.skyTop, 0.35), w),
        skyBottom: lerpColor(look.skyBottom, lerpColor(0xb8c0cc, look.skyBottom, 0.35), w),
        tint: lerpColor(look.tint, lerpColor(0xc4c8d4, look.tint, 0.5), w),
        cloudTint: lerpColor(look.cloudTint, 0xa0a8b8, w),
        sunAlpha: look.sunAlpha * (1 - w * 0.8),
        // Bei Regen sind die Sterne weg und der Mond nur noch schwach hinter den Wolken
        starsAlpha: look.starsAlpha * Math.max(0, 1 - w * 1.6),
        moonAlpha: look.moonAlpha * (1 - w * 0.85),
      };
    }
    this.apply(look);
    this.maybeYawn();
  }

  private apply(look: Look): void {
    const t = this.scene.time.now / 1000;
    this.sky.clear();
    this.sky.fillGradientStyle(look.skyTop, look.skyTop, look.skyBottom, look.skyBottom, 1);
    this.sky.fillRect(0, 0, GAME_WIDTH, GROUND_TOP);

    this.sun.setPosition(look.sunX, look.sunY).setTint(look.sunColor).setAlpha(look.sunAlpha);
    this.moon.setAlpha(look.moonAlpha);
    this.stars.forEach((s, i) => s.setAlpha(look.starsAlpha * (0.6 + 0.4 * Math.sin(t * 2 + i * 1.7))));
    this.dew.forEach((d, i) => d.setAlpha(look.dewAlpha * Math.max(0, Math.sin(t * 3 + i * 2.3))));
    this.wire.setAlpha(Math.min(1, look.lightsAlpha * 1.5));
    this.bulbs.forEach((b, i) => b.setAlpha(look.lightsAlpha * (0.75 + 0.25 * Math.sin(t * 2.5 + i))));
    this.clouds.forEach((c) => c.setTint(look.cloudTint));
    this.tint.setFillStyle(look.tint).setVisible(look.tint !== 0xffffff);
  }

  /** Optional aus dem Issue: Nachts gähnen die Kinder ab und zu. */
  private maybeYawn(): void {
    if (this.target !== 'night' || this.scene.time.now < this.nextYawn) return;
    this.nextYawn = this.scene.time.now + Phaser.Math.Between(6000, 12000);
    const kids = this.scene.kidsOnMeadow().filter((k) => k.mode === 'idle');
    if (kids.length) Phaser.Utils.Array.GetRandom(kids).yawn();
  }
}
