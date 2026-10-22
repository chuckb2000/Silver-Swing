// Share a scorecard picture (player improvements, item 2): a 1080 x 1350 PNG
// of a finished round - the course's card art and logo, the date, tees and
// level, the score and the scorecard with birdie circles and bogey squares.
// Drawn in texels with the game's own font and widgets, then scaled up 4x
// without smoothing so it stays pixel-crisp. Phones get the share sheet; a
// computer gets the picture in a box with copy, download and close.

import Phaser from 'phaser';
import { app, GAME_NAME } from '../app';
import type { LeaderboardEntry } from '../save/entry';
import { cardBlocks, lengthLabel, shapeOfCourse } from '../systems/game/lengths';
import { toPar } from '../systems/rules/scoring';
import { cardOfEntry, scorecardOf } from '../scenes/HudScene';
import { COLORS, txt } from './widgets';
import { dialogText, openDialog } from './domDialog';

export const SHARE_W = 270, SHARE_H = 338; // texels; x4 = 1080 x 1350 (the last half texel is cut)
const SCALE = 4;
const OUT_W = 1080, OUT_H = 1350;

/** Load images into the texture manager if they aren't there yet (missing files are skipped). */
export function ensureImages(scene: Phaser.Scene, want: [string, string][]): Promise<void> {
  const todo = want.filter(([k]) => !scene.textures.exists(k));
  if (!todo.length) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const go = () => {
      for (const [k, url] of todo) if (!scene.textures.exists(k)) scene.load.image(k, url);
      scene.load.once(Phaser.Loader.Events.COMPLETE, finish);
      scene.load.start();
    };
    // the scene's loader busy with something else: ours go when it has finished (start() is ignored meanwhile)
    if (scene.load.isLoading()) scene.load.once(Phaser.Loader.Events.COMPLETE, go);
    else go();
    // never waits for ever: a card without its art is better than no card
    setTimeout(finish, 8000);
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
  const shape = info ? shapeOfCourse(info) : undefined;
  const nines = cardBlocks(e.length, e.scores.map((x) => x.hole), shape).length;
  const artH = nines >= 3 ? 52 : nines === 2 ? 92 : 132;
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
  const meta = [dayText(e.date), `${e.tee.toLowerCase()} tees`, lengthLabel(e.length, shape), e.difficulty, ...(e.casual ? ['casual'] : []), ...(e.daily ? ['daily round'] : [])];
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
/** A phone or tablet (touch first): the system share sheet suits it (developer: "it works perfectly on the phone"). */
function touchDevice(): boolean {
  try {
    return navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

function download(blob: Blob, file: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export type ShareResult = 'shared' | 'copied' | 'saved' | 'closed' | 'failed';

export async function shareRound(scene: Phaser.Scene, e: LeaderboardEntry, rank = ''): Promise<ShareResult> {
  const blob = await shareImage(scene, e, rank);
  if (!blob) return 'failed';
  const file = `silver-swings-${e.course}-${e.date.slice(0, 10)}.png`;
  const text = `${e.player}: ${e.gross} (${toPar(e.toPar)}) at ${app.courses.find((c) => c.id === e.course)?.name ?? e.course}`;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const f = new File([blob], file, { type: 'image/png' });
  const canSheet = !!nav.share && !!nav.canShare?.({ files: [f] });
  const sheet = async (): Promise<ShareResult> => {
    try {
      await nav.share({ files: [f], title: GAME_NAME, text });
      return 'shared';
    } catch (err) {
      return (err as { name?: string })?.name === 'AbortError' ? 'closed' : 'failed'; // closed the sheet
    }
  };
  if (touchDevice()) {
    // phones and tablets: the share sheet, as before
    if (canSheet) { const r = await sheet(); return r === 'closed' ? 'shared' : r === 'failed' ? (download(blob, file), 'saved') : r; }
    download(blob, file);
    return 'saved';
  }
  // a computer (developer, 2026-10-20: the system share window was confusing there): the
  // picture in a box with "copy picture" (paste it into a chat), "download" and "close";
  // the system share window stays one button away when the browser has one
  return new Promise<ShareResult>((resolve) => {
    const url = URL.createObjectURL(blob);
    let done = false;
    const finish = (r: ShareResult) => {
      if (done) return;
      done = true;
      if (!dlg.closed) dlg.close();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve(r);
    };
    const dlg = openDialog(scene, 380, () => finish('closed'));
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'scorecard picture';
    Object.assign(img.style, { display: 'block', margin: '6px auto', maxWidth: '100%', maxHeight: 'min(52vh, 420px)', imageRendering: 'pixelated', border: '2px solid #2a3640' } as CSSStyleDeclaration);
    const msg = dialogText('', '#9fb0bd', 13);
    // someone else's round (from the boards) says whose it is
    const mine = e.player === app.settings.playerName;
    dlg.box.append(dialogText(mine ? 'your scorecard' : `${e.player}'s scorecard`, '#f6f6f2', 15), img, msg);
    const clip = navigator.clipboard as (Clipboard & { write?: (items: ClipboardItem[]) => Promise<void> }) | undefined;
    const canCopy = !!clip?.write && typeof ClipboardItem !== 'undefined';
    const labels = [...(canCopy ? ['copy picture'] : []), 'download', ...(canSheet ? ['more...'] : []), 'close'];
    const btns = dlg.buttons(labels);
    const byLabel = (l: string) => btns[labels.indexOf(l)];
    let result: ShareResult = 'closed';
    if (canCopy) byLabel('copy picture').addEventListener('click', async () => {
      try {
        await clip!.write!([new ClipboardItem({ 'image/png': blob })]);
        msg.style.color = '#8fd18f';
        msg.textContent = 'copied - paste it into a message or a chat';
        result = 'copied';
      } catch {
        msg.style.color = '#ff7a6a';
        msg.textContent = "this browser won't copy pictures - use download";
      }
    });
    byLabel('download').addEventListener('click', () => {
      download(blob, file);
      msg.style.color = '#8fd18f';
      msg.textContent = `saved to your downloads as ${file}`;
      if (result === 'closed') result = 'saved';
    });
    if (canSheet) byLabel('more...').addEventListener('click', async () => {
      const r = await sheet();
      if (r === 'shared') finish('shared');
    });
    byLabel('close').addEventListener('click', () => finish(result));
  });
}
