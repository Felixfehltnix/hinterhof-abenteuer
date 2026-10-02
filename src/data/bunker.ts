// Bunker unter der Wiese (Buddeln mit der Schaufel). Bisher nur die Eingangsluke, noch keine Unterwelt.
// Koordinaten sind Weltkoordinaten.

export const BUNKER = {
  /** Hier (weit links im Gras, zwischen Baum und Ankleidekiste) kann ein Kind mit Schaufel buddeln. */
  zone: { left: 320, right: 1150 },
  /** So lange buddelt ein Kind, bis das Loch fertig ist (ms). */
  digMs: 4200,
  /** Ein Schaufelstich (ms). */
  scoopMs: 700,
  /** Abstand Kind → Mitte des Lochs (px, in Blickrichtung). */
  reach: 140,
  /** Das Loch liegt etwas hinter den Füßen (px), damit das Kind davor steht. */
  behind: 30,
  /** Erdhaufen neben dem Loch (px, weiter in Blickrichtung). */
  pileOffset: 160,
  /** So nah an der Luke (oder einem anderen Loch) wird nicht gebuddelt (px). */
  keepAway: 220,
  /** Ein Loch ohne Fund schüttet sich nach so vielen ms wieder zu. */
  refillMs: 1500,
};
