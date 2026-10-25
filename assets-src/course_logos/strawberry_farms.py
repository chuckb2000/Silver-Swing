"""Strawberry Farms Golf Club logo: The Strawberry Flag. A ripe strawberry whose leafy cap carries a short pin with a strawberry leaf for its flag.
Drawn as SVG in assets-src/logo_concepts/strawberry_farms/concept1.src.svg (house style; the developer, 2026-10-25,
didn't want the first drafts' round badges). Facts and sources: logo_concepts/strawberry_farms/notes.json. An
original drawing; never the club's own logo or trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build strawberry_farms && python3 assets-src/logos.py strawberry_farms
"""
from logos import concept_logo

LOGO = concept_logo("strawberry_farms", "concept1")
