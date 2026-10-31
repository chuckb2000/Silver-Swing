"""Victoria Golf Club logo: The Garry Oak on the Point. A crooked Garry oak on the rock of Gonzales
Point, the Strait of Juan de Fuca and the snow-capped Olympic Mountains behind it.
Drawn as SVG in assets-src/logo_concepts/victoria/concept1.src.svg. Facts and sources:
logo_concepts/victoria/notes.json. An original drawing; never the club's own logo or trademark
(CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build victoria && python3 assets-src/logos.py victoria
"""
from logos import concept_logo

LOGO = concept_logo("victoria", "concept1")
