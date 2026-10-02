import Phaser from 'phaser';
import { DEPTH_DRAGGING, DEPTH_LIGHTS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { MAX_PHOTOS, PHOTO, PHOTO_LINE } from '../data/photos';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import { loadPhotos, savePhotos } from '../save/photos';

// Die Leine hängt vor dem Zaun (und den Büschen), aber hinter allem auf der Wiese.
const LINE_DEPTH = -993;
// Großansicht und Blitz liegen über der Tageszeit-Einfärbung (sonst wären sie nachts dunkel).
const VIEWER_DEPTH = 9_500;
const FLASH_DEPTH = DEPTH_LIGHTS + 10;

interface Hanging {
  key: string;
  data: string;
  view: Phaser.GameObjects.Container;
}

/**
 * Fotos der Kamera: Der Ausschnitt vor dem Kind wird zum Sofortbild, das aus der Kamera kommt, sich
 * langsam entwickelt und an die Fotoleine unter der Pergola fliegt (höchstens MAX_PHOTOS, das älteste
 * fällt herunter). Foto an der Leine antippen = groß ansehen, nochmal tippen = zu.
 * Gespeichert in einem eigenen localStorage-Eintrag (src/save/photos.ts).
 */
export class Photos {
  private hanging: Hanging[] = [];
  private counter = 0;
  private viewer?: Phaser.GameObjects.Container;

  constructor(private readonly scene: PlaygroundScene) {
    scene.add.image(PHOTO_LINE.left - 10, PHOTO_LINE.y - 12, 'photo-line').setOrigin(0).setDepth(LINE_DEPTH);
    // Gespeicherte Fotos der Reihe nach wieder aufhängen
    const saved = loadPhotos().slice(-MAX_PHOTOS);
    const load = (i: number) => {
      if (i >= saved.length) return;
      this.makeFrame(saved[i], (key) => {
        this.hang(key, saved[i], false);
        load(i + 1);
      });
    };
    load(0);
  }

  /**
   * Fotografiert, was vor (x, y) in Blickrichtung dir zu sehen ist. Das Sofortbild kommt bei
   * `from` (Kamera) heraus.
   */
  take(x: number, y: number, dir: number, from: { x: number; y: number }): void {
    const cam = this.scene.cameras.main;
    const V = PHOTO.view;
    // Ausschnitt in Bildschirmkoordinaten, im Bild gehalten
    const sx = Phaser.Math.Clamp(Math.round(x + dir * V.ahead - V.width / 2 - cam.scrollX), 0, GAME_WIDTH - V.width);
    const sy = Phaser.Math.Clamp(Math.round(y - V.up - V.height / 2 - cam.scrollY), 0, GAME_HEIGHT - V.height);
    this.scene.game.renderer.snapshotArea(sx, sy, V.width, V.height, (snap) => {
      // Erst nach der Aufnahme blitzen, sonst wäre das Foto weiß
      this.flash(from);
      if (!(snap instanceof HTMLImageElement)) return;
      const data = this.thumbData(snap);
      if (data) this.makeFrame(data, (key) => this.popOut(key, data, from));
    });
  }

  // --- Bild und Rahmen -------------------------------------------------------

  /** Verkleinert die Aufnahme fürs Speichern. */
  private thumbData(img: HTMLImageElement): string | null {
    const { width, height } = PHOTO.thumb;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/webp', PHOTO.quality);
  }

  /** Baut aus dem Bild ein Sofortbild mit weißem Rand und legt es als Textur an. */
  private makeFrame(data: string, done: (key: string) => void): void {
    const img = new Image();
    img.onload = () => {
      const F = PHOTO.frame;
      const canvas = document.createElement('canvas');
      canvas.width = F.width;
      canvas.height = F.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#fbfaf4';
      ctx.fillRect(0, 0, F.width, F.height);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, F.width - 2, F.height - 2);
      const w = F.width - 2 * F.border;
      ctx.drawImage(img, F.border, F.border, w, (w * PHOTO.thumb.height) / PHOTO.thumb.width);
      const key = `photo-${this.counter++}`;
      this.scene.textures.addCanvas(key, canvas);
      done(key);
    };
    img.src = data;
  }

  // --- Leine -----------------------------------------------------------------

  /** Wo das i-te Foto an der Leine hängt (Klammer oben Mitte). */
  private slot(i: number): { x: number; y: number } {
    const t = (i + 0.5) / MAX_PHOTOS;
    return {
      x: PHOTO_LINE.left + (PHOTO_LINE.right - PHOTO_LINE.left) * t,
      y: PHOTO_LINE.y + Math.sin(Math.PI * t) * PHOTO_LINE.sag,
    };
  }

  /** Sofortbild an einem Container mit Klammer oben (Ursprung = Klammer). */
  private makeView(key: string): Phaser.GameObjects.Container {
    const img = this.scene.add.image(0, 0, key).setOrigin(0.5, 0);
    const peg = this.scene.add.image(0, 8, 'photo-peg').setOrigin(0.5, 1);
    return this.scene.add.container(0, 0, [img, peg]);
  }

  /** Neues Foto kommt aus der Kamera, entwickelt sich und fliegt an die Leine. */
  private popOut(key: string, data: string, from: { x: number; y: number }): void {
    const F = PHOTO.frame;
    const view = this.makeView(key);
    (view.list[1] as Phaser.GameObjects.Image).setVisible(false); // Klammer erst an der Leine
    // Weiß, das langsam verschwindet: das Bild entwickelt sich
    const w = F.width - 2 * F.border;
    const develop = this.scene.add
      .rectangle(-F.width / 2 + F.border, F.border, w, (w * PHOTO.thumb.height) / PHOTO.thumb.width, 0xf4f1e8)
      .setOrigin(0);
    view.add(develop);
    view.setPosition(from.x, from.y).setScale(0).setDepth(DEPTH_DRAGGING - 1).setAngle(-6);
    this.scene.tweens.add({ targets: view, scale: PHOTO.popScale, y: from.y - 160, angle: 4, duration: 450, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: develop,
      alpha: 0,
      delay: 300,
      duration: PHOTO.developMs,
      ease: 'Sine.easeIn',
      onComplete: () => {
        develop.destroy();
        this.addToLine({ key, data, view });
      },
    });
  }

  private addToLine(h: Hanging): void {
    while (this.hanging.length >= MAX_PHOTOS) this.dropOldest();
    this.hanging.push(h);
    this.save();
    const target = this.slot(this.hanging.length - 1);
    const dist = Phaser.Math.Distance.Between(h.view.x, h.view.y, target.x, target.y);
    this.scene.tweens.add({
      targets: h.view,
      x: target.x,
      y: target.y,
      scale: PHOTO.lineScale,
      angle: Phaser.Math.Between(-5, 5),
      duration: Phaser.Math.Clamp(dist * 0.6, 500, 1600),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        h.view.setDepth(LINE_DEPTH + 0.5);
        (h.view.list[1] as Phaser.GameObjects.Image).setVisible(true);
        this.makeTappable(h);
        this.scene.events.emit('sound', { kind: 'photo', x: target.x });
      },
    });
    this.layout();
  }

  /** Hängt ein (gespeichertes) Foto ohne Flug auf. */
  private hang(key: string, data: string, animate: boolean): void {
    const h: Hanging = { key, data, view: this.makeView(key) };
    const p = this.slot(this.hanging.length);
    h.view.setPosition(p.x, p.y).setScale(PHOTO.lineScale).setDepth(LINE_DEPTH + 0.5).setAngle(Phaser.Math.Between(-5, 5));
    this.hanging.push(h);
    this.makeTappable(h);
    if (animate) this.layout();
  }

  private makeTappable(h: Hanging): void {
    const F = PHOTO.frame;
    const pad = 110; // in Textur-px, wird mit verkleinert (an der Leine ~ 34 px)
    const w = F.width + 2 * pad;
    const h2 = F.height + 2 * pad;
    h.view.setSize(w, h2);
    // Container rechnen die Touch-Fläche ab ihrer Mitte; das Foto hängt unter der Klammer (y 0 … F.height)
    h.view.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, F.height / 2, w, h2),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    h.view.setData('scenery', true);
    h.view.setData('onTap', () => this.show(h.key));
  }

  /** Rückt die Fotos an ihre Plätze (nachdem das älteste heruntergefallen ist). */
  private layout(): void {
    this.hanging.forEach((h, i) => {
      if (!h.view.input) return; // fliegt noch
      const p = this.slot(i);
      this.scene.tweens.add({ targets: h.view, x: p.x, y: p.y, duration: 350, ease: 'Sine.easeInOut' });
    });
  }

  private dropOldest(): void {
    const old = this.hanging.shift();
    if (!old) return;
    old.view.disableInteractive();
    this.scene.tweens.add({
      targets: old.view,
      y: old.view.y + 260,
      angle: old.view.angle + Phaser.Math.Between(-60, 60),
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeIn',
      onComplete: () => {
        old.view.destroy();
        if (this.scene.textures.exists(old.key)) this.scene.textures.remove(old.key);
      },
    });
  }

  private save(): void {
    savePhotos(this.hanging.map((h) => h.data));
  }

  // --- Blitz und Großansicht -------------------------------------------------

  private flash(at: { x: number; y: number }): void {
    const scene = this.scene;
    const screen = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.55)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(FLASH_DEPTH);
    scene.tweens.add({ targets: screen, alpha: 0, duration: 260, onComplete: () => screen.destroy() });
    const burst = scene.add.circle(at.x, at.y, 30, 0xffffff, 0.9).setDepth(FLASH_DEPTH);
    scene.tweens.add({ targets: burst, scale: 4, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
  }

  /** Großansicht eines Fotos; Antippen irgendwo schließt sie. */
  private show(key: string): void {
    if (this.viewer || !this.scene.textures.exists(key)) return;
    const scene = this.scene;
    scene.closeInventories();
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0);
    shade.setInteractive();
    const photo = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key).setScale(0.3).setAngle(-8);
    this.viewer = scene.add.container(0, 0, [shade, photo]).setScrollFactor(0).setDepth(VIEWER_DEPTH);
    scene.tweens.add({ targets: photo, scale: 3, angle: -2, duration: 350, ease: 'Back.easeOut' });
    scene.events.emit('sound', { kind: 'photo' });
    shade.setData('onTap', () => {
      const v = this.viewer;
      this.viewer = undefined;
      shade.disableInteractive();
      scene.tweens.add({ targets: v, alpha: 0, duration: 200, onComplete: () => v?.destroy() });
    });
  }
}
