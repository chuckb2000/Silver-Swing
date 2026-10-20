# <Course name>

Course id: `<id>` (data folder `data/<id>/`), branch `course/<id>`.

## Build summary

One paragraph: when it was built, what the data was (OSM complete or traced,
DEM and lidar products), the tee set, the theme, anything unusual (a course in
two parts, a shared green), how every hole compares with the card, and the
test counts on the branch.

## Facts

-   **Location:** street address, town, county, state, and the setting.
    `state` XX. Course id `<id>`.
-   **Design:** architect(s) and year(s), with the source.
-   **UTM zone:** NN N (EPSG:326NN). World W x H m. Theme `<theme>`.
    Wind a-b mph.
-   **Data:** each source with product name, date and where the originals
    are (git, or the release named in `data/<id>/release.json`).
-   **Water:** every penalty area and its colour; what is out of bounds.
-   **Trees:** count from lidar (on the course), how types were found, any
    removed and why.

## Scorecard

Source and date (club card, photo, website; or third-party and unverified).

| Hole | 1 | 2 | ... | Out | 10 | ... | In | Total |
|---|---|---|---|---|---|---|---|---|
| Par | | | | | | | | |
| HCP | | | | | | | | |
| Blue | | | | | | | | |
| Built | | | | | | | | |

Ratings/slopes per tee set; the tee sets on the card that were not built.

## Default tee

The set built, and why (4.1 default or the developer's call).

## The developer's calls

Every decision the developer made or accepted, with the date: accepted flags
and fails, traced or lidar features, penalty colours, removed trees, card hole.

## New pipeline keys or theme

Each new `course_config.json` key (name, what it does, its no-op default) or
new theme, and the `make regress` result. "None" if none.

## Open items

Numbered, each with a recommendation. Details in
`data/<id>/validation_report.md`.

## Lessons

What cost time on this course and what to do instead next time. The design
chat folds these into `docs/COURSE_LESSONS.md`.
