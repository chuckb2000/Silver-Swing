# Logo concepts

Two new logo directions for every course, next to the logo it has now. Nothing
here replaces a shipped logo: `game/public/sprites/logos/<id>.png` and the
drawing scripts (`assets-src/logos.py`, `assets-src/course_logos/<id>.py`) are
untouched. To adopt a concept, copy `<id>/conceptN_32.png` over
`game/public/sprites/logos/<id>.png` (and keep the SVG source as the drawing).

```
assets-src/logo_concepts/
  lc.py                         build + review tool (python3 lc.py --help)
  <id>/concept1.src.svg         Concept 1: the existing logo, elevated
  <id>/concept2.src.svg         Concept 2: an original logo from the course itself
  <id>/conceptN.fix             optional pixel touch-ups
  <id>/notes.json               rationale, facts with sources, recommendation
  <id>/conceptN.svg             (built) vector master with the outline
  <id>/conceptN_32.png          (built) game sprite, 32 x 32
  <id>/conceptN_512.png         (built) smooth 512 px render
```

```
pip install --break-system-packages cairosvg
python3 assets-src/logo_concepts/lc.py build <id>
python3 assets-src/logo_concepts/lc.py sheet <id> /path/to/sheet.png   # current | 1 | 2
```

## The two briefs

**Concept 1 - elevate the existing logo.** Work out what the current logo is
trying to say and say it at the highest level. Keep the subject the developer
chose (many have a personal reason: a hockey skate, lederhosen, a rooster). Keep
what is recognisable; fix proportions, silhouette, colour, composition. Bold
changes are welcome (a new pose, a crop, a container, a two-tone treatment); a
redraw that looks the same is a failure.

**Concept 2 - an original logo from the course.** One strongest idea from the
course's real history, landscape, architecture, signature hole, wildlife or
town. If the name were removed it should still say where it is. No crossed
clubs, ball-on-tee, flags or generic shields unless there is a real reason.
Must differ from Concept 1 in idea, not just colour.

## Rules (CLAUDE.md 14 and assets-src/course_logos/README.md)

- Original drawing. Never the club's real logo, crest or trademark, and never
  close to one: look up the club's real logo first and avoid its subject and form.
- Do not reuse a subject another course in the game already has (list below).
- Drawn on the 32 x 32 grid (`viewBox="0 0 32 32"`), art inside 1..31 (the tool
  adds a 1 px dark outline round everything, so leave the margin).
- Flat fills only: no gradients, filters, blur, opacity tricks, text elements.
  `clipPath` is fine (for split shading). Aim for 4-10 colours, at most 12.
- Light from the upper left: lit left/top edges, shaded right/bottom.
- Readable at 1x on the course card (look at the sheet's 1x tiles and card, not
  only the 8x view). Key features at least 2 units thick; 1-unit details only
  as accents. Avoid scene clutter (ground strips, skies) unless it carries the idea.
- Letters only if they carry the idea and read at 32 px; never the club's name.
- Facts are facts: every historical or geographic claim in notes.json has a
  source (URL or repo path). Anything invented is labelled as interpretation.
  Do not invent history.

## Subjects already used (shipped logos)

oswego_lake anchor · highland_links lighthouse · langdon red barn ·
east_potomac domed memorial (Blue/White/Red on colour discs) · langston
three-petalled orange wildflower · stone_creek waterfall · waverley green
locomotive · eastmoreland pink rhododendron · willamette_valley glass of red
wine · indian_island flint arrowhead · gearhart shipwreck · chambers_bay concrete
plant ruins · tualatin arched footbridge · ogc great blue heron in grass ·
wannamoisett hockey skate · franklin turtle · bandon_dunes harbor seal on a rock ·
bandon_preserve western snowy plover · bandon_trails trail-marker post and spruce ·
old_macdonald tweed flat cap and pipe · pacific_dunes grey whale's tail ·
redtail red fox · sandpines Siuslaw River Bridge · sheep_ranch black-faced sheep
on a clifftop · shortys spotted fawn · stanford arcade of the Main Quad ·
tpc_boston baby-blue lederhosen · triggs Rhode Island Red rooster

New in this folder: oswego_lake concept 2, the Oswego Iron Furnace.

## notes.json

See `oswego_lake/notes.json`. Fields: `facts` (fact + source), `current`
(subject, keep, weaknesses), two `concepts` (name, rationale, references,
symbolism, interpretation, typography, lockup {font, weight, case, tracking,
line1, line2}, palette [{hex, name}], strengths, tradeoffs) and
`recommendation`. Lockup fonts are Google Fonts. Plain, short sentences.
