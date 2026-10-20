// Boot: load sprites, font, the course list and the last-played course.

import Phaser from 'phaser';
import { app } from '../app';
import { applyScale, uiCamera } from '../scale';
import { initialCourseId, loadCourse, loadRegistry } from '../data/courses';
import { loadSettings, saveSettings } from '../save/store';
import { OPEN_COURSE_KEY } from './CourseSelectScene';
import { calibrateAll } from '../systems/physics/calibrate';
import { flushUploads } from '../save/online';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    uiCamera(this.cameras.main);
    const W = app.view.w, H = app.view.h;
    const bar = this.add.graphics();
    const label = this.add.text(W / 2, H / 2 - 14, 'loading', { fontFamily: 'monospace', fontSize: '8px', color: '#dfe6e9' }).setOrigin(0.5);
    this.load.on('progress', (p: number) => {
      bar.clear();
      bar.fillStyle(0x23303a, 1).fillRect(W / 2 - 60, H / 2, 120, 6);
      bar.fillStyle(0xe8681e, 1).fillRect(W / 2 - 59, H / 2 + 1, Math.round(118 * p), 4);
    });
    this.load.once('complete', () => { this.load.off('progress'); label.destroy(); bar.destroy(); });
    this.load.atlas('ui', 'sprites/sprites.png', 'sprites/sprites.json');
    this.load.bitmapFont('px', 'sprites/pxfont.png', 'sprites/pxfont.xml');
    this.load.image('trophy', 'sprites/trophy.png'); // the logo (assets-src/title_art.py)
  }

  async create() {
    const label = this.add.text(app.view.w / 2, app.view.h / 2, 'loading course', { fontFamily: 'monospace', fontSize: '8px', color: '#dfe6e9' }).setOrigin(0.5);
    try {
      const [settings, courses] = await Promise.all([loadSettings(), loadRegistry()]);
      app.settings = settings;
      app.courses = courses;
      applyScale(this.game); // the saved pixel-size setting
      // after a "reload" on the course screen, open the course that was being loaded
      let open = '';
      try { open = sessionStorage.getItem(OPEN_COURSE_KEY) ?? ''; sessionStorage.removeItem(OPEN_COURSE_KEY); } catch { /* blocked */ }
      if (open && !courses.some((c) => c.id === open)) open = '';
      const id = open || initialCourseId(courses, settings.courseId);
      if (!id) throw new Error('no courses found (courses/index.json)');
      await loadCourse(this, id, (f) => label.setText(`loading course ${Math.round(f * 100)}%`));
      if (open) { app.settings.courseId = open; void saveSettings(app.settings); }
      app.calibration = calibrateAll();
      (window as unknown as { __golf: unknown }).__golf = app;
      label.destroy();
      void flushUploads(); // rounds finished offline go to the shared leaderboard now
      this.scene.start(open ? 'setup' : 'title');
    } catch (e) {
      console.error(e);
      label.destroy();
      this.add.text(10, 10, `failed to load: ${(e as Error).message}`, { fontFamily: 'monospace', fontSize: '8px', color: '#ff8080', wordWrap: { width: app.view.w - 20 } });
    }
  }
}
