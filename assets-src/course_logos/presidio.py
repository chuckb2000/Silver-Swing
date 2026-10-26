"""Presidio Golf Course logo: The Fort Gun. An old fort's bronze field gun on its wooden carriage, a golf ball at the muzzle, on the parade-ground lawn.
Drawn as SVG in assets-src/logo_concepts/presidio/concept1.src.svg (house style; the developer, 2026-10-25,
didn't want the first drafts' round badges). Facts and sources: logo_concepts/presidio/notes.json. An
original drawing; never the club's own logo or trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build presidio && python3 assets-src/logos.py presidio
"""
from logos import concept_logo

LOGO = concept_logo("presidio", "concept1")
