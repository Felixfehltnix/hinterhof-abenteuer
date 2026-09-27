// Katalog aller Spielzeug-TYPEN. Welche Spielzeuge anfangs auf der Wiese liegen,
// steht getrennt davon in playground.ts.
//
// Neues Spielzeug: Eintrag hier + Platzhalter-Zeichnung in scenes/placeholders/toys.ts.
// Die id ist gleichzeitig der Texture-Key (echte Grafik: assets/…png unter derselben id laden).

/** Verhaltensbausteine, siehe src/objects/toys/behaviors/. */
export type BehaviorId = 'draggable' | 'fling' | 'kick' | 'wobble' | 'glide' | 'kidKick';

export interface ToyParams {
  /** Schwerkraft in px/s². */
  gravity: number;
  /** Sprungkraft beim Aufprall auf Boden und Bande (0 = gar nicht, 1 = verlustfrei). */
  bounce: number;
  /** Bremsen beim Rollen über die Wiese (pro Sekunde). */
  rollFriction: number;
  /** Luftwiderstand (pro Sekunde). Klein = fliegt weit, groß = schwebt kurz und fällt. */
  airDrag: number;
  /** Auftrieb 0..1: Anteil der Schwerkraft, der bei schnellem Flug wegfällt (Frisbee). */
  lift: number;
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
  lift: 0,
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
    behaviors: ['draggable', 'fling', 'kick', 'kidKick'],
    params: { bounce: 0.55, rollFriction: 3, spin: true },
  },
  {
    id: 'bucket',
    width: 90,
    height: 90,
    behaviors: ['draggable', 'fling', 'wobble'],
    params: { bounce: 0.15, rollFriction: 10 },
  },
  {
    // Flacher Schuss, rollt weit über die Wiese.
    id: 'football',
    width: 76,
    height: 76,
    behaviors: ['draggable', 'fling', 'kick', 'kidKick'],
    params: { bounce: 0.4, rollFriction: 1.1, spin: true, kickSpeed: 850, kickLift: 320, gravity: 3200 },
  },
  {
    // Hoher Bogen, springt ein paarmal nach.
    id: 'basketball',
    width: 84,
    height: 84,
    behaviors: ['draggable', 'fling', 'kick', 'kidKick'],
    params: { bounce: 0.5, rollFriction: 2.5, spin: true, kickSpeed: 220, kickLift: 1450, gravity: 3300 },
  },
  {
    // Groß und leicht: fliegt langsam und schwebt lange.
    id: 'beachball',
    width: 130,
    height: 130,
    behaviors: ['draggable', 'fling', 'kick', 'kidKick'],
    params: { bounce: 0.65, rollFriction: 2.5, spin: true, gravity: 900, airDrag: 0.7, kickSpeed: 320, kickLift: 750, throwFactor: 0.75 },
  },
  {
    // Werfen: gleitet waagerecht weit und sinkt am Ende sanft.
    id: 'frisbee',
    width: 110,
    height: 34,
    behaviors: ['draggable', 'fling', 'glide', 'wobble'],
    params: { bounce: 0.15, rollFriction: 6, gravity: 2600, lift: 0.85, airDrag: 0.3, throwFactor: 1.2 },
  },
] as const satisfies readonly ToyDef[];

export type ToyId = (typeof TOYS)[number]['id'];

export function getToyDef(id: ToyId): ToyDef {
  const def = TOYS.find((t) => t.id === id);
  if (!def) throw new Error(`Unbekanntes Spielzeug: ${id}`);
  return def;
}
