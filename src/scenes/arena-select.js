import { ARENAS } from '../data/arenas.js';
import { MECHS } from '../data/mechs.js';

export class ArenaSelectScene {
  constructor(game, { mode } = {}) {
    this.game = game;
    this.mode = mode;
    this.selectedId = null;
  }

  render(container) {
    const el = document.createElement('div');
    el.className = 'screen';

    const playerMech = this.game.state.playerMech;

    el.innerHTML = `
      <p class="screen-heading">Select Arena</p>
      <p style="color:var(--color-text-dim);font-size:0.8rem;letter-spacing:0.1em;margin-bottom:1.25rem;">
        Your mech: <strong style="color:var(--color-gold)">${playerMech.name}</strong>
      </p>
      <div class="arena-grid" id="arena-grid" role="listbox" aria-label="Arena selection"></div>
      <div>
        <button class="btn" id="back-btn">◄ Back</button>
        <button class="btn btn-primary" id="fight-btn" disabled>Fight! ►</button>
      </div>
    `;

    const grid = el.querySelector('#arena-grid');
    const fightBtn = el.querySelector('#fight-btn');

    ARENAS.forEach((arena) => {
      const card = document.createElement('div');
      card.className = 'arena-card';
      card.setAttribute('role', 'option');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-selected', 'false');
      card.dataset.id = arena.id;
      card.innerHTML = `
        ${this._arenaPreviewSvg(arena)}
        <span class="arena-name">${arena.name}</span>
      `;

      const pick = () => {
        this.selectedId = arena.id;
        grid.querySelectorAll('.arena-card').forEach((c) => {
          c.classList.toggle('selected', c.dataset.id == arena.id);
          c.setAttribute('aria-selected', c.dataset.id == arena.id ? 'true' : 'false');
        });
        fightBtn.disabled = false;
      };

      card.addEventListener('click', pick);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
      });

      grid.appendChild(card);
    });

    el.querySelector('#back-btn').addEventListener('click', () => {
      this.game.navigate('mech-select', { mode: this.mode });
    });

    fightBtn.addEventListener('click', () => {
      if (this.selectedId === null) return;

      // CPU picks a random mech that is different from the player's
      const remaining = MECHS.filter((m) => m.id !== playerMech.id);
      const cpuMech = remaining[Math.floor(Math.random() * remaining.length)];

      this.game.state.cpuMech = cpuMech;
      this.game.state.arena = ARENAS[this.selectedId];
      this.game.navigate('match', { mode: this.mode });
    });

    container.appendChild(el);
  }

  _arenaPreviewSvg(arena) {
    return `
      <svg class="arena-preview" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="bg-${arena.id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="${arena.bgTop}" />
            <stop offset="100%" stop-color="${arena.bgBottom}" />
          </linearGradient>
        </defs>
        <rect width="200" height="100" fill="url(#bg-${arena.id})" />
        <!-- ground -->
        <rect x="0" y="82" width="200" height="18" fill="${arena.groundColor}" />
        <!-- silhouette: left mech -->
        <rect x="35" y="50" width="18" height="32" fill="#00000066" />
        <rect x="39" y="40" width="10" height="12" fill="#00000066" />
        <!-- silhouette: right mech -->
        <rect x="147" y="50" width="18" height="32" fill="#00000066" />
        <rect x="151" y="40" width="10" height="12" fill="#00000066" />
      </svg>
    `;
  }

  destroy() {}
}
