// The card of a live match: each hole's par, both players' scores and who won
// it, nine by nine, with the match's standing after each hole ("1", "as"); any
// extra holes on a line under it.

import Phaser from 'phaser';
import { cardBlocks, lengthOf } from '../systems/game/lengths';
import { courseHoleFor } from '../systems/game/round';
import type { MatchSession } from '../systems/match/session';
import { holeNo, isExtra, ordinal, statusText } from '../systems/match/rules';
import type { Seat } from '../systems/match/types';
import { COLORS, Panel, txt } from './widgets';

export function matchCard(scene: Phaser.Scene, ms: MatchSession, me: Seat | null, W: number, H: number): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const s = ms.state;
  const holes = ms.course.json.holes;
  const n = holes.length;
  const blocks = cardBlocks(lengthOf(s.cfg.holes, n), s.cfg.holes, n);
  const cellW = W < 330 ? 19 : 21;
  const labelW = 46, sumW = 24;
  const tw = labelW + cellW * 9 + sumW + 2;
  const x0 = Math.round((W - tw) / 2);
  const rowH = 11;
  const names = s.players.map((p, k) => (k === me ? 'you' : p?.name ?? '-').slice(0, 7));
  const rows = ['hole', 'par', names[0], names[1], 'match'];
  const blockH = rowH * rows.length + 4;
  // extra holes (the match was all square after the last): one line, "19th (1): 4-4 halved  ·  20th (2): 4-5"
  const extras = s.results.filter((r) => isExtra(s.cfg, r.hole));
  const extraLine = extras.map((r) => `${ordinal(r.hole + 1)} (hole ${holeNo(s.cfg, r.hole)}): ${r.strokes[0]}-${r.strokes[1]} ${r.winner === null ? 'halved' : `${names[r.winner]} won`}`).join('  ·  ');
  // the legend under the card, measured first: a long result ("you won at the 10th") wraps it to a second line
  const legend = txt(scene, x0, 0, `${statusText(s, me)}  ·  circled: won the hole  ·  match: holes up`, { color: COLORS.dim, maxWidth: tw });
  const extraTxt = extras.length ? txt(scene, x0, 0, `extra holes (${names[0]}-${names[1]}):  ${extraLine}`, { color: COLORS.white, maxWidth: tw }) : null;
  const tail = Math.ceil(legend.height) - 10 + (extraTxt ? Math.ceil(extraTxt.height) + 2 : 0);
  const th = blockH * blocks.length + 30 + Math.max(0, tail);
  const y0 = Math.max(4, Math.round((H - th) / 2) - 6);
  c.add(new Panel(scene, x0 - 6, y0 - 4, tw + 12, th + 8, 0.94));
  c.add(txt(scene, x0, y0, `${ms.course.json.name}  ·  ${s.cfg.tee.toLowerCase()} tees  ·  match play`, { color: COLORS.dim, maxWidth: tw }));
  // the result and the standing after each hole, by scorecard hole number
  const byHole = new Map<number, { strokes: [number, number]; holed: [boolean, boolean]; winner: Seat | null; up: number }>();
  let up = 0;
  for (const r of s.results) {
    if (isExtra(s.cfg, r.hole)) continue; // on their own line below
    if (r.winner === 0) up++; else if (r.winner === 1) up--;
    byHole.set(s.cfg.holes[r.hole], { strokes: r.strokes, holed: r.holed, winner: r.winner, up });
  }
  const standing = (u: number) => (u === 0 ? 'as' : String(Math.abs(u)));
  blocks.forEach(([a, b, lab], k) => {
    const yb = y0 + 14 + k * (blockH + 6);
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 0.06).fillRect(x0, yb, tw, rowH);
    g.fillStyle(0xffffff, 0.04).fillRect(x0, yb + rowH, tw, rowH);
    c.add(g);
    rows.forEach((rl, i) => c.add(txt(scene, x0 + 2, yb + i * rowH + 1, rl, { color: i === 2 || i === 3 ? COLORS.white : COLORS.dim })));
    let sumPar = 0, lastUp: number | null = null;
    const won: [number, number] = [0, 0];
    const sum: [number, number] = [0, 0];
    for (let h = a; h <= b; h++) {
      const hj = holes[courseHoleFor(h, n) - 1];
      const cx = x0 + labelW + (h - a) * cellW + cellW / 2;
      sumPar += hj.par;
      c.add(txt(scene, cx, yb + 1, String(h), { origin: [0.5, 0] }));
      c.add(txt(scene, cx, yb + rowH + 1, String(hj.par), { origin: [0.5, 0], color: COLORS.dim }));
      const res = byHole.get(h);
      if (!res) continue;
      lastUp = res.up;
      for (const p of [0, 1] as Seat[]) {
        const winner = res.winner === p;
        if (winner) won[p]++;
        sum[p] += res.strokes[p];
        // a ball not holed (picked up, conceded, or the hole decided first): its strokes, dimmed
        const label = String(res.strokes[p]);
        const col = winner ? COLORS.yellow : res.holed[p] ? COLORS.white : COLORS.dim;
        const t = txt(scene, cx, yb + (2 + p) * rowH + 1, label, { origin: [0.5, 0], color: col });
        c.add(t);
        if (winner) {
          const gg = scene.add.graphics();
          gg.lineStyle(1, COLORS.yellow, 0.9).strokeCircle(Math.round(cx), yb + (2 + p) * rowH + 5.5, 5.5);
          c.add(gg);
        }
      }
      const lead = res.up;
      const col = lead === 0 ? COLORS.dim : (lead > 0) === (me !== 1) ? COLORS.green : 0x9fd0ff;
      c.add(txt(scene, cx, yb + 4 * rowH + 1, standing(lead), { origin: [0.5, 0], color: me === null ? COLORS.dim : col }));
    }
    const sx = x0 + labelW + 9 * cellW + sumW / 2;
    c.add(txt(scene, sx, yb + 1, lab, { origin: [0.5, 0], color: COLORS.dim }));
    c.add(txt(scene, sx, yb + rowH + 1, String(sumPar), { origin: [0.5, 0], color: COLORS.dim }));
    // the nine's strokes (not the match: the standing row says that), and the standing after it
    if (lastUp !== null) {
      c.add(txt(scene, sx, yb + 2 * rowH + 1, String(sum[0]), { origin: [0.5, 0], color: COLORS.dim }));
      c.add(txt(scene, sx, yb + 3 * rowH + 1, String(sum[1]), { origin: [0.5, 0], color: COLORS.dim }));
      c.add(txt(scene, sx, yb + 4 * rowH + 1, standing(lastUp), { origin: [0.5, 0], color: COLORS.dim }));
    }
    void won;
  });
  let yEnd = y0 + 14 + blocks.length * (blockH + 6) - 2;
  if (extraTxt) {
    c.add(extraTxt.setY(yEnd));
    yEnd += Math.ceil(extraTxt.height) + 2;
  }
  c.add(legend.setY(yEnd));
  c.setData('bottom', y0 + th + 4);
  c.setData('top', y0 - 4);
  return c;
}
