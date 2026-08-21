# Timor-Leste Suco Map Quiz

Live at **https://andrewlkline.github.io/tl-suco-map-quiz/**
Repo: **https://github.com/andrewlkline/tl-suco-map-quiz**

A JetPunk-style geography quiz for every administrative division of
Timor-Leste — 442 sucos (villages), 65 administrative posts, and 13
municipalities. Click the map or type the names; supports English,
Portuguese, and Tetun.

This file is written so a fresh Claude session (or a human who wasn't
here for the original build) can pick up work with no prior context.
Read this before making changes — several design decisions below are
non-obvious and easy to accidentally undo.

## Stack

Static site, **no build step, no framework**. Plain HTML/CSS/JS +
[D3](https://d3js.org/) (geo projection/rendering) loaded from a CDN,
plus the Firebase JS SDK (compat build, also from CDN) for the
leaderboard. Deploys to GitHub Pages directly from `main` — there is
no CI, no bundler, nothing to compile. Editing a file and pushing is
the entire deploy process.

## Running it locally

```bash
cd tl-map-game
python3 -m http.server 8934
```

Then open `http://localhost:8934/index.html`.

### ⚠️ Browser caching gotcha (read this before you debug a "my fix isn't working" mystery)

Whatever browser tooling you're testing with (this was hit repeatedly
with the Claude Code browser tool in the original build session) tends
to aggressively cache `index.html`, `app.js`, and `style.css` — to the
point that editing a file, restarting the server, and even doing a
"fresh" navigation can still serve stale content, sometimes across
*multiple* reload attempts. This produced a lot of false "why isn't my
change showing up" confusion during development. If a change doesn't
seem to be taking effect:

1. Navigate with a cache-busting query string on the **document itself**, e.g. `index.html?v=<random>` — busts the HTML but not necessarily the linked JS/CSS.
2. If that's not enough, in the browser console replace the stylesheet/script link element entirely rather than mutating its `href`/`src`:
   ```js
   const old = document.querySelector('link[href*="style.css"]');
   const fresh = document.createElement('link');
   fresh.rel = 'stylesheet';
   fresh.href = 'css/style.css?fresh=' + Date.now();
   document.head.appendChild(fresh);
   old.remove();
   ```
3. For JS, don't re-inject a `<script>` tag into an already-loaded page — top-level `const`/`let` redeclaration throws and silently aborts the whole script. Do a real navigation instead.
4. Verify the *server* is actually serving your edit before chasing a phantom bug: `curl -s http://localhost:PORT/js/app.js | grep yourNewCode`.

This is a testing-tool artifact, not a real issue for actual site
visitors on GitHub Pages.

## File structure

```
index.html                  — all screens (markup only; text is filled in by js/i18n.js)
css/style.css                — everything, incl. light/dark theme variables
js/app.js                    — quiz engine, rendering, all UI logic
js/i18n.js                   — translation dictionaries + t()/tCount() helpers
js/leaderboard.js            — thin Firestore wrapper, self-disables if unconfigured
js/firebase-config.js        — Firebase project keys (safe to be public; see below)
data/*.geojson                — generated map data (committed, don't hand-edit)
scripts/convert_shapefiles.py — regenerates data/*.geojson from the raw shapefile
firestore.rules              — reference copy of the security rules (paste into Firebase Console manually; nothing auto-deploys this)
tls_admin_boundaries.shp.zip / shapefile_raw/ — gitignored, source shapefile (OCHA COD-AB, ~2020 vintage)
```

## Data pipeline

The map data comes from a UN OCHA administrative-boundary shapefile
(`tls_admin_boundaries.shp.zip`, gitignored — unzip it to
`shapefile_raw/` if you need to regenerate). `scripts/convert_shapefiles.py`
converts `admin1`/`admin2`/`admin3` shapefile layers into
`data/municipalities.geojson` / `data/admin_posts.geojson` /
`data/sucos.geojson`, simplifying geometry and computing a
`representative_point()` (guaranteed inside the polygon, unlike a
centroid) for each feature.

**The dataset predates the 2022 restructuring** — Atauro wasn't yet
its own municipality (still part of Dili) and Baucau's Quelicai
Administrative Post hadn't yet split into Quelicai Antigo and
Matebian. This is disclosed to players via the disclaimer text on the
home screen (`data-i18n="disclaimer"`).

### Known shapefile misspellings

The source shapefile has several genuine spelling errors (confirmed by
the user, who has fieldwork-based knowledge of these places). These
are fixed via a small pcode-keyed table, **not** by editing the
shapefile:

```python
# scripts/convert_shapefiles.py
NAME_CORRECTIONS = {
    "TL030107": "Gariuai",   # shapefile has "Fariuai"
    "TL030608": "Uatuhaco",  # shapefile has "Uataco"
    "TL030604": "Uai Oli",   # shapefile has "Uaiolo"
    "TL0503": "Fohorem",     # shapefile has "Forohem"
}
```

**To add another correction:** find the feature's pcode (e.g. `python3 -c "import json; d=json.load(open('data/sucos.geojson')); [print(f['properties']) for f in d['features'] if 'searchterm' in f['properties']['name'].lower()]"`), add a line to `NAME_CORRECTIONS`, then regenerate:

```bash
python3 scripts/convert_shapefiles.py
```

This rewrites all three `data/*.geojson` files (the correction cascades into any suco/post that cross-references the corrected name via `post_name`/`muni_name`). Commit and push the regenerated files.

You do **not** need to also register the old/wrong spelling anywhere — the typing-mode fuzzy matcher (see below) almost always accepts it automatically as a near-miss of the corrected name. Verify this after adding a correction (see "Testing checklist" below).

## Quiz engine (`js/app.js`)

### Modes

Four scopes, wired in `wireUI()`:
- **Easy: Municipalities** (`btn-easy`) — 13 items, flat (no sub-grouping — there's nothing beneath municipality to group by).
- **Whole Country** (`btn-country`) — 442 sucos, groupable by admin post.
- **Administrative Posts** (`btn-posts`) — 65 posts, groupable by municipality.
- **By Municipality** (`btn-muni-picker` → picker screen → `startMunicipalityQuiz()`) — sucos within one municipality, **always** grouped by admin post regardless of answer mode.

Each of the two answer modes (click / type, `currentAnswerMode`) can be
toggled independently of scope.

### Grouping model

Every quiz — even the "flat" ones — is internally represented as
`game.groupQueue`, an array of `{ label, ids: [...], total }`. A truly
flat quiz (Whole Country / Administrative Posts in **click** mode) is
just a group queue with a single group covering everything; this means
`markFound()`, skip logic, etc. don't need separate flat/grouped code
paths — see the comment block above `startQuiz()` in `app.js` for the
full rationale (`game.flatSkipStyle` is the one place behavior
actually forks: flat mode's Skip reveals just the current single
target, grouped mode's Skip defers the rest of the group to the back
of the queue, force-revealing on a second skip via `game.deferredIds`
to guarantee termination).

Grouping is active when: `forceGroup` is set on the quiz config (always true for By Municipality), OR the current answer mode is `"type"` (typing mode is always grouped, everywhere, so you type all the sucos in one admin post before moving to the next — this was a specific, deliberate request, not a default).

### Typing-mode matching (`normalizeName` / `canonicalKey` / `exactMatchInGroup` / `findMatchInGroup`)

This went through several iterations based on user feedback — read the
inline comments in `app.js` around these functions, they explain the
reasoning in detail. Summary:

- **`normalizeName`**: strips diacritics, lowercases, treats hyphens as spaces.
- **`canonicalKey`**: layered on top — treats **c/k**, **ua/wa**, and **u/o after a consonant** as interchangeable, and removes all spaces. This encodes systematic Tetum/Portuguese spelling variation the user specified explicitly, not just "close enough" fuzzy matching.
- **Live "as you type" auto-accept** (`exactMatchInGroup`, no Enter needed) only fires on an exact literal match OR a `canonicalKey` match — i.e. only on the systematic-rule variants. This is deliberate: applying full fuzzy (Levenshtein) matching on every keystroke was tried and reverted (see commit `28ad5bf`) because a still-incomplete word could look like a fuzzy match to some *unrelated* candidate before the player finished typing.
- **Enter-triggered submit** (`findMatchInGroup`) additionally falls back to Levenshtein distance on top of the canonical key, for genuine typos/alternate spellings beyond the systematic rules (threshold scales with word length — see `fuzzyThreshold()`).
- Sucos/posts with an official dual name joined by `/` (e.g. "Barique/Natarbora") have both halves registered as valid answers via `nameVariants()`.

**Before changing anything in this area**, re-run the collision sweep
that was used to validate it — it generates every possible variant of
every single name under all the rules and confirms (a) each one
resolves to the right answer and (b) nothing collides with a
*different* name in the same group. See the git log around commit
`b02c7b1` for the exact test methodology (it was run live in a browser
console against the loaded dataset, not as a committed test file —
there is no automated test suite for this project).

### Scoring / found states

Three visual states per shape (map fill *and* checklist row):
- **found** (green) — correct on the first attempt.
- **found-retry** (yellow/orange) — eventually correct, but had at least one wrong guess first. Determined by checking `game.missedIds.has(id)` at the moment of success (see `markFound()`). This was a deliberate fix (commit `eae198b`) — it used to always show green.
- **missed** (terracotta/red) — never answered correctly; revealed via Skip or Give Up.

`game.missedIds` is also what drives "first-try accuracy" — it's
populated on any wrong click (click mode) or forced reveal, but
**not** by a wrong Enter-submission in type mode (there's no way to
attribute a wrong free-text guess to a specific intended target, so
type-mode wrong guesses only bump the visible miss counter, they don't
affect accuracy%).

The end-screen "Correct" stat is `total − missedIds.size`, **not**
`foundIds.size` — `foundIds` includes forced reveals too, so it's
always equal to `total` at quiz end and was a confusing thing to show
as "Found" (fixed in commit `cc00622`).

### Answers checklist panel

Jetpunk-style: every target in the quiz, grouped and alphabetized,
starts blank and fills in as resolved (`buildAnswersPanel()` /
`fillAnswerRow()`). This replaced an earlier approach that drew names
directly on the map shapes — that looked messy and was reverted
same-session (commits `2855d72` region).

## Personal bests & Leaderboard

- **Personal bests**: `localStorage`, keyed by `tlq_pb_${title}_${answerMode}` where `title` is the *stable* mode key (see below).
- **Leaderboard**: Firestore, via `js/leaderboard.js`. Gracefully disables itself (`Leaderboard.isAvailable()` returns false, submit UI hides, leaderboard screen shows a "not set up" message) if `window.FIREBASE_CONFIG` is `null` — it currently is **not** null, a real Firebase project (`tl-map-game`) is wired up and live with real player data in it.
- **Security model**: `firestore.rules` (paste into Firebase Console → Firestore → Rules manually, nothing automates this) — public read, validated create (checks field shapes/ranges), **no update or delete** from the client at all. There is no auth; abuse resistance relies entirely on the create-time validation.

### Important: stable mode keys vs. translated display titles

`game.title` (e.g. `"Whole Country"`, `"Administrative Posts"`,
`"Municipalities"`, `"${muniName} sucos"`) is used as the Firestore
`modeKey` **and** the personal-best localStorage key **and** the
`<option value>` in the leaderboard mode-select. **It is always
English and is never translated**, on purpose — this is what makes
existing leaderboard/personal-best data survive a UI language switch
without fragmenting. The *displayed* title (end-screen heading,
leaderboard dropdown text) is derived separately via
`displayModeTitle(modeKey)`, which translates for display without
touching the stable key. **Do not** make `game.title` translation-aware
directly — that would silently orphan all existing leaderboard entries
and personal bests. If you add a new quiz scope, give it a stable
English title/modeKey and add the corresponding translation branch to
`displayModeTitle()`.

## Theming (light/dark)

CSS custom properties in `:root` (light, default palette — matches the
user's academic site's "earthy" theme: cream/tan background, rust
accent) and `[data-theme="dark"]` (a warm brown-black dark variant,
*not* generic navy — deliberately chosen to match the earthy brand
rather than a generic dev-tool dark mode). **Dark is the default** for
new visitors (commit `b2fd37a`); an inline script in `<head>` applies
`data-theme="dark"` before first paint to avoid a flash of the wrong
theme. The logic is "dark unless `localStorage.tlq_colorScheme` is
explicitly `'light'`" — i.e. dark is the fallback for both first-time
visitors and any unexpected/missing value. Toggle buttons
(`.theme-toggle-btn`, plural — one on the home screen, one in the game
topbar) all stay in sync via `setColorScheme()`.

## Internationalization (EN / PT / TET)

`js/i18n.js` holds `I18N.en` / `I18N.pt` / `I18N.tet`, each a flat
key→string dictionary covering every piece of UI chrome. **Place
names (suco/admin-post/municipality) are proper nouns and are never
translated in any language** — only the surrounding interface text.

- `t(key, params)` — looks up `key` in the current language, falling back to English if missing (so an incomplete `tet` entry never shows blank). `{placeholder}` tokens in the string get substituted from `params`.
- `tCount(baseKey, n)` — picks `${baseKey}_one` or `${baseKey}_other` (only used for the miss counter).
- `applyStaticTranslations()` — walks `[data-i18n]` / `[data-i18n-placeholder]` / `[data-i18n-title]` elements in the DOM and fills them in. Called on load and again on every language switch.
- Dynamic strings (toasts, prompts, stat labels assembled at runtime) call `t()` directly in `app.js` rather than using data attributes.
- Language toggle buttons: `.lang-toggle-btn[data-lang="en|pt|tet"]`, present on the home screen and in the game topbar (same shared-class pattern as the theme toggle). `setLanguage()` re-applies translations to whatever screen is currently active, including mid-quiz dynamic text (placeholder, skip button, context badge) and end/leaderboard screens if visible.
- Preference persists via `localStorage.tlq_lang`.

**Status**: EN and PT are complete. TET was filled in by the user
directly in `js/i18n.js` (they're a Timor-Leste linguistics
researcher — this is their area of expertise) but **four keys are
still English placeholders**, confirmed still outstanding as of the
last session:
- `resetView` ("Reset View")
- `resetZoomTooltip` ("Reset zoom")
- `statAccuracy` ("First-try accuracy")
- `pbExisting` — mostly translated but has a stray English `" in "` where the rest of the string is Tetun (should presumably be `"iha"`, matching the pattern used in `pbNew`)

If asked to help finish these, edit the values (not the keys) in the
`tet` block of `js/i18n.js` directly — do **not** invent Tetun
translations yourself unless explicitly asked to; the user has
specifically wanted to do this translation personally. Preserve any
`{placeholder}` tokens exactly.

## Mobile layout notes

Two real bugs were found and fixed while testing, both worth knowing about if you touch layout CSS:

1. **Flexbox "unsafe" centering swallows overflow.** `#screen-home`, `#screen-end`, `#screen-leaderboard` all center their content with flexbox. When content is taller than the viewport (common on mobile with the disclaimer + 4 mode cards, or a long missed-list), default ("unsafe") centering can render the *start* of the content above `scrollTop: 0` — i.e., genuinely unreachable by scrolling, not just requiring a scroll. Fixed by using `align-items: safe center` (note: these screens default to flex-direction `row`, so it's `align-items` controlling the vertical axis here, not `justify-content` — easy to fix the wrong property, which happened once during debugging). If you add a new full-screen centered section, use `safe center` from the start.
2. **`.game-actions` needed its own `flex-wrap`.** The outer `.game-topbar` already wraps, but the nested `.game-actions` button group (Skip / Give Up / Reset View / theme toggle / language toggle) didn't wrap *within itself*, so on narrow viewports the language toggle could render fully off-screen to the right instead of dropping to a new line.

## Testing checklist (no automated tests — do this manually)

There's no test suite. When making changes, the pattern used throughout development was: make the edit, serve locally, then drive the app via `mcp__Claude_Browser__javascript_tool` (dispatch real click/input events, don't just call internal functions directly — that's what caught the `handleMapClick` hardcoded-class bug in commit `eae198b`) for:
1. A full click-through of Whole Country (442 sucos) — `while (game.groupQueue.length > 0) { click the front id }` — confirms `ended: true, found: 442, total: 442` with no thrown errors.
2. Same for at least one grouped municipality quiz, in both click and type mode.
3. If you touched matching logic: rebuild `featuresById`/`nameVariantsCache` fresh (clear the cache object) and sweep every name in the dataset against its own group for false positives — see commit `b02c7b1`'s description for the exact loop.
4. If you touched i18n: switch through all three languages on at least the home screen, a live quiz, the end screen, and the leaderboard screen; confirm place names never translate and the leaderboard's stable `<option value>` doesn't change across languages.
5. Resize to a mobile preset and check nothing overflows/hides (see the two bugs above).
6. Remember the caching gotcha at the top of this file before concluding something is broken.

## Deployment

Plain `git push` to `main` — GitHub Pages serves directly from the
repo root, no Actions workflow. After pushing, the Pages build usually
takes 1–3 minutes; poll with:

```bash
gh api repos/andrewlkline/tl-suco-map-quiz/pages/builds/latest --jq '.status'
```

## Related project

The user also has an academic site (repo `andrewlkline.github.io`,
local checkout at `~/Documents/04_Personal/website2`) whose "earthy"
theme this quiz's light mode deliberately matches. Note the local
folder name doesn't match the repo name — its `origin` remote was
originally stale (pointed at a renamed/nonexistent `phd_page` repo)
and was repointed to the correct URL during this project's work; it's
correct now (`git remote -v` → `andrewlkline/andrewlkline.github.io`),
but it's a good sanity check if you ever work in that folder. That
site is otherwise unrelated to this one — don't confuse the two repos.
