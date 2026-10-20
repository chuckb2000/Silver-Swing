// Swing coach: short tips on a player's first shots (player improvements
// report, item 1). Each tip shows until the shot it explains has been struck,
// then never again on this device (settings.tipsSeen); the "tips" setting
// turns them off, and turning it back on shows them again. Pure: the HUD asks
// which tip fits the moment and draws it.

import type { LieKind } from '../systems/rules/lie';
import type { MeterPhase } from '../systems/swing/meter';

export interface CoachState {
  on: boolean;                 // settings.showTips
  seen: readonly string[];     // settings.tipsSeen
  state: string;               // PlayScene state ('aim', 'swing', ...)
  phase: MeterPhase | null;    // the meter's phase while swinging
  putting: boolean;
  lie: LieKind | null;
  blocked: boolean;            // a dialog, the hole intro or the card is up
}

export interface Tip { key: string; text: string }

export const TIPS: Record<string, string> = {
  start: 'aim with the arrows or by dragging the view, then tap swing (or press space) to start',
  power: 'tap again to set the power: 100 is a full swing with this club',
  accuracy: 'now tap as the cursor comes back over the dark line in the green',
  putt: 'putting: 100 on the meter is the distance under the club. read the slope arrows, then the same three taps',
  rough: 'in the rough the ball goes shorter and the driver stays in the bag',
  bunker: 'in a bunker: take a wedge, and expect it to come out short',
  trees: 'under trees the ball flies low: aim for a gap',
};

/** The tip for this moment, or null. */
export function tipFor(s: CoachState): Tip | null {
  if (!s.on || s.blocked) return null;
  const want = (key: string): Tip | null => (s.seen.includes(key) ? null : { key, text: TIPS[key] });
  if (s.state === 'swing') {
    if (s.phase === 'power') return want('power');
    if (s.phase === 'accuracy') return want('accuracy');
    return null;
  }
  if (s.state !== 'aim') return null;
  if (s.putting) return want('putt');
  if (s.lie === 'rough') { const t = want('rough'); if (t) return t; }
  if (s.lie === 'fairway_bunker' || s.lie === 'greenside_bunker') { const t = want('bunker'); if (t) return t; }
  if (s.lie === 'trees') { const t = want('trees'); if (t) return t; }
  return want('start');
}

/**
 * Tips that count as learnt once a shot is struck: the ones shown for it. The
 * timing tip only counts when the player made the third tap in time (a swing
 * that ran out to the end of the bar shows it again next time).
 */
export function learnt(shown: Iterable<string>, lateThirdTap: boolean): string[] {
  return [...shown].filter((k) => !(k === 'accuracy' && lateThirdTap));
}
