import { MECHS } from '../data/mechs.js';

export class MechSelectScene {
  constructor(game, { mode } = {}) {
    this.game = game;
    this.mode = mode;
    this.selectedId = null;
  }

  render(container) {
    const el = document.createElement('div');
    el.className = 'screen';
    el.innerHTML = `
      <p class="screen-heading">Select Your Mech</p>
      <div class="mech-grid" id="mech-grid" role="listbox" aria-label="Mech selection"></div>
      <div>
        <button class="btn" id="back-btn">◄ Back</button>
        <button class="btn btn-primary" id="select-btn" disabled>Select ►</button>
      </div>
      <p class="controls-hint">Choose a mech to see its stats</p>
    `;

    const grid = el.querySelector('#mech-grid');
    const selectBtn = el.querySelector('#select-btn');

    MECHS.forEach((mech) => {
      const card = document.createElement('div');
      card.className = 'mech-card';
      card.setAttribute('role', 'option');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-selected', 'false');
      card.dataset.id = mech.id;
      card.innerHTML = `
        ${this._mechAvatarSvg(mech)}
        <div class="mech-name">${mech.name}</div>
        <div class="mech-stat-row"><span>HP ${mech.hp}</span><span>DP ${mech.dp}</span></div>
        <div class="mech-stat-row"><span>SPD ${mech.speed}</span><span>ATK ${mech.attack}</span></div>
      `;

      const pick = () => {
        this.selectedId = mech.id;
        grid.querySelectorAll('.mech-card').forEach((c) => {
          c.classList.toggle('selected', c.dataset.id == mech.id);
          c.setAttribute('aria-selected', c.dataset.id == mech.id ? 'true' : 'false');
        });
        selectBtn.disabled = false;
      };

      card.addEventListener('click', pick);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
      });

      grid.appendChild(card);
    });

    el.querySelector('#back-btn').addEventListener('click', () => {
      this.game.navigate('main-menu');
    });

    selectBtn.addEventListener('click', () => {
      if (this.selectedId === null) return;
      this.game.state.playerMech = MECHS[this.selectedId];
      this.game.navigate('arena-select', { mode: this.mode });
    });

    container.appendChild(el);
  }

  /** Generates a simple inline SVG avatar for a mech using its colour. */
  _mechAvatarSvg(mech) {
    const c = mech.color;
    return `
      <svg class="mech-avatar" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- head -->
        <rect x="20" y="4" width="20" height="16" rx="3" fill="${c}" />
        <!-- visor -->
        <rect x="23" y="9" width="14" height="5" rx="1" fill="#001824" opacity="0.9" />
        <!-- body -->
        <rect x="14" y="22" width="32" height="28" rx="2" fill="${c}" />
        <!-- chest detail -->
        <rect x="20" y="26" width="20" height="8" rx="1" fill="#ffffff18" />
        <!-- left arm -->
        <rect x="4"  y="22" width="9"  height="22" rx="2" fill="${c}" />
        <!-- right arm -->
        <rect x="47" y="22" width="9"  height="22" rx="2" fill="${c}" />
        <!-- left leg -->
        <rect x="14" y="52" width="13" height="24" rx="2" fill="${c}" />
        <!-- right leg -->
        <rect x="33" y="52" width="13" height="24" rx="2" fill="${c}" />
      </svg>
    `;
  }

  destroy() {}
}
