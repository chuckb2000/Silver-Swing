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
  /** Draw over the course fly-over (BgScene)? The title screen has its own backdrop. */
  protected flyover = true;

  create(_data?: unknown) {
    if (this.flyover) ensureBg(this);
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

  /** Bumped on every rebuild: a build still waiting on the network checks it before drawing. */
  protected gen = 0;

  /** Is this build (started at generation `g`) still the current one? */
  protected isCurrentBuild(g: number): boolean {
    return g === this.gen && this.sys.isActive();
  }

  /** Rebuild on the next tick so a button is never destroyed inside its own input handler. */
  rebuild() {
    this.time.delayedCall(0, () => {
      if (!this.sys.isActive()) return;
      this.gen++;
      this.root.removeAll(true);
      void this.build();
    });
  }

  protected back() {
    this.scene.start('title');
  }

  abstract build(): void | Promise<void>;
}
