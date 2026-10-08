// Schminke der Kinder (Gesicht und Glitzertattoos) – eigener Eintrag im localStorage (Bilddaten
// sind zu groß für den 250-ms-Vergleich des AutoSave). Geschrieben wird beim Verlassen des
// Schminkspiels. Keine Netzwerkzugriffe.

import { SHAPES, type ShapeId } from '../data/makeup';

const STORAGE_KEY = 'hinterhof-abenteuer/schminke';

/** Ein fertiges Glitzertattoo: Form, Mitte auf dem Arm (Bildschirm des Schminkspiels) und Bild (Kleber + Glitzer). */
export interface SavedTattoo {
  id: ShapeId;
  x: number;
  y: number;
  image: string;
}

/** Schminke eines Kindes. */
export interface SavedMakeup {
  /** Bemalte Gesichtsfläche (data-URL), fehlt = ungeschminkt. */
  face?: string;
  tattoos: SavedTattoo[];
  /** Wo Glitzer liegt (Bildschirm des Schminkspiels), damit es dort wieder funkelt. */
  grains: { x: number; y: number; mode: 'face' | 'arm' }[];
}

const isImage = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:image/');
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Prüft einen Eintrag; Kaputtes fällt weg (nie ein Absturz). */
function parse(v: unknown): SavedMakeup | undefined {
  if (typeof v !== 'object' || v === null) return undefined;
  const o = v as Record<string, unknown>;
  const tattoos = (Array.isArray(o.tattoos) ? o.tattoos : []).filter(
    (t): t is SavedTattoo =>
      typeof t === 'object' && t !== null && SHAPES.includes(t.id) && isNum(t.x) && isNum(t.y) && isImage(t.image),
  );
  const grains = (Array.isArray(o.grains) ? o.grains : []).filter(
    (g): g is SavedMakeup['grains'][number] => typeof g === 'object' && g !== null && isNum(g.x) && isNum(g.y) && (g.mode === 'face' || g.mode === 'arm'),
  );
  const face = isImage(o.face) ? o.face : undefined;
  if (!face && tattoos.length === 0) return undefined;
  return { face, tattoos, grains };
}

/** Gespeicherte Schminke je Kind (id → Schminke). */
export function loadMakeup(): Map<string, SavedMakeup> {
  const out = new Map<string, SavedMakeup>();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const all: unknown = raw ? JSON.parse(raw) : {};
    if (typeof all !== 'object' || all === null) return out;
    for (const [id, v] of Object.entries(all)) {
      const m = parse(v);
      if (m) out.set(id, m);
    }
  } catch {
    // Kaputt oder gesperrt: dann eben ungeschminkt
  }
  return out;
}

export function saveMakeup(all: Map<string, SavedMakeup>): void {
  try {
    if (all.size === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(all)));
  } catch {
    // Speicher voll oder gesperrt: dann eben ohne
  }
}
