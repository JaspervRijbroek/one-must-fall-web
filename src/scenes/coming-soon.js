import Phaser from 'phaser';
import { BUTTON_STYLE, HEADING_STYLE, TITLE_STYLE, SUBTITLE_STYLE } from './ui-styles.js';

export class ComingSoonScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ComingSoon' });
  }

  init(data) {
    this.label = data.label ?? 'This Mode';
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.text(cx, 100, 'ONE MUST FALL', TITLE_STYLE).setOrigin(0.5);
    this.add.text(cx, 140, 'WEB EDITION', SUBTITLE_STYLE).setOrigin(0.5);
    this.add.text(cx, 210, this.label.toUpperCase(), HEADING_STYLE).setOrigin(0.5);
    this.add.text(cx, 265, 'COMING SOON', {
      ...BUTTON_STYLE,
      color: '#7a8ab0',
      fontSize: '18px',
      letterSpacing: 6,
    }).setOrigin(0.5);

    this._addButton(cx, 340, '◄  BACK TO MENU', () => this.scene.start('MainMenu'));
  }

  _addButton(x, y, label, cb) {
    const bw = 260;
    const bh = 40;
    const bg = this.add.rectangle(x, y, bw, bh, 0x1a1a2e).setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y, bw, bh).setStrokeStyle(1, 0x2a2a4a);
    const txt = this.add.text(x, y, label, BUTTON_STYLE).setOrigin(0.5);

    bg.on('pointerover',  () => { bg.setFillColor(0x2a2a4a); txt.setColor('#00c8ff'); });
    bg.on('pointerout',   () => { bg.setFillColor(0x1a1a2e); txt.setColor('#ccd6f6'); });
    bg.on('pointerup', cb);
  }
}
