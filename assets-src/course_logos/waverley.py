"""Waverley Country Club logo: "Along the Line", a trolley car on the line across the links,
chosen by the developer on 2026-10-25 (DECISIONS.md "Logos from the logo concepts"). The club's
Junior Clubhouse was the Trolley House, a stop on the interurban Ardgour line. It replaces the
locomotive in assets-src/logos.py LOGOS["waverley"], which stays there; a course's own file wins.

The drawing is assets-src/logo_concepts/waverley/trolley_c.src.svg; after changing it run
`python3 assets-src/logo_concepts/lc.py build waverley`, then `python3 assets-src/logos.py waverley`.
"""
from __future__ import annotations

from logos import concept_logo

LOGO = concept_logo("waverley", "trolley_c")
