import Phaser from 'phaser';
import { TITLE_STYLE, SUBTITLE_STYLE, BUTTON_STYLE } from './ui-styles.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenu' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.text(cx, 105, 'ONE MUST FALL', TITLE_STYLE).setOrigin(0.5);
    this.add.text(cx, 152, 'WEB EDITION', SUBTITLE_STYLE).setOrigin(0.5);

    const items = [
      { label: '1.  Single Player',  enabled: false, scene: 'ComingSoon', data: { label: 'Single Player' } },
      { label: '2.  Quick Match',    enabled: true,  scene: 'MechSelect', data: { mode: 'quick-match' } },
      { label: '3.  Multiplayer',    enabled: false, scene: 'ComingSoon', data: { label: 'Multiplayer' } },
      { label: '4.  Leaderboard',    enabled: false, scene: 'ComingSoon', data: { label: 'Leaderboard' } },
    ];

    items.forEach((item, i) => {
      this._addMenuItem(cx, 220 + i * 54, item.label, item.enabled, item.scene, item.data);
    });
  }

  _addMenuItem(x, y, label, enabled, targetScene, data) {
    const bw = 320;
    const bh = 44;
    const borderColor = enabled ? 0x2a2a4a : 0x1e1e30;
    const textColor   = enabled ? '#ccd6f6' : '#3a3a5a';

    this.add.rectangle(x, y, bw, bh).setStrokeStyle(1, borderColor);
    const bg  = this.add.rectangle(x, y, bw - 2, bh - 2, 0x12121e);
    const txt = this.add.text(x - bw / 2 + 18, y, label, {
      ...BUTTON_STYLE,
      fontSize: '15px',
      color: textColor,
    }).setOrigin(0, 0.5);

    if (!enabled) return;

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover',  () => { bg.setFillColor(0x2a2a4a); txt.setColor('#00c8ff'); });
    bg.on('pointerout',   () => { bg.setFillColor(0x12121e); txt.setColor('#ccd6f6'); });
    bg.on('pointerup', () => this.scene.start(targetScene, data));
  }
}
