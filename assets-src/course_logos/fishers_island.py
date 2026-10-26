"""Fishers Island Club logo: The Nun Buoy. A red nun buoy (a channel marker) afloat in the Sound, a white reflective band round it and a gull on its top.
Drawn as SVG in assets-src/logo_concepts/fishers_island/concept1.src.svg (house style; the developer, 2026-10-25,
didn't want the first drafts' round badges). Facts and sources: logo_concepts/fishers_island/notes.json. An
original drawing; never the club's own logo or trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build fishers_island && python3 assets-src/logos.py fishers_island
"""
from logos import concept_logo

LOGO = concept_logo("fishers_island", "concept1")
