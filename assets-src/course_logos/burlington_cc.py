"""Burlington Country Club logo: Sugaring Season. A galvanised sap bucket hung on a sugar maple's
spile, heaped with golf balls instead of sap, and a scarlet maple leaf (Vermont's sugarbush and the
course's hardwoods). Drawn as SVG in assets-src/logo_concepts/burlington_cc/concept1.src.svg (house
style) by the course chat, 2026-10-30 (overnight; the developer gave the course chats a free hand).
Facts and sources: logo_concepts/burlington_cc/notes.json. An original drawing; never the club's own
logo or trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build burlington_cc && python3 assets-src/logos.py burlington_cc
"""
from logos import concept_logo

LOGO = concept_logo("burlington_cc", "concept1")
