"""Willamette Valley CC logo: "The Canby Dahlia", Concept 2 of the logo concepts, chosen by the
developer on 2026-10-25 (DECISIONS.md "Logos from the logo concepts"). It replaces the drawing
in assets-src/logos.py LOGOS["willamette_valley"], which stays there; a course's own file wins.

The drawing is assets-src/logo_concepts/willamette_valley/concept2.src.svg; after changing it run
`python3 assets-src/logo_concepts/lc.py build willamette_valley`, then `python3 assets-src/logos.py willamette_valley`.
"""
from __future__ import annotations

from logos import concept_logo

LOGO = concept_logo("willamette_valley", "concept2")
