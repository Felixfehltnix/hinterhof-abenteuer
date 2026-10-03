// Zaubertrank: Zutaten aus dem Garten in den Eimer geben, umrühren, eine Fee erscheint.
// Kein Verlieren: Jede Mischung ergibt eine Fee.

export const INGREDIENTS = ['mud', 'leaf', 'root', 'flower', 'grass', 'berry', 'mushroom', 'sand', 'drop', 'snow', 'stone', 'shell'] as const;
export type IngredientId = (typeof INGREDIENTS)[number];

export const FAIRIES = ['flower', 'mud', 'leaf', 'berry', 'mushroom', 'drop', 'ice', 'rainbow'] as const;
export type FairyId = (typeof FAIRIES)[number];

export interface IngredientDef {
  /** Farbe, die der Trank annimmt (Mittelwert aller Zutaten). */
  color: number;
  /** Punkte für Feen (die höchste Summe gewinnt). */
  score: Partial<Record<FairyId, number>>;
}

export const INGREDIENT_DEFS: Record<IngredientId, IngredientDef> = {
  mud: { color: 0x7a5230, score: { mud: 3 } },
  leaf: { color: 0x58a83c, score: { leaf: 3, flower: 1 } },
  root: { color: 0x9b6a3c, score: { mud: 1, mushroom: 2 } },
  flower: { color: 0xff7fb0, score: { flower: 3 } },
  grass: { color: 0x7cc84e, score: { leaf: 2, flower: 2 } },
  berry: { color: 0xa63a8c, score: { berry: 3 } },
  mushroom: { color: 0xe8553d, score: { mushroom: 3 } },
  sand: { color: 0xe6cf8e, score: { mud: 2 } },
  drop: { color: 0x6ec6ff, score: { drop: 3, ice: 1 } },
  snow: { color: 0xe3f4ff, score: { ice: 3 } },
  stone: { color: 0x9a9aa6, score: { drop: 1, ice: 1, mud: 1 } },
  shell: { color: 0xf3c8b8, score: { drop: 2, ice: 1 } },
};

export interface FairyDef {
  dress: number;
  wing: number;
  hair: number;
  /** Funken auf der Wiese und beim Auftauchen. */
  spark: number;
}

export const FAIRY_DEFS: Record<FairyId, FairyDef> = {
  flower: { dress: 0xff8fb8, wing: 0xffd1e6, hair: 0xf2c14e, spark: 0xffb3d1 },
  mud: { dress: 0x8a5a34, wing: 0xd9b98a, hair: 0x4a2f1a, spark: 0xb98a5a },
  leaf: { dress: 0x58a83c, wing: 0xf2a541, hair: 0x7a4a2a, spark: 0xb7e07a },
  berry: { dress: 0x9b3d86, wing: 0xe08ac8, hair: 0x3a1d4a, spark: 0xff7fb0 },
  mushroom: { dress: 0xe8553d, wing: 0xfff1d6, hair: 0xf7f3e8, spark: 0xfff7a8 },
  drop: { dress: 0x4aa8e8, wing: 0xbfe6ff, hair: 0x1f5fa8, spark: 0xbfe6ff },
  ice: { dress: 0xdff3ff, wing: 0x9ad8ff, hair: 0xffffff, spark: 0xe8f8ff },
  rainbow: { dress: 0xffd166, wing: 0xc9a8ff, hair: 0xef476f, spark: 0xffffff },
};

/** Eine Fee zu den Zutaten: höchste Punktzahl; ohne klaren Sieger (oder zu bunt gemischt) die Regenbogenfee. */
export function pickFairy(added: IngredientId[]): FairyId {
  const total = new Map<FairyId, number>();
  for (const id of added) for (const [f, n] of Object.entries(INGREDIENT_DEFS[id].score)) total.set(f as FairyId, (total.get(f as FairyId) ?? 0) + (n ?? 0));
  const ranked = [...total.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return 'rainbow';
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return 'rainbow';
  if (new Set(added).size >= BREW.mixedKinds) return 'rainbow';
  return ranked[0][0];
}

/** Trankfarbe: Mittelwert der Zutaten (Wasserblau, wenn noch nichts drin ist). */
export function mixColor(added: IngredientId[]): number {
  if (added.length === 0) return BREW.water;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const id of added) {
    const c = INGREDIENT_DEFS[id].color;
    r += (c >> 16) & 255;
    g += (c >> 8) & 255;
    b += c & 255;
  }
  const n = added.length;
  return (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n);
}

export const BREW = {
  water: 0x6fc3d8,
  /** So viele verschiedene Zutaten sind „bunt gemischt“ = Regenbogenfee. */
  mixedKinds: 6,
  /** Höchstens so viele Zutaten im Trank. */
  maxAdded: 12,
  /** So viele ganze Umdrehungen rühren, bis die Fee kommt. */
  turns: 2.5,
  /** Der Topf (Bildschirmkoordinaten): Mitte der Öffnung, Radien. */
  pot: { x: 960, y: 380, rx: 250, ry: 80, bodyH: 300 },
  /** Der Korb mit Zutaten, 2 Reihen × 6 am unteren Rand. */
  basket: { x: 960, y: 870, cols: 6, dx: 170, dy: 130, item: 96 },
  /** Ausgang: Holzschild oben links (Textur `snack-sign`). */
  exit: { x: 60, y: 50 },
};

/** Auf der Wiese höchstens so viele Feen, die älteste geht mit Glitzer fort. */
export const MAX_FAIRIES = 3;
