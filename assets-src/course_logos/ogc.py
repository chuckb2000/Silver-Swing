"""Oregon Golf Club logo: "The Heron", Concept 1 of the logo concepts, chosen by the
developer on 2026-10-25 (DECISIONS.md "Logos from the logo concepts"). It replaces the drawing
in assets-src/logos.py LOGOS["ogc"], which stays there; a course's own file wins.

The drawing is assets-src/logo_concepts/ogc/concept1.src.svg; after changing it run
`python3 assets-src/logo_concepts/lc.py build ogc`, then `python3 assets-src/logos.py ogc`.
"""
from __future__ import annotations

from logos import concept_logo

LOGO = concept_logo("ogc", "concept1")
