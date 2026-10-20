# Course logos drawn by course chats

One file per course, named by the course id (`<id>.py`, the same id as
`game/public/courses/<id>/`). It defines `LOGO = (draw, colours)`, where
`draw(colours)` returns a 32 x 32 RGBA numpy array, built with the helpers in
`assets-src/logos.py`:

```python
import math
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, ring_of, seg, shade


def badge(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    ...
    return outlined(img, c["edge"])


LOGO = (badge, {"fill": rgba("#2f6fd1"), "edge": EDGE})
```

Then `python3 assets-src/logos.py <id>` writes
`game/public/sprites/logos/<id>.png`; commit both. Rules (CLAUDE.md 14): an
original drawing, never the club's own logo or trademark; light from the upper
left; a dark 1 px outline; readable at 32 px (look at it at 1x, not only
enlarged).
