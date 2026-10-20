// The player's own rounds, for "my golf" and the milestones: this device's
// rounds under the current name (and any played before a name was set), plus
// the player code's rounds from other devices on the shared board.

import { app } from '../app';
import { stateOf } from '../data/registry';
import type { LeaderboardEntry } from './entry';
import type { MilestoneCourse } from './milestones';
import { DEFAULT_NAME } from './names';
import { fetchOwnRounds } from './online';
import { mergeRounds } from './stats';
import { loadBoard } from './store';

/** The courses on offer, as the milestones need them. */
export function milestoneCourses(): MilestoneCourse[] {
  return app.courses.map((c) => ({ id: c.id, name: c.name, state: stateOf(c) }));
}

/** This player's rounds; `online` also asks the shared board for the player code's rounds. */
export async function myRounds(online = true): Promise<{ rounds: LeaderboardEntry[]; fromServer: boolean }> {
  const name = app.settings.playerName;
  const local = (await loadBoard()).filter((e) => e.player === name || e.player === DEFAULT_NAME);
  const remote = online ? await fetchOwnRounds() : null;
  return { rounds: mergeRounds(local, remote ?? []), fromServer: !!remote };
}
