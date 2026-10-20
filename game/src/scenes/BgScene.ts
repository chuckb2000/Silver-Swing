// Background fly-over of the course used behind every menu screen.

import Phaser from 'phaser';
import { app, PX_PER_M } from '../app';
import { centerSnapped, worldCamera } from '../scale';
import { CourseView } from '../ui/courseView';

export class BgScene extends Phaser.Scene {
  private view!: CourseView;
  private t = 0;
  private path: { x: number; y: number }[] = [];
  private shade!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('bg');
  }

  create() {
    const course = app.course;
    this.path = []; // the scene object is reused: start from this course's holes, not the last one's
    if (!course) {
      // no course loaded (a load failed): no fly-over rather than a crash
      this.scene.stop();
      return;
    }
    worldCamera(this.cameras.main);
    this.view = new CourseView(this, course);
    const H = course.json.world.height;
    for (const h of course.json.holes) {
      const t = h.tees[course.json.defaultTee];
      this.path.push({ x: t.x * PX_PER_M, y: (H - t.y) * PX_PER_M });
      this.path.push({ x: h.pin[0] * PX_PER_M, y: (H - h.pin[1]) * PX_PER_M });
    }
    this.t = Math.floor(Math.random() * course.json.holes.length) * 2;
    this.shade = this.add.rectangle(0, 0, 10, 10, 0x081018, 0.3).setOrigin(0, 0).setDepth(1e7);
    const onResize = () => worldCamera(this.cameras.main);
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  update(_t: number, dt: number) {
    const n = this.path.length;
    if (!n || !this.view) return;
    this.t = (this.t + Math.min(dt, 50) / 11000) % n;
    const i = Math.floor(this.t), f = this.t - i;
    const a = this.path[i], b = this.path[(i + 1) % n];
    const e = f * f * (3 - 2 * f);
    const cam = this.cameras.main;
    centerSnapped(cam, a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e);
    this.view.update(cam, dt);
    const v = cam.worldView;
    this.shade.setPosition(v.x - 4, v.y - 4).setSize(v.width + 8, v.height + 8);
  }
}
