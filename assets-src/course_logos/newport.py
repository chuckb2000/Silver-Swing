"""Newport Country Club logo: Hickory and Gutty, 1895. A hickory-shafted, long-nosed wooden club and a hand-hammered gutta-percha ball over a run of Atlantic waves.
Drawn as SVG in assets-src/logo_concepts/newport/concept1.src.svg (house style; the developer, 2026-10-25,
didn't want the first drafts' round badges). Facts and sources: logo_concepts/newport/notes.json. An
original drawing; never the club's own logo or trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build newport && python3 assets-src/logos.py newport
"""
from logos import concept_logo

LOGO = concept_logo("newport", "concept1")
