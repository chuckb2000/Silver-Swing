"""Sankaty Head Golf Club logo: The Lightship Basket. A Nantucket lightship basket: rattan
cane woven over staves on a turned wooden base, a bent wooden bail, and a wooden lid carrying a
small ivory sperm whale. The island's own craft, first made aboard the lightships on the
Nantucket shoals (1850s-1900); the club's holes carry nautical names, the 7th "Cross Rip" after
a lightship station. Drawn as SVG in assets-src/logo_concepts/sankaty_head/concept1.src.svg.
Facts and sources: logo_concepts/sankaty_head/notes.json. An original drawing; never the club's
own logo or trademark (CLAUDE.md 14), and not a lighthouse (Highland Links has one).

    python3 assets-src/logo_concepts/lc.py build sankaty_head && python3 assets-src/logos.py sankaty_head
"""
from logos import concept_logo

LOGO = concept_logo("sankaty_head", "concept1")
