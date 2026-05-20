import Phaser from 'phaser';
import { MainMenuScene } from './scenes/main-menu.js';
import { MechSelectScene } from './scenes/mech-select.js';
import { ArenaSelectScene } from './scenes/arena-select.js';
import { MatchScene } from './scenes/match.js';
import { ComingSoonScene } from './scenes/coming-soon.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: 'app',
  backgroundColor: '#0a0a12',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainMenuScene, MechSelectScene, ArenaSelectScene, MatchScene, ComingSoonScene],
};

export default new Phaser.Game(config);
