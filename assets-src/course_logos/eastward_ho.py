"""Eastward Ho! Country Club logo: The Quahog. A Cape Cod quahog shell, its chalky grey growth bands and the wampum purple of its lip, on a flat of pale sand.
Drawn as SVG in assets-src/logo_concepts/eastward_ho/concept1.src.svg (house style; the developer, 2026-10-25,
didn't want the first drafts' round badges). Facts and sources: logo_concepts/eastward_ho/notes.json. An
original drawing; never the club's own logo or trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build eastward_ho && python3 assets-src/logos.py eastward_ho
"""
from logos import concept_logo

LOGO = concept_logo("eastward_ho", "concept1")
