"""Cyprian Keyes Golf Club logo: The Deacon's Key. An old hand-forged brass key, its bow set with a golf ball,
for the Keyes family whose homestead (1734) stood where the clubhouse is now: Deacon Cyprian Keyes, a founder,
selectman and town clerk of Boylston. Drawn as SVG in assets-src/logo_concepts/cyprian_keyes/concept1.src.svg
(house style). Facts and sources: logo_concepts/cyprian_keyes/notes.json. An original drawing; never the club's
own logo or trademark (CLAUDE.md 14).

    python3 assets-src/logo_concepts/lc.py build cyprian_keyes && python3 assets-src/logos.py cyprian_keyes
"""
from logos import concept_logo

LOGO = concept_logo("cyprian_keyes", "concept1")
