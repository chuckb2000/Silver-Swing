"""Rancho San Joaquin Golf Course logo: The Marsh Avocet. An American avocet (cinnamon head and neck,
black-and-white back, long upturned bill) wading in a pond, for the San Joaquin Marsh beside the
course and the course's lakes. Drawn as SVG in assets-src/logo_concepts/rancho_san_joaquin/concept1.src.svg
(house style). Facts and sources: logo_concepts/rancho_san_joaquin/notes.json. An original drawing; never
the club's own logo or trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build rancho_san_joaquin && python3 assets-src/logos.py rancho_san_joaquin
"""
from logos import concept_logo

LOGO = concept_logo("rancho_san_joaquin", "concept1")
