// A yes / no question in the style of the in-round "quit this round?" panel
// (HudScene.confirmQuit): a dimmer, a hatched panel, a title, a line of text
// and two buttons. Used on the menus before a round in progress is thrown away.

import Phaser from 'phaser';
import { app } from '../app';
import { Button, COLORS, dimmer, Panel, txt } from './widgets';

/** Ask; `yes` runs on the right-hand (orange) button, `no` (if given) on the other or a tap outside. */
export function confirmBox(scene: Phaser.Scene, parent: Phaser.GameObjects.Container | null, title: string, body: string,
  noLabel: string, yesLabel: string, yes: () => void, no?: () => void): Phaser.GameObjects.Container {
  const W = app.view.w, H = app.view.h;
  const layer = scene.add.container(0, 0).setDepth(200);
  const close = () => { if (layer.active) layer.destroy(); };
  const dim = dimmer(scene, 0.6);
  dim.on('pointerdown', () => { close(); no?.(); });
  const w = Math.min(210, W - 12);
  const t1 = txt(scene, 0, 0, title, { origin: [0.5, 0], scale: 2 });
  if (t1.width > w - 8) t1.setScale(1); // a narrow screen: the title at 1x (wrapping a scaled title overlapped the text)
  const t2 = txt(scene, 0, 0, body, { origin: [0.5, 0], color: COLORS.dim, maxWidth: w - 12 });
  const bodyY = 7 + Math.ceil(t1.height) + 5;
  const h = bodyY + Math.ceil(t2.height) + 8 + 16 + 8;
  const x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
  const pnl = new Panel(scene, x, y, w, h, 0.92);
  t1.setPosition(Math.round(x + w / 2), y + 7);
  t2.setPosition(Math.round(x + w / 2), y + bodyY);
  const bw = Math.floor((w - 20) / 2);
  const back = new Button(scene, x + 8, y + h - 24, bw, 16, noLabel, () => { close(); no?.(); }, { color: 'grey' });
  const ok = new Button(scene, x + w - 8 - bw, y + h - 24, bw, 16, yesLabel, () => { close(); yes(); });
  layer.add([dim, pnl, t1, t2, back, ok]);
  parent?.add(layer);
  return layer;
}
