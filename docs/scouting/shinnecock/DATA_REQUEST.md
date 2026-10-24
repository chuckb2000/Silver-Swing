# Shinnecock Hills — data request (2026-10-24)

**Nothing new to download for the map, elevation, trees or photos.**
Shinnecock Hills shares a boundary with National Golf Links of America, and
the NGLA request already covers both courses with one box:
`docs/scouting/ngla/DATA_REQUEST.md` (box south 40.87914, west -72.47372,
north 40.92895, east -72.41727; EPSG:32618 x 712858-717459, y 4528547-4533948).
`box.json` and `links_generated.md` here are the same box.

| Step | File(s) | Where |
|---|---|---|
| 1. OSM layout | `ngla_shin_overpass.geojson` | NGLA request, step 1 |
| 2. Bare earth | `ngla_shin_dem_1.tif` ... `_4.tif` | NGLA request, step 2 |
| 3. Lidar for trees | the NYS Long Island 2024 tiles (or `ngla_shin_lidar_2014.zip`) | NGLA request, step 3 (the 12 needed tiles cover both courses) |
| 4. Orthophoto | `ngla_shin_ortho_1.jpg` ... `_9.jpg` | NGLA request, step 4 |

## 5. Scorecard (if you can get it)

The club publishes no card online. A phone photo of the printed card (every
tee, the stroke index and the ratings) would settle two conflicting online
versions (see `scorecard_sources.md`). Save as `shinnecock_card_*.jpg`.

## 6. Reference pictures

None needed. The 2026 US Open course guide or a yardage book page is
welcome as look-only reference.

## 7. Hand-off

1. Open https://github.com/chuckb2000/Silver-Swing/releases and open the
   draft release `shinnecock-data` (if there is none: "Draft a new release",
   tag `shinnecock-data`).
2. Drop the **same files** you attached to `ngla-data` (steps 1-4 above)
   into **Attach binaries** (below the description box, which rejects files
   over 25 MB), plus the card photo if you have one.
3. Click **Publish release**.
