# Silver Swings Golf - one command per job (see CLAUDE.md section 12)
NAME ?= oswego_lake
NAMES ?=
ARGS ?=
PY   ?= python3

.PHONY: dev build test e2e course fetch regress lists assets music cards all clean-course pins

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

music:          ## make the game's music again (about 15 min on two cores) -> game/public/music
	$(PY) assets-src/music/build_music.py

fetch:          ## put a course's build inputs that aren't in git (lidar, big DEMs) into data/$(NAME)/raw/
	$(PY) pipeline/fetch_raw.py $(NAME)

regress:        ## rebuild every course (or NAMES="a b") and check its committed files came out the same
	$(PY) pipeline/regress.py $(NAMES)

lists:          ## make the game's course lists (courses/index.json, sprites/title/index.json)
	cd game && node scripts/course-lists.mjs

course: fetch   ## rebuild one course from raw/ (+ edited/) -> game/public/courses/$(NAME), with its pinned pipeline (pipeline/pins.py); ARGS="--from s06_holes" etc.
	$(PY) pipeline/build.py $(NAME) $(ARGS)

pins:           ## which pipeline each course is pinned to
	$(PY) pipeline/pins.py status

all: assets course build test

clean-course:
	rm -rf data/$(NAME)/build game/public/courses/$(NAME)

cards:          ## course-select art: logos and a card per course (after `make course`)
	$(PY) assets-src/logos.py
	$(PY) assets-src/course_cards.py
