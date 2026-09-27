import Phaser from 'phaser';
import { DEPTH_TINT, GAME_WIDTH, GROUND_TOP } from '../config';
import type { Kid } from '../objects/Kid';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import type { DayCycle } from './DayCycle';
import { environment, type WeatherKind } from './environment';

/** Reihenfolge beim Antippen einer Wolke. Wind (#14) und Schnee (#15) werden hier eingereiht. */
export const WEATHER_ORDER: WeatherKind[] = ['sunny', 'cloudy', 'rain', 'wind'];

interface WeatherLook {
  /** Wie grau Himmel und Welt werden (0..1). */
  grey: number;
  /** Sichtbarkeit der zusätzlichen Wolken (0..1). */
  clouds: number;
}

const LOOKS: Record<WeatherKind, WeatherLook> = {
  sunny: { grey: 0, clouds: 0 },
  cloudy: { grey: 0.4, clouds: 1 },
  rain: { grey: 0.75, clouds: 1 },
  wind: { grey: 0.1, clouds: 0.7 },
};

// Wind (px/s²): Grundwind und Böen, die ab und zu kommen.
const WIND_BASE = 250;
const WIND_GUST = 350;
// Wolken ziehen immer ein bisschen, bei Wind schneller (px/s pro px/s² Wind).
const CLOUD_DRIFT = 6;
const CLOUD_WIND = 0.25;

// Pfützen auf der Wiese (Mitte, Fußpunkt), abseits vom Sandkasten.
const PUDDLES = [
  { x: 360, y: 905 },
  { x: 770, y: 1015 },
  { x: 1320, y: 885 },
  { x: 1580, y: 1035 },
  { x: 1000, y: 800 },
];
const PUDDLE_GROW = 1 / 20; // pro Sekunde bei Regen (in 20 s voll)
const PUDDLE_DRY = 1 / 90; // pro Sekunde danach (in 90 s trocken)
const RAINBOW_MS = 10_000;

/**
 * Wetter: Eine Wolke antippen → nächstes Wetter. Andere Objekte fragen es über
 * `environment.weather` / `isRaining()` ab. Kein Gewitter, keine Blitze.
 */
export class Weather {
  private kind: WeatherKind = 'sunny';
  private grey = 0;
  private cloudAlpha = 0;
  private readonly extraClouds: Phaser.GameObjects.Image[] = [];
  private readonly rain: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly puddles: { img: Phaser.GameObjects.Image; size: number }[];
  private readonly rainbow: Phaser.GameObjects.Image;
  private readonly leaves: Phaser.GameObjects.Particles.ParticleEmitter;
  private gust = 0;
  private nextGust = 0;

  constructor(
    private readonly scene: PlaygroundScene,
    private readonly dayCycle: DayCycle,
  ) {
    // Zusätzliche Wolken für bewölkt/Regen
    for (const [x, y, s] of [
      [150, 90, 1.1],
      [640, 210, 0.9],
      [1180, 90, 1.2],
      [1750, 250, 0.9],
    ]) {
      this.extraClouds.push(scene.add.image(x, y, 'cloud').setDepth(-1039).setScale(s).setAlpha(0));
    }
    // Alle Wolken sind der Wetter-Knopf
    for (const cloud of [...dayCycle.clouds, ...this.extraClouds]) {
      cloud.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-30, -30, cloud.width + 60, cloud.height + 60),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      cloud.setData('onTap', () => this.next());
    }

    this.rainbow = scene.add.image(GAME_WIDTH / 2, GROUND_TOP, 'rainbow').setOrigin(0.5, 1).setDepth(-1060).setAlpha(0);

    this.puddles = PUDDLES.map((p) => ({ img: scene.add.image(p.x, p.y, 'puddle').setOrigin(0.5, 0.5).setDepth(-985).setScale(0), size: 0 }));

    // Regen: viele kleine Partikel, unter der Tageszeit-Einfärbung (nachts dunkler)
    this.rain = scene.add.particles(0, -30, 'raindrop', {
      x: { min: -150, max: GAME_WIDTH + 100 },
      speedY: { min: 950, max: 1150 },
      speedX: { onEmit: () => -40 + environment.wind * 0.3 },
      lifespan: { min: 800, max: 1150 },
      quantity: 3,
      frequency: 16,
      alpha: { start: 0.75, end: 0.5 },
      emitting: false,
    });
    this.rain.setDepth(DEPTH_TINT - 10);

    // Wind: Blätter wehen von links durchs Bild
    this.leaves = scene.add.particles(-40, 0, 'leaf', {
      y: { min: 80, max: 1000 },
      speedX: { onEmit: () => 250 + environment.wind * 0.8 },
      speedY: { min: -40, max: 60 },
      rotate: { start: 0, end: 540 },
      lifespan: 6000,
      frequency: 180,
      quantity: 1,
      tint: [0x8ac926, 0x6a994e, 0xf4a259, 0xe9c46a],
      scale: { min: 0.6, max: 1.1 },
      emitting: false,
    });
    this.leaves.setDepth(DEPTH_TINT - 20);

    scene.registerWorldState('weather', {
      save: () => this.kind,
      load: (v) => {
        if (typeof v === 'string' && (WEATHER_ORDER as string[]).includes(v)) this.set(v as WeatherKind, true);
      },
    });
    scene.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, delta: number) => this.update(delta));
  }

  get current(): WeatherKind {
    return this.kind;
  }

  /** Nächstes Wetter in der Reihenfolge. */
  next(): void {
    this.set(WEATHER_ORDER[(WEATHER_ORDER.indexOf(this.kind) + 1) % WEATHER_ORDER.length]);
  }

  /** Wetter setzen. instant: ohne Übergang (beim Laden). */
  set(kind: WeatherKind, instant = false): void {
    const wasRaining = this.kind === 'rain';
    this.kind = kind;
    environment.weather = kind;
    if (kind === 'rain') this.rain.start();
    else this.rain.stop();
    if (kind === 'wind') this.leaves.start();
    else this.leaves.stop();
    if (instant) {
      this.grey = LOOKS[kind].grey;
      this.cloudAlpha = LOOKS[kind].clouds;
      if (kind === 'rain') this.puddles.forEach((p) => (p.size = 0.6));
    } else {
      this.scene.events.emit('sound', { kind: `weather-${kind}` });
      // Wenn der Regen aufhört: Regenbogen!
      if (wasRaining && kind !== 'rain') this.showRainbow();
    }
  }

  /** Steht (x, y) in einer Pfütze? */
  puddleAt(x: number, y: number): boolean {
    return this.puddles.some((p) => {
      if (p.size < 0.25) return false;
      const rx = (p.img.width / 2) * p.size + 20;
      const ry = (p.img.height / 2) * p.size + 15;
      return ((x - p.img.x) / rx) ** 2 + ((y - p.img.y) / ry) ** 2 <= 1;
    });
  }

  /** Ein Kind ist gelandet: In einer Pfütze spritzt es (und das Kind lacht). */
  onKidLanded(kid: Kid): void {
    if (!this.puddleAt(kid.x, kid.y)) return;
    this.splash(kid.x, kid.y);
    kid.giggle();
    this.scene.events.emit('sound', { kind: 'splash', x: kid.x });
  }

  /** Grundwind plus gelegentliche Böe; bei einer Böe halten sich alle Kinder fest. */
  private updateWind(dt: number): void {
    const now = this.scene.time.now;
    const windy = this.kind === 'wind';
    if (windy && now > this.nextGust) {
      this.nextGust = now + Phaser.Math.Between(6000, 11000);
      this.scene.tweens.add({ targets: this, gust: 1, duration: 500, yoyo: true, hold: 900, ease: 'Sine.easeInOut' });
      this.scene.kidsOnMeadow().forEach((kid, i) => this.scene.time.delayedCall(300 + i * 60, () => kid.brace(1)));
      this.scene.events.emit('sound', { kind: 'gust' });
    }
    const target = windy ? WIND_BASE + this.gust * WIND_GUST : 0;
    environment.wind += (target - environment.wind) * (1 - Math.exp(-1.2 * dt));
    if (Math.abs(environment.wind) < 1) environment.wind = 0;
  }

  private splash(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      const drop = this.scene.add.circle(x, y - 5, Phaser.Math.Between(4, 8), 0x8ecae6).setDepth(y + 1);
      const a = -Math.PI / 2 + Phaser.Math.FloatBetween(-1.3, 1.3);
      const r = Phaser.Math.Between(50, 130);
      this.scene.tweens.add({
        targets: drop,
        x: x + Math.cos(a) * r,
        y: y + Math.sin(a) * r * 0.7 + 30,
        alpha: 0,
        duration: Phaser.Math.Between(400, 650),
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy(),
      });
    }
  }

  private showRainbow(): void {
    this.scene.tweens.killTweensOf(this.rainbow);
    this.scene.tweens.chain({
      targets: this.rainbow,
      tweens: [
        { alpha: 0.75, duration: 1500, ease: 'Sine.easeInOut' },
        { alpha: 0, duration: 1500, delay: RAINBOW_MS - 3000, ease: 'Sine.easeInOut' },
      ],
    });
  }

  private update(delta: number): void {
    const dt = delta / 1000;
    const look = LOOKS[this.kind];
    const k = 1 - Math.exp(-1.5 * dt);
    this.grey += (look.grey - this.grey) * k;
    this.cloudAlpha += (look.clouds - this.cloudAlpha) * k;
    this.dayCycle.setWeatherGrey(this.grey);
    const cloudTint = this.dayCycle.clouds[0]?.tintTopLeft ?? 0xffffff;
    this.extraClouds.forEach((c) => c.setAlpha(this.cloudAlpha).setTint(cloudTint));

    this.updateWind(dt);
    const drift = CLOUD_DRIFT + Math.max(0, environment.wind) * CLOUD_WIND;
    for (const c of [...this.dayCycle.clouds, ...this.extraClouds]) {
      c.x += drift * dt;
      if (c.x > GAME_WIDTH + c.displayWidth / 2 + 20) c.x = -c.displayWidth / 2 - 20;
    }

    const raining = this.kind === 'rain';
    for (const p of this.puddles) {
      p.size = Phaser.Math.Clamp(p.size + (raining ? PUDDLE_GROW : -PUDDLE_DRY) * dt, 0, 1);
      p.img.setScale(p.size).setVisible(p.size > 0.01);
    }
  }
}
