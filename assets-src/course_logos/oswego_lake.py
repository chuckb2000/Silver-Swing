"""Oswego Lake Country Club logo: "The Iron Furnace", Concept 2 of the logo concepts, chosen by the
developer on 2026-10-25 (DECISIONS.md "Logos from the logo concepts"). It replaces the drawing
in assets-src/logos.py LOGOS["oswego_lake"], which stays there; a course's own file wins.

The drawing is assets-src/logo_concepts/oswego_lake/concept2.src.svg; after changing it run
`python3 assets-src/logo_concepts/lc.py build oswego_lake`, then `python3 assets-src/logos.py oswego_lake`.
"""
from __future__ import annotations

from logos import concept_logo

LOGO = concept_logo("oswego_lake", "concept2")
