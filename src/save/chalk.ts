// Kreidebild auf der Terrasse – eigener Eintrag im localStorage (Bilddaten sind groß; der
// AutoSave der Wiese vergleicht alle 250 ms und soll das nicht jedes Mal mitschleppen).
// Geschrieben wird nur beim Verlassen des Malspiels. Keine Netzwerkzugriffe.

const STORAGE_KEY = 'hinterhof-abenteuer/kreide';

/** Gespeichertes Bild als data-URL, oder null. */
export function loadChalk(): string | null {
  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    return data && data.startsWith('data:image/') ? data : null;
  } catch {
    return null;
  }
}

/** Speichert das Bild (null = löschen). Speicher voll: dann eben ohne. */
export function saveChalk(data: string | null): void {
  try {
    if (data) window.localStorage.setItem(STORAGE_KEY, data);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Speicher voll oder gesperrt
  }
}
