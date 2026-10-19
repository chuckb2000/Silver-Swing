// Leaderboard: one board per course x tee x round length, filterable by
// difficulty, casual rounds on their own tab. Export / import as JSON.

import { app } from '../app';
import { Difficulty } from '../data/difficulty';
import { backupText, LeaderboardEntry, loadBoard } from '../save/store';
import { askImport, showBackup } from '../ui/backup';
import { compareRounds, toPar } from '../systems/rules/scoring';
import { Button, COLORS, Panel, txt } from '../ui/widgets';
import { MenuScene } from './menu';

let len: '18' | 'front' | 'back' = '18';
let diff: Difficulty | 'all' = 'all';
let casual = false;
let page = 0;

export class LeaderboardScene extends MenuScene {
  constructor() {
    super('leaderboard');
  }

  async build() {
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(360, W - 8), ph = H - 8;
    const x0 = Math.round((W - pw) / 2), y0 = 4;
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.9));
    this.root.add(txt(this, x0 + pw / 2, y0 + 5, 'leaderboard', { origin: [0.5, 0], scale: 2 }));
    this.root.add(txt(this, x0 + pw / 2, y0 + 24, `${app.course!.json.name}  ·  ${app.course!.json.defaultTee.toLowerCase()} tees`, { origin: [0.5, 0], color: COLORS.dim }));
    let y = y0 + 36;
    const tab = (items: [string, string][], cur: string, set: (v: string) => void) => {
      const bw = Math.floor((pw - 16 - (items.length - 1) * 2) / items.length);
      items.forEach(([k, lab], i) => this.root.add(new Button(this, x0 + 8 + i * (bw + 2), y, bw, 14, lab, () => { set(k); page = 0; this.rebuild(); }, { color: cur === k ? 'orange' : 'grey' })));
      y += 17;
    };
    tab([['18', '18 holes'], ['front', 'front 9'], ['back', 'back 9'], ['casual', 'casual']], casual ? 'casual' : len, (v) => {
      if (v === 'casual') casual = !casual; else { len = v as typeof len; casual = false; }
    });
    tab([['all', 'all'], ['easy', 'easy'], ['normal', 'normal'], ['pro', 'pro']], diff, (v) => { diff = v as typeof diff; });
    const all = await loadBoard();
    if (!this.sys.isActive()) return;
    const rows = all.filter((e) => e.course === app.course!.json.id && e.length === len && e.casual === casual && (diff === 'all' || e.difficulty === diff));
    rows.sort(compareRounds);
    const lineH = 11;
    const listTop = y + 2;
    const maxRows = Math.max(1, Math.floor((y0 + ph - 26 - listTop) / lineH) - 1);
    const pages = Math.max(1, Math.ceil(rows.length / maxRows));
    page = Math.min(page, pages - 1);
    const cols = [x0 + 10, x0 + 30, x0 + 110, x0 + 150, x0 + 186, pw > 300 ? x0 + 240 : -1];
    const head = ['#', 'player', 'gross', 'to par', 'level', 'date'];
    head.forEach((h, i) => { if (cols[i] >= 0) this.root.add(txt(this, cols[i], listTop, h, { color: COLORS.dim })); });
    if (!rows.length) this.root.add(txt(this, x0 + pw / 2, listTop + 24, 'no rounds yet - go play!', { origin: [0.5, 0], color: COLORS.dim }));
    const best = new Map<string, LeaderboardEntry>();
    for (const e of rows) if (!best.has(e.player)) best.set(e.player, e);
    rows.slice(page * maxRows, (page + 1) * maxRows).forEach((e, k) => {
      const yy = listTop + (k + 1) * lineH;
      const i = page * maxRows + k;
      const pb = best.get(e.player) === e;
      const vals = [String(i + 1), e.player.slice(0, 12), String(e.gross), toPar(e.toPar), e.difficulty, e.date.slice(0, 10)];
      vals.forEach((v, j) => { if (cols[j] >= 0) this.root.add(txt(this, cols[j], yy, v, { color: j === 1 && pb ? COLORS.yellow : COLORS.white })); });
    });
    const by = y0 + ph - 20;
    this.root.add(new Button(this, x0 + 6, by, 44, 15, 'back', () => this.back(), { color: 'grey' }));
    if (pages > 1) {
      this.root.add(new Button(this, x0 + 54, by, 18, 15, '', () => { page = Math.max(0, page - 1); this.rebuild(); }, { icon: 'arrow_left', color: 'grey' }));
      this.root.add(txt(this, x0 + 84, by + 3, `${page + 1}/${pages}`, { origin: [0.5, 0] }));
      this.root.add(new Button(this, x0 + 96, by, 18, 15, '', () => { page = Math.min(pages - 1, page + 1); this.rebuild(); }, { icon: 'arrow_right', color: 'grey' }));
    }
    this.root.add(new Button(this, x0 + pw - 114, by, 52, 15, 'export', () => void showBackup(backupText(all), all.length), { color: 'grey' }));
    this.root.add(new Button(this, x0 + pw - 58, by, 52, 15, 'import', async () => {
      const n = await askImport();
      if (n === null || !this.scene.isActive()) return;
      this.rebuild();
      this.root.add(txt(this, x0 + pw / 2, by - 12, n ? `imported ${n} ${n === 1 ? 'round' : 'rounds'}` : 'nothing new to import', { origin: [0.5, 0], color: COLORS.yellow }));
    }, { color: 'grey' }));
  }
}
