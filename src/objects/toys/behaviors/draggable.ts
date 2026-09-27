import { DEPTH_DRAGGING } from '../../../config';
import type { BehaviorFactory } from './types';

/** Lässt sich mit dem Finger ziehen. Beim Loslassen landet es auf der Wiese. */
export const draggable: BehaviorFactory = (toy) => {
  toy.scene.input.setDraggable(toy);
  return {
    onDragStart: () => {
      toy.setScale(1.08).setDepth(DEPTH_DRAGGING);
    },
    onDragEnd: () => {
      toy.setScale(1);
    },
  };
};
