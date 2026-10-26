"""George Wright Golf Course logo: The Stitched Ball. A golf ball sewn with a baseball's red stitching, sitting on a scarlet oak leaf.
Drawn as SVG in assets-src/logo_concepts/george_wright/concept1.src.svg (house style; the developer, 2026-10-25,
didn't want the first drafts' round badges). Facts and sources: logo_concepts/george_wright/notes.json. An
original drawing; never the club's own logo or trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build george_wright && python3 assets-src/logos.py george_wright
"""
from logos import concept_logo

LOGO = concept_logo("george_wright", "concept1")
