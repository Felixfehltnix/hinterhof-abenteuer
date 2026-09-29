// Grill-Spiel (#66): Grillgut, Garstufen und Bestellungen. Gezeichnet in
// src/scenes/placeholders/grill.ts, gespielt in src/scenes/GrillScene.ts.

export type FoodId = 'sausage' | 'bun' | 'baguette' | 'cheese';
export const FOOD_IDS: readonly FoodId[] = ['sausage', 'bun', 'baguette', 'cheese'];

export type Sauce = 'ketchup' | 'mustard';

export interface FoodDef {
  /** Sekunden auf dem Rost, bis es gar ist (Garstufe 1). Gewendet wird nicht. */
  cook: number;
  /** Muss gegrillt werden (roh = bäh). Brötchen darf auch ungetoastet gegessen werden. */
  mustCook: boolean;
  /** Passt ins aufgeschnittene Brötchen. */
  fillsBun: boolean;
  width: number;
  height: number;
}

export const FOODS: Record<FoodId, FoodDef> = {
  sausage: { cook: 10, mustCook: true, fillsBun: true, width: 150, height: 42 },
  bun: { cook: 4, mustCook: false, fillsBun: false, width: 140, height: 72 },
  baguette: { cook: 6, mustCook: true, fillsBun: false, width: 176, height: 54 },
  cheese: { cook: 7, mustCook: true, fillsBun: true, width: 112, height: 70 },
};

/**
 * Garstufe (in Vielfachen der Garzeit): 0 roh, 1 angebräunt (noch roh), 2 gar,
 * 3 kräftig gebräunt (noch gut), 4 verkohlt. Gegessen wird von 1,0 bis unter 2,5.
 */
export const DONE = 1;
export const BURNT = 2.5;
export const STAGE_LIMITS = [0.5, DONE, 1.8, BURNT];
export const STAGES = 5;

export function stageOf(level: number): number {
  let s = 0;
  while (s < STAGE_LIMITS.length && level >= STAGE_LIMITS[s]) s++;
  return s;
}

/** Wie weit es schon zur nächsten Garstufe ist (0..1), zum weichen Überblenden der Bilder. */
export function stageProgress(level: number): number {
  const s = stageOf(level);
  if (s >= STAGE_LIMITS.length) return 0;
  const lo = s === 0 ? 0 : STAGE_LIMITS[s - 1];
  return (level - lo) / (STAGE_LIMITS[s] - lo);
}

/** Wie ein Stück Grillgut ist: roh, gut oder verbrannt. */
export function quality(id: FoodId, level: number): 'raw' | 'good' | 'burnt' {
  if (level >= BURNT) return 'burnt';
  if (FOODS[id].mustCook && level < DONE) return 'raw';
  return 'good';
}

/** Ab so vielen Klecksen zählt eine Soße als drauf (kurz drüberhalten reicht). */
export const SAUCE_MIN = 8;

// --- Bestellungen --------------------------------------------------------------------

/** Ein bestelltes Gericht: Hauptsache, im Brötchen oder nicht, Soßen. */
export interface OrderItem {
  main: 'sausage' | 'cheese' | 'baguette';
  bun: boolean;
  sauces: Sauce[];
}

type SauceChoice = [Sauce[], number];

interface MenuEntry {
  main: OrderItem['main'];
  bun: boolean;
  weight: number;
  sauces: SauceChoice[];
}

// Leichter Realismus: meistens Würstchen im Brötchen mit Ketchup, Grillkäse selten mit Soße,
// Kräuterbaguette nie mit Soße.
const MENU: MenuEntry[] = [
  { main: 'sausage', bun: true, weight: 38, sauces: [[['ketchup'], 45], [['mustard'], 28], [['ketchup', 'mustard'], 12], [[], 15]] },
  { main: 'sausage', bun: false, weight: 12, sauces: [[['ketchup'], 50], [['mustard'], 30], [[], 20]] },
  { main: 'cheese', bun: true, weight: 10, sauces: [[[], 70], [['ketchup'], 30]] },
  { main: 'cheese', bun: false, weight: 14, sauces: [[[], 86], [['ketchup'], 9], [['mustard'], 5]] },
  { main: 'baguette', bun: false, weight: 16, sauces: [[[], 100]] },
];

// Beilage zu einer zweiteiligen Bestellung
const SIDES: [OrderItem, number][] = [
  [{ main: 'baguette', bun: false, sauces: [] }, 55],
  [{ main: 'cheese', bun: false, sauces: [] }, 25],
  [{ main: 'sausage', bun: false, sauces: ['ketchup'] }, 20],
];
const TWO_ITEMS = 0.22;

function pick<T>(list: [T, number][], rnd: () => number): T {
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of list) {
    r -= w;
    if (r <= 0) return v;
  }
  return list[list.length - 1][0];
}

export const signature = (items: OrderItem[]) =>
  items
    .map((i) => `${i.main}${i.bun ? '+bun' : ''}:${[...i.sauces].sort().join(',')}`)
    .sort()
    .join('|');

/**
 * Neue zufällige Bestellung. Die letzten Bestellungen werden nicht gleich wiederholt, und was
 * zuletzt oft kam, wird seltener (damit nicht fünfmal Grillkäse mit Senf kommt).
 */
export function randomOrder(recent: string[], rnd: () => number = Math.random): OrderItem[] {
  let best: OrderItem[] = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    const recentMains = recent.slice(-3).join('|');
    const menu: [MenuEntry, number][] = MENU.map((m) => {
      // Was in den letzten Bestellungen schon vorkam, wird seltener
      const seen = (recentMains.match(new RegExp(`${m.main}${m.bun ? '\\+bun' : ':'}`, 'g')) ?? []).length;
      return [m, m.weight / (1 + seen * 1.5)];
    });
    const entry = pick(menu, rnd);
    const items: OrderItem[] = [{ main: entry.main, bun: entry.bun, sauces: pick(entry.sauces, rnd) }];
    if (rnd() < TWO_ITEMS) {
      const side = pick(SIDES.filter(([s]) => s.main !== entry.main), rnd);
      items.push({ ...side, sauces: [...side.sauces] });
    }
    best = items;
    if (!recent.slice(-2).includes(signature(items))) break;
  }
  return best;
}
