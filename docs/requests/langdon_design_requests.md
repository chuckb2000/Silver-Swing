# Langdon Farms Golf Club: requests to the design chat

From the Langdon Farms course chat, 2026-10-19. The course plays without any
game change; the logo for `langdon` already exists.

## 1. The Playwright smoke tests assume Oswego Lake is on the first page of Oregon

**What:** `tests/e2e/smoke.spec.ts` ("title -> new round -> play hole 1 to the
cup" and "the menu button quits a round for good") tap "oregon", then wait for
the text "oswego lake country club". The course screen lists a state's
courses alphabetically, three to a page at the test's 1280 x 720 viewport.
With Langdon Farms, Oregon has seven courses and page 1 is Eastmoreland,
Langdon Farms, Oregon Golf Club; Oswego Lake is on page 2, so both tests
time out on that tap. Every other check in them never runs.

**Why:** any new Oregon course whose name sorts before "Oswego" (and any
course added to a state the tests use) moves the course off the first page.

**Smallest change:** in the two tests, after tapping the state, tap the
right-arrow page button until "oswego lake country club" is on screen (or
start the course with the scene's `choose('oswego_lake')`, as the course
chats' screenshot scripts do). No game code changes.

**Status:** with Langdon Farms merged, `npm run e2e` fails these two tests;
the other two pass. Unit tests (396) pass.
