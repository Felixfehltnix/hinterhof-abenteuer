import Phaser from 'phaser';
import { ARM, FACE, HEAD_SCALE, MAKEUP_DECAL, STENCIL } from '../data/makeup';
import { KID_RIG } from '../data/poses';
import { loadMakeup, saveMakeup, type SavedMakeup } from '../save/makeup';
import { FACE_X, FACE_Y } from '../scenes/placeholders/kids';

/** Schminke eines Kindes mit fertig geladenen Bildern (fürs Schminkspiel zum Weiterschminken). */
export interface LoadedMakeup {
  saved: SavedMakeup;
  face?: HTMLImageElement;
  tattoos: HTMLImageElement[];
}

/** Texture-Keys der Auflagen: Gesicht (im Format des Kopfes) und Tattoos (im Format des Arms). */
export const makeupFaceKey = (kidId: string) => `makeup-face-${kidId}`;
export const makeupArmKey = (kidId: string) => `makeup-arm-${kidId}`;

function decode(src: string): Promise<HTMLImageElement | undefined> {
  const img = new Image();
  img.src = src;
  return img.decode().then(
    () => img,
    () => undefined,
  );
}

/**
 * Schminke aller Kinder (#88, #89): gespeichert im eigenen localStorage-Eintrag, auf der Wiese als
 * Auflagen auf Kopf und Arm. Die Auflagen sind Canvas-Texturen `makeup-face-<id>` / `makeup-arm-<id>`;
 * jedes Kind (auch in Grill, Snackbox, Ankleide …) legt sie beim Erschaffen selbst auf (`Kid`).
 */
export class KidMakeup {
  private readonly saved = loadMakeup();
  private readonly loaded = new Map<string, Promise<LoadedMakeup | undefined>>();

  /** onReady: Auflagen eines Kindes sind (neu) gezeichnet – Kinder auf der Wiese frisch auflegen lassen. */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onReady: (kidId: string) => void,
  ) {
    for (const id of this.saved.keys()) void this.build(id);
  }

  /** Schminke eines Kindes mit geladenen Bildern (undefined = ungeschminkt). */
  get(kidId: string): Promise<LoadedMakeup | undefined> {
    let p = this.loaded.get(kidId);
    if (!p) {
      const saved = this.saved.get(kidId);
      p = saved ? this.decodeAll(saved) : Promise.resolve(undefined);
      this.loaded.set(kidId, p);
    }
    return p;
  }

  /** Neue Schminke nach dem Schminkspiel (undefined = alles abgewischt). Speichert und zeichnet die Auflagen neu. */
  set(kidId: string, makeup: SavedMakeup | undefined): void {
    if (makeup) this.saved.set(kidId, makeup);
    else this.saved.delete(kidId);
    this.loaded.delete(kidId);
    saveMakeup(this.saved);
    void this.build(kidId);
  }

  private async decodeAll(saved: SavedMakeup): Promise<LoadedMakeup | undefined> {
    const face = saved.face ? await decode(saved.face) : undefined;
    const images = await Promise.all(saved.tattoos.map((t) => decode(t.image)));
    // Bilder, die sich nicht laden lassen, fallen weg
    const ok = saved.tattoos.map((_, i) => images[i] !== undefined);
    return {
      saved: { ...saved, face: face ? saved.face : undefined, tattoos: saved.tattoos.filter((_, i) => ok[i]) },
      face,
      tattoos: images.filter((img): img is HTMLImageElement => img !== undefined),
    };
  }

  /** Zeichnet die Auflagen eines Kindes (Canvas-Texturen werden wiederverwendet, abgewischt = leer). */
  private async build(kidId: string): Promise<void> {
    const m = await this.get(kidId);
    if (!this.scene.sys.isActive() && !this.scene.sys.isSleeping()) return;
    const { res: fr } = MAKEUP_DECAL.face;
    const face = this.canvas(makeupFaceKey(kidId), KID_RIG.head.width * fr, KID_RIG.head.height * fr, !!m?.face);
    if (face) {
      const ctx = face.context;
      if (m?.face) {
        // Gesichtsfläche des Schminkspiels (Bildschirm-px) → Kopf (Rig-Einheiten): geteilt durch HEAD_SCALE
        const r = (FACE.radius / HEAD_SCALE) * fr;
        const cx = FACE_X * fr;
        const cy = FACE_Y * fr;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(m.face, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
      }
      face.refresh();
    }
    const { res: ar, sleeve } = MAKEUP_DECAL.arm;
    const arm = this.canvas(makeupArmKey(kidId), KID_RIG['arm-r'].width * ar, KID_RIG['arm-r'].height * ar, !!m?.tattoos.length);
    if (arm && m) {
      // Unterarm des Schminkspiels (liegt quer, Hand rechts) → Arm der Figur (hängt, Hand unten):
      // um 90° gedreht, die Dicke des Unterarms wird zur Breite des Arms.
      const { area } = ARM;
      const f = KID_RIG['arm-r'].width / (area.y1 - area.y0);
      const midY = (area.y0 + area.y1) / 2;
      const ctx = arm.context;
      const size = STENCIL.size * STENCIL.scale * f * ar;
      m.saved.tattoos.forEach((t, i) => {
        const img = m.tattoos[i];
        const x = (KID_RIG['arm-r'].width / 2 - (t.y - midY) * f) * ar;
        const y = (sleeve + (t.x - area.x0) * f) * ar;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      });
      arm.refresh();
    } else arm?.refresh();
    this.onReady(kidId);
  }

  /** Canvas-Textur leeren (oder erst anlegen, wenn es etwas zu zeigen gibt). */
  private canvas(key: string, w: number, h: number, needed: boolean): Phaser.Textures.CanvasTexture | undefined {
    const textures = this.scene.textures;
    if (!textures.exists(key)) {
      if (!needed) return undefined;
      return textures.createCanvas(key, Math.ceil(w), Math.ceil(h)) ?? undefined;
    }
    const tex = textures.get(key) as Phaser.Textures.CanvasTexture;
    tex.context.clearRect(0, 0, tex.width, tex.height);
    return tex;
  }
}
