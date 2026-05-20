import { MainMenuScene } from './scenes/main-menu.js';
import { MechSelectScene } from './scenes/mech-select.js';
import { ArenaSelectScene } from './scenes/arena-select.js';
import { MatchScene } from './scenes/match.js';

class Game {
  constructor() {
    this.container = document.getElementById('app');
    this.currentScene = null;
    /** Shared state passed between scenes */
    this.state = {
      playerMech: null,
      cpuMech: null,
      arena: null,
      mode: null,
    };
  }

  /**
   * Navigate to a named scene.
   * @param {'main-menu'|'mech-select'|'arena-select'|'match'|'coming-soon'} name
   * @param {object} [params]
   */
  navigate(name, params = {}) {
    if (this.currentScene) {
      this.currentScene.destroy();
      this.currentScene = null;
    }
    this.container.innerHTML = '';

    switch (name) {
      case 'main-menu':
        this.currentScene = new MainMenuScene(this);
        break;
      case 'mech-select':
        this.currentScene = new MechSelectScene(this, params);
        break;
      case 'arena-select':
        this.currentScene = new ArenaSelectScene(this, params);
        break;
      case 'match':
        this.currentScene = new MatchScene(this, params);
        break;
      case 'coming-soon':
        this.currentScene = new ComingSoonScene(this, params);
        break;
      default:
        console.warn(`Unknown scene: ${name}`);
        return;
    }

    this.currentScene.render(this.container);
  }
}

class ComingSoonScene {
  constructor(game, { label = 'This Mode' } = {}) {
    this.game = game;
    this.label = label;
  }

  render(container) {
    const el = document.createElement('div');
    el.className = 'screen';
    el.innerHTML = `
      <div class="game-title">One Must Fall</div>
      <div class="game-subtitle">Web Edition</div>
      <p class="screen-heading">${this.label}</p>
      <p class="coming-soon">Coming Soon</p>
      <button class="btn btn-primary" id="back-btn">◄ Back to Menu</button>
    `;
    el.querySelector('#back-btn').addEventListener('click', () => {
      this.game.navigate('main-menu');
    });
    container.appendChild(el);
  }

  destroy() {}
}

const game = new Game();
game.navigate('main-menu');
