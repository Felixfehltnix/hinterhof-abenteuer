// Kamera und Fotoleine: Ein Kind fotografiert, das Sofortbild hängt dann an der Leine.

/** Fotoleine unter dem Pergola-Balken zwischen Schaukel und Ankleidekiste (Weltkoordinaten). */
export const PHOTO_LINE = { left: 860, right: 1160, y: 472, sag: 18 };
/** So viele Fotos hängen an der Leine; ein neues schiebt das älteste herunter. */
export const MAX_PHOTOS = 4;

export const PHOTO = {
  /** Ausschnitt, den die Kamera sieht (Welt-px), vor dem Kind in Blickrichtung. */
  view: { width: 760, height: 570, ahead: 380, up: 230 },
  /** Gespeichertes Bild (px) – klein halten, es liegt im localStorage. */
  thumb: { width: 216, height: 162 },
  /** Maße des Sofortbilds mit weißem Rand (Textur), Bild darin oben. */
  frame: { width: 240, height: 284, border: 12 },
  /** Größe an der Leine und beim Herauskommen. */
  lineScale: 0.31,
  popScale: 0.75,
  /** So lange entwickelt sich das Bild (ms), bevor es zur Leine fliegt. */
  developMs: 1400,
  /** Hebt das Kind die Kamera, löst sie nach so vielen ms aus. */
  shutterDelay: 380,
  /** WebP-Qualität fürs Speichern. */
  quality: 0.8,
};
