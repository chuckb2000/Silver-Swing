// Share a scorecard picture (player improvements, item 2): a 1080 x 1350 PNG
// of a finished round - the course's card art and logo, the date, tees and
// level, the score and the scorecard with birdie circles and bogey squares.
// Drawn in texels with the game's own font and widgets, then scaled up 4x
// without smoothing so it stays pixel-crisp. Phones get the share sheet,
// everything else a download.

import Phaser from 'phaser';
import { app, GAME_NAME } from '../app';
import type { LeaderboardEntry } from '../save/entry';
import { lengthLabel } from '../systems/game/lengths';
import { toPar } from '../systems/rules/scoring';
import { cardOfEntry, scorecardOf } from '../scenes/HudScene';
import { COLORS, txt } from './widgets';

export const SHARE_W = 270, SHARE_H = 338; // texels; x4 = 1080 x 1350 (the last half texel is cut)
const SCALE = 4;
const OUT_W = 1080, OUT_H = 1350;

/** Load images into the texture manager if they aren't there yet (missing files are skipped). */
export function ensureImages(scene: Phaser.Scene, want: [string, string][]): Promise<void> {
  const todo = want.filter(([k]) => !scene.textures.exists(k));
  if (!todo.length) return Promise.resolve();
  return new Promise((resolve) => {
    for (const [k, url] of todo) scene.load.image(k, url);
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    scene.load.start();
  });
}

function dayText(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toLowerCase();
}

/** The picture as a PNG blob. `rank` is a line such as "#2 of 14 among friends". */
export async function shareImage(scene: Phaser.Scene, e: LeaderboardEntry, rank = ''): Promise<Blob | null> {
  const info = app.courses.find((c) => c.id === e.course);
  const name = info?.name ?? e.course;
  const logoIds = [e.course, ...(info?.group ? [info.group] : [])];
  await ensureImages(scene, [[`card_${e.course}`, `sprites/cards/${e.course}.png`], ...logoIds.map((id): [string, string] => [`logo_${id}`, `sprites/logos/${id}.png`])]);
  if (!scene.sys.isActive()) return null;
  const W = SHARE_W, H = SHARE_H;
  const box = scene.make.container({ x: 0, y: 0 }, false);
  const g = scene.add.graphics();
  g.fillStyle(0x0b1116, 1).fillRect(0, 0, W, H);
  g.fillStyle(COLORS.orange, 1).fillRect(0, 0, W, 2).fillRect(0, H - 2, W, 2);
  box.add(g);
  box.add(txt(scene, W / 2, 4, GAME_NAME.toLowerCase(), { origin: [0.5, 0], color: COLORS.dim }));
  // the course's card art (the middle of it: the signature green), with its logo
  const nines = e.length === '18' || e.length === '9x2' ? 2 : 1;
  const artH = nines === 2 ? 92 : 132;
  const ax = Math.round((W - 208) / 2), ay = 15;
  const frame = scene.add.graphics();
  frame.fillStyle(0x394049, 1).fillRect(ax - 2, ay - 2, 212, artH + 4);
  frame.fillStyle(0x1d2a22, 1).fillRect(ax, ay, 208, artH);
  box.add(frame);
  const ck = `card_${e.course}`;
  if (scene.textures.exists(ck)) {
    const src = scene.textures.get(ck).getSourceImage() as HTMLImageElement;
    const cy = Math.max(0, Math.round((src.height - artH) / 2) - 6);
    box.add(scene.add.image(ax, ay - cy, ck).setOrigin(0, 0).setCrop(0, cy, Math.min(208, src.width), Math.min(artH, src.height)));
  }
  const lk = logoIds.map((id) => `logo_${id}`).find((k) => scene.textures.exists(k));
  if (lk) box.add(scene.add.image(ax + 3, ay + 3, lk).setOrigin(0, 0));
  let y = ay + artH + 6;
  box.add(txt(scene, W / 2, y, name, { origin: [0.5, 0], maxWidth: W - 12 }));
  y += 11;
  const meta = [dayText(e.date), `${e.tee.toLowerCase()} tees`, lengthLabel(e.length), e.difficulty, ...(e.casual ? ['casual'] : []), ...(e.daily ? ['daily round'] : [])];
  box.add(txt(scene, W / 2, y, meta.join('  ·  '), { origin: [0.5, 0], color: COLORS.dim, maxWidth: W - 12 }));
  y += 13;
  const who = txt(scene, 8, y + 4, e.player, { scale: 2, color: COLORS.white });
  const score = txt(scene, W - 8, y, `${e.gross}`, { origin: [1, 0], scale: 3, color: COLORS.yellow });
  const tp = txt(scene, W - 14 - score.width, y + 10, toPar(e.toPar), { origin: [1, 0], scale: 2, color: e.toPar <= 0 ? COLORS.yellow : COLORS.white });
  box.add([who, score, tp]);
  y += 28;
  if (rank) { box.add(txt(scene, W / 2, y, rank, { origin: [0.5, 0], color: COLORS.green, maxWidth: W - 12 })); y += 11; }
  // the scorecard, placed under the header (its own layout centres it in the height it is given)
  const holes = app.course?.json.id === e.course ? app.course.json.holes : null;
  const card = scorecardOf(scene, { ...cardOfEntry(e, name, holes), title: '' }, W, 400);
  card.y = y + 2 - (card.getData('top') as number);
  box.add(card);
  // render, then scale up without smoothing
  const rt = scene.make.renderTexture({ x: 0, y: 0, width: W, height: H }, false);
  rt.draw(box);
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    rt.snapshot((s) => resolve(s instanceof HTMLImageElement ? s : null));
  });
  box.destroy(true);
  rt.destroy();
  if (!img) return null;
  if (!img.complete) await new Promise((r) => { img.onload = r; img.onerror = r; });
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, W * SCALE, H * SCALE);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Share the picture (phone share sheet) or download it. */
export async function shareRound(scene: Phaser.Scene, e: LeaderboardEntry, rank = ''): Promise<'shared' | 'saved' | 'failed'> {
  const blob = await shareImage(scene, e, rank);
  if (!blob) return 'failed';
  const file = `silver-swings-${e.course}-${e.date.slice(0, 10)}.png`;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    const f = new File([blob], file, { type: 'image/png' });
    if (nav.share && nav.canShare?.({ files: [f] })) {
      await nav.share({ files: [f], title: GAME_NAME, text: `${e.player}: ${e.gross} (${toPar(e.toPar)}) at ${app.courses.find((c) => c.id === e.course)?.name ?? e.course}` });
      return 'shared';
    }
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return 'shared'; // the player closed the share sheet
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'saved';
}
