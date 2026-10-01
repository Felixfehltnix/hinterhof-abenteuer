import type { BehaviorId } from '../../../data/toys';
import { dig } from './dig';
import { draggable } from './draggable';
import { drum } from './drum';
import { fillable } from './fillable';
import { boomerang } from './boomerang';
import { bubbles } from './bubbles';
import { circuit } from './circuit';
import { cans } from './cans';
import { float } from './float';
import { goal } from './goal';
import { handheld } from './handheld';
import { holdable } from './holdable';
import { honk } from './honk';
import { hopper } from './hopper';
import { hula } from './hula';
import { hoop } from './hoop';
import { kite } from './kite';
import { mold } from './mold';
import { pins } from './pins';
import { plane } from './plane';
import { pool } from './pool';
import { pop } from './pop';
import { rideable } from './rideable';
import { rocket } from './rocket';
import { seesaw } from './seesaw';
import { snowmerge } from './snowmerge';
import { sprinkler } from './sprinkler';
import { tent } from './tent';
import { trampoline } from './trampoline';
import { water } from './water';
import { whirlpool } from './whirlpool';
import { xylophone } from './xylophone';
import { flashlight } from './flashlight';
import { fling } from './fling';
import { glide } from './glide';
import { kick } from './kick';
import { kidKick } from './kidKick';
import { wobble } from './wobble';
import type { BehaviorFactory } from './types';

export type { BehaviorFactory, Release, ToyBehavior } from './types';

/** Alle Bausteine. Neuer Baustein: Datei anlegen, hier eintragen, BehaviorId erweitern. */
export const BEHAVIORS: Record<BehaviorId, BehaviorFactory> = {
  circuit,
  draggable,
  fling,
  kick,
  wobble,
  glide,
  kidKick,
  plane,
  boomerang,
  kite,
  float,
  holdable,
  pop,
  bubbles,
  hoop,
  goal,
  cans,
  pins,
  rideable,
  honk,
  trampoline,
  seesaw,
  hopper,
  hula,
  pool,
  dig,
  fillable,
  mold,
  water,
  sprinkler,
  drum,
  xylophone,
  tent,
  handheld,
  flashlight,
  snowmerge,
  whirlpool,
  rocket,
};
