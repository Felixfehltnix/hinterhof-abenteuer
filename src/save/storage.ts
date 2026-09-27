// Speicherstand der Wiese – nur lokal auf dem Gerät (localStorage, bleibt im
// Capacitor-WebView erhalten). Keine Netzwerkzugriffe.

const STORAGE_KEY = 'hinterhof-abenteuer/wiese';
export const SAVE_VERSION = 1;

export interface SavedObject {
  id: string;
  x: number;
  y: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  kids: SavedObject[];
  toys: SavedObject[];
  /** Weitere Zustände (Tageszeit, Wetter, …). Jeder Leser prüft seinen Wert selbst. */
  world: Record<string, unknown>;
}

/** Liest den Speicherstand. null bei erstem Start, unbekannter Version oder kaputten Daten. */
export function loadSave(): SaveData | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Speicher voll oder gesperrt: dann eben ohne Speichern weiterspielen.
  }
}

function parseSave(value: unknown): SaveData | null {
  if (!isRecord(value) || value.version !== SAVE_VERSION) return null;
  if (!Array.isArray(value.kids) || !Array.isArray(value.toys)) return null;
  return {
    version: SAVE_VERSION,
    kids: value.kids.filter(isSavedObject),
    toys: value.toys.filter(isSavedObject),
    world: isRecord(value.world) ? value.world : {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSavedObject(value: unknown): value is SavedObject {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y)
  );
}
