export class MainMenuScene {
  constructor(game) {
    this.game = game;
  }

  render(container) {
    const el = document.createElement('div');
    el.className = 'screen';
    el.innerHTML = `
      <div class="game-title">One Must Fall</div>
      <div class="game-subtitle">Web Edition</div>
      <ul class="menu-list" role="menu">
        <li><button class="menu-item disabled" data-mode="campaign" aria-disabled="true">1. Single Player</button></li>
        <li><button class="menu-item" data-mode="quick-match">2. Quick Match</button></li>
        <li><button class="menu-item disabled" data-mode="multiplayer" aria-disabled="true">3. Multiplayer</button></li>
        <li><button class="menu-item disabled" data-mode="leaderboard" aria-disabled="true">4. Leaderboard</button></li>
      </ul>
    `;

    el.querySelector('[data-mode="quick-match"]').addEventListener('click', () => {
      this.game.navigate('mech-select', { mode: 'quick-match' });
    });

    // Disabled items show a coming-soon notice when clicked
    el.querySelectorAll('.menu-item.disabled').forEach((btn) => {
      btn.addEventListener('click', () => {
        const labels = {
          campaign: 'Single Player',
          multiplayer: 'Multiplayer',
          leaderboard: 'Leaderboard',
        };
        this.game.navigate('coming-soon', { label: labels[btn.dataset.mode] });
      });
    });

    container.appendChild(el);
  }

  destroy() {}
}
