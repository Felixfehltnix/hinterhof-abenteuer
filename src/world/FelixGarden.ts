import Phaser from 'phaser';
import { DEPTH_DRAGGING } from '../config';
import { FELIX_GARDEN } from '../data/backdrop';
import { FelixGate } from '../objects/FelixGate';
import {
  fairyBulbs,
  LIGHTS_AREA,
  PERGOLA_AREA,
  SHED_AREA,
} from '../scenes/placeholders/garden';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import { environment, windStrength } from './environment';

const { pergola: P, railing: R, grill: GRILL, trunk: TRUNK, gate: GATE } = FELIX_GARDEN;

// Tiefen: Der Schuppen steht am Zaun (Hintergrund), alles andere nach seinem Fußpunkt.
const SHED_DEPTH = -996;
const PERGOLA_DEPTH = P.y;
const VINE_DEPTH = P.y + 0.5;
// Die Birnen hängen vor Pergola und Ranken, aber hinter der Brüstung (und allen Kindern).
const LIGHTS_DEPTH = P.y + 1;
// Der Lichtschein auf Grill und Boden fällt auch auf Kinder davor: Nur Gezogenes verdeckt ihn.
const GLOW_DEPTH = DEPTH_DRAGGING - 1;

/** Tagsüber eingeschaltet leuchtet die Kette gedimmt, abends und nachts voll. */
const DAY_DIM = 0.3;
const WARM_WHITE = 0xffd89a;
/** Ab dieser Lichter-Stärke (Abend 0,5) leuchten die Birnen ganz über die Lichtebene. */
const DUSK = 0.3;

/**
 * Felix' Garten (#64): Pergola mit wildem Wein, Grill (Deko), Holzbrüstung, schwarzer Schuppen,
 * dicker Baumstamm, grünes Gartentor (Deko, später Grill-Spiel) und die warmweiße Lichterkette.
 * Lichterkette antippen = an/aus (auch tagsüber, dann gedimmt), wird mitgespeichert.
 * Bei Wind wiegen sich die Ranken und rote Blätter fallen, bei Schnee liegt Schnee auf dem Dach.
 */
export class FelixGarden {
  readonly gate: FelixGate;
  private on = true;
  private brightness = 0;
  /** Leuchten über die Lichtebene (Dämmerung, Nacht). */
  private readonly bulbs: Phaser.GameObjects.Image[];
  /** Leuchten direkt in der Szene (tagsüber, gedimmt). */
  private readonly dayBulbs: Phaser.GameObjects.Image[];
  private readonly glows: Phaser.GameObjects.Image[];
  private readonly curtains: { img: Phaser.GameObjects.Image; phase: number }[] = [];
  private readonly snowCaps: Phaser.GameObjects.Image[] = [];
  private readonly leaves: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: PlaygroundScene) {
    const add = (x: number, y: number, key: string) => scene.add.image(x, y, key);

    add(SHED_AREA.x, SHED_AREA.y, 'felix-shed').setOrigin(0).setDepth(SHED_DEPTH);
    this.snowCaps.push(add(SHED_AREA.x, SHED_AREA.y, 'felix-shed-snow').setOrigin(0).setDepth(SHED_DEPTH + 0.1));
    add(TRUNK.x, TRUNK.y, 'felix-trunk').setOrigin(0.5, 1).setDepth(TRUNK.y);
    this.gate = new FelixGate(scene, GATE.x, GATE.y);
    // Grill: reine Deko ohne Touch-Fläche (schluckt keine Berührungen, #55). Später Grill-Spiel (#66).
    add(GRILL.x, GRILL.y, 'felix-grill').setOrigin(0.5, 1).setDepth(GRILL.y);
    add(PERGOLA_AREA.x, PERGOLA_AREA.y, 'felix-pergola').setOrigin(0).setDepth(PERGOLA_DEPTH);
    this.snowCaps.push(add(PERGOLA_AREA.x, PERGOLA_AREA.y, 'felix-pergola-snow').setOrigin(0).setDepth(PERGOLA_DEPTH + 0.2));
    add((R.left + R.right) / 2, R.y, 'felix-railing').setOrigin(0.5, 1).setDepth(R.y);

    // Ranken hängen an den Seiten herab (in der Mitte kürzer, damit man den Grill sieht)
    const hang: [number, number][] = [
      [P.left - 30, 1],
      [P.left + 40, 0.8],
      [P.left + 150, 0.45],
      [P.right - 150, 0.5],
      [P.right - 40, 0.85],
      [P.right + 30, 1],
    ];
    hang.forEach(([x, len], i) => {
      const img = add(x, P.top + 16, 'felix-vine').setOrigin(0.5, 0).setScale(1, len).setDepth(VINE_DEPTH);
      this.curtains.push({ img, phase: i * 1.1 });
    });

    // Lichterkette: Leitung und Birnen sind tagsüber zu sehen, das Leuchten kommt von der Lichtebene
    add(LIGHTS_AREA.x, LIGHTS_AREA.y, 'felix-lights').setOrigin(0).setDepth(LIGHTS_DEPTH - 0.1);
    // Tagsüber ist die Szene nicht abgedunkelt: Die Birnen leuchten direkt in der Szene (Kinder davor
    // verdecken sie von selbst). Erst in der Dämmerung übernimmt die Lichtebene (teurer).
    const bulb = (b: Phaser.Math.Vector2) => add(b.x, b.y, 'bulb').setTint(WARM_WHITE).setScale(1.3);
    this.dayBulbs = fairyBulbs().map((b) => bulb(b).setBlendMode(Phaser.BlendModes.ADD).setDepth(LIGHTS_DEPTH));
    this.bulbs = fairyBulbs().map(bulb);
    scene.lightLayer.add({
      objects: this.bulbs,
      depth: () => LIGHTS_DEPTH,
      active: () => this.bulbs[0].visible,
    });
    // Weicher Lichtschein auf dem Boden unter der Pergola und auf dem Grill
    this.glows = [
      add((P.left + P.right) / 2, P.y + 30, 'glow-soft').setScale(7, 1.6),
      add(GRILL.x, GRILL.y - 90, 'glow-soft').setScale(2.6, 2),
    ].map((g) => g.setTint(WARM_WHITE));
    scene.lightLayer.add({
      objects: this.glows,
      depth: () => GLOW_DEPTH,
      active: () => this.brightness > 0.01,
    });

    // Antippen der Lichterkette (großzügig um die Leitung, endet über dem Grill): an/aus.
    // Kinder davor haben Vorrang (Deko, touchRank).
    const zone = scene.add
      .zone(LIGHTS_AREA.x, LIGHTS_AREA.y - 30, LIGHTS_AREA.w, LIGHTS_AREA.h + 10)
      .setOrigin(0)
      .setDepth(LIGHTS_DEPTH);
    zone.setInteractive({ useHandCursor: true });
    zone.setData('scenery', true);
    zone.setData('onTap', () => this.toggle());

    // Bei Wind fallen einzelne rote Blätter vom wilden Wein
    this.leaves = scene.add.particles(0, 0, 'leaf', {
      x: { min: P.left - 60, max: P.right + 60 },
      y: { min: P.top - 30, max: P.top + 20 },
      speedX: { onEmit: () => Phaser.Math.Between(-20, 30) + environment.wind * 0.25 },
      speedY: { min: 40, max: 90 },
      gravityY: 20,
      rotate: { start: 0, end: 360 },
      lifespan: 4500,
      frequency: 420,
      tint: [0xc0392b, 0xd9483b, 0xe67e22],
      scale: { min: 0.6, max: 0.9 },
      emitting: false,
    });
    this.leaves.setDepth(R.y + 1);

    scene.registerWorldState('fairyLights', {
      save: () => this.on,
      load: (v) => {
        if (typeof v === 'boolean') this.on = v;
      },
    });
    scene.events.on(Phaser.Scenes.Events.UPDATE, () => this.update());
  }

  get lightsOn(): boolean {
    return this.on;
  }

  /** Lichterkette an oder aus (Antippen). */
  toggle(): void {
    this.on = !this.on;
    this.scene.events.emit('sound', { kind: 'click', x: LIGHTS_AREA.x + LIGHTS_AREA.w / 2 });
  }

  private update(): void {
    const day = this.scene.dayCycle;
    const weather = this.scene.weather;
    if (!day || !weather) return;
    const now = this.scene.time.now;

    // Helligkeit weich nachführen: an = gedimmt bis voll (je nach Tageszeit), aus = dunkel
    const target = this.on ? Math.max(DAY_DIM, day.lightsAmount) : 0;
    this.brightness += (target - this.brightness) * 0.12;
    if (Math.abs(target - this.brightness) < 0.005) this.brightness = target;
    // Überblenden: je dunkler die Szene, desto mehr Licht kommt von der Lichtebene
    const night = Phaser.Math.Clamp(day.lightsAmount / DUSK, 0, 1);
    const flicker = (i: number) => this.brightness * (0.85 + 0.15 * Math.sin(now / 400 + i * 1.7));
    this.bulbs.forEach((b, i) => b.setAlpha(flicker(i) * night).setVisible(this.brightness * night > 0.01));
    this.dayBulbs.forEach((b, i) => b.setAlpha(flicker(i) * (1 - night)).setVisible(this.brightness * (1 - night) > 0.01));
    // Der Lichtschein ist nur im Dunkeln zu sehen
    const glow = this.brightness * Math.max(0, day.lightsAmount - 0.2) * 0.55;
    this.glows.forEach((g) => g.setAlpha(glow).setVisible(glow > 0.01));

    // Wind: Ranken wiegen sich, Blätter fallen
    const wind = Math.min(1.6, windStrength());
    for (const c of this.curtains) {
      const target = wind > 0.01 ? -wind * (3 + 3 * Math.sin(now / 500 + c.phase)) : 0;
      c.img.angle += (target - c.img.angle) * 0.05;
    }
    const windy = environment.weather === 'wind';
    if (windy && !this.leaves.emitting) this.leaves.start();
    else if (!windy && this.leaves.emitting) this.leaves.stop();

    // Schnee auf Pergola und Schuppen
    const cover = Math.min(1, weather.snow.coverAmount * 1.3);
    for (const s of this.snowCaps) s.setAlpha(cover).setVisible(cover > 0.01);
  }
}
