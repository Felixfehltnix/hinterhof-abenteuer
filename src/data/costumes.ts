// Verkleidungen der Ankleidekiste (#70): 10 Kostüme aus je 4 Teilen, frei mischbar.
// Gezeichnet werden die Teile in src/scenes/placeholders/costumes.ts, getragen als Auflage auf den
// Körperteilen des Kindes (Kid.setOutfit). Echte Grafiken: `costume-<costume>-<slot>-<layer>`.

/** Wo ein Teil sitzt. */
export type Slot = 'head' | 'top' | 'bottom' | 'feet';
export const SLOTS: readonly Slot[] = ['head', 'top', 'bottom', 'feet'];

export const COSTUMES = [
  'pirate',
  'princess',
  'firefighter',
  'astronaut',
  'knight',
  'wizard',
  'dino',
  'superhero',
  'builder',
  'ballerina',
] as const;

export type CostumeId = (typeof COSTUMES)[number];

/** Was ein Kind trägt: je Stelle ein Kostüm (fehlt eine Stelle, trägt es dort seine eigenen Sachen). */
export type Outfit = Partial<Record<Slot, CostumeId>>;

/** Texture-Key eines Teils auf einer Ebene der Figur. */
export const costumeKey = (costume: CostumeId, slot: Slot, layer: string) => `costume-${costume}-${slot}-${layer}`;

/** Prüft einen gespeicherten Wert und behält nur Bekanntes (nie ein Absturz bei kaputten Daten). */
export function parseOutfit(value: unknown): Outfit {
  const outfit: Outfit = {};
  if (typeof value !== 'object' || value === null) return outfit;
  for (const slot of SLOTS) {
    const c = (value as Record<string, unknown>)[slot];
    if (typeof c === 'string' && (COSTUMES as readonly string[]).includes(c)) outfit[slot] = c as CostumeId;
  }
  return outfit;
}
