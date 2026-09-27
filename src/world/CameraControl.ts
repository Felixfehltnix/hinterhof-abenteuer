import Phaser from 'phaser';
import { DRAG_THRESHOLD, GAME_WIDTH, WORLD_WIDTH } from '../config';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';

// Wie weit man über den Weltrand hinaus ziehen kann (federt dann zurück), px.
const RUBBER = 140;
// Bremsen des Schwungs nach dem Loslassen (pro Sekunde).
const FRICTION = 3.5;
// Wie schnell die Kamera vom Rand zurückfedert (pro Sekunde).
const SPRING = 10;

/**
 * Kamera über der breiten Wiese: Ein Finger auf der freien Wiese und waagerecht ziehen
 * scrollt die Welt, mit Schwung und weichem Rand. Die Position wird mitgespeichert.
 * Tippen ohne Ziehen bleibt ein Tippen (die Szene prüft dafür die Zieh-Distanz).
 */
export class CameraControl {
  private readonly cam: Phaser.Cameras.Scene2D.Camera;
  private gesture?: { id: number; startX: number; startScroll: number; lastX: number; lastT: number; moved: boolean };
  private velocity = 0; // px/s Kamera-Bewegung
  private scroll = 0; // eigene Position (darf beim Ziehen über den Rand hinaus)

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
    if (this.gesture?.moved) return;
    const dt = delta / 1000;
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
  }
}
