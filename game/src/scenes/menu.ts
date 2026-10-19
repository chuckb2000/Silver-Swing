// Base class for menu screens drawn above the BgScene fly-over.

import Phaser from 'phaser';
import { uiCamera } from '../scale';

export function ensureBg(scene: Phaser.Scene) {
  if (!scene.scene.isActive('bg')) {
    scene.scene.launch('bg');
  }
  scene.scene.moveBelow(scene.scene.key, 'bg');
  scene.scene.bringToTop(scene.scene.key);
}

export abstract class MenuScene extends Phaser.Scene {
  protected root!: Phaser.GameObjects.Container;

  create(_data?: unknown) {
    ensureBg(this);
    uiCamera(this.cameras.main);
    this.root = this.add.container(0, 0);
    void this.build();
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
    this.input.keyboard?.on('keydown-ESC', () => this.back());
  }

  private onResize() {
    uiCamera(this.cameras.main);
    this.rebuild();
  }

  /** Rebuild on the next tick so a button is never destroyed inside its own input handler. */
  rebuild() {
    this.time.delayedCall(0, () => {
      if (!this.sys.isActive()) return;
      this.root.removeAll(true);
      void this.build();
    });
  }

  protected back() {
    this.scene.start('title');
  }

  abstract build(): void | Promise<void>;
}
