import type { PartId, PartPose, PoseName } from '../data/poses';

// Bewegungen der Kinder je Tätigkeit: eine Grundpose (weich überblendet) plus Bewegung, die
// jedes Bild neu aus der Zeit, dem Weg und der Geschwindigkeit des Kindes berechnet wird.
// Alle Winkel in Grad, aus Sicht der ungespiegelten Figur (flipX spiegelt automatisch).

export type Activity =
  | 'idle'
  | 'drag'
  | 'swing'
  | 'climb'
  | 'slide'
  | 'ride-sit'
  | 'ride-toddle'
  | 'ride-run'
  | 'ride-push'
  | 'ride-cart'
  | 'bounce'
  | 'hop-ball'
  | 'seesaw'
  | 'bathe'
  | 'walk'
  | 'sit'
  | 'hidden';

/** Zusatzwerte, die ein Spielgerät mitgeben kann (z. B. Sprunghöhe, oben/unten). */
export interface ActivityParams {
  /** Höhe im Sprung 0..1 (Trampolin, Hüpfball). */
  height?: number;
  /** Salto mit angezogenen Beinen. */
  salto?: boolean;
  /** Wippe: −1 ganz unten … 1 ganz oben. */
  up?: number;
}

export type Face = 'blink' | 'joy' | 'yawn';

/** Was die Bewegung pro Bild wissen muss. */
export interface MotionContext {
  /** Zeit in Sekunden. */
  t: number;
  /** Zurückgelegter Weg des Kindes in px (für Schritte). */
  travel: number;
  /** Geglättete Geschwindigkeit in px/s (Bildschirmrichtung, + = rechts / unten). */
  vx: number;
  /** Nachschwingen beim Ziehen (Grad, gedämpfte Feder). */
  sway: number;
  /** Blickrichtung des Kopfes beim Herumschauen (Grad). */
  look: number;
  /** Eigener Zeitversatz, damit nicht alle Kinder im Gleichtakt atmen. */
  seed: number;
  params: ActivityParams;
}

export type Deltas = Partial<Record<PartId, PartPose>>;

export const ACTIVITY_POSE: Record<Activity, PoseName> = {
  idle: 'stand',
  drag: 'dangle',
  swing: 'swingSit',
  climb: 'stand',
  slide: 'slideDown',
  'ride-sit': 'rideSit',
  'ride-toddle': 'rideSit',
  'ride-run': 'rideStand',
  'ride-push': 'rideStand',
  'ride-cart': 'cartSit',
  bounce: 'stand',
  'hop-ball': 'hopSit',
  seesaw: 'seesawSit',
  bathe: 'bathe',
  walk: 'stand',
  sit: 'sit',
  hidden: 'stand',
};

/** Gesicht, das zu einer Tätigkeit gehört (sonst normal mit Blinzeln). */
export const ACTIVITY_FACE: Partial<Record<Activity, Face>> = {
  drag: 'joy',
  slide: 'joy',
  bounce: 'joy',
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Schrittfolge aus dem zurückgelegten Weg: Beine und Arme gegengleich. */
function stride(travel: number, length: number, legAmp: number, armAmp: number): Deltas {
  const s = Math.sin(travel / length);
  const bob = -Math.abs(s) * 2;
  return {
    'leg-l': { angle: legAmp * s },
    'leg-r': { angle: -legAmp * s },
    'arm-l': { angle: -armAmp * s },
    'arm-r': { angle: armAmp * s },
    body: { y: bob },
  };
}

/** Ruhiges Atmen: Oberkörper hebt sich leicht, Arme schwingen minimal mit. */
function breathe(c: MotionContext, amount = 1): Deltas {
  const b = Math.sin(c.t * 2.3 + c.seed);
  return {
    body: { y: -1.6 * b * amount },
    'arm-l': { angle: 1.8 * b * amount },
    'arm-r': { angle: -1.8 * b * amount },
  };
}

export function activityMotion(a: Activity, c: MotionContext): Deltas {
  const t = c.t;
  switch (a) {
    case 'idle':
      return merge(breathe(c), { head: { angle: c.look } });
    case 'drag': {
      // Beine baumeln, schnelles Ziehen lässt alles nachschwingen
      const dangle = Math.sin(t * 7 + c.seed) * 7;
      return {
        'leg-l': { angle: c.sway + dangle },
        'leg-r': { angle: c.sway - dangle },
        'arm-l': { angle: c.sway * 0.8 },
        'arm-r': { angle: c.sway * 0.8 },
        head: { angle: c.sway * 0.25 },
      };
    }
    case 'swing': {
      // In Schwungrichtung die Beine vorstrecken, beim Zurückschwingen anziehen
      const v = clamp(c.vx / 380, -1, 1);
      const legs = -58 * v;
      const tuck = 1 - 0.3 * Math.max(0, -v * Math.sign(legs || 1));
      return {
        'leg-l': { angle: legs + 4, scaleY: tuck },
        'leg-r': { angle: legs - 4, scaleY: tuck },
        head: { angle: v * 5 },
      };
    }
    case 'climb': {
      // Hochklettern: abwechselnd Arm hoch, Knie hoch
      const s = Math.sin(c.travel / 16);
      return {
        'arm-l': { angle: 150 + 22 * s },
        'arm-r': { angle: -150 + 22 * s },
        'leg-l': { angle: 8 * s, scaleY: 1 - 0.28 * Math.max(0, s) },
        'leg-r': { angle: 8 * s, scaleY: 1 - 0.28 * Math.max(0, -s) },
      };
    }
    case 'slide': {
      const w = Math.sin(t * 16) * 9;
      return { 'arm-l': { angle: w }, 'arm-r': { angle: -w } };
    }
    case 'ride-sit': {
      // Mit den Füßen abstoßen (je nach gefahrenem Weg)
      const s = Math.sin(c.travel / 14);
      return merge(breathe(c, 0.6), { 'leg-l': { angle: 12 * s }, 'leg-r': { angle: -12 * s } });
    }
    case 'ride-toddle': {
      // Rutschfahrzeug: kleine, schnelle Trippelschritte mit beiden Füßen im Wechsel
      const s = Math.sin(c.travel / 7);
      return merge(breathe(c, 0.6), { 'leg-l': { angle: 16 * s }, 'leg-r': { angle: -16 * s } });
    }
    case 'ride-run':
      // Laufrad: richtige Laufbewegung, Hände bleiben am Lenker
      return stride(c.travel, 18, 26, 0);
    case 'ride-push': {
      // Roller: ein Bein steht auf dem Trittbrett, das andere stößt nach hinten ab
      const push = Math.max(0, Math.sin(c.travel / 60));
      return { 'leg-r': { angle: 38 * push, scaleY: 1 - 0.1 * push }, body: { angle: -4 * push } };
    }
    case 'ride-cart': {
      const d = Math.sin(t * 4 + c.seed) * 6;
      return merge(breathe(c, 0.6), { 'leg-l': { angle: d }, 'leg-r': { angle: -d } });
    }
    case 'bounce': {
      const h = clamp(c.params.height ?? 0, 0, 1);
      if (c.params.salto) {
        // Salto: Knie ganz an die Brust, Arme umfassen die Beine
        return {
          'leg-l': { angle: -70, scaleY: 0.6 },
          'leg-r': { angle: -76, scaleY: 0.6 },
          'arm-l': { angle: -30 },
          'arm-r': { angle: -36 },
          body: { y: 10 },
        };
      }
      // Oben Arme hoch, unten Knie anziehen
      const low = Math.max(0, 0.2 - h) / 0.2;
      return {
        'arm-l': { angle: 30 + 125 * h },
        'arm-r': { angle: -30 - 125 * h },
        'leg-l': { angle: 6 * h, y: 10 * low, scaleY: 1 - 0.14 * low },
        'leg-r': { angle: -6 * h, y: 10 * low, scaleY: 1 - 0.14 * low },
        body: { y: 10 * low },
      };
    }
    case 'hop-ball': {
      const h = clamp(c.params.height ?? 0, 0, 1);
      return { 'arm-l': { angle: 40 * h }, 'arm-r': { angle: -40 * h }, head: { y: -2 * h } };
    }
    case 'seesaw': {
      // Oben: Arme hoch. Unten: Beine gebeugt am Boden.
      const up = clamp(c.params.up ?? 0, -1, 1);
      const u = Math.max(0, up);
      const d = Math.max(0, -up);
      return {
        'arm-l': { angle: 195 * u },
        'arm-r': { angle: -107 * u },
        'leg-l': { angle: 40 * u + 25 * d },
        'leg-r': { angle: 40 * u + 25 * d },
        head: { y: -2 * u },
      };
    }
    case 'bathe': {
      // Patscht abwechselnd mit beiden Händen aufs Wasser
      const l = Math.max(0, Math.sin(t * 7 + c.seed));
      const r = Math.max(0, Math.sin(t * 7 + c.seed + Math.PI));
      return merge(breathe(c, 0.5), { 'arm-l': { angle: 30 * l }, 'arm-r': { angle: -30 * r }, head: { angle: c.look * 0.6 } });
    }
    case 'walk':
      return stride(c.travel, 16, 24, 16);
    case 'sit':
      // Sitzt und schaut sich um (Spielhaus)
      return merge(breathe(c, 0.7), { head: { angle: c.look } });
    case 'hidden':
      return {};
  }
}

/** Kurze Gesten, die eine Tätigkeit für einen Moment überlagern. */
export type GestureName = 'hop' | 'cheer' | 'giggle' | 'yawn' | 'brace' | 'kick' | 'wave' | 'greet' | 'land' | 'drum' | 'throw' | 'blow';

export interface GestureDef {
  duration: number;
  pose?: PoseName;
  face?: Face;
  /** Bewegung abhängig vom Fortschritt p (0..1), der Zeit und der Richtung (dir, lokal). */
  motion?: (p: number, t: number, dir: number) => Deltas;
}

const env = (p: number) => Math.sin(Math.PI * Math.min(1, p));

export const GESTURES: Record<GestureName, GestureDef> = {
  hop: { duration: 420, pose: 'hopArms', face: 'joy' },
  cheer: {
    duration: 1000,
    pose: 'armsUp',
    face: 'joy',
    motion: (_p, t) => ({ 'arm-l': { angle: Math.sin(t * 14) * 14 }, 'arm-r': { angle: Math.sin(t * 14 + 1) * 14 } }),
  },
  giggle: {
    duration: 900,
    pose: 'giggle',
    face: 'joy',
    motion: (p, t) => ({
      body: { angle: Math.sin(t * 34) * 5 * env(p) },
      head: { angle: Math.sin(t * 28) * 6 * env(p) },
    }),
  },
  yawn: {
    duration: 2200,
    pose: 'stretch',
    face: 'yawn',
    motion: (p) => ({ body: { y: -3 * env(p) } }),
  },
  brace: {
    duration: 1500,
    pose: 'brace',
    // dir = Windrichtung (lokal): gegen den Wind lehnen und zittern
    motion: (p, t, dir) => ({
      body: { angle: (-dir * 10 + Math.sin(t * 45) * 1.5) * env(Math.min(1, p * 1.6)) },
    }),
  },
  kick: {
    duration: 380,
    // dir = Schussrichtung (lokal): das Bein auf dieser Seite schwingt nach vorn
    motion: (p, _t, dir) => {
      const e = env(p);
      const leg: PartId = dir > 0 ? 'leg-r' : 'leg-l';
      return {
        [leg]: { angle: -dir * 62 * e },
        body: { angle: dir * 6 * e },
        'arm-l': { angle: 35 * e },
        'arm-r': { angle: -35 * e },
      };
    },
  },
  wave: {
    duration: 1150,
    pose: 'wave',
    face: 'joy',
    motion: (_p, t) => ({ 'arm-r': { angle: Math.sin(t * 13) * 24 } }),
  },
  greet: {
    duration: 1600,
    pose: 'wave',
    face: 'joy',
    motion: (_p, t) => ({ 'arm-r': { angle: Math.sin(t * 13) * 24 } }),
  },
  drum: {
    duration: 650,
    face: 'joy',
    // Abwechselnd mit beiden Händen auf die Trommel
    motion: (_p, t) => ({
      'arm-l': { angle: -22 * Math.max(0, Math.sin(t * 24)) },
      'arm-r': { angle: 22 * Math.max(0, Math.sin(t * 24 + Math.PI)) },
      head: { angle: Math.sin(t * 12) * 3 },
    }),
  },
  throw: {
    duration: 420,
    face: 'joy',
    // Arm holt kräftig aus nach vorn oben, der Oberkörper geht mit
    motion: (p) => ({ 'arm-r': { angle: -150 * Math.sin(Math.PI * Math.min(1, p * 1.3)) }, body: { angle: -5 * env(p) } }),
  },
  blow: {
    duration: 700,
    face: 'yawn',
    // Pusten: Kopf zum Stab geneigt, Backen rund (Gesicht mit rundem Mund)
    motion: (p) => ({ head: { angle: 7 * env(p), y: 2 * env(p) } }),
  },
  land: {
    duration: 300,
    // Kurz in die Knie: Rumpf runter, Beine kürzer, Arme zum Ausbalancieren
    motion: (p) => {
      const e = env(p);
      return {
        body: { y: 11 * e },
        'leg-l': { y: 11 * e, scaleY: 1 - (11 / 70) * e },
        'leg-r': { y: 11 * e, scaleY: 1 - (11 / 70) * e },
        'arm-l': { angle: 25 * e },
        'arm-r': { angle: -25 * e },
      };
    },
  },
};

/** Zwei Deltas addieren (Winkel/Verschiebung addieren, scaleY multiplizieren). */
export function merge(a: Deltas, b: Deltas): Deltas {
  const out: Deltas = { ...a };
  for (const id of Object.keys(b) as PartId[]) {
    const x = a[id] ?? {};
    const y = b[id]!;
    out[id] = {
      angle: (x.angle ?? 0) + (y.angle ?? 0),
      x: (x.x ?? 0) + (y.x ?? 0),
      y: (x.y ?? 0) + (y.y ?? 0),
      scaleY: (x.scaleY ?? 1) * (y.scaleY ?? 1),
    };
  }
  return out;
}
