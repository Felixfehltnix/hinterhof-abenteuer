// Aufbau der Kinder aus Einzelteilen (Rig) und ihre Posen.
// Alle Maße in Pixeln der Standardfigur (size 1, 140 × 264), Ursprung = Fußpunkt (unten Mitte),
// y nach oben negativ. Jedes Kind wird mit seiner `size` (characters.ts) skaliert.

export type PartId = 'leg-l' | 'leg-r' | 'arm-l' | 'arm-r' | 'body' | 'head';

/** Textur je Teil: `kid-<id>-<texture>`. Linke und rechte Seite teilen sich eine Textur. */
export type PartTexture = 'head' | 'body' | 'arm' | 'leg';

export interface PartRig {
  texture: PartTexture;
  /** Größe des Teils (Bildfläche). */
  width: number;
  height: number;
  /** Drehpunkt im Bild als Anteil (0..1), z. B. die Schulter oben am Arm. */
  originX: number;
  originY: number;
  /** Wo das Gelenk in der stehenden Figur liegt (relativ zum Fußpunkt). */
  jointX: number;
  jointY: number;
  /** 'hip': hängt an der Hüfte (Beine, Rumpf). 'body': dreht sich mit dem Rumpf (Kopf, Arme). */
  attach: 'hip' | 'body';
}

/** Gesamtfläche der Standardfigur (Touch-Fläche, Bounds). */
export const KID_FRAME = { width: 140, height: 264 };

/** Hüfte: Drehpunkt des Rumpfes. */
export const HIP = { x: 0, y: -56 };

export const KID_RIG: Record<PartId, PartRig> = {
  'leg-l': { texture: 'leg', width: 24, height: 70, originX: 0.5, originY: 4 / 70, jointX: -16, jointY: -66, attach: 'hip' },
  'leg-r': { texture: 'leg', width: 24, height: 70, originX: 0.5, originY: 4 / 70, jointX: 16, jointY: -66, attach: 'hip' },
  'arm-l': { texture: 'arm', width: 22, height: 70, originX: 0.5, originY: 10 / 70, jointX: -45, jointY: -130, attach: 'body' },
  'arm-r': { texture: 'arm', width: 22, height: 70, originX: 0.5, originY: 10 / 70, jointX: 45, jointY: -130, attach: 'body' },
  body: { texture: 'body', width: 80, height: 92, originX: 0.5, originY: 1, jointX: HIP.x, jointY: HIP.y, attach: 'hip' },
  head: { texture: 'head', width: 144, height: 156, originX: 0.5, originY: 124 / 156, jointX: 0, jointY: -140, attach: 'body' },
};

/** Zeichenreihenfolge von hinten nach vorn. */
export const PART_ORDER: readonly PartId[] = ['leg-l', 'leg-r', 'arm-l', 'arm-r', 'body', 'head'];

/** Länge Schulter → Hand (für Schnüre, Taschenlampe, …). */
export const ARM_REACH = 60;

/**
 * Stellung eines Teils: Winkel in Grad (positiv = im Uhrzeigersinn), Verschiebung in px,
 * scaleY < 1 staucht (z. B. Beine, die im Sitzen nach vorn zeigen).
 * Die Seiten sind aus Sicht des Betrachters: arm-l ist links im Bild.
 * Ein Arm, der nach außen/oben soll: arm-l positiv, arm-r negativ.
 */
export interface PartPose {
  angle?: number;
  x?: number;
  y?: number;
  scaleY?: number;
}

export type Pose = Partial<Record<PartId, PartPose>>;

// Im Sitzen sinkt die Hüfte ungefähr um die Länge der Oberschenkel.
export const SEAT_DROP = 34;

export const POSES = {
  /** Steht gerade, Arme hängen. */
  stand: {},
  /** Sitzt von vorn gesehen: Hüfte tiefer, Beine verkürzt und leicht gespreizt. */
  sit: {
    body: { y: SEAT_DROP },
    'leg-l': { y: SEAT_DROP, angle: 14, scaleY: 0.55 },
    'leg-r': { y: SEAT_DROP, angle: -14, scaleY: 0.55 },
    'arm-l': { angle: 10 },
    'arm-r': { angle: -10 },
  },
  /** Sitzt mit ausgestreckten Beinen (Blickrichtung rechts, gespiegelt mit flipX). */
  sitLegsForward: {
    body: { y: SEAT_DROP },
    'leg-l': { y: SEAT_DROP, angle: -78 },
    'leg-r': { y: SEAT_DROP, angle: -84 },
    'arm-l': { angle: -12 },
    'arm-r': { angle: -18 },
  },
  /** Beide Arme hoch („Juhu!“). */
  armsUp: {
    'arm-l': { angle: 155 },
    'arm-r': { angle: -155 },
    head: { y: -2 },
  },
  /** Winkt mit dem rechten Arm (die Hin-und-her-Bewegung macht die Animation). */
  wave: {
    'arm-r': { angle: -140 },
    head: { angle: 4 },
  },
  /** Hängt in der Luft (wird gezogen): Beine baumeln locker, Arme leicht hoch. */
  dangle: {
    'leg-l': { angle: 10 },
    'leg-r': { angle: -7 },
    'arm-l': { angle: 40 },
    'arm-r': { angle: -40 },
  },
  /** Hält etwas mit der rechten Hand hoch (Schnur, Taschenlampe). */
  hold: {
    'arm-r': { angle: -70 },
  },

  // --- Grundposen der Tätigkeiten (Animationen, src/objects/kidMotion.ts) ---

  /** Schaukel: sitzt, beide Hände oben an den Seilen. */
  swingSit: {
    body: { y: SEAT_DROP },
    'leg-l': { y: SEAT_DROP, angle: 6 },
    'leg-r': { y: SEAT_DROP, angle: -6 },
    'arm-l': { angle: 176 },
    'arm-r': { angle: -176 },
  },
  /** Rutschen: sitzt mit gestreckten Beinen, Arme hoch („Juhu!“). */
  slideDown: {
    body: { y: SEAT_DROP },
    'leg-l': { y: SEAT_DROP, angle: -80 },
    'leg-r': { y: SEAT_DROP, angle: -86 },
    'arm-l': { angle: 150 },
    'arm-r': { angle: -160 },
  },
  /** Bobbycar: sitzt, Füße vorn am Boden, Hände am Lenkrad. */
  rideSit: {
    body: { y: SEAT_DROP },
    'leg-l': { y: SEAT_DROP, angle: -55 },
    'leg-r': { y: SEAT_DROP, angle: -62 },
    'arm-l': { angle: -45 },
    'arm-r': { angle: -52 },
  },
  /** Laufrad, Roller: steht/läuft, Hände vorn am Lenker. */
  rideStand: {
    'arm-l': { angle: -50 },
    'arm-r': { angle: -58 },
  },
  /** Schubkarre: sitzt auf dem Rand, Beine hängen vorn über den Rand, Hände halten sich fest. */
  cartSit: {
    body: { y: SEAT_DROP },
    'leg-l': { y: SEAT_DROP, angle: -28 },
    'leg-r': { y: SEAT_DROP, angle: -40 },
    'arm-l': { angle: 30 },
    'arm-r': { angle: -30 },
  },
  /** Hüpfball: sitzt mit angewinkelten Beinen, hält den Griff vorn. */
  hopSit: {
    body: { y: SEAT_DROP },
    'leg-l': { y: SEAT_DROP, angle: 22, scaleY: 0.7 },
    'leg-r': { y: SEAT_DROP, angle: -22, scaleY: 0.7 },
    'arm-l': { angle: -20 },
    'arm-r': { angle: 20 },
  },
  /** Wippe: sitzt, Beine nach vorn, Hände am Griff. */
  seesawSit: {
    body: { y: SEAT_DROP },
    'leg-l': { y: SEAT_DROP, angle: -60 },
    'leg-r': { y: SEAT_DROP, angle: -66 },
    'arm-l': { angle: -40 },
    'arm-r': { angle: -48 },
  },
  /** Planschbecken, Whirlpool: sitzt im Wasser, Hände seitlich überm Wasser. */
  bathe: {
    body: { y: SEAT_DROP },
    'leg-l': { y: SEAT_DROP, angle: 30, scaleY: 0.55 },
    'leg-r': { y: SEAT_DROP, angle: -30, scaleY: 0.55 },
    'arm-l': { angle: 55 },
    'arm-r': { angle: -55 },
  },

  // --- Kurze Posen (Gesten) ---

  /** Kleiner Freudensprung. */
  hopArms: {
    'arm-l': { angle: 115 },
    'arm-r': { angle: -115 },
  },
  /** Kichern: Hände vor dem Bauch, Kopf schief. */
  giggle: {
    'arm-l': { angle: -38 },
    'arm-r': { angle: 38 },
    head: { angle: 8 },
  },
  /** Gähnen: sich strecken. */
  stretch: {
    body: { y: -5 },
    'arm-l': { angle: 168 },
    'arm-r': { angle: -168 },
    head: { y: -3 },
  },
  /** Bäh: Hände abwehrend nach vorn, Kopf weggedreht. */
  yuck: {
    'arm-l': { angle: -70 },
    'arm-r': { angle: 70 },
    head: { angle: -12, x: -4 },
  },
  /** Böe: Arme schützend vors Gesicht, Kopf eingezogen. */
  brace: {
    'arm-l': { angle: 150 },
    'arm-r': { angle: -150 },
    head: { y: 5 },
  },
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;

/**
 * Armhaltung beim Halten in der Hand (Winkel in Grad, ersetzt die Grundpose dieser Arme; die
 * Bewegung der Tätigkeit läuft obendrauf weiter). string = Schnur (Ballon, Drachen).
 */
export type HoldPose = 'up' | 'forward' | 'hang' | 'both' | 'diagonal' | 'string';

export const HOLD_POSES: Record<HoldPose, { arms: Partial<Record<'arm-l' | 'arm-r', number>>; twoHanded: boolean }> = {
  /** Rechte Hand erhoben (Bumerang, Seifenblasenstab, Papierflieger). */
  up: { arms: { 'arm-r': -150 }, twoHanded: false },
  /** Rechte Hand nach vorn (Taschenlampe, Frisbee, Förmchen). */
  forward: { arms: { 'arm-r': -70 }, twoHanded: false },
  /** Rechter Arm hängt, das Spielzeug baumelt am Henkel (Eimer, Gießkanne, Reifen). */
  hang: { arms: { 'arm-r': -6 }, twoHanded: false },
  /** Beide Hände vor dem Bauch (Trommel). */
  both: { arms: { 'arm-l': -42, 'arm-r': 42 }, twoHanded: true },
  /** Beide Hände schräg vor dem Körper (Schaufel). */
  diagonal: { arms: { 'arm-l': -34, 'arm-r': 28 }, twoHanded: true },
  /** Schnur schräg nach oben (Ballon, Drachen). */
  string: { arms: { 'arm-r': -118 }, twoHanded: false },
};

