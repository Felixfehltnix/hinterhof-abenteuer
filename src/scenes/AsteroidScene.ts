import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  EARTH,
  ROCK_SHAPES,
  ROCK_SIZES,
  SHIP,
  SHOT,
  SPAWN_CLEARANCE,
  WAVE_STARS_MAX,
  WAVES,
  type RockSize,
} from '../data/asteroids';
import type { CharacterDef } from '../data/characters';
import type { Outfit } from '../data/costumes';
import { ROCKET, SPACE_SKY } from '../data/space';
import { Kid } from '../objects/Kid';
import { GOLD_STAR_SIZE } from './placeholders/asteroids';
import { ROCKET_ART } from './placeholders/space';

/** Was die Wiese dem Sternenflug mitgibt: die Kinder in der Rakete (auch keins). */
export interface AsteroidData {
  kids: { def: CharacterDef; outfit: Outfit }[];
  /** Erde angetippt: zurück über die Wiese. */
  onDone(): void;
}

interface Rock {
  size: RockSize;
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  spin: number;
  /** Bis dahin kein neuer Zusammenstoß mit der Rakete (ms). */
  calmUntil: number;
}

interface Shot {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  age: number;
}

const DEPTH = { sky: 0, stars: 1, planets: 2, earth: 50, rocks: 100, shots: 150, ship: 200, sparkle: 300, ui: 400 };
const STAR_COUNT = 140;
/** Ab dieser Geschwindigkeit zeigt die Spitze in Flugrichtung (px/s). */
const TURN_FROM_SPEED = 160;
/** Nach einem Schuss dreht sich eine nicht gelenkte Rakete so lange zum Ziel (ms). */
const AIM_HOLD = 700;
/** Neue Asteroiden blenden ein und stoßen so lange (ms) noch nicht zusammen. */
const SPAWN_FADE = 700;

/**
 * Sternenflug: Asteroiden-Spiel ganz oben im Weltall (Einstieg: Rakete über der Wiese bis an den oberen
 * Rand fliegen und weiter nach oben ziehen). Rakete anfassen und ziehen = fliegen, sie folgt dem Finger.
 * Woanders hintippen (oder den Finger liegen lassen) = die Rakete schießt leuchtende Sterne dorthin.
 * Große Steine zerfallen in zwei mittlere, die in zwei kleine, die kleinen in Glitzer. Steine, die am Rand
 * hinausfliegen, kommen gegenüber wieder herein. Zusammenstoß = beide werden geschubst, die Kinder halten
 * sich fest. Kein Verlieren, keine Punkte; sind alle Steine weg, jubeln die Kinder, oben kommt ein
 * goldener Stern dazu und die nächste Welle hat einen Stein mehr. Die Erde unten links führt zurück.
 */
export class AsteroidScene extends Phaser.Scene {
  private params!: AsteroidData;
  private ship = { x: 0, y: 0, vx: 0, vy: 0, tilt: 0, wobble: 0 };
  private back!: Phaser.GameObjects.Image;
  private front!: Phaser.GameObjects.Image;
  private flame!: Phaser.GameObjects.Image;
  private kids: Kid[] = [];
  private rocks: Rock[] = [];
  private shots: Shot[] = [];
  private stars: { img: Phaser.GameObjects.Image; depth: number }[] = [];
  private planets: { img: Phaser.GameObjects.Image; depth: number }[] = [];
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private crumbs!: Phaser.GameObjects.Particles.ParticleEmitter;
  private steer?: { id: number; x: number; y: number };
  private shooters = new Map<number, { pointer: Phaser.Input.Pointer; next: number }>();
  private aim?: { tilt: number; until: number };
  private wave = 0;
  private waveStars = 0;
  /** Kleine Steine dieser Welle: jeder Glitzer klingt einen Ton höher. */
  private glitterCount = 0;
  private between = true;
  private leaving = false;

  constructor() {
    super('Asteroids');
  }

  create(data: AsteroidData): void {
    this.params = data;
    this.kids = [];
    this.rocks = [];
    this.shots = [];
    this.stars = [];
    this.planets = [];
    this.steer = undefined;
    this.shooters = new Map();
    this.aim = undefined;
    this.wave = 0;
    this.waveStars = 0;
    this.glitterCount = 0;
    this.between = true;
    this.leaving = false;

    // Töne spielt die Wiese (dort lebt der AudioContext)
    const playground = this.scene.get('Playground');
    this.events.off('sound');
    this.events.on('sound', (e: unknown) => playground.events.emit('sound', e));

    this.makeSky();
    this.makeEarth();
    this.makeShip(data);

    this.sparkles = this.add.particles(0, 0, 'twinkle', {
      speed: { min: 80, max: 340 },
      lifespan: { min: 500, max: 1000 },
      scale: { start: 1.6, end: 0 },
      tint: [0xffffff, 0xffd166, 0x8ecae6, 0xf4a6ff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.sparkles.setDepth(DEPTH.sparkle);
    this.crumbs = this.add.particles(0, 0, 'smoke', {
      speed: { min: 60, max: 240 },
      lifespan: { min: 400, max: 800 },
      scale: { start: 0.7, end: 0.15 },
      alpha: { start: 1, end: 0 },
      tint: 0x9a8c7e,
      emitting: false,
    });
    this.crumbs.setDepth(DEPTH.sparkle - 1);

    this.setupInput();
    // Warp: weiß aufblenden
    this.cameras.main.fadeIn(500, 255, 255, 255);
    this.time.delayedCall(900, () => this.startWave());
  }

  // --- Aufbau ---------------------------------------------------------------------------

  /** Weltall: Farbverlauf, Sterne in drei Ebenen (ziehen gegen die Flugrichtung), zwei Planeten (kein grauer Mond: sähe aus wie ein Stein). */
  private makeSky(): void {
    const sky = this.add.graphics().setDepth(DEPTH.sky);
    sky.fillGradientStyle(SPACE_SKY.top, SPACE_SKY.top, SPACE_SKY.bottom, SPACE_SKY.bottom, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let i = 0; i < STAR_COUNT; i++) {
      const layer = i % 3;
      const img = this.add
        .image((i * 173 + 31) % GAME_WIDTH, (i * 311 + 17) % GAME_HEIGHT, 'twinkle')
        .setScale(0.3 + layer * 0.25)
        .setTint([0xffffff, 0xfff3c4, 0xcfe8ff][i % 3])
        .setDepth(DEPTH.stars);
      this.stars.push({ img, depth: 0.015 + layer * 0.02 });
    }
    const planet = (key: string, x: number, y: number, scale: number) =>
      this.planets.push({ img: this.add.image(x, y, key).setScale(scale).setAlpha(0.85).setDepth(DEPTH.planets), depth: 0.008 });
    planet('planet-saturn', 1500, 220, 0.55);
    planet('planet-mars', 380, 330, 0.6);
  }

  /** Die Erde unten links: Antippen = zurück. Pulsiert leicht, damit man sie bemerkt. */
  private makeEarth(): void {
    const earth = this.add.image(EARTH.x, EARTH.y, 'earth').setDepth(DEPTH.earth);
    this.tweens.add({ targets: earth, scale: { from: 1, to: 1.07 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Rakete mit den Kindern (wie über der Wiese: Rückseite, Kinder, Vorderseite mit Fenster). */
  private makeShip(data: AsteroidData): void {
    this.ship = { x: GAME_WIDTH / 2, y: GAME_HEIGHT + 260, vx: 0, vy: -1100, tilt: 0, wobble: 0 };
    this.flame = this.add.image(0, 0, 'rocket-flame').setOrigin(0.5, 0).setScale(SHIP.scale).setDepth(DEPTH.ship - 1);
    this.back = this.add.image(0, 0, 'rocket').setScale(SHIP.scale).setDepth(DEPTH.ship);
    this.front = this.add.image(0, 0, 'rocket-front').setScale(SHIP.scale).setDepth(DEPTH.ship + 0.3);
    data.kids.slice(0, ROCKET.seats).forEach(({ def, outfit }, i) => {
      const kid = new Kid(this, def, 0, 0).setScale(SHIP.scale * ROCKET.kidScale);
      kid.setOutfit(outfit);
      kid.disableInteractive();
      kid.setDepth(DEPTH.ship + (ROCKET_ART.seats[i].front ? 0.2 : 0.1));
      this.kids.push(kid);
    });
    this.placeShip();
  }

  // --- Eingabe ---------------------------------------------------------------------------

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.leaving) return;
      if (Phaser.Math.Distance.Between(p.x, p.y, EARTH.x, EARTH.y) < EARTH.radius + 40) {
        this.leave();
        return;
      }
      const s = this.ship;
      if (!this.steer && Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) < SHIP.grabRadius) {
        this.steer = { id: p.id, x: p.x, y: p.y };
        return;
      }
      this.shooters.set(p.id, { pointer: p, next: this.time.now + SHOT.repeat * 1000 });
      this.fire(p.x, p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.steer?.id === p.id) this.steer = { id: p.id, x: p.x, y: p.y };
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (this.steer?.id === p.id) this.steer = undefined;
      this.shooters.delete(p.id);
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  /** Zurück zur Erde (über der Wiese kommt die Rakete oben im Weltall an und sinkt). */
  private leave(): void {
    this.leaving = true;
    this.events.emit('sound', { kind: 'pop' });
    this.cameras.main.fade(350, 0, 0, 0, true);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.params.onDone());
  }

  // --- Ablauf ----------------------------------------------------------------------------

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.flyShip(dt);
    this.moveRocks(dt);
    this.moveShots(dt);
    this.keepShooting();
    this.collide();
    this.driftSky(dt);
    this.placeShip();
  }

  private flyShip(dt: number): void {
    const s = this.ship;
    if (this.steer) {
      let gx = (this.steer.x - s.x) * SHIP.pull;
      let gy = (this.steer.y - s.y) * SHIP.pull;
      const speed = Math.hypot(gx, gy);
      if (speed > SHIP.maxSpeed) {
        gx *= SHIP.maxSpeed / speed;
        gy *= SHIP.maxSpeed / speed;
      }
      const k = 1 - Math.exp(-SHIP.response * dt);
      s.vx += (gx - s.vx) * k;
      s.vy += (gy - s.vy) * k;
    } else {
      const f = Math.exp(-SHIP.friction * dt);
      s.vx *= f;
      s.vy *= f;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    // Die Rakete bleibt im Bild (beim Hereinfliegen von unten darf sie noch darunter sein)
    const m = SHIP.radius;
    if (s.x < m || s.x > GAME_WIDTH - m) {
      s.x = Phaser.Math.Clamp(s.x, m, GAME_WIDTH - m);
      s.vx = 0;
    }
    if (s.y < m) {
      s.y = m;
      s.vy = Math.max(0, s.vy);
    }
    if (s.y > GAME_HEIGHT - m && s.vy >= 0) {
      s.y = GAME_HEIGHT - m;
      s.vy = 0;
    }

    // Spitze: gelenkt in Flugrichtung, nach einem Schuss zum Ziel, sonst bleibt sie, wie sie ist
    let goal = s.tilt;
    if (this.steer && Math.hypot(s.vx, s.vy) > TURN_FROM_SPEED) goal = Math.atan2(s.vx, -s.vy);
    else if (this.aim && this.time.now < this.aim.until) goal = this.aim.tilt;
    s.tilt = Phaser.Math.Angle.Wrap(s.tilt + Phaser.Math.Angle.Wrap(goal - s.tilt) * (1 - Math.exp(-SHIP.turnRate * dt)));
    s.wobble *= Math.exp(-5 * dt);
  }

  /** Punkt an der Rakete (relativ zum Fußpunkt der Zeichnung, ungedreht) auf dem Bildschirm. */
  private at(dx: number, dy: number, tilt: number): { x: number; y: number } {
    const lx = dx * SHIP.scale;
    const ly = (dy + ROCKET_ART.height / 2) * SHIP.scale;
    const c = Math.cos(tilt);
    const sn = Math.sin(tilt);
    return { x: this.ship.x + lx * c - ly * sn, y: this.ship.y + lx * sn + ly * c };
  }

  /** Rakete, Flamme und Kinder an ihren Platz (Kinder schweben in der Kabine). */
  private placeShip(): void {
    const s = this.ship;
    const t = this.time.now / 1000;
    const tilt = s.tilt + Math.sin(t * 30) * s.wobble;
    this.back.setPosition(s.x, s.y).setRotation(tilt);
    this.front.setPosition(s.x, s.y).setRotation(tilt);
    const thrust = 0.3 + 0.9 * Phaser.Math.Clamp(Math.hypot(s.vx, s.vy) / SHIP.maxSpeed, 0, 1);
    const n = this.at(ROCKET_ART.nozzle.dx, ROCKET_ART.nozzle.dy, tilt);
    this.flame
      .setPosition(n.x, n.y)
      .setRotation(tilt)
      .setScale(SHIP.scale * (0.85 + 0.12 * Math.sin(t * 33)), SHIP.scale * thrust * (0.9 + 0.18 * Math.sin(t * 41)));
    this.kids.forEach((kid, i) => {
      const seat = ROCKET_ART.seats[i];
      const bob = 7 + 6 * Math.sin(t * 1.8 + i * 1.3);
      const hip = this.at(seat.dx, seat.dy - bob, tilt);
      const drop = kid.hipHeight();
      kid.setRotation(tilt).setPosition(hip.x - drop * Math.sin(tilt), hip.y + drop * Math.cos(tilt));
      kid.setActivity('rocket', { float: 1 });
    });
  }

  // --- Schüsse ---------------------------------------------------------------------------

  /** Leuchtender Stern von der Rakete zum Finger. */
  private fire(tx: number, ty: number): void {
    if (this.shots.length >= SHOT.max) return;
    const s = this.ship;
    const dx = tx - s.x;
    const dy = ty - s.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const ux = dx / d;
    const uy = dy / d;
    this.aim = { tilt: Math.atan2(ux, -uy), until: this.time.now + AIM_HOLD };
    const img = this.add.image(s.x + ux * SHIP.radius * 0.8, s.y + uy * SHIP.radius * 0.8, 'astro-shot').setDepth(DEPTH.shots);
    img.setBlendMode(Phaser.BlendModes.ADD);
    this.shots.push({ img, vx: ux * SHOT.speed + s.vx * 0.3, vy: uy * SHOT.speed + s.vy * 0.3, age: 0 });
    this.events.emit('sound', { kind: 'zap' });
  }

  /** Finger bleibt liegen: immer wieder ein Schuss dorthin, wo er gerade ist. */
  private keepShooting(): void {
    const now = this.time.now;
    for (const sh of this.shooters.values()) {
      if (!sh.pointer.isDown || now < sh.next) continue;
      sh.next = now + SHOT.repeat * 1000;
      this.fire(sh.pointer.x, sh.pointer.y);
    }
  }

  private moveShots(dt: number): void {
    for (const shot of [...this.shots]) {
      shot.age += dt;
      shot.img.x += shot.vx * dt;
      shot.img.y += shot.vy * dt;
      shot.img.rotation += dt * 8;
      const out = shot.img.x < -50 || shot.img.x > GAME_WIDTH + 50 || shot.img.y < -50 || shot.img.y > GAME_HEIGHT + 50;
      if (shot.age > SHOT.life || out) this.removeShot(shot);
      else shot.img.setAlpha(Math.min(1, (SHOT.life - shot.age) * 6));
    }
  }

  private removeShot(shot: Shot): void {
    this.shots = this.shots.filter((s) => s !== shot);
    shot.img.destroy();
  }

  // --- Asteroiden ------------------------------------------------------------------------

  private startWave(): void {
    if (this.leaving) return;
    const count = Math.min(WAVES.max, WAVES.first + this.wave);
    this.wave++;
    this.glitterCount = 0;
    this.between = false;
    for (let i = 0; i < count; i++) {
      // Irgendwo im Bild, aber mit Abstand zur Rakete (und nicht auf der Erde)
      let x = 0;
      let y = 0;
      for (let tries = 0; tries < 30; tries++) {
        x = Phaser.Math.Between(150, GAME_WIDTH - 150);
        y = Phaser.Math.Between(150, GAME_HEIGHT - 150);
        const farFromShip = Phaser.Math.Distance.Between(x, y, this.ship.x, this.ship.y) > SPAWN_CLEARANCE;
        const farFromEarth = Phaser.Math.Distance.Between(x, y, EARTH.x, EARTH.y) > 320;
        if (farFromShip && farFromEarth) break;
      }
      const a = Math.random() * Math.PI * 2;
      this.addRock(0, x, y, a);
    }
  }

  private addRock(size: RockSize, x: number, y: number, angle: number, fade = true): void {
    const def = ROCK_SIZES[size];
    const speed = Phaser.Math.Between(def.speed[0], def.speed[1]);
    const img = this.add.image(x, y, `rock-${size}-${Phaser.Math.Between(0, ROCK_SHAPES - 1)}`).setDepth(DEPTH.rocks + Math.random());
    img.setRotation(Math.random() * Math.PI * 2);
    const rock: Rock = {
      size,
      img,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: Phaser.Math.FloatBetween(-1, 1) * (0.4 + size * 0.4),
      calmUntil: this.time.now + (fade ? SPAWN_FADE : 250),
    };
    if (fade) this.tweens.add({ targets: img, alpha: { from: 0, to: 1 }, scale: { from: 0.4, to: 1 }, duration: SPAWN_FADE, ease: 'Back.easeOut' });
    this.rocks.push(rock);
  }

  /** Steine fliegen geradeaus und drehen sich; am Rand hinaus = gegenüber wieder herein. */
  private moveRocks(dt: number): void {
    for (const rock of this.rocks) {
      const r = ROCK_SIZES[rock.size].radius;
      const img = rock.img;
      img.x += rock.vx * dt;
      img.y += rock.vy * dt;
      img.rotation += rock.spin * dt;
      if (img.x < -r) img.x += GAME_WIDTH + 2 * r;
      else if (img.x > GAME_WIDTH + r) img.x -= GAME_WIDTH + 2 * r;
      if (img.y < -r) img.y += GAME_HEIGHT + 2 * r;
      else if (img.y > GAME_HEIGHT + r) img.y -= GAME_HEIGHT + 2 * r;
    }
  }

  private collide(): void {
    const now = this.time.now;
    for (const rock of [...this.rocks]) {
      const r = ROCK_SIZES[rock.size].radius;
      if (now < rock.calmUntil) continue;
      // Treffer (großzügig)
      const shot = this.shots.find((s) => Phaser.Math.Distance.Between(s.img.x, s.img.y, rock.img.x, rock.img.y) < r + SHOT.radius);
      if (shot) {
        const d = Math.hypot(shot.vx, shot.vy) || 1;
        this.removeShot(shot);
        this.hit(rock, shot.vx / d, shot.vy / d);
        continue;
      }
      // Zusammenstoß mit der Rakete: beide werden auseinandergeschubst
      const s = this.ship;
      const dx = rock.img.x - s.x;
      const dy = rock.img.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < r * 0.85 + SHIP.radius && d > 0) this.bump(rock, dx / d, dy / d);
    }
  }

  private bump(rock: Rock, nx: number, ny: number): void {
    const s = this.ship;
    const speed = Math.max(Math.hypot(rock.vx, rock.vy), SHIP.bump * 0.5);
    rock.vx = nx * speed;
    rock.vy = ny * speed;
    rock.calmUntil = this.time.now + 500;
    s.vx -= nx * SHIP.bump;
    s.vy -= ny * SHIP.bump;
    s.wobble = 0.12;
    this.events.emit('sound', { kind: 'bonk' });
    this.crumbs.emitParticleAt(s.x + nx * SHIP.radius, s.y + ny * SHIP.radius, 5);
    this.kids.forEach((kid) => kid.brace(-nx));
  }

  /** Getroffen: groß → zwei mittlere, mittel → zwei kleine, klein → Glitzer. */
  private hit(rock: Rock, ux: number, uy: number): void {
    const { x, y } = rock.img;
    const r = ROCK_SIZES[rock.size].radius;
    this.rocks = this.rocks.filter((k) => k !== rock);
    this.tweens.killTweensOf(rock.img);
    rock.img.destroy();
    if (rock.size < 2) {
      const next = (rock.size + 1) as RockSize;
      this.events.emit('sound', { kind: 'crack', pitch: ROCK_SIZES[rock.size].pitch });
      this.crumbs.emitParticleAt(x, y, 10 - rock.size * 4);
      this.sparkles.emitParticleAt(x, y, 6);
      // Die zwei Teile fliegen schräg zur Schussrichtung auseinander
      const base = Math.atan2(uy, ux);
      for (const side of [-1, 1]) {
        const a = base + side * Phaser.Math.FloatBetween(0.6, 1.1);
        this.addRock(next, x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, a, false);
      }
    } else {
      this.events.emit('sound', { kind: 'sparkle', pitch: Math.min(7, this.glitterCount) });
      this.glitterCount++;
      this.sparkles.emitParticleAt(x, y, 22);
    }
    if (this.rocks.length === 0 && !this.between) this.waveDone();
  }

  /** Alle Steine weg: Jubel, ein goldener Stern oben, Ufo fliegt vorbei, dann die nächste Welle. */
  private waveDone(): void {
    this.between = true;
    this.time.delayedCall(350, () => {
      if (this.leaving) return;
      this.events.emit('sound', { kind: 'wave-done' });
      this.kids.forEach((kid, i) => this.time.delayedCall(i * 120, () => kid.cheer()));
      this.addWaveStar();
      this.ufoFlyBy();
    });
    this.time.delayedCall(WAVES.pause, () => this.startWave());
  }

  /** Goldener Stern fliegt von der Rakete nach oben in die Reihe. */
  private addWaveStar(): void {
    if (this.waveStars >= WAVE_STARS_MAX) {
      this.sparkles.emitParticleAt(this.ship.x, this.ship.y, 30);
      return;
    }
    const gap = GOLD_STAR_SIZE + 14;
    const i = this.waveStars++;
    const x = GAME_WIDTH / 2 - ((WAVE_STARS_MAX - 1) * gap) / 2 + i * gap;
    const star = this.add.image(this.ship.x, this.ship.y, 'gold-star').setDepth(DEPTH.ui).setScale(2);
    this.tweens.add({
      targets: star,
      x,
      y: 56,
      scale: 1,
      angle: 360,
      duration: 900,
      ease: 'Cubic.easeInOut',
      onComplete: () => this.sparkles.emitParticleAt(x, 56, 10),
    });
  }

  /** Zwischen zwei Wellen: Ufo mit Alien zieht oben vorbei und piept. */
  private ufoFlyBy(): void {
    const fromLeft = this.wave % 2 === 1;
    const x0 = fromLeft ? -200 : GAME_WIDTH + 200;
    const ufo = this.add
      .container(x0, 240, [this.add.image(0, 0, 'ufo-dome'), this.add.image(0, -40, 'alien'), this.add.image(0, 0, 'ufo')])
      .setScale(0.6)
      .setDepth(DEPTH.planets + 1);
    this.tweens.add({ targets: ufo, y: 200, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({
      targets: ufo,
      x: fromLeft ? GAME_WIDTH + 200 : -200,
      duration: 4200,
      ease: 'Sine.easeInOut',
      onComplete: () => ufo.destroy(),
    });
    this.time.delayedCall(1600, () => this.events.emit('sound', { kind: 'ufo' }));
  }

  /** Sterne und Planeten ziehen gegen die Flugrichtung (nah schneller), am Rand herum. */
  private driftSky(dt: number): void {
    const t = this.time.now / 1000;
    const s = this.ship;
    const move = (list: { img: Phaser.GameObjects.Image; depth: number }[], margin: number) => {
      for (const { img, depth } of list) {
        img.x -= s.vx * depth * dt * 5;
        img.y -= s.vy * depth * dt * 5;
        if (img.x < -margin) img.x += GAME_WIDTH + 2 * margin;
        else if (img.x > GAME_WIDTH + margin) img.x -= GAME_WIDTH + 2 * margin;
        if (img.y < -margin) img.y += GAME_HEIGHT + 2 * margin;
        else if (img.y > GAME_HEIGHT + margin) img.y -= GAME_HEIGHT + 2 * margin;
      }
    };
    move(this.stars, 10);
    move(this.planets, 300);
    this.stars.forEach(({ img }, i) => img.setAlpha(0.55 + 0.45 * Math.sin(t * (1.5 + (i % 5) * 0.4) + i)));
  }
}
