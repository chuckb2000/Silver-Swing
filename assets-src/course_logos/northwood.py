"""Northwood Golf Club logo: The Foot of the Giant. The flared, fluted cinnamon foot of a coast redwood,
its trunk running off the top of the badge, a golf ball at rest in the fire-hollowed "goose pen" at its base,
sword ferns either side on the red-brown duff.
Drawn as SVG in assets-src/logo_concepts/northwood/concept1.src.svg (house style: one subject, no round badge).
Facts and sources: logo_concepts/northwood/notes.json. An original drawing; never the club's own logo or
trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build northwood && python3 assets-src/logos.py northwood
"""
from logos import concept_logo

LOGO = concept_logo("northwood", "concept1")
