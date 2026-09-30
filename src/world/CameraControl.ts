import Phaser from 'phaser';
import { DRAG_THRESHOLD, GAME_HEIGHT, GAME_WIDTH, WORLD_WIDTH } from '../config';
import { ALTITUDE_MAX } from '../data/space';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';

// Wie weit man über den Weltrand hinaus ziehen kann (federt dann zurück), px.
const RUBBER = 140;
// Bremsen des Schwungs nach dem Loslassen (pro Sekunde).
const FRICTION = 3.5;
// Wie schnell die Kamera vom Rand zurückfedert (pro Sekunde).
const SPRING = 10;
// So schnell folgt die Kamera einem fliegenden Objekt (1/s).
const FOLLOW_RATE = 9;
// Ein verfolgtes Objekt bleibt in diesem Bereich des Bildschirms (Anteile von Breite/Höhe).
const FOLLOW_TOP = 0.14;
const FOLLOW_BOTTOM = 0.9;
const FOLLOW_SIDE = 0.22;

/** Was die Kamera verfolgen kann (z. B. die Rakete): Fußpunkt und Größe. */
export interface CameraTarget {
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  active: boolean;
}

/**
 * Kamera über der breiten Wiese: Ein Finger auf der freien Wiese und waagerecht ziehen
 * scrollt die Welt, mit Schwung und weichem Rand. Die Position wird mitgespeichert.
 * Tippen ohne Ziehen bleibt ein Tippen (die Szene prüft dafür die Zieh-Distanz).
 * Nach oben geht es nur mit etwas Fliegendem (Rakete, #75): `follow(obj)` hält es im Bild,
 * auch hoch über der Wiese bis ins Weltall; ohne Ziel sinkt die Kamera zurück auf die Wiese.
 */
export class CameraControl {
  private readonly cam: Phaser.Cameras.Scene2D.Camera;
  private gesture?: { id: number; startX: number; startScroll: number; lastX: number; lastT: number; moved: boolean };
  private velocity = 0; // px/s Kamera-Bewegung
  private scroll = 0; // eigene Position (darf beim Ziehen über den Rand hinaus)
  private scrollUp = 0; // senkrecht: 0 = Wiese, negativ = darüber
  private target?: CameraTarget;

  constructor(scene: PlaygroundScene) {
    this.cam = scene.cameras.main;
    // Grenzen selbst verwalten (Phasers setBounds würde hart abschneiden, wir wollen weich federn).
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.gesture || over.length > 0) return;
      this.gesture = { id: p.id, startX: p.x, startScroll: this.scroll, lastX: p.x, lastT: p.moveTime || p.downTime, moved: false };
      this.velocity = 0;
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    scene.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));
    scene.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, delta: number) => this.update(delta));

    scene.registerWorldState('camera', {
      save: () => Math.round(this.clamped(this.scroll)),
      load: (v) => {
        if (typeof v === 'number' && Number.isFinite(v)) this.jumpTo(v);
      },
    });
  }

  static get maxScroll(): number {
    return WORLD_WIDTH - GAME_WIDTH;
  }

  get scrollX(): number {
    return this.scroll;
  }

  /** Wie hoch die Kamera über der Wiese steht (px, 0 = auf der Wiese). */
  get altitude(): number {
    return -this.scrollUp;
  }

  /** Verfolgt ein fliegendes Objekt (undefined = keins mehr, die Kamera sinkt zurück). */
  follow(target: CameraTarget | undefined): void {
    this.target = target;
  }

  isFollowing(target: CameraTarget): boolean {
    return this.target === target;
  }

  /** Wird gerade mit dem Finger gescrollt? */
  get isDragging(): boolean {
    return !!this.gesture?.moved;
  }

  jumpTo(x: number): void {
    this.scroll = this.clamped(x);
    this.velocity = 0;
    this.apply();
  }

  /** Um dx verschieben, hart an den Weltgrenzen (z. B. Scrollen am Bildschirmrand, #35). */
  scrollBy(dx: number): void {
    this.scroll = this.clamped(this.scroll + dx);
    this.apply();
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const g = this.gesture;
    if (!g || p.id !== g.id) return;
    const dx = p.x - g.startX;
    if (!g.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!g.moved) {
      g.moved = true;
      g.startX = p.x;
      g.startScroll = this.scroll;
    }
    const raw = g.startScroll - (p.x - g.startX);
    this.scroll = this.rubber(raw);
    const dt = (p.moveTime - g.lastT) / 1000;
    if (dt > 0) this.velocity = -(p.x - g.lastX) / dt;
    g.lastX = p.x;
    g.lastT = p.moveTime;
    this.apply();
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const g = this.gesture;
    if (!g || p.id !== g.id) return;
    this.gesture = undefined;
    // Stand der Finger vor dem Loslassen still, gibt es keinen Schwung.
    if (!g.moved || p.upTime - g.lastT > 80) this.velocity = 0;
  }

  private update(delta: number): void {
    const dt = delta / 1000;
    this.updateVertical(dt);
    if (this.gesture?.moved) {
      this.apply();
      return;
    }
    this.followSideways(dt);
    const max = CameraControl.maxScroll;
    if (Math.abs(this.velocity) > 5) {
      this.scroll += this.velocity * dt;
      this.velocity *= Math.exp(-FRICTION * dt);
      // Über den Rand hinaus bremst es stark
      if (this.scroll < 0 || this.scroll > max) this.velocity *= Math.exp(-12 * dt);
    } else {
      this.velocity = 0;
    }
    // Weich zurückfedern
    const target = this.clamped(this.scroll);
    if (this.scroll !== target) {
      this.scroll += (target - this.scroll) * (1 - Math.exp(-SPRING * dt));
      if (Math.abs(target - this.scroll) < 0.5) this.scroll = target;
    }
    this.apply();
  }

  /** Senkrecht: das verfolgte Objekt im Bild halten, sonst zurück auf die Wiese. */
  private updateVertical(dt: number): void {
    const t = this.target;
    if (t && !t.active) this.target = undefined;
    let goal = 0;
    if (this.target) {
      const top = this.target.y - this.target.displayHeight;
      const lowest = this.target.y - FOLLOW_BOTTOM * GAME_HEIGHT;
      const highest = top - FOLLOW_TOP * GAME_HEIGHT;
      goal = Phaser.Math.Clamp(this.scrollUp, lowest, Math.max(lowest, highest));
    }
    goal = Phaser.Math.Clamp(goal, -ALTITUDE_MAX, 0);
    this.scrollUp += (goal - this.scrollUp) * (1 - Math.exp(-FOLLOW_RATE * dt));
    if (Math.abs(goal - this.scrollUp) < 0.5) this.scrollUp = goal;
  }

  /** Waagerecht: fliegt das verfolgte Objekt an den Rand, scrollt die Welt mit. */
  private followSideways(dt: number): void {
    const t = this.target;
    if (!t) return;
    const left = t.x - t.displayWidth / 2 - FOLLOW_SIDE * GAME_WIDTH;
    const right = t.x + t.displayWidth / 2 - (1 - FOLLOW_SIDE) * GAME_WIDTH;
    const goal = this.clamped(Phaser.Math.Clamp(this.scroll, right, Math.max(right, left)));
    if (goal === this.scroll) return;
    this.velocity = 0;
    this.scroll += (goal - this.scroll) * (1 - Math.exp(-FOLLOW_RATE * dt));
  }

  /** Über den Rand hinaus nur gebremst (Gummiband). */
  private rubber(x: number): number {
    const max = CameraControl.maxScroll;
    if (x < 0) return -RUBBER * (1 - Math.exp(x / RUBBER));
    if (x > max) return max + RUBBER * (1 - Math.exp(-(x - max) / RUBBER));
    return x;
  }

  private clamped(x: number): number {
    return Phaser.Math.Clamp(x, 0, CameraControl.maxScroll);
  }

  private apply(): void {
    this.cam.scrollX = Math.round(this.scroll * 10) / 10;
    this.cam.scrollY = Math.round(this.scrollUp * 10) / 10;
  }
}
