import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { CIRCUIT, isOutput, LEVELS, PORTS, WIRE_COLORS, type GateKind, type PartDef, type PortName } from '../data/circuit';

/** Was die Wiese der Strom-Werkstatt mitgibt. */
export interface CircuitData {
  /** Schon geschaffte Level (0-basiert). */
  solved: number[];
  onSolved(level: number): void;
  /** Holzschild angetippt: zurück auf die Wiese. */
  onDone(): void;
}

interface Part {
  def: PartDef;
  on: boolean;
  img: Phaser.GameObjects.Image;
  /** Gatter, das auf diesem Platz steckt. */
  gate?: TrayGate;
}

interface End {
  part: Part;
  port: PortName;
}

interface Wire {
  from: End;
  to: End;
  fixed: boolean;
  color: number;
  points: Phaser.Math.Vector2[];
}

interface TrayGate {
  kind: GateKind;
  img: Phaser.GameObjects.Image;
  home: { x: number; y: number };
  slot?: Part;
}

type Touch =
  | { kind: 'wire'; from: End; x: number; y: number }
  | { kind: 'gate'; gate: TrayGate; ox: number; oy: number }
  | { kind: 'tap'; act: () => void };

const DEPTH = { slot: 5, glow: 8, parts: 10, wires: 20, ports: 30, tray: 40, trayGates: 45, drag: 50, fx: 60, ui: 70 };

/**
 * Strom-Werkstatt (Elektro-Baukasten): Auf der Lochplatte einen Stromkreis schließen, bis die Lampe
 * leuchtet. Drähte von Anschluss zu Anschluss ziehen (Draht antippen = abnehmen), Schalter antippen =
 * umlegen (mit Pflaster: klemmt), Logikgatter aus der Ablage auf den gestrichelten Platz ziehen.
 * Strom sieht man: Drähte mit Strom leuchten gelb, Funken laufen entlang. 5 Level (src/data/circuit.ts),
 * oben je Level ein Lämpchen (antippen = dieses Level). Kein Text, kein Verlieren.
 */
export class CircuitScene extends Phaser.Scene {
  private params!: CircuitData;
  private level = 0;
  private solved = new Set<number>();
  private parts: Part[] = [];
  private wires: Wire[] = [];
  private trayGates: TrayGate[] = [];
  private levelObjects: Phaser.GameObjects.GameObject[] = [];
  private touches = new Map<number, Touch>();
  private wireGfx!: Phaser.GameObjects.Graphics;
  private portGfx!: Phaser.GameObjects.Graphics;
  private uiGfx!: Phaser.GameObjects.Graphics;
  private glow!: Phaser.GameObjects.Image;
  private lit = false;
  private won = false;
  private leaving = false;
  private nextColor = 0;
  private hintUntil = 0;

  constructor() {
    super('Circuit');
  }

  create(data: CircuitData): void {
    this.params = data;
    this.solved = new Set(data.solved);
    this.touches = new Map();
    this.leaving = false;
    // Beim ersten noch nicht geschafften Level weitermachen
    this.level = LEVELS.findIndex((_, i) => !this.solved.has(i));
    if (this.level < 0) this.level = 0;

    // Töne spielt die Wiese (dort lebt der AudioContext)
    const playground = this.scene.get('Playground');
    this.events.on('sound', (e: unknown) => playground.events.emit('sound', e));

    this.add.image(0, 0, 'circuit-board').setOrigin(0);
    this.glow = this.add.image(0, 0, 'circuit-glow').setTint(0xffe066).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.glow).setAlpha(0);
    this.wireGfx = this.add.graphics().setDepth(DEPTH.wires);
    this.portGfx = this.add.graphics().setDepth(DEPTH.ports);
    this.uiGfx = this.add.graphics().setDepth(DEPTH.ui);
    this.add.image(CIRCUIT.exit.x, CIRCUIT.exit.y, 'circuit-sign').setOrigin(0).setDepth(DEPTH.ui);
    this.add.image(GAME_WIDTH / 2, CIRCUIT.tray.y + 10, 'circuit-tray').setDepth(DEPTH.tray);

    this.buildLevel();
    this.setupInput();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // --- Level aufbauen ------------------------------------------------------------

  private buildLevel(): void {
    this.levelObjects.forEach((o) => o.destroy());
    this.levelObjects = [];
    this.parts = [];
    this.wires = [];
    this.trayGates = [];
    this.lit = false;
    this.won = false;
    this.glow.setAlpha(0);
    const def = LEVELS[this.level];

    for (const p of def.parts) {
      const key =
        p.kind === 'battery' ? 'circuit-battery' : p.kind === 'lamp' ? 'circuit-lamp' : p.kind === 'switch' ? 'circuit-switch' : `circuit-slot-${p.inputs ?? 2}`;
      const img = this.add.image(p.x, p.y, key).setDepth(p.kind === 'slot' ? DEPTH.slot : DEPTH.parts);
      this.levelObjects.push(img);
      const part: Part = { def: p, on: p.on ?? false, img };
      this.parts.push(part);
      if (p.stuck) {
        const tape = this.add.image(p.x - 6, p.y - 20, 'circuit-bandaid').setAngle(-24).setDepth(DEPTH.parts + 1);
        this.levelObjects.push(tape);
      }
    }
    for (const w of def.fixed) {
      const from = this.end(w.from[0], w.from[1]);
      const to = this.end(w.to[0], w.to[1]);
      if (from && to) this.wires.push({ from, to, fixed: true, color: 0x343a40, points: [] });
    }
    def.tray.forEach((kind, i) => {
      const x = GAME_WIDTH / 2 + (i - (def.tray.length - 1) / 2) * CIRCUIT.tray.gap;
      const img = this.add.image(x, CIRCUIT.tray.y, `circuit-${kind}`).setDepth(DEPTH.trayGates);
      this.levelObjects.push(img);
      this.trayGates.push({ kind, img, home: { x, y: CIRCUIT.tray.y } });
    });
    this.refresh(false);
  }

  private end(id: string, port: PortName): End | undefined {
    const part = this.parts.find((p) => p.def.id === id);
    return part ? { part, port } : undefined;
  }

  /** Anschlüsse eines Teils (ein Platz mit einem Eingang hat die Anschlüsse des NICHT-Gatters). */
  private portsOf(part: Part): Partial<Record<PortName, { x: number; y: number }>> {
    const d = part.def;
    if (d.kind === 'slot') return d.inputs === 1 ? PORTS.not : PORTS.slot;
    return PORTS[d.kind];
  }

  private portPos(e: End): Phaser.Math.Vector2 {
    const off = this.portsOf(e.part)[e.port] ?? { x: 0, y: 0 };
    return new Phaser.Math.Vector2(e.part.img.x + off.x, e.part.img.y + off.y);
  }

  private wireAt(e: End): Wire | undefined {
    return this.wires.find((w) => (w.from.part === e.part && w.from.port === e.port) || (w.to.part === e.part && w.to.port === e.port));
  }

  // --- Strom berechnen -------------------------------------------------------------

  /** Strom am Eingang: undefined = nichts angeschlossen. */
  private inputOf(part: Part, port: PortName, seen: Set<Part>): boolean | undefined {
    const w = this.wires.find((x) => x.to.part === part && x.to.port === port);
    return w ? this.output(w.from.part, seen) : undefined;
  }

  /** Strom am Ausgang eines Teils. */
  private output(part: Part, seen = new Set<Part>()): boolean {
    if (seen.has(part)) return false; // Kreis im Kreis: kein Strom
    seen.add(part);
    const kind = part.def.kind === 'slot' ? part.gate?.kind : part.def.kind;
    const a = () => this.inputOf(part, kind === 'switch' ? 'in' : 'in1', new Set(seen));
    const b = () => this.inputOf(part, 'in2', new Set(seen));
    switch (kind) {
      case 'battery':
        return true;
      case 'switch':
        return part.on && a() === true;
      case 'and':
        return a() === true && b() === true;
      case 'or':
        return a() === true || b() === true;
      case 'not':
        // Nur angeschlossen: kein Strom rein = Strom raus
        return a() === false;
      default:
        return false;
    }
  }

  private lampLit(): boolean {
    const lamp = this.parts.find((p) => p.def.kind === 'lamp');
    return !!lamp && this.inputOf(lamp, 'in', new Set()) === true;
  }

  /** Nach jeder Änderung: Bilder anpassen, Lampe prüfen. */
  private refresh(sound = true): void {
    for (const p of this.parts) {
      if (p.def.kind === 'switch') p.img.setTexture(p.on ? 'circuit-switch-on' : 'circuit-switch');
    }
    const lamp = this.parts.find((p) => p.def.kind === 'lamp');
    const lit = this.lampLit();
    if (lamp) {
      lamp.img.setTexture(lit ? 'circuit-lamp-on' : 'circuit-lamp');
      this.glow.setPosition(lamp.img.x, lamp.img.y - 50).setScale(3.2);
    }
    if (lit !== this.lit) {
      this.lit = lit;
      this.tweens.killTweensOf(this.glow);
      this.tweens.add({ targets: this.glow, alpha: lit ? 0.9 : 0, duration: 300 });
      if (lit && lamp) {
        this.tweens.add({ targets: lamp.img, scale: 1.12, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
        if (sound) this.events.emit('sound', { kind: 'circuit-lamp' });
      }
    }
    if (lit && !this.won) this.win();
  }

  private win(): void {
    this.won = true;
    const level = this.level;
    this.solved.add(level);
    this.params.onSolved(level);
    this.events.emit('sound', { kind: 'circuit-win' });
    this.confetti(level === LEVELS.length - 1 ? 120 : 50);
    // Weiter zum nächsten Level (nach dem letzten bleibt es zum Weiterspielen)
    if (level < LEVELS.length - 1) {
      this.time.delayedCall(CIRCUIT.winMs, () => {
        if (this.level === level && !this.leaving) this.goTo(level + 1);
      });
    }
  }

  private goTo(level: number): void {
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.level = level;
      this.touches.clear();
      this.buildLevel();
      this.cameras.main.fadeIn(220, 0, 0, 0);
    });
  }

  private confetti(count: number): void {
    const colors = [0xe63946, 0xffd60a, 0x3a86ff, 0x2a9d8f, 0xf15bb5, 0xfb8500];
    const lamp = this.parts.find((p) => p.def.kind === 'lamp');
    const ox = lamp?.img.x ?? GAME_WIDTH / 2;
    const oy = (lamp?.img.y ?? 400) - 80;
    for (let i = 0; i < count; i++) {
      const bit = this.add.rectangle(ox, oy, 14, 9, colors[i % colors.length]).setDepth(DEPTH.fx).setAngle(Phaser.Math.Between(0, 360));
      const a = Phaser.Math.FloatBetween(-Math.PI, 0);
      const r = Phaser.Math.Between(150, 650);
      this.tweens.add({
        targets: bit,
        x: ox + Math.cos(a) * r,
        y: oy + Math.sin(a) * r * 0.7 + Phaser.Math.Between(200, 500),
        angle: bit.angle + Phaser.Math.Between(-400, 400),
        alpha: 0,
        duration: Phaser.Math.Between(1200, 2000),
        ease: 'Quad.easeOut',
        onComplete: () => bit.destroy(),
      });
    }
  }

  // --- Eingabe ---------------------------------------------------------------------

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.leaving) return;
      const touch = this.touchAt(p.x, p.y);
      if (touch) this.touches.set(p.id, touch);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const t = this.touches.get(p.id);
      if (!t || !p.isDown) return;
      if (t.kind === 'wire') {
        t.x = p.x;
        t.y = p.y;
      } else if (t.kind === 'gate') {
        t.gate.img.setPosition(p.x + t.ox, p.y + t.oy);
      }
    });
    const up = (p: Phaser.Input.Pointer) => {
      const t = this.touches.get(p.id);
      if (!t) return;
      this.touches.delete(p.id);
      if (t.kind === 'wire') this.finishWire(t.from, p.x, p.y);
      else if (t.kind === 'gate') this.dropGate(t.gate);
      else if (p.getDistance() < 30) t.act();
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  /** Was liegt unter dem Finger? Reihenfolge: Schild, Level-Lämpchen, Anschluss, Gatter, Schalter, Draht, Lampe. */
  private touchAt(x: number, y: number): Touch | undefined {
    const E = CIRCUIT.exit;
    if (x < E.x + E.w + 30 && y < E.y + E.h + 30) return { kind: 'tap', act: () => this.leave() };
    const lvl = this.progressAt(x, y);
    if (lvl !== undefined) return { kind: 'tap', act: () => lvl !== this.level && this.goTo(lvl) };
    if (this.won && this.level < LEVELS.length - 1) return undefined; // gleich geht es weiter

    // Anschluss: nächster in Reichweite
    let best: End | undefined;
    let bestD: number = CIRCUIT.portReach;
    for (const part of this.parts) {
      for (const port of Object.keys(this.portsOf(part)) as PortName[]) {
        const d = Phaser.Math.Distance.BetweenPoints(this.portPos({ part, port }), { x, y });
        if (d < bestD) {
          best = { part, port };
          bestD = d;
        }
      }
    }
    if (best) {
      const existing = this.wireAt(best);
      if (existing?.fixed) return this.nope(best.part.img);
      // Ein loser Draht an diesem Anschluss wird neu gezogen
      if (existing) this.removeWire(existing, false);
      return { kind: 'wire', from: best, x, y };
    }

    // Gatter (in der Ablage oder auf dem Platz) zum Ziehen
    for (const gate of this.trayGates) {
      if (gate.img.getBounds().contains(x, y)) {
        if (gate.slot) {
          gate.slot.gate = undefined;
          gate.slot.img.setVisible(true);
          gate.slot = undefined;
          this.refresh();
        }
        this.tweens.killTweensOf(gate.img);
        gate.img.setDepth(DEPTH.drag).setScale(1.06);
        return { kind: 'gate', gate, ox: gate.img.x - x, oy: gate.img.y - y };
      }
    }

    for (const part of this.parts) {
      const b = part.img.getBounds();
      if (part.def.kind === 'switch' && Phaser.Geom.Rectangle.Contains(b, x, y)) return { kind: 'tap', act: () => this.toggle(part) };
    }

    const wire = this.wires.find((w) => !w.fixed && w.points.some((pt) => Phaser.Math.Distance.Between(pt.x, pt.y, x, y) < CIRCUIT.wireReach));
    if (wire) return { kind: 'tap', act: () => this.removeWire(wire, true) };

    const lamp = this.parts.find((p) => p.def.kind === 'lamp');
    if (lamp?.img.getBounds().contains(x, y)) return { kind: 'tap', act: () => this.hint() };
    return undefined;
  }

  private nope(target: Phaser.GameObjects.Image): undefined {
    this.events.emit('sound', { kind: 'circuit-nope' });
    if (!this.tweens.isTweening(target)) {
      this.tweens.add({ targets: target, angle: { from: -4, to: 4 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => target.setAngle(0) });
    }
    return undefined;
  }

  private toggle(part: Part): void {
    if (part.def.stuck) {
      this.nope(part.img);
      return;
    }
    part.on = !part.on;
    this.events.emit('sound', { kind: 'circuit-switch' });
    this.refresh();
  }

  /** Draht losgelassen: an einem passenden Anschluss festmachen (ein Ausgang und ein Eingang). */
  private finishWire(from: End, x: number, y: number): void {
    let target: End | undefined;
    let bestD: number = CIRCUIT.portReach;
    for (const part of this.parts) {
      if (part === from.part) continue;
      for (const port of Object.keys(this.portsOf(part)) as PortName[]) {
        const d = Phaser.Math.Distance.BetweenPoints(this.portPos({ part, port }), { x, y });
        if (d < bestD) {
          target = { part, port };
          bestD = d;
        }
      }
    }
    if (!target) return; // ins Leere: Draht verschwindet
    const fromOut = isOutput(from.port);
    if (fromOut === isOutput(target.port)) {
      this.nope(target.part.img);
      return;
    }
    const existing = this.wireAt(target);
    if (existing?.fixed) {
      this.nope(target.part.img);
      return;
    }
    if (existing) this.removeWire(existing, false);
    const [a, b] = fromOut ? [from, target] : [target, from];
    this.wires.push({ from: a, to: b, fixed: false, color: WIRE_COLORS[this.nextColor++ % WIRE_COLORS.length], points: [] });
    this.events.emit('sound', { kind: 'circuit-wire' });
    this.refresh();
  }

  private removeWire(w: Wire, sound: boolean): void {
    this.wires = this.wires.filter((x) => x !== w);
    if (sound) this.events.emit('sound', { kind: 'circuit-unwire' });
    this.refresh();
  }

  /** Gatter losgelassen: auf einen passenden Platz stecken, sonst zurück in die Ablage. */
  private dropGate(gate: TrayGate): void {
    gate.img.setScale(1);
    const slot = this.parts.find(
      (p) =>
        p.def.kind === 'slot' &&
        Phaser.Math.Distance.Between(p.img.x, p.img.y, gate.img.x, gate.img.y) < CIRCUIT.slotReach &&
        (p.def.inputs === 1) === (gate.kind === 'not'),
    );
    if (!slot) {
      gate.img.setDepth(DEPTH.trayGates);
      this.tweens.add({ targets: gate.img, x: gate.home.x, y: gate.home.y, duration: 260, ease: 'Sine.easeOut' });
      return;
    }
    // Steckt schon eins: das kommt zurück in die Ablage
    const old = slot.gate;
    if (old) {
      old.slot = undefined;
      old.img.setDepth(DEPTH.trayGates);
      this.tweens.add({ targets: old.img, x: old.home.x, y: old.home.y, duration: 300, ease: 'Sine.easeOut' });
    }
    slot.gate = gate;
    gate.slot = slot;
    slot.img.setVisible(false);
    gate.img.setDepth(DEPTH.parts);
    this.tweens.add({ targets: gate.img, x: slot.img.x, y: slot.img.y, duration: 140, ease: 'Back.easeOut' });
    this.events.emit('sound', { kind: 'circuit-gate' });
    this.refresh();
  }

  /** Lampe angetippt: freie Anschlüsse blinken kurz (Tipp, ohne Text). */
  private hint(): void {
    this.hintUntil = this.time.now + 1800;
    this.events.emit('sound', { kind: 'circuit-switch' });
  }

  private progressAt(x: number, y: number): number | undefined {
    const P = CIRCUIT.progress;
    if (Math.abs(y - P.y) > 45) return undefined;
    for (let i = 0; i < LEVELS.length; i++) {
      if (Math.abs(x - this.progressX(i)) < 42) return i;
    }
    return undefined;
  }

  private progressX(i: number): number {
    return GAME_WIDTH / 2 + (i - (LEVELS.length - 1) / 2) * CIRCUIT.progress.gap;
  }

  // --- Zeichnen ----------------------------------------------------------------------

  update(time: number): void {
    this.drawWires(time);
    this.drawPorts(time);
    this.drawProgress(time);
  }

  private curve(a: Phaser.Math.Vector2, b: Phaser.Math.Vector2): Phaser.Math.Vector2[] {
    const dx = (b.x - a.x) * 0.35;
    const sag = 40 + Phaser.Math.Distance.BetweenPoints(a, b) * 0.12;
    const c = new Phaser.Curves.CubicBezier(a, new Phaser.Math.Vector2(a.x + dx, a.y + sag), new Phaser.Math.Vector2(b.x - dx, b.y + sag), b);
    return c.getPoints(28);
  }

  private drawWires(time: number): void {
    const g = this.wireGfx.clear();
    const strand = (pts: Phaser.Math.Vector2[], color: number, powered: boolean, fixed: boolean) => {
      if (powered) {
        g.lineStyle(20, 0xffe066, 0.55);
        g.strokePoints(pts);
      }
      g.lineStyle(10, fixed ? 0x212529 : color);
      g.strokePoints(pts);
      g.lineStyle(3, 0xffffff, 0.35);
      g.strokePoints(pts.map((p) => new Phaser.Math.Vector2(p.x - 2, p.y - 3)));
      if (powered) {
        // Funken laufen vom Ausgang zum Eingang
        g.fillStyle(0xfffbe0);
        const n = pts.length - 1;
        for (let k = 0; k < 4; k++) {
          const t = ((time / 900 + k / 4) % 1) * n;
          const i = Math.floor(t);
          const p = pts[i].clone().lerp(pts[Math.min(n, i + 1)], t - i);
          g.fillCircle(p.x, p.y, 6);
        }
      }
    };
    for (const w of this.wires) {
      w.points = this.curve(this.portPos(w.from), this.portPos(w.to));
      strand(w.points, w.color, this.output(w.from.part), w.fixed);
    }
    // Draht, der gerade gezogen wird
    for (const t of this.touches.values()) {
      if (t.kind !== 'wire') continue;
      const a = this.portPos(t.from);
      const pts = this.curve(a, new Phaser.Math.Vector2(t.x, t.y));
      strand(pts, WIRE_COLORS[this.nextColor % WIRE_COLORS.length], isOutput(t.from.port) && this.output(t.from.part), false);
      g.fillStyle(0xadb5bd);
      g.fillCircle(t.x, t.y, 12);
    }
  }

  private drawPorts(time: number): void {
    const g = this.portGfx.clear();
    const pulse = 0.5 + 0.5 * Math.sin(time / 260);
    const hint = time < this.hintUntil;
    for (const part of this.parts) {
      for (const port of Object.keys(this.portsOf(part)) as PortName[]) {
        const e = { part, port };
        const p = this.portPos(e);
        const wired = !!this.wireAt(e);
        const out = isOutput(port);
        const powered = out ? this.output(part) : this.inputOf(part, port, new Set()) === true;
        // Freie Anschlüsse atmen (beim Tipp blinken sie kräftig)
        if (!wired) {
          g.lineStyle(hint ? 8 : 5, 0xffffff, hint ? 0.5 + 0.5 * Math.sin(time / 90) : 0.25 + 0.4 * pulse);
          g.strokeCircle(p.x, p.y, 26 + 4 * pulse);
        }
        // Ausgang = Stecker (voll), Eingang = Buchse (Ring); mit Strom gelb
        g.fillStyle(0x343a40);
        g.fillCircle(p.x, p.y, 17);
        g.fillStyle(powered ? 0xffd60a : out ? 0xadb5bd : 0xf8f9fa);
        g.fillCircle(p.x, p.y, out ? 13 : 12);
        if (!out) {
          g.fillStyle(0x343a40);
          g.fillCircle(p.x, p.y, 5);
        }
      }
    }
  }

  private drawProgress(time: number): void {
    const g = this.uiGfx.clear();
    const P = CIRCUIT.progress;
    for (let i = 0; i < LEVELS.length; i++) {
      const x = this.progressX(i);
      const done = this.solved.has(i);
      if (i === this.level) {
        g.lineStyle(5, 0xffffff, 0.6 + 0.3 * Math.sin(time / 300));
        g.strokeCircle(x, P.y, 36);
      }
      g.fillStyle(0x495057);
      g.fillRoundedRect(x - 12, P.y + 18, 24, 18, 5);
      g.fillStyle(done ? 0xffe066 : 0xdee2e6);
      g.fillCircle(x, P.y, 24);
      if (done) {
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(x - 8, P.y - 8, 6);
      }
    }
  }

  // --- Zurück ------------------------------------------------------------------------

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.params.onDone());
  }
}
