# Alexander — CLAUDE.md

## What This File Is

This file defines the architecture rules, hard constraints, naming conventions, and code
style for the Alexander project. Read this FIRST at the start of every session before
touching any code.

---

## Section 1 — Project Overview

Alexander is a browser-based idle civilization-building survival simulation built with
Phaser 3.60.0. Players watch settlers autonomously gather resources, build structures,
and defend against nighttime enemies. The player can observe or provide gentle assistance
(dropping resources) but cannot directly control settlers.

**Engine:** Phaser 3.60.0
**Pathfinding:** EasyStar.js 0.4.4
**Backend:** Supabase (save/load)
**Structure:** Multi-file vanilla JS, no module system

---

## Section 2 — Architecture Rules

1. **`_state` — mutate properties, never reassign.** `_state` is the global state object.
   Always modify individual properties (`_state.settlers.push(...)`) — never do
   `_state = {...}` or replace the whole object.

2. **Script load order matters.** All files share globals via `window`. Each file can
   only use globals defined by files loaded before it. Load order is defined in
   `index.html` and documented in OVERVIEW.md.

3. **Global namespace: `window.AX`** — Each system file exposes its public API via
   `window.AX.systemName = { ... }`. Internal functions stay as plain declarations.

4. **Phaser scene reference.** The active GameScene is the only place Phaser objects
   (sprites, graphics, containers) should be created. Systems like `characters.js`
   manage data; the scene manages visuals.

5. **Tile coordinates vs world coordinates.** Tile = `{ col, row }` integers.
   World = `{ x, y }` pixel positions. Use `tileToWorld()` and `worldToTile()` to convert.
   Never mix them.

6. **State is the source of truth.** Phaser sprites are visual representations of state
   data. Always update `_state` first, then sync visuals. Never store game logic data
   on Phaser objects.

7. **Pathfinding is synchronous.** EasyStar is configured with `enableSync()`. Calls to
   `findPath()` return immediately. No callback patterns needed.

8. **index.html is a pure shell.** No inline `<style>` or `<script>` blocks. All CSS in
   `css/` files, all JS in `js/` files.

9. **typeof guards on cross-file calls.** When calling a function defined in another file,
   use `if (typeof functionName === 'function')` guards to prevent load-order crashes
   during development.

---

## Section 3 — Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| CSS classes | `kebab-case` | `.hud-resource`, `.settler-info` |
| CSS variables | `--kebab-case` | `--bg-dark`, `--green-primary` |
| HTML element IDs | `camelCase` | `id="hudWood"`, `id="settlerName"` |
| JS variables | `camelCase` | `let currentPhase`, `let settlers` |
| JS constants | `SCREAMING_SNAKE` | `const TILE_SIZE`, `const WORLD_COLS` |
| JS constant objects | `PascalCase` or `SCREAMING_SNAKE` | `const BUILDING_DEFS`, `const TILE` |
| JS functions | `camelCase` with verb prefix | `createSettler()`, `updateHUD()`, `renderTileMap()` |
| JS files | `camelCase.js` | `dayNight.js`, `playerActions.js` |
| CSS files | `camelCase.css` | `base.css`, `hud.css` |

---

## Section 4 — File Organization

See OVERVIEW.md for the current file map. The standard structure is:

```
alexander/
├── index.html          ← Pure shell
├── CLAUDE.md           ← This file (rules)
├── OVERVIEW.md         ← Living project map
├── css/                ← Stylesheets
├── js/                 ← All game logic
└── assets/             ← Sprites, audio, UI
```

JS load order:
```
constants → state → utils → world → pathfinding →
characters → buildings → crafting → resources →
enemies → combat → dayNight → audio → camera →
playerActions → save → ui → events → init
```

---

## Section 5 — DO NOT List

1. **Do NOT reassign `_state`** — only mutate its properties
2. **Do NOT put inline styles or scripts in index.html**
3. **Do NOT store game logic on Phaser sprite objects** — state is in `_state`
4. **Do NOT create Phaser objects outside of Scene classes**
5. **Do NOT mix tile coords and world coords without conversion**
6. **Do NOT create a CHANGELOG.md** — this project does not use one
7. **Do NOT add cache-busting `?v=` on script/CSS tags**
8. **Do NOT use ES modules (import/export)** — this is a globals-based multi-file project

---

## Section 6 — Version Tracking

- Version lives in `GAME_VERSION` constant in `js/constants.js` — the ONLY place
- Format: `v0.1, v0.2 ... v1.0 ...` — increment every code-changing session
- Display in main menu via `#mainMenuVersion` element
- Do NOT put version numbers in OVERVIEW.md beyond the "Current version" line
