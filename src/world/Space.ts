import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, WORLD_WIDTH } from '../config';
import {
  CLOUD_FRONT_DEPTH,
  CLOUD_LAYER,
  PLANET_PARALLAX,
  SPACE_BODIES,
  SPACE_FULL,
  spaceAmount,
  type SpaceBody,
} from '../data/space';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import { ALIEN_SIZE, UFO_SIZE } from '../scenes/placeholders/space';

// Wolken der Wolkenschicht: hinter allem auf der Wiese bzw. vor der Rakete
const CLOUD_BACK_DEPTH = -1000;
// Sterne des Weltalls (fest im Bild) und Himmelskörper
const SPACE_STARS_DEPTH = -1090;
const BODY_DEPTH = -1020;
const SHOOTING_STAR_DEPTH = -1085;
const STAR_COUNT = 110;

/**
 * Himmel über der Wiese (#75): Fliegt die Rakete nach oben, folgt die Kamera. Dann wird der Himmel
 * dunkler (DayCycle.setSpace), man durchfliegt eine Wolkenschicht (Regen und Schnee bleiben darunter)
 * und kommt ins Weltall: Sterne, Sternschnuppen, Mond und Planeten zum Antippen, ein Ufo mit Alien.
 */
export class Space {
  private readonly stars: Phaser.GameObjects.Image[] = [];
  private readonly frontClouds: Phaser.GameObjects.Image[] = [];
  private readonly backClouds: Phaser.GameObjects.Image[] = [];
  private readonly bodies: Phaser.GameObjects.GameObject[] = [];
  private nextShootingStar = 0;
  /** Wo die Kamera gerade ist: 0 Wiese/Himmel, 1 in den Wolken, 2 Weltall (für je einen Ton beim Hineinfliegen). */
  private zone = 0;

  constructor(private readonly scene: PlaygroundScene) {
    // Sterne stehen fest im Bild und erscheinen, je weiter oben man ist
    for (let i = 0; i < STAR_COUNT; i++) {
      const x = (i * 173 + 31) % GAME_WIDTH;
      const y = (i * 311 + 17) % GAME_HEIGHT;
      const star = scene.add
        .image(x, y, 'twinkle')
        .setScale(0.35 + (i % 4) * 0.2)
        .setTint([0xffffff, 0xfff3c4, 0xcfe8ff][i % 3])
        .setScrollFactor(0)
        .setDepth(SPACE_STARS_DEPTH)
        .setAlpha(0)
        .setVisible(false);
      this.stars.push(star);
    }

    this.makeCloudLayer();
    for (const b of SPACE_BODIES) this.bodies.push(b.kind === 'ufo' ? this.makeUfo(b) : this.makePlanet(b));

    scene.events.on(Phaser.Scenes.Events.UPDATE, () => this.update());
  }

  /** Die Wolkenschicht über der ganzen Breite: dichte Wolken hinter und ein paar vor der Rakete. */
  private makeCloudLayer(): void {
    const { top, bottom } = CLOUD_LAYER;
    const span = bottom - top;
    for (let i = 0; i < 70; i++) {
      const x = ((i * 397) % (WORLD_WIDTH + 400)) - 200;
      const y = top + ((i * 137) % span);
      const s = 1.6 + ((i * 7) % 5) * 0.35;
      this.backClouds.push(this.scene.add.image(x, y, 'cloud').setScale(s, s * 0.85).setDepth(CLOUD_BACK_DEPTH).setVisible(false));
    }
    for (let i = 0; i < 12; i++) {
      const x = ((i * 613 + 150) % (WORLD_WIDTH + 400)) - 200;
      const y = top + 120 + ((i * 211) % (span - 200));
      const s = 1.8 + (i % 3) * 0.4;
      this.frontClouds.push(this.scene.add.image(x, y, 'cloud').setScale(s, s * 0.8).setDepth(CLOUD_FRONT_DEPTH).setAlpha(0.6).setVisible(false));
    }
  }

  /** Planet zum Antippen: wackelt, dreht sich ein Stück und klingt (jeder in eigener Tonhöhe). */
  private makePlanet(b: SpaceBody): Phaser.GameObjects.Image {
    const p = { x: b.x, y: b.y };
    const key = `planet-${b.kind}`;
    const img = this.scene.add.image(p.x, p.y, key).setScale(b.scale).setScrollFactor(PLANET_PARALLAX).setDepth(BODY_DEPTH).setVisible(false);
    img.setInteractive({ useHandCursor: true });
    img.setData('onTap', () => {
      if (this.scene.tweens.isTweening(img)) return;
      this.scene.events.emit('sound', { kind: 'planet', pitch: b.pitch });
      this.scene.tweens.add({ targets: img, scale: { from: b.scale * 1.12, to: b.scale }, duration: 500, ease: 'Elastic.easeOut' });
      this.scene.tweens.add({ targets: img, angle: img.angle + (b.kind === 'saturn' ? 12 : 40), duration: 700, ease: 'Sine.easeOut' });
    });
    return img;
  }

  /** Ufo mit Alien: schwebt auf und ab. Antippen: Alien winkt, Lichter blinken, Ufo macht einen Hopser. */
  private makeUfo(b: SpaceBody): Phaser.GameObjects.Container {
    const p = { x: b.x, y: b.y };
    const s = this.scene;
    const alien = s.add.image(0, -40, 'alien');
    // Rechter Arm an der Schulter (hängt, winkt beim Antippen)
    const arm = s.add.image(alien.x + 20, alien.y + 72 - ALIEN_SIZE.height / 2, 'alien-arm').setOrigin(0.5, 0).setAngle(25);
    const dome = s.add.image(0, 0, 'ufo-dome');
    const saucer = s.add.image(0, 0, 'ufo');
    const lights = [0, 1, 2, 3, 4].map((i) =>
      s.add.circle(-100 + i * 50, 36 + (i === 0 || i === 4 ? -6 : 0), 9, [0xffd166, 0xef476f, 0x06d6a0, 0x4d96ff, 0xffd166][i]),
    );
    const ufo = s.add
      .container(p.x, p.y, [dome, alien, arm, saucer, ...lights])
      .setScale(b.scale)
      .setScrollFactor(PLANET_PARALLAX)
      .setDepth(BODY_DEPTH + 1)
      .setVisible(false);
    ufo.setSize(UFO_SIZE.width, UFO_SIZE.height).setInteractive({ useHandCursor: true });
    s.tweens.add({ targets: ufo, y: p.y - 30, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    lights.forEach((l, i) => s.tweens.add({ targets: l, alpha: { from: 1, to: 0.3 }, duration: 400, delay: i * 120, yoyo: true, repeat: -1 }));
    ufo.setData('onTap', () => {
      if (s.tweens.isTweening(arm)) return;
      s.events.emit('sound', { kind: 'ufo', x: ufo.x });
      s.tweens.add({ targets: arm, angle: { from: 200, to: 145 }, duration: 180, yoyo: true, repeat: 3, onComplete: () => arm.setAngle(25) });
      s.tweens.add({ targets: [saucer, dome, alien, arm, ...lights], y: '-=26', duration: 200, yoyo: true, ease: 'Quad.easeOut' });
    });
    return ufo;
  }

  private update(): void {
    const altitude = this.scene.cameraControl.altitude;
    const space = spaceAmount(altitude);
    this.scene.dayCycle.setSpace(space);
    // Über der Wolkenschicht regnet und schneit es nicht mehr
    this.scene.weather.setHighUp((altitude + CLOUD_LAYER.bottom + GAME_HEIGHT / 2) / 900);

    const high = altitude > 1;
    const t = this.scene.time.now / 1000;
    this.stars.forEach((star, i) => {
      star.setVisible(space > 0);
      if (space > 0) star.setAlpha(space * (0.55 + 0.45 * Math.sin(t * (1.5 + (i % 5) * 0.4) + i)));
    });
    const tint = this.scene.dayCycle.cloudTint;
    for (const c of [...this.backClouds, ...this.frontClouds]) c.setVisible(high).setTint(tint);
    for (const b of this.bodies) (b as Phaser.GameObjects.Image).setVisible(space > 0).setAlpha(space);
    this.maybeShootingStar(space);
    this.announceZone(altitude);
  }

  /** Einmal „wusch“ beim Eintauchen in die Wolken und „pling“ beim Ankommen im Weltall. */
  private announceZone(altitude: number): void {
    const bounds = [-CLOUD_LAYER.bottom - GAME_HEIGHT / 2, SPACE_FULL];
    let zone = 0;
    while (zone < bounds.length && altitude >= bounds[zone]) zone++;
    // Zurück erst ein Stück darunter (kein Flattern an der Grenze)
    if (zone < this.zone && altitude > bounds[zone] - 300) return;
    if (zone > this.zone) this.scene.events.emit('sound', { kind: zone === 2 ? 'space' : 'clouds' });
    this.zone = zone;
  }

  /** Ab und zu zieht eine Sternschnuppe schräg durchs Bild. */
  private maybeShootingStar(space: number): void {
    const now = this.scene.time.now;
    if (space < 0.6 || now < this.nextShootingStar) return;
    this.nextShootingStar = now + Phaser.Math.Between(3500, 8000);
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? Phaser.Math.Between(100, 900) : Phaser.Math.Between(1000, 1800);
    const y = Phaser.Math.Between(60, 380);
    const dir = fromLeft ? 1 : -1;
    const star = this.scene.add
      .image(x, y, 'shooting-star')
      .setScrollFactor(0)
      .setDepth(SHOOTING_STAR_DEPTH)
      .setFlipX(!fromLeft)
      .setAngle(dir * 22)
      .setAlpha(0);
    this.scene.tweens.add({
      targets: star,
      x: x + dir * 700,
      y: y + 280,
      alpha: { from: 1, to: 0 },
      duration: 1100,
      ease: 'Sine.easeIn',
      onComplete: () => star.destroy(),
    });
    this.scene.events.emit('sound', { kind: 'shooting-star' });
  }
}
