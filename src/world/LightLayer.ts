import Phaser from 'phaser';
import { DEPTH_LIGHTS, DEPTH_TINT, GAME_HEIGHT, GAME_WIDTH } from '../config';

/** Etwas, das über der Tageszeit-Einfärbung leuchtet (Mond, Lichterkette, Taschenlampe). */
export interface LightSource {
  /** Die Bilder, die leuchten. Sie werden nicht selbst gezeichnet, sondern von der Lichtebene. */
  readonly objects: Phaser.GameObjects.GameObject[];
  /**
   * Tiefe des Lichts: Alles auf der Welt mit größerer Tiefe (weiter vorne) verdeckt es.
   * Z. B. Tiefe der Pergola für die Lichterkette, Tiefe des haltenden Kindes für die Taschenlampe.
   */
  depth(): number;
  /** Leuchtet gerade etwas? Sonst wird die Quelle übersprungen. */
  active(): boolean;
}

// Auflösung der Lichtebene im Verhältnis zum Bild.
const RESOLUTION = 0.5;

type Drawable = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform &
  Phaser.GameObjects.Components.Visible &
  Phaser.GameObjects.Components.Depth &
  Phaser.GameObjects.Components.ScrollFactor;

/**
 * Lichtebene: Lichter müssen über der Einfärbung (`DEPTH_TINT`, Multiplizieren) liegen, sonst
 * werden sie nachts mit abgedunkelt. Damit sie trotzdem nicht durch Kinder und Spielzeug
 * hindurchscheinen, zeichnet diese Ebene jedes Bild alle Lichter in eine Textur und radiert
 * danach pixelgenau alles aus, was davor steht – von hinten nach vorn: Nach jedem Licht
 * verdecken nur die Dinge, die vor ihm stehen.
 */
export class LightLayer {
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private readonly sources = new Set<LightSource>();

  constructor(private readonly scene: Phaser.Scene) {
    // Halbe Auflösung reicht für weiches Licht und spart viel Füllrate (Tablet).
    this.rt = scene.add
      .renderTexture(0, 0, GAME_WIDTH * RESOLUTION, GAME_HEIGHT * RESOLUTION)
      .setOrigin(0)
      .setScale(1 / RESOLUTION)
      .setScrollFactor(0)
      .setDepth(DEPTH_LIGHTS)
      // Die Ebene addiert ihr Licht auf die Szene; hineingezeichnet wird normal (in WebGL ergibt
      // Addieren auf eine leere, durchsichtige Textur sonst nichts Sichtbares).
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    // Die Textur-Kamera verkleinert alles, was hineingezeichnet wird (Ursprung oben links).
    this.rt.camera.setOrigin(0, 0).setZoom(RESOLUTION);
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, () => this.render());
  }

  /** Meldet eine Lichtquelle an. Ihre Bilder werden ab jetzt nur noch über die Lichtebene gezeichnet. */
  add(source: LightSource): void {
    this.sources.add(source);
    source.objects.forEach((o) => o.removeFromDisplayList());
  }

  remove(source: LightSource): void {
    this.sources.delete(source);
  }

  private render(): void {
    const active = [...this.sources].filter((s) => s.active()).sort((a, b) => a.depth() - b.depth());
    this.rt.setVisible(active.length > 0);
    if (!active.length) return;

    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const rt = this.rt;

    // Wo überhaupt Licht ist (Weltkoordinaten) – nur dort muss etwas ausradiert werden
    const lights = new Set<Phaser.GameObjects.GameObject>(active.flatMap((s) => s.objects));
    const lit: Phaser.Geom.Rectangle[] = [];
    for (const o of lights as Set<Drawable>) {
      if (!o.visible) continue;
      const b = worldBounds(o, cam);
      if (Phaser.Geom.Intersects.RectangleToRectangle(b, view)) lit.push(b);
    }
    // Kein Licht im Bild (z. B. Lichterkette weit weg gescrollt): nichts zu tun
    if (!lit.length) {
      rt.setVisible(false);
      return;
    }
    rt.clear();
    rt.beginDraw();

    // Alles auf der Welt, was ein Licht verdecken kann, von hinten nach vorn
    const occluders = (this.scene.children.list as Drawable[])
      .filter((o) => this.canOcclude(o, lights, lit))
      .sort((a, b) => a.depth - b.depth);

    // Verdecker zwischen zwei Lichtern werden gesammelt und in einem Durchgang ausradiert
    // (jedes Ausradieren beendet den Zeichendurchgang – einzeln wäre das bei vielen Dingen teuer).
    const pending: Drawable[] = [];
    const eraseQueued = () => {
      if (!pending.length) return;
      rt.endDraw();
      // Die Textur-Kamera scrollt mit, so stehen alle Verdecker (auch mit Parallaxe) an ihrem Platz.
      rt.camera.setScroll(cam.scrollX, cam.scrollY);
      rt.erase(pending);
      rt.camera.setScroll(0, 0);
      rt.beginDraw();
      pending.length = 0;
    };
    let next = 0;
    const drawUpTo = (depth: number) => {
      // Alle Lichter, die hinter dieser Tiefe liegen, zuerst zeichnen
      while (next < active.length && active[next].depth() < depth) {
        eraseQueued();
        for (const o of active[next].objects as (Drawable & Phaser.GameObjects.Components.BlendMode)[]) {
          if (!o.visible || !o.active) continue;
          const blend = o.blendMode;
          o.blendMode = Phaser.BlendModes.NORMAL;
          rt.batchDraw(o, o.x - cam.scrollX * o.scrollFactorX, o.y - cam.scrollY * o.scrollFactorY);
          o.blendMode = blend;
        }
        next++;
      }
    };
    for (const o of occluders) {
      drawUpTo(o.depth);
      if (next > 0) pending.push(o); // sonst noch kein Licht dahinter
    }
    drawUpTo(Infinity);
    eraseQueued();
    rt.endDraw();
  }

  /**
   * Steht es sichtbar auf der Welt und liegt über einem Licht? Was nicht mit der Welt scrollt
   * (Himmel, Wolken, Leisten), verdeckt nichts – außer Hintergrund-Ebenen mit Parallaxe, die sich
   * mit `setData('occludesLight', true)` melden (Häuser, Bäume hinter dem Zaun).
   */
  private canOcclude(o: Drawable, lights: Set<Phaser.GameObjects.GameObject>, lit: Phaser.Geom.Rectangle[]): boolean {
    if (lights.has(o) || o === this.rt || !o.visible || !o.active) return false;
    if (o.depth >= DEPTH_TINT) return false;
    if (o.scrollFactorX !== 1 && o.getData('occludesLight') !== true) return false;
    if ((o as unknown as { alpha?: number }).alpha === 0) return false;
    if (o instanceof Phaser.GameObjects.Particles.ParticleEmitter) return false;
    const bounded = o as unknown as { getBounds?: () => Phaser.Geom.Rectangle };
    if (bounded.getBounds && !(o instanceof Phaser.GameObjects.Graphics)) {
      const b = worldBounds(o, this.scene.cameras.main);
      return lit.some((l) => Phaser.Geom.Intersects.RectangleToRectangle(b, l));
    }
    return true;
  }
}

/** Umriss in Weltkoordinaten, auch für Dinge mit Parallaxe (wo sie gerade auf dem Bildschirm stehen). */
function worldBounds(o: Drawable, cam: Phaser.Cameras.Scene2D.Camera): Phaser.Geom.Rectangle {
  const b = (o as unknown as Phaser.GameObjects.Image).getBounds();
  b.x += cam.scrollX * (1 - o.scrollFactorX);
  return b;
}
