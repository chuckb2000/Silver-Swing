// Between two holes of the daily par 3s / 4s / 5s on different courses: the
// next hole's course loads (usually already in the cache: flow.ts
// prefetchNextCourse), with where it is and how far it has got, then the hole
// opens. A reload button if it stalls, as on the title.

import Phaser from 'phaser';
import { app } from '../app';
import { uiCamera } from '../scale';
import { LoadSuperseded } from '../data/courses';
import { Button, COLORS, Panel, setTxt, txt } from '../ui/widgets';
import { prefetchNextCourse, useCourseQuietly } from './flow';
import { saveSnapshot } from '../save/snapshot';
import { shortName } from '../save/milestones';

const STALL_MS = 20_000;

export class TourLoadScene extends Phaser.Scene {
  constructor() {
    super('tourload');
  }

  create() {
    const r = app.round;
    if (!r?.cfg.tour) { this.scene.start('title'); return; }
    uiCamera(this.cameras.main);
    this.cameras.main.setBackgroundColor('#14202a');
    const W = app.view.w, H = app.view.h, cx = Math.round(W / 2);
    const t = r.cfg.tour[r.holeIndex];
    const info = app.courses.find((c) => c.id === t.course);
    const pw = Math.min(260, W - 16), ph = 74;
    this.add.existing(new Panel(this, Math.round(cx - pw / 2), Math.round(H / 2 - ph / 2), pw, ph, 0.9));
    const top = Math.round(H / 2 - ph / 2) + 8;
    txt(this, cx, top, `hole ${r.holeNumber} of ${r.cfg.holes.length}`, { origin: [0.5, 0], scale: 2 });
    txt(this, cx, top + 22, `${info ? shortName(info.name).toLowerCase() : t.course}  ·  hole ${t.hole}`, { origin: [0.5, 0], color: COLORS.yellow, maxWidth: pw - 12 });
    const msg = txt(this, cx, top + 36, 'loading course...', { origin: [0.5, 0], color: COLORS.dim });
    let last = Date.now();
    let offered = false;
    const watch = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (offered || Date.now() - last < STALL_MS || !msg.active) return;
        offered = true;
        txt(this, cx, top + 48, 'this is taking a while - the connection may have stalled', { origin: [0.5, 0], color: COLORS.dim, maxWidth: W - 16 });
        this.add.existing(new Button(this, cx - 40, top + ph + 2, 80, 16, 'reload', () => window.location.reload()));
      },
    });
    void (async () => {
      try {
        await useCourseQuietly(this, t.course, (f) => { last = Date.now(); if (msg.active) setTxt(msg, `loading course ${Math.round(f * 100)}%`); });
      } catch (e) {
        if (e instanceof LoadSuperseded) return;
        console.error(e);
        window.location.reload(); // the round is saved between holes: it opens again on this hole
        return;
      }
      watch.remove();
      if (!this.sys.isActive() || app.round !== r) return;
      r.setCourse(app.course!);
      r.startHole(r.holeIndex);
      void saveSnapshot(r);
      prefetchNextCourse(r);
      this.scene.start('play', { resume: false });
    })();
  }
}
