import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { AsteroidScene } from './scenes/AsteroidScene';
import { BootScene } from './scenes/BootScene';
import { DressUpScene } from './scenes/DressUpScene';
import { GrillScene } from './scenes/GrillScene';
import { PlaygroundScene } from './scenes/PlaygroundScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#9fd8ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  // Ton macht src/audio/Sound.ts mit eigenem AudioContext.
  audio: { noAudio: true },
  input: {
    activePointers: 3, // mehrere Kinderfinger gleichzeitig
  },
  scene: [BootScene, PlaygroundScene, DressUpScene, GrillScene, AsteroidScene],
});
