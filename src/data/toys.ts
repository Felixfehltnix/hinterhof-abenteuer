// Katalog aller Spielzeug-TYPEN. Welche Spielzeuge anfangs auf der Wiese liegen,
// steht getrennt davon in playground.ts.
//
// Neues Spielzeug: Eintrag hier + Platzhalter-Zeichnung in scenes/placeholders/toys.ts.
// Die id ist gleichzeitig der Texture-Key (echte Grafik: assets/…png unter derselben id laden).

/** Verhaltensbausteine, siehe src/objects/toys/behaviors/. */
export type BehaviorId =
  | 'draggable'
  | 'fling'
  | 'kick'
  | 'wobble'
  | 'glide'
  | 'kidKick'
  | 'plane'
  | 'boomerang'
  | 'kite'
  | 'float'
  | 'holdable'
  | 'pop'
  | 'bubbles'
  | 'hoop'
  | 'goal'
  | 'cans'
  | 'pins'
  | 'rideable'
  | 'honk'
  | 'trampoline'
  | 'seesaw'
  | 'hopper'
  | 'hula'
  | 'pool';

/** Merkmale, auf die andere Spielzeuge reagieren (z. B. Treffer nur mit Bällen). */
export type ToyTag = 'ball';

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
  /** Wie stark Wind das Spielzeug in der Luft mitnimmt (0 = gar nicht, 1 = voll). */
  windFactor: number;
  /** holdable: so hoch über der Hand des Kindes hängt es an der Schnur (px). */
  holdHeight: number;
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
  windFactor: 0,
  holdHeight: 150,
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
  tags?: readonly ToyTag[];
  /** Abweichungen von DEFAULT_TOY_PARAMS. */
  params?: Partial<ToyParams>;
}

export const TOYS = [
  {
    id: 'ball',
    tags: ['ball'],
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
    tags: ['ball'],
    width: 76,
    height: 76,
    behaviors: ['draggable', 'fling', 'kick', 'kidKick'],
    params: { bounce: 0.4, rollFriction: 1.1, spin: true, kickSpeed: 850, kickLift: 320, gravity: 3200 },
  },
  {
    // Hoher Bogen, springt ein paarmal nach.
    id: 'basketball',
    tags: ['ball'],
    width: 84,
    height: 84,
    behaviors: ['draggable', 'fling', 'kick', 'kidKick'],
    params: { bounce: 0.5, rollFriction: 2.5, spin: true, kickSpeed: 220, kickLift: 1450, gravity: 3300 },
  },
  {
    // Groß und leicht: fliegt langsam und schwebt lange.
    id: 'beachball',
    tags: ['ball'],
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
  {
    // Werfen: gleitet in Wurfrichtung, sinkt sanft, ab und zu ein Looping.
    id: 'paperplane',
    width: 100,
    height: 50,
    behaviors: ['draggable', 'fling', 'plane'],
    params: { gravity: 1800, lift: 0.9, airDrag: 0.35, bounce: 0.1, rollFriction: 8, windFactor: 0.8, throwFactor: 0.9 },
  },
  {
    // Werfen: großer Bogen, kommt zurück.
    id: 'boomerang',
    width: 100,
    height: 100,
    behaviors: ['draggable', 'fling', 'boomerang', 'wobble'],
    params: { gravity: 2400, airDrag: 0, bounce: 0.2, rollFriction: 8, spin: true },
  },
  {
    // Ziehen: steigt an der Schnur hoch. Ein Kind darauf ziehen: Es hält die Schnur.
    id: 'kite',
    width: 120,
    height: 150,
    behaviors: ['draggable', 'kite', 'holdable'],
    params: { gravity: 150, airDrag: 2.5, bounce: 0, rollFriction: 10, windFactor: 1, holdHeight: 380 },
  },
  {
    // Steigt und schwebt. Antippen: platzt. Auf ein Kind ziehen: Es hält ihn.
    id: 'balloon',
    width: 90,
    height: 150,
    behaviors: ['draggable', 'float', 'holdable', 'pop'],
    params: { windFactor: 1, holdHeight: 170 },
  },
  {
    // Antippen: Seifenblasen steigen auf.
    id: 'bubblewand',
    width: 60,
    height: 120,
    behaviors: ['draggable', 'fling', 'bubbles'],
    params: { bounce: 0.2, rollFriction: 8 },
  },
  {
    // Ball fliegt oder fällt durch den Ring: Netz wackelt, Sterne sprühen.
    id: 'hoop',
    width: 170,
    height: 330,
    behaviors: ['draggable', 'hoop'],
    params: { bounce: 0, rollFriction: 20 },
  },
  {
    // Ball rollt ins Tor: Netz beult sich, alle Kinder jubeln.
    id: 'goal',
    width: 300,
    height: 170,
    behaviors: ['draggable', 'goal'],
    params: { bounce: 0, rollFriction: 20 },
  },
  {
    // 6 Dosen auf einer Kiste. Ball trifft: purzeln. Antippen: neu aufbauen.
    id: 'cans',
    width: 170,
    height: 60,
    behaviors: ['draggable', 'cans'],
    params: { bounce: 0, rollFriction: 20 },
  },
  {
    // 6 Kegel auf einer Matte. Ball rollt hinein: fallen um. Antippen: aufstellen.
    id: 'pins',
    width: 240,
    height: 34,
    behaviors: ['draggable', 'pins'],
    params: { bounce: 0, rollFriction: 20 },
  },
  {
    // Kind darauf ziehen: sitzt. Ziehen: fährt. Antippen: hupt.
    id: 'bobbycar',
    width: 180,
    height: 100,
    behaviors: ['draggable', 'rideable', 'honk'],
    params: { bounce: 0.1, rollFriction: 1.8 },
  },
  {
    // Wie Bobbycar, das Kind macht Laufbewegungen.
    id: 'balancebike',
    width: 190,
    height: 110,
    behaviors: ['draggable', 'rideable', 'wobble'],
    params: { bounce: 0.1, rollFriction: 1.8 },
  },
  {
    // Wie Bobbycar, das Kind steht und stößt sich ab.
    id: 'scooter',
    width: 150,
    height: 150,
    behaviors: ['draggable', 'rideable', 'wobble'],
    params: { bounce: 0.1, rollFriction: 1.5 },
  },
  {
    // Spielzeug oder Kind hineinlegen und samt Inhalt schieben.
    id: 'wheelbarrow',
    width: 200,
    height: 110,
    behaviors: ['draggable', 'rideable', 'wobble'],
    params: { bounce: 0.1, rollFriction: 2.5 },
  },
  {
    // Kind darauf: hüpft von selbst. Antippen: Salto.
    id: 'trampoline',
    width: 230,
    height: 90,
    behaviors: ['draggable', 'trampoline'],
    params: { bounce: 0, rollFriction: 20 },
  },
  {
    // Ein Kind: diese Seite runter. Zwei Kinder: wippt.
    id: 'seesaw',
    width: 360,
    height: 90,
    behaviors: ['draggable', 'seesaw'],
    params: { bounce: 0, rollFriction: 20 },
  },
  {
    // Kind darauf: hüpft in kleinen Sprüngen über die Wiese.
    id: 'hopperball',
    width: 90,
    height: 100,
    behaviors: ['draggable', 'fling', 'hopper'],
    params: { bounce: 0.5, rollFriction: 3 },
  },
  {
    // Auf ein Kind ziehen: kreist um die Hüfte.
    id: 'hulahoop',
    width: 130,
    height: 40,
    behaviors: ['draggable', 'fling', 'hula'],
    params: { bounce: 0.3, rollFriction: 6 },
  },
  {
    // Kinder und Spielzeug hinein: planschen und schwimmen.
    id: 'pool',
    width: 320,
    height: 100,
    behaviors: ['draggable', 'pool'],
    params: { bounce: 0, rollFriction: 20 },
  },
] as const satisfies readonly ToyDef[];

export type ToyId = (typeof TOYS)[number]['id'];

export function getToyDef(id: ToyId): ToyDef {
  const def = TOYS.find((t) => t.id === id);
  if (!def) throw new Error(`Unbekanntes Spielzeug: ${id}`);
  return def;
}
