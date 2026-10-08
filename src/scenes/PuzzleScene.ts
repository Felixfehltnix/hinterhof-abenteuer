import Phaser from 'phaser';
import {
  advancePuzzle,
  BOARD,
  PIECE,
  PILES,
  PUZZLE_LAYOUT,
  PUZZLE_LEVEL_UP,
  PUZZLE_LEVELS,
  PUZZLE_PICTURES,
  PUZZLE_TIMING,
  type PuzzleProgress,
} from '../data/puzzle';
import { drawPicturePlaceholder, PUZZLE_STAR_SIZE } from './placeholders/puzzle';

/** Was die Wiese dem Puzzle mitgibt: Fortschritt und wohin Änderungen gehen. */
export interface PuzzleData {
  progress: PuzzleProgress;
  /** Fortschritt hat sich geändert (Bild gelöst, Stufe gewählt). */
  onProgress(progress: PuzzleProgress): void;
  /** Holzschild angetippt: zurück auf die Wiese. */
  onDone(): void;
}

interface Piece {
  col: number;
  row: number;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  /** Mitte des Platzes im Rahmen. */
  homeX: number;
  homeY: number;
  placed: boolean;
}

/** Ein Teilrand: von wo, wohin, nach außen zeigend, mit Nase (1), Loch (−1) oder gerade (0). */
type Edge = (ctx: CanvasRenderingContext2D) => void;

const DEPTH = { board: 10, ghost: 11, slots: 12, placed: 20, complete: 25, loose: 100, ui: 1000, fx: 1100 };
const PIECE_PREFIX = 'puzzle-piece-';
const SLOTS_KEY = 'puzzle-slots';

const photoKey = (picture: number) => `puzzle-${PUZZLE_PICTURES[picture]}`;

/**
 * Puzzle mit Tierfotos: Das Bild zeigt sich kurz ganz, zerfällt in Teile, die links und rechts liegen
 * bleiben. Teile auf ihren Platz im Rahmen ziehen (rastet großzügig ein, jedes Teil einen Ton höher).
 * Fertig = Jubel mit Sternen, dann das nächste Bild. Oben die Stufen (mehr Kästchen = mehr Teile);
 * nach `PUZZLE_LEVEL_UP` Bildern kommt die nächste dazu. Mehrere Finger gleichzeitig gehen.
 */
export class PuzzleScene extends Phaser.Scene {
  private params!: PuzzleData;
  private progress!: PuzzleProgress;
  private pieces: Piece[] = [];
  private byImage = new Map<Phaser.GameObjects.GameObject, Piece>();
  private ghost!: Phaser.GameObjects.Image;
  private slots?: Phaser.GameObjects.Image;
  private complete!: Phaser.GameObjects.Image;
  private levelButtons: Phaser.GameObjects.Container[] = [];
  private levelGlow!: Phaser.GameObjects.Image;
  private marks: Phaser.GameObjects.Image[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  /** Zählt jeden Neustart; späte Rückrufe eines alten Bildes erkennen sich daran. */
  private round = 0;
  private topDepth = DEPTH.loose;
  private placedCount = 0;
  private looseScale = 1;
  private cell = { w: 0, h: 0 };
  private photo?: string;
  private leaving = false;

  constructor() {
    super('Puzzle');
  }

  create(data: PuzzleData): void {
    this.params = data;
    this.progress = { ...data.progress };
    this.pieces = [];
    this.byImage.clear();
    this.levelButtons = [];
    this.marks = [];
    this.timers = [];
    this.slots = undefined;
    this.photo = undefined;
    this.leaving = false;

    // Töne spielt die Wiese (dort lebt der AudioContext)
    const playground = this.scene.get('Playground');
    this.events.off('sound');
    this.events.on('sound', (e: unknown) => playground.events.emit('sound', e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    this.add.image(0, 0, 'puzzle-bg').setOrigin(0);
    this.add.image(BOARD.x - BOARD.frame, BOARD.y - BOARD.frame, 'puzzle-board').setOrigin(0).setDepth(DEPTH.board);
    this.ghost = this.add.image(BOARD.x, BOARD.y, '__DEFAULT').setOrigin(0).setDepth(DEPTH.ghost).setVisible(false);
    this.complete = this.add.image(BOARD.x, BOARD.y, '__DEFAULT').setOrigin(0).setDepth(DEPTH.complete).setVisible(false);

    // Ausgang: Holzschild (großzügige Touch-Fläche)
    const E = PUZZLE_LAYOUT.exit;
    this.add.image(E.x, E.y, 'chalk-sign').setOrigin(0).setDepth(DEPTH.ui);
    this.add
      .zone(E.x - 20, E.y - 20, E.w + 60, E.h + 60)
      .setOrigin(0)
      .setDepth(DEPTH.ui + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.leave());

    this.buildLevels();
    this.setupInput();
    this.startPuzzle();
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  update(): void {
    // Schatten folgen den losen Teilen
    for (const p of this.pieces) {
      if (!p.shadow.visible) continue;
      const s = p.img.scale;
      p.shadow.setPosition(p.img.x + 6 * s, p.img.y + 10 * s).setScale(s).setDepth(p.img.depth - 0.5);
    }
  }

  // --- Stufen oben ------------------------------------------------------------------------

  private levelX(i: number): number {
    const { gap } = PUZZLE_LAYOUT.levels;
    return 960 + (i - (PUZZLE_LEVELS.length - 1) / 2) * gap;
  }

  private buildLevels(): void {
    const { y, w, h } = PUZZLE_LAYOUT.levels;
    this.levelGlow = this.add.image(0, y, 'puzzle-level-glow').setDepth(DEPTH.ui - 1);
    PUZZLE_LEVELS.forEach((_, i) => {
      const c = this.add.container(this.levelX(i), y).setDepth(DEPTH.ui);
      c.add(this.add.image(0, 0, `puzzle-level-${i}`));
      c.setSize(w + 20, h + 20).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => this.chooseLevel(i));
      this.levelButtons.push(c);
    });
    this.refreshLevels();
  }

  /** Erreichte Stufen hell, die anderen blass; unter der höchsten: wie viele Bilder bis zur nächsten. */
  private refreshLevels(): void {
    const { y, h } = PUZZLE_LAYOUT.levels;
    this.levelButtons.forEach((c, i) => c.setAlpha(i <= this.progress.unlocked ? 1 : 0.3));
    this.levelGlow.setPosition(this.levelX(this.progress.level) - 2, PUZZLE_LAYOUT.levels.y - 3);
    this.marks.forEach((m) => m.destroy());
    this.marks = [];
    const top = this.progress.unlocked;
    if (top >= PUZZLE_LEVELS.length - 1) return;
    for (let k = 0; k < PUZZLE_LEVEL_UP; k++) {
      const x = this.levelX(top) + (k - (PUZZLE_LEVEL_UP - 1) / 2) * (PUZZLE_STAR_SIZE * 0.75);
      const key = k < this.progress.streak ? 'puzzle-star' : 'puzzle-dot';
      this.marks.push(this.add.image(x, y + h / 2 + 22, key).setScale(0.7).setDepth(DEPTH.ui));
    }
  }

  private chooseLevel(i: number): void {
    if (this.leaving) return;
    const c = this.levelButtons[i];
    if (i > this.progress.unlocked) {
      // Noch nicht erreicht: wackelt nur
      this.tweens.add({ targets: c, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => c.setAngle(0) });
      this.events.emit('sound', { kind: 'click' });
      return;
    }
    this.tweens.add({ targets: c, scale: { from: 1.15, to: 1 }, duration: 200 });
    if (i === this.progress.level) return;
    this.progress.level = i;
    this.params.onProgress({ ...this.progress });
    this.events.emit('sound', { kind: 'puzzle-pick' });
    this.refreshLevels();
    this.startPuzzle();
  }

  // --- Ein Bild ---------------------------------------------------------------------------

  /** Räumt das alte Bild weg und lädt das nächste (Fotos werden erst bei Bedarf geladen). */
  private startPuzzle(): void {
    const round = ++this.round;
    this.timers.forEach((t) => t.remove());
    this.timers = [];
    this.clearPieces();
    this.ghost.setVisible(false);
    this.complete.setVisible(false);

    const key = photoKey(this.progress.picture);
    const ready = () => {
      if (round !== this.round || this.leaving) return;
      if (!this.textures.exists(key)) this.makePlaceholder(key);
      this.ghost.setTexture('__DEFAULT');
      this.complete.setTexture('__DEFAULT');
      // Das vorige Foto wird nicht mehr gebraucht (spart Speicher auf dem Tablet)
      if (this.photo && this.photo !== key) this.textures.remove(this.photo);
      this.photo = key;
      this.showPicture(round);
    };
    if (this.textures.exists(key)) {
      ready();
      return;
    }
    this.load.image(key, `assets/puzzle/${PUZZLE_PICTURES[this.progress.picture]}.webp`);
    this.load.once(Phaser.Loader.Events.COMPLETE, ready);
    this.load.start();
  }

  private makePlaceholder(key: string): void {
    const g = this.add.graphics();
    drawPicturePlaceholder(g, this.progress.picture);
    g.generateTexture(key, BOARD.w, BOARD.h);
    g.destroy();
  }

  /** Das Bild liegt erst ganz im Rahmen, dann fallen die Teile heraus auf die Stapel. */
  private showPicture(round: number): void {
    const key = this.photo!;
    const level = PUZZLE_LEVELS[this.progress.level];
    this.complete.setTexture(key).setDisplaySize(BOARD.w, BOARD.h).setAlpha(1).setVisible(true);
    this.ghost.setTexture(key).setDisplaySize(BOARD.w, BOARD.h).setAlpha(level.ghost).setVisible(level.ghost > 0);
    this.cutPieces(key);
    this.complete.setDepth(DEPTH.loose + 1000);
    this.later(PUZZLE_TIMING.preview, round, () => {
      this.complete.setVisible(false).setDepth(DEPTH.complete);
      this.scatter();
    });
  }

  /** Zuschnitt: Ränder mit zufälligen Nasen, je Teil eine Canvas-Textur, dazu die Umrisse im Rahmen. */
  private cutPieces(photo: string): void {
    const level = PUZZLE_LEVELS[this.progress.level];
    const { cols, rows } = level;
    const cw = BOARD.w / cols;
    const ch = BOARD.h / rows;
    this.cell = { w: cw, h: ch };
    const tab = PIECE.tab * Math.min(cw, ch);
    const margin = Math.ceil(tab * 1.15) + 4;
    // Zwischen zwei Teilen: 1 = Nase zeigt nach rechts/unten, −1 = nach links/oben
    const flip = () => (Math.random() < 0.5 ? 1 : -1);
    const vertical = Array.from({ length: rows }, () => Array.from({ length: cols + 1 }, flip));
    const horizontal = Array.from({ length: rows + 1 }, () => Array.from({ length: cols }, flip));
    const outline = (c: number, r: number, ox: number, oy: number): Edge => (ctx) => {
      const top = r === 0 ? 0 : -horizontal[r][c];
      const right = c === cols - 1 ? 0 : vertical[r][c + 1];
      const bottom = r === rows - 1 ? 0 : horizontal[r + 1][c];
      const left = c === 0 ? 0 : -vertical[r][c];
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      edge(ctx, ox, oy, ox + cw, oy, 0, -1, top, tab);
      edge(ctx, ox + cw, oy, ox + cw, oy + ch, 1, 0, right, tab);
      edge(ctx, ox + cw, oy + ch, ox, oy + ch, 0, 1, bottom, tab);
      edge(ctx, ox, oy + ch, ox, oy, -1, 0, left, tab);
      ctx.closePath();
    };

    const src = this.textures.get(photo).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const k = src.width / BOARD.w;
    const tw = Math.ceil(cw + margin * 2);
    const th = Math.ceil(ch + margin * 2);
    this.looseScale = Math.min(1, PIECE.looseMax / (Math.max(cw, ch) + tab * 2));

    // Umrisse aller Plätze im Rahmen (zeigen, wo welches Teil hingehört)
    if (this.textures.exists(SLOTS_KEY)) this.textures.remove(SLOTS_KEY);
    const slots = this.textures.createCanvas(SLOTS_KEY, BOARD.w + 8, BOARD.h + 8)!;
    const sctx = slots.context;
    sctx.lineWidth = 3;
    sctx.strokeStyle = 'rgba(122, 78, 38, 0.5)';
    sctx.lineJoin = 'round';

    let n = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        outline(c, r, 4 + c * cw, 4 + r * ch)(sctx);
        sctx.stroke();

        const key = `${PIECE_PREFIX}${n++}`;
        if (this.textures.exists(key)) this.textures.remove(key);
        const tex = this.textures.createCanvas(key, tw, th)!;
        const ctx = tex.context;
        const path = outline(c, r, margin, margin);
        ctx.save();
        path(ctx);
        ctx.clip();
        ctx.drawImage(src, (c * cw - margin) * k, (r * ch - margin) * k, tw * k, th * k, 0, 0, tw, th);
        // Heller Rand innen: sieht aus wie eine dicke Pappe
        ctx.lineWidth = 7;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.stroke();
        ctx.restore();
        path(ctx);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(70, 45, 20, 0.8)';
        ctx.lineJoin = 'round';
        ctx.stroke();
        tex.refresh();

        const homeX = BOARD.x + c * cw + cw / 2;
        const homeY = BOARD.y + r * ch + ch / 2;
        const origin = { x: (margin + cw / 2) / tw, y: (margin + ch / 2) / th };
        const shadow = this.add.image(homeX, homeY, key).setOrigin(origin.x, origin.y).setTintFill(0x000000).setAlpha(0.28).setVisible(false);
        const img = this.add.image(homeX, homeY, key).setOrigin(origin.x, origin.y).setDepth(DEPTH.placed).setVisible(false);
        // Anfassen: die Zelle plus etwas Rand (die Nasen gehören zum Nachbarn dazu, das ist egal)
        const pad = tab * 0.25;
        img.setInteractive(new Phaser.Geom.Rectangle(margin - pad, margin - pad, cw + pad * 2, ch + pad * 2), Phaser.Geom.Rectangle.Contains);
        this.input.setDraggable(img, false);
        const piece: Piece = { col: c, row: r, img, shadow, homeX, homeY, placed: false };
        this.pieces.push(piece);
        this.byImage.set(img, piece);
      }
    }
    slots.refresh();
    this.slots = this.add.image(BOARD.x - 4, BOARD.y - 4, SLOTS_KEY).setOrigin(0).setDepth(DEPTH.slots);
    this.placedCount = 0;
  }

  /** Die Teile fliegen aus dem Bild auf die beiden Stapel links und rechts (gemischt). */
  private scatter(): void {
    const spots = this.pileSpots(this.pieces.length);
    Phaser.Utils.Array.Shuffle(spots);
    // Ganz im Bild lassen (mit Nasen)
    const tab = PIECE.tab * Math.min(this.cell.w, this.cell.h);
    const half = { w: (this.cell.w / 2 + tab) * this.looseScale + 4, h: (this.cell.h / 2 + tab) * this.looseScale + 4 };
    for (const s of spots) {
      s.x = Phaser.Math.Clamp(s.x, half.w, 1920 - half.w);
      s.y = Phaser.Math.Clamp(s.y, half.h, 1080 - half.h);
    }
    this.pieces.forEach((p, i) => {
      const spot = spots[i];
      p.img.setVisible(true).setDepth(++this.topDepth);
      p.shadow.setVisible(true);
      this.tweens.add({
        targets: p.img,
        x: spot.x,
        y: spot.y,
        scale: this.looseScale,
        duration: PUZZLE_TIMING.scatter,
        delay: i * 25,
        ease: 'Cubic.easeOut',
        onComplete: () => this.input.setDraggable(p.img, true),
      });
    });
    this.events.emit('sound', { kind: 'puzzle-scatter' });
  }

  /** Plätze auf den Stapeln: ein lockeres Raster mit etwas Zufall, je Stapel die Hälfte. */
  private pileSpots(count: number): { x: number; y: number }[] {
    const spots: { x: number; y: number }[] = [];
    const per = [Math.ceil(count / 2), Math.floor(count / 2)];
    PILES.forEach((pile, i) => {
      const n = per[i];
      if (!n) return;
      const cols = n > 3 ? 2 : 1;
      const rows = Math.ceil(n / cols);
      const w = (pile.x1 - pile.x0) / cols;
      const h = (pile.y1 - pile.y0) / rows;
      for (let k = 0; k < n; k++) {
        const c = k % cols;
        const r = Math.floor(k / cols);
        spots.push({
          x: pile.x0 + (c + 0.5) * w + Phaser.Math.Between(-20, 20),
          y: pile.y0 + (r + 0.5) * h + Phaser.Math.Between(-15, 15),
        });
      }
    });
    return spots;
  }

  // --- Ziehen und Einrasten ---------------------------------------------------------------

  private setupInput(): void {
    this.input.on(Phaser.Input.Events.DRAG_START, (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const piece = this.byImage.get(obj);
      if (!piece || piece.placed) return;
      this.tweens.killTweensOf(piece.img);
      piece.img.setDepth(++this.topDepth);
      this.tweens.add({ targets: piece.img, scale: 1, duration: 120, ease: 'Quad.easeOut' });
      this.events.emit('sound', { kind: 'puzzle-pick' });
    });
    this.input.on(Phaser.Input.Events.DRAG, (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, x: number, y: number) => {
      const piece = this.byImage.get(obj);
      if (!piece || piece.placed) return;
      piece.img.setPosition(Phaser.Math.Clamp(x, 0, 1920), Phaser.Math.Clamp(y, 0, 1080));
    });
    this.input.on(Phaser.Input.Events.DRAG_END, (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const piece = this.byImage.get(obj);
      if (!piece || piece.placed) return;
      this.drop(piece);
    });
  }

  private drop(p: Piece): void {
    const near = Math.max(PIECE.snapMin, PIECE.snap * Math.min(this.cell.w, this.cell.h));
    if (Phaser.Math.Distance.Between(p.img.x, p.img.y, p.homeX, p.homeY) < near) {
      this.place(p);
      return;
    }
    // Auf dem Rahmen bleibt es groß (passt dann zu den Umrissen), daneben wird es wieder klein
    const onBoard = Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(BOARD.x, BOARD.y, BOARD.w, BOARD.h), p.img.x, p.img.y);
    const scale = onBoard ? 1 : this.looseScale;
    const half = { w: (this.cell.w / 2) * scale, h: (this.cell.h / 2) * scale };
    this.tweens.add({
      targets: p.img,
      scale,
      x: Phaser.Math.Clamp(p.img.x, half.w, 1920 - half.w),
      y: Phaser.Math.Clamp(p.img.y, half.h + 150, 1080 - half.h),
      duration: 150,
      ease: 'Quad.easeOut',
    });
    this.events.emit('sound', { kind: 'puzzle-drop' });
  }

  private place(p: Piece): void {
    p.placed = true;
    this.input.setDraggable(p.img, false);
    p.img.disableInteractive();
    p.shadow.setVisible(false);
    p.img.setDepth(DEPTH.placed);
    this.tweens.add({ targets: p.img, x: p.homeX, y: p.homeY, scale: 1, duration: 110, ease: 'Quad.easeOut' });
    // Jedes Teil einen Ton höher
    this.events.emit('sound', { kind: 'puzzle-snap', pitch: Math.min(7, this.placedCount) });
    this.placedCount++;
    this.sparkle(p.homeX, p.homeY, 4, 60);
    if (this.placedCount === this.pieces.length) this.solved();
  }

  /** Bild fertig: es leuchtet ganz auf, Sterne fliegen, dann kommt das nächste (ggf. eine neue Stufe). */
  private solved(): void {
    const round = this.round;
    this.complete.setAlpha(0).setVisible(true);
    this.tweens.add({ targets: this.complete, alpha: 1, duration: 450, delay: 150 });
    this.slots?.setVisible(false);
    this.sparkle(BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h / 2, 18, 520);
    this.events.emit('sound', { kind: 'puzzle-done' });

    const before = this.progress.level;
    const levelUp = advancePuzzle(this.progress);
    this.params.onProgress({ ...this.progress });

    // Ein Stern fliegt zur Stufe hinauf
    const star = this.add.image(BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h / 2, 'puzzle-star').setDepth(DEPTH.fx).setScale(2.2);
    this.tweens.add({
      targets: star,
      x: this.levelX(before),
      y: PUZZLE_LAYOUT.levels.y,
      scale: 0.7,
      duration: 900,
      delay: 700,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        star.destroy();
        if (round !== this.round) return;
        this.refreshLevels();
        if (levelUp) this.celebrateLevel(this.progress.level);
      },
    });
    this.later(PUZZLE_TIMING.next, round, () => this.startPuzzle());
  }

  /** Neue Stufe erreicht: der Knopf hüpft und funkelt. */
  private celebrateLevel(i: number): void {
    const c = this.levelButtons[i];
    this.tweens.add({ targets: c, scale: { from: 1.5, to: 1 }, duration: 500, ease: 'Back.easeOut' });
    this.sparkle(c.x, c.y, 10, 120);
    this.events.emit('sound', { kind: 'puzzle-level' });
  }

  /** Kleine Sterne, die aus einem Punkt nach außen fliegen und verblassen. */
  private sparkle(x: number, y: number, count: number, spread: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const d = spread * (0.6 + Math.random() * 0.6);
      const s = this.add.image(x, y, 'puzzle-star').setDepth(DEPTH.fx).setScale(0.3 + Math.random() * 0.4);
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        alpha: 0,
        angle: 120,
        duration: 600 + Math.random() * 300,
        ease: 'Quad.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  // --- Aufräumen --------------------------------------------------------------------------

  /** Zeitgeber, der nur gilt, solange dasselbe Bild läuft. */
  private later(ms: number, round: number, fn: () => void): void {
    this.timers.push(
      this.time.delayedCall(ms, () => {
        if (round === this.round && !this.leaving) fn();
      }),
    );
  }

  private clearPieces(): void {
    for (const p of this.pieces) {
      this.tweens.killTweensOf(p.img);
      p.img.destroy();
      p.shadow.destroy();
    }
    this.pieces = [];
    this.byImage.clear();
    this.slots?.destroy();
    this.slots = undefined;
  }

  private cleanup(): void {
    this.load.off(Phaser.Loader.Events.COMPLETE);
    this.clearPieces();
    for (const key of this.textures.getTextureKeys()) {
      if (key.startsWith(PIECE_PREFIX) || key === SLOTS_KEY) this.textures.remove(key);
    }
    if (this.photo) this.textures.remove(this.photo);
    this.photo = undefined;
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.events.emit('sound', { kind: 'click' });
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.params.onDone());
  }
}

/**
 * Ein Rand von a nach b; (nx, ny) zeigt nach außen. sign 1 = Nase nach außen, −1 = Loch nach innen,
 * 0 = gerade. Die Nase sitzt in der Mitte, Größe `tab` (unabhängig von der Kantenlänge).
 */
function edge(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  nx: number,
  ny: number,
  sign: number,
  tab: number,
): void {
  if (!sign) {
    ctx.lineTo(bx, by);
    return;
  }
  const len = Math.hypot(bx - ax, by - ay);
  const dx = (bx - ax) / len;
  const dy = (by - ay) / len;
  const m = len / 2;
  // u = Weg entlang der Kante ab der Mitte, v = nach außen (beides in Einheiten von tab)
  const p = (u: number, v: number): [number, number] => [
    ax + dx * (m + u * tab) + nx * v * tab * sign,
    ay + dy * (m + u * tab) + ny * v * tab * sign,
  ];
  ctx.lineTo(...p(-0.5, 0));
  ctx.bezierCurveTo(...p(-0.3, 0), ...p(-0.22, 0.3), ...p(-0.34, 0.5));
  ctx.bezierCurveTo(...p(-0.5, 0.8), ...p(-0.3, 1.05), ...p(0, 1.05));
  ctx.bezierCurveTo(...p(0.3, 1.05), ...p(0.5, 0.8), ...p(0.34, 0.5));
  ctx.bezierCurveTo(...p(0.22, 0.3), ...p(0.3, 0), ...p(0.5, 0));
  ctx.lineTo(bx, by);
}
