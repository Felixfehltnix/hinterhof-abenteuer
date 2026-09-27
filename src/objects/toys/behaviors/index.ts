import type { BehaviorId } from '../../../data/toys';
import { draggable } from './draggable';
import { boomerang } from './boomerang';
import { bubbles } from './bubbles';
import { cans } from './cans';
import { float } from './float';
import { goal } from './goal';
import { holdable } from './holdable';
import { hoop } from './hoop';
import { kite } from './kite';
import { pins } from './pins';
import { plane } from './plane';
import { pop } from './pop';
import { fling } from './fling';
import { glide } from './glide';
import { kick } from './kick';
import { kidKick } from './kidKick';
import { wobble } from './wobble';
import type { BehaviorFactory } from './types';

export type { BehaviorFactory, Release, ToyBehavior } from './types';

/** Alle Bausteine. Neuer Baustein: Datei anlegen, hier eintragen, BehaviorId erweitern. */
export const BEHAVIORS: Record<BehaviorId, BehaviorFactory> = {
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
};
