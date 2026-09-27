import type { BehaviorId } from '../../../data/toys';
import { draggable } from './draggable';
import { fling } from './fling';
import { kick } from './kick';
import { wobble } from './wobble';
import type { BehaviorFactory } from './types';

export type { BehaviorFactory, Release, ToyBehavior } from './types';

/** Alle Bausteine. Neuer Baustein: Datei anlegen, hier eintragen, BehaviorId erweitern. */
export const BEHAVIORS: Record<BehaviorId, BehaviorFactory> = {
  draggable,
  fling,
  kick,
  wobble,
};
