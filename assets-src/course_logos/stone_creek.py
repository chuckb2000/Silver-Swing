"""Stone Creek Golf Club logo: "End of the Trail", Concept 2 of the logo concepts, chosen by the
developer on 2026-10-25 (DECISIONS.md "Logos from the logo concepts"). It replaces the drawing
in assets-src/logos.py LOGOS["stone_creek"], which stays there; a course's own file wins.

The drawing is assets-src/logo_concepts/stone_creek/concept2.src.svg; after changing it run
`python3 assets-src/logo_concepts/lc.py build stone_creek`, then `python3 assets-src/logos.py stone_creek`.
"""
from __future__ import annotations

from logos import concept_logo

LOGO = concept_logo("stone_creek", "concept2")
