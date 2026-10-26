"""The Sea Ranch Golf Links logo: The Windbreak Cypress. A wind-swept Monterey cypress on the headland meadow, its flat crown streaming inland, the cliff edge to the sea.
Drawn as SVG in assets-src/logo_concepts/sea_ranch/concept1.src.svg (house style; the developer, 2026-10-25,
didn't want the first drafts' round badges). Facts and sources: logo_concepts/sea_ranch/notes.json. An
original drawing; never the club's own logo or trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build sea_ranch && python3 assets-src/logos.py sea_ranch
"""
from logos import concept_logo

LOGO = concept_logo("sea_ranch", "concept1")
