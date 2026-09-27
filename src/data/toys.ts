// Katalog aller Spielzeug-TYPEN. Welche Spielzeuge anfangs auf der Wiese liegen,
// steht getrennt davon in playground.ts.
//
// Neues Spielzeug: Eintrag hier + Platzhalter-Zeichnung in scenes/placeholders/toys.ts.
// Die id ist gleichzeitig der Texture-Key (echte Grafik: assets/…png unter derselben id laden).

/** Verhaltensbausteine, siehe src/objects/toys/behaviors/. */
export type BehaviorId = 'draggable' | 'fling' | 'kick' | 'wobble';

export interface ToyParams {
  /** Schwerkraft in px/s². */
  gravity: number;
  /** Sprungkraft beim Aufprall auf Boden und Bande (0 = gar nicht, 1 = verlustfrei). */
  bounce: number;
  /** Bremsen beim Rollen über die Wiese (pro Sekunde). */
  rollFriction: number;
  /** Luftwiderstand (pro Sekunde). Klein = fliegt weit, groß = schwebt kurz und fällt. */
  airDrag: number;
  /** Dreht sich beim Rollen und Fliegen (Ball ja, Eimer nein). */
  spin: boolean;
  /** kick: waagerechte Schussgeschwindigkeit in px/s. */
  kickSpeed: number;
  /** kick: Geschwindigkeit nach oben in px/s. */
  kickLift: number;
  /** fling: Wurfgeschwindigkeit = Fingergeschwindigkeit × Faktor. */
  throwFactor: number;
}

export const DEFAULT_TOY_PARAMS: ToyParams = {
  gravity: 3000,
  bounce: 0.3,
  rollFriction: 4,
  airDrag: 0.3,
  spin: false,
  kickSpeed: 260,
  kickLift: 950,
  throwFactor: 1,
};

export interface ToyDef {
  id: string;
  /** Größe der Grafik in px (auch die Größe der Platzhalter-Textur). */
  width: number;
  height: number;
  behaviors: readonly BehaviorId[];
  /** Abweichungen von DEFAULT_TOY_PARAMS. */
  params?: Partial<ToyParams>;
}

export const TOYS = [
  {
    id: 'ball',
    width: 80,
    height: 80,
    behaviors: ['draggable', 'fling', 'kick'],
    params: { bounce: 0.55, rollFriction: 3, spin: true },
  },
  {
    id: 'bucket',
    width: 90,
    height: 90,
    behaviors: ['draggable', 'fling', 'wobble'],
    params: { bounce: 0.15, rollFriction: 10 },
  },
] as const satisfies readonly ToyDef[];

export type ToyId = (typeof TOYS)[number]['id'];

export function getToyDef(id: ToyId): ToyDef {
  const def = TOYS.find((t) => t.id === id);
  if (!def) throw new Error(`Unbekanntes Spielzeug: ${id}`);
  return def;
}
