// Snackbox-Spiel: Zwei Kinder halten eine Zahl + Snack hoch, auf den Teller kommt die Summe.
// Bildschirmkoordinaten (1920×1080).

export type SnackId = 'apple' | 'banana' | 'cookie' | 'strawberry';

/** Reihenfolge = Fächer der Box von links nach rechts. */
export const SNACKS: SnackId[] = ['apple', 'banana', 'cookie', 'strawberry'];

export interface Round {
  snack: SnackId;
  /** Zahl des linken und des rechten Kindes. */
  a: number;
  b: number;
}

/** Je mehr Runden, desto größer die Zahlen (Summe höchstens 10 = Plätze auf dem Teller). */
export function maxNumber(roundIndex: number): number {
  return roundIndex < 3 ? 3 : roundIndex < 6 ? 4 : 5;
}

/** Neue Runde: anderer Snack und andere Zahlen als zuvor. */
export function newRound(roundIndex: number, previous?: Round): Round {
  const max = maxNumber(roundIndex);
  for (;;) {
    const round: Round = {
      snack: SNACKS[Math.floor(Math.random() * SNACKS.length)],
      a: 1 + Math.floor(Math.random() * max),
      b: 1 + Math.floor(Math.random() * max),
    };
    if (!previous || (round.snack !== previous.snack && (round.a !== previous.a || round.b !== previous.b))) return round;
  }
}

export const SNACK = {
  /** Fußpunkt der beiden Kinder. */
  kids: [
    { x: 520, y: 700 },
    { x: 1400, y: 700 },
  ],
  kidScale: 1,
  /** Mitte der Zahlenkarten über den Köpfen. */
  cardY: 290,
  /** Teller in der Mitte: Platz für höchstens 10 Snacks in 2 Reihen. */
  plate: { x: 960, y: 790, w: 640, h: 170 },
  plateSlots: { perRow: 5, dx: 100, y: [762, 818] },
  maxOnPlate: 10,
  /** Die Box unten: ab hier (y) gilt „zurück in die Box“. */
  box: { x: 960, y: 960, w: 1300, h: 230, top: 860 },
  /** Holzschild zurück oben links. */
  exit: { x: 30, y: 30, w: 200, h: 110 },
  /** Ein Snack in der Hand/auf dem Teller (px). */
  snackSize: 96,
};

/** Mitte des Fachs eines Snacks in der Box. */
export function compartmentX(snack: SnackId): number {
  const w = SNACK.box.w / SNACKS.length;
  return SNACK.box.x - SNACK.box.w / 2 + w * (SNACKS.indexOf(snack) + 0.5);
}
