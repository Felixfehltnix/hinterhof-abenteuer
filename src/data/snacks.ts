// Snackbox-Spiel: Zwei Kinder halten eine Zahl + Snack hoch, auf den Teller kommt die Summe.
// Bildschirmkoordinaten (1920×1080).

export type SnackId = 'apple' | 'banana' | 'cookie' | 'strawberry';

/** Reihenfolge = Fächer der Box von links nach rechts. */
export const SNACKS: SnackId[] = ['apple', 'banana', 'cookie', 'strawberry'];

/** Was ein Kind hochhält: Zahl + Snackart. */
export interface Hold {
  snack: SnackId;
  n: number;
}

/** Linkes und rechtes Kind; gleiche Snackart oder verschiedene Früchte. */
export interface Round {
  a: Hold;
  b: Hold;
}

/** Je mehr Runden, desto größer die Zahlen (Summe höchstens 10 = Plätze auf dem Teller). */
export function maxNumber(roundIndex: number): number {
  return roundIndex < 3 ? 3 : roundIndex < 6 ? 4 : 5;
}

/** Wie viele Snacks je Art auf den Teller müssen (gleiche Art: die Summe). */
export function needed(round: Round): Map<SnackId, number> {
  const need = new Map<SnackId, number>();
  for (const h of [round.a, round.b]) need.set(h.snack, (need.get(h.snack) ?? 0) + h.n);
  return need;
}

/** Neue Runde: andere Zahlen/Snacks als zuvor; ab Runde 2 halten die Kinder oft verschiedene Früchte. */
export function newRound(roundIndex: number, previous?: Round): Round {
  const max = maxNumber(roundIndex);
  const pick = () => SNACKS[Math.floor(Math.random() * SNACKS.length)];
  const num = () => 1 + Math.floor(Math.random() * max);
  const key = (r: Round) => `${r.a.snack}${r.a.n}${r.b.snack}${r.b.n}`;
  for (;;) {
    const first = pick();
    let second = first;
    if (roundIndex >= 2 && Math.random() < 0.6) {
      while (second === first) second = pick();
    }
    const round: Round = { a: { snack: first, n: num() }, b: { snack: second, n: num() } };
    if (!previous || key(round) !== key(previous)) return round;
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
