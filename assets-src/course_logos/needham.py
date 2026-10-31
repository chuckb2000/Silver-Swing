"""Needham Golf Club logo: The Town Pump. A red cast-iron pitcher pump on a granite plinth, a drop of
water falling from its spout. The course is the Town of Needham's watershed land (bought from the
Colburn farm in 1899 to protect the water supply); the Water Commissioners' certificate of 28 March 1923
started the club, and it still leases the land from the town (Mass Golf, "Needham Golf Club Turns 100").
The pump is an interpretation of that story, not a real object on the course. Drawn as SVG in
assets-src/logo_concepts/needham/concept1.src.svg; facts and sources in notes.json there. An original
drawing; never the club's own logo (two pines and a flag) or trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build needham && python3 assets-src/logos.py needham
"""
from logos import concept_logo

LOGO = concept_logo("needham", "concept1")
