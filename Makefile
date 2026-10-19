# Local Golf - one command per job (see CLAUDE.md section 12)
NAME ?= oswego_lake
PY   ?= python3

.PHONY: dev build test e2e course assets all clean-course

dev:            ## run the game locally (Vite dev server)
	cd game && npm run dev

build:          ## type-check and build the static site into game/dist
	cd game && npm run build

test:           ## unit tests (physics calibration, swing, rules)
	cd game && npm test

e2e:            ## Playwright smoke test (builds first)
	cd game && npm run build && npm run e2e

assets:         ## regenerate sprites, UI art and the bitmap font
	$(PY) assets-src/build_assets.py

course:         ## rebuild one course from raw/ (+ edited/) -> game/public/courses/$(NAME)
	cd pipeline && \
	$(PY) s01_osm.py $(NAME) && \
	$(PY) s02_reproject.py $(NAME) && \
	$(PY) s03_audit.py $(NAME) && \
	$(PY) s04_elevation.py $(NAME) && \
	$(PY) s05_trees.py $(NAME) && \
	$(PY) s06_holes.py $(NAME) && \
	$(PY) s07_greens.py $(NAME) && \
	$(PY) s08_surface.py $(NAME) && \
	$(PY) s09_render.py $(NAME) && \
	$(PY) s09b_green_views.py $(NAME) && \
	$(PY) s10_export.py $(NAME)

all: assets course build test

clean-course:
	rm -rf data/$(NAME)/build game/public/courses/$(NAME)
