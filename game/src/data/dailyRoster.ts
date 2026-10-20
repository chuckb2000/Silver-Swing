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
};
