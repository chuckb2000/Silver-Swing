import type { DailyPick } from '../systems/game/daily';

// The daily round's courses and the first day each one is in the rotation
// (yyyy-mm-dd, the player's own day). A day's course is picked from the
// courses in the rotation on that day only, so a course merged today never
// changes today's daily (developer, 2026-10-20: the daily changed from Stone
// Creek to East Potomac Red after three courses were merged in the afternoon).
//
// When a course is merged into main, the design chat adds it here with the
// next day's date. A course that isn't listed is never the daily.

export const DAILY_ROSTER: Readonly<Record<string, string>> = {
  // the daily round began on 2026-10-20 with these sixteen
  east_potomac_blue: '2026-10-20',
  east_potomac_red: '2026-10-20',
  east_potomac_white: '2026-10-20',
  eastmoreland: '2026-10-20',
  franklin: '2026-10-20',
  highland_links: '2026-10-20',
  indian_island: '2026-10-20',
  langdon: '2026-10-20',
  langston: '2026-10-20',
  ogc: '2026-10-20',
  oswego_lake: '2026-10-20',
  stone_creek: '2026-10-20',
  tualatin: '2026-10-20',
  wannamoisett: '2026-10-20',
  waverley: '2026-10-20',
  willamette_valley: '2026-10-20',
  // merged on 2026-10-20 after the day's daily was set
  gearhart: '2026-10-21',
  bandon_trails: '2026-10-21',
  chambers_bay: '2026-10-21',
  // merged on 2026-10-20 in the evening
  bandon_dunes: '2026-10-21',
  triggs: '2026-10-21',
  // merged on 2026-10-21 in the morning
  tpc_boston: '2026-10-22',
  pacific_dunes: '2026-10-22',
  old_macdonald: '2026-10-22',
  sheep_ranch: '2026-10-22',
  // merged on 2026-10-22
  redtail: '2026-10-23',
  lake_oswego_muni: '2026-10-23',
  // merged on 2026-10-22 in the afternoon (13 and 19 holes: in the list, no nine to play)
  shortys: '2026-10-23',
  bandon_preserve: '2026-10-23',
  // merged on 2026-10-24
  sandpines: '2026-10-25',
  stanford: '2026-10-25',
  wildwood: '2026-10-25',
  pumpkin_ridge_witch_hollow: '2026-10-25',
  pumpkin_ridge_ghost_creek: '2026-10-25',
  // merged on 2026-10-24 in the evening
  cypress_point: '2026-10-25',
  astoria: '2026-10-25',
  // landed 2026-10-25 (pipeline/land.py)
  silvies_craddock: '2026-10-26',
  silvies_hankins: '2026-10-26',
  silvies_chief_egan: '2026-10-26',
  // landed 2026-10-25 (pipeline/land.py)
  fishers_island: '2026-10-26',
  // landed 2026-10-25 (pipeline/land.py)
  newport: '2026-10-26',
  // landed 2026-10-25 (pipeline/land.py)
  george_wright: '2026-10-26',
  // landed 2026-10-25 (pipeline/land.py)
  eastward_ho: '2026-10-26',
  // landed 2026-10-25 (pipeline/land.py)
  sea_ranch: '2026-10-26',
  // landed 2026-10-25 (pipeline/land.py)
  strawberry_farms: '2026-10-26',
  // landed 2026-10-26 (pipeline/land.py)
  presidio: '2026-10-27',
  // landed 2026-10-31 (pipeline/land.py)
  victoria: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  needham: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  cyprian_keyes: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  pronghorn_nicklaus: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  marovitz: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  kwiniaska: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  rancho_san_joaquin: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  tetherow: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  spruce_peak: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  aberdeen: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  aquidneck: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  burlington_cc: '2026-11-01',
  // landed 2026-10-31 (pipeline/land.py)
  sankaty_head: '2026-11-01',
};

/**
 * Days the developer picked by hand (yyyy-mm-dd): that day's daily is this course and
 * nine, whatever the rotation says. Add a day before it starts, never on the day.
 */
export const DAILY_PICKS: Readonly<Record<string, DailyPick>> = {
  '2026-10-21': { courseId: 'oswego_lake', length: 'back' }, // developer, 2026-10-20: "the back 9 at Oswego Lake"
  '2026-10-25': { courseId: 'sandpines', length: 'front' }, // developer, 2026-10-25: an Oregon course today, the random draw from tomorrow
  // the day's draw, kept on the Black tees it was played from: TPC Boston's default became the longer Gold (2026-10-31)
  '2026-10-29': { courseId: 'tpc_boston', length: 'back', tee: 'Black' },
};
