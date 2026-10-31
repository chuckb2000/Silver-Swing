"""Kwiniaska Golf Club logo: The Ridge Holstein. A Holstein's head, black and white with a pink
muzzle and a yellow ear tag, for the dairy farmers who founded the club: Brad and May Caldwell moved
to Shelburne in the 1960s to farm dairy and opened the course on the ridge above the village.
Drawn as SVG in assets-src/logo_concepts/kwiniaska/concept1.src.svg (house style). Facts and sources:
logo_concepts/kwiniaska/notes.json. An original drawing; never the club's own logo or trademark
(CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build kwiniaska && python3 assets-src/logos.py kwiniaska
"""
from logos import concept_logo

LOGO = concept_logo("kwiniaska", "concept1")
