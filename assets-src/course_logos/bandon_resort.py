"""Bandon Dunes Golf Resort, the place that groups Bandon Dunes, Pacific Dunes, Bandon
Trails, Old Macdonald, Sheep Ranch, Bandon Preserve and Shorty's on the course list
(game/scripts/course-groups.json): Bennett's Gorse, a sprig of gorse in bloom, the logo
concept drawn for Bandon Dunes (logo_concepts/bandon_dunes/concept2; Bandon Dunes kept
its seal). The developer, 2026-10-27: "there was a little gorse flower logo made in
another chat i liked". `python3 assets-src/logos.py bandon_resort` writes
game/public/sprites/logos/bandon_resort.png.
"""
from logos import concept_logo

LOGO = concept_logo("bandon_dunes", "concept2")
