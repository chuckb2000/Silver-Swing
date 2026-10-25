"""Tualatin Country Club logo: "The Tualatin Mastodon", Concept 2 of the logo concepts, chosen by the
developer on 2026-10-25 (DECISIONS.md "Logos from the logo concepts"). It replaces the drawing
in assets-src/logos.py LOGOS["tualatin"], which stays there; a course's own file wins.

The drawing is assets-src/logo_concepts/tualatin/concept2.src.svg; after changing it run
`python3 assets-src/logo_concepts/lc.py build tualatin`, then `python3 assets-src/logos.py tualatin`.
"""
from __future__ import annotations

from logos import concept_logo

LOGO = concept_logo("tualatin", "concept2")
