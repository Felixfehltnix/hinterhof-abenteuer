// Fotos an der Leine – eigener Eintrag im localStorage (Bilddaten sind zu groß für den
// 250-ms-Vergleich des AutoSave). Geschrieben wird bei jedem neuen Foto. Keine Netzwerkzugriffe.

const STORAGE_KEY = 'hinterhof-abenteuer/fotos';

/** Gespeicherte Fotos (data-URLs, ältestes zuerst). */
export function loadPhotos(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string' && s.startsWith('data:image/')) : [];
  } catch {
    return [];
  }
}

export function savePhotos(photos: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch {
    // Speicher voll oder gesperrt: dann eben ohne
  }
}
