# Alexander — Overview

> An idle civilization-building survival simulation where settlers autonomously gather resources, build a community, and defend against nighttime threats.

**Current version:** v0.2
Last updated: April 3, 2026 (Central Time)

---

## File Map

| File | Purpose |
|------|---------|
| `index.html` | Pure HTML shell. Loads all CSS/JS, contains HUD overlay, main menu, in-game menu, settler info panel DOM structure. No inline styles or scripts. |
| `css/base.css` | CSS variables (colors, fonts, spacing, borders), reset, base body styles, shared button/input/label components, `.hidden` utility. |
| `css/hud.css` | HUD overlay positioning, resource bar, population/day display, menu button, action panel, settler info panel with stat bars. |
| `css/menus.css` | Main menu layout (title, username input, new/continue buttons), in-game menu overlay with resume/settings/exit options. |
| `js/constants.js` | Game config: tile size (64px), world size (80×60), tile type enum, nature object types, harvestable definitions, resource types, camera limits, day/night timing, settler names/personalities/base stats, AI priority values, building definitions, crafting recipes, enemy definitions, save config. Global namespace `window.AX` defined here. |
| `js/state.js` | Global mutable state object `_state`: game meta (username, day, phase), tile map array, nature objects, settlers, buildings, resources, enemies, inventory, camera/UI state. |
| `js/utils.js` | Pure helpers: `randInt`, `randFloat`, `randPick`, `shuffle`, `clamp`, `dist`, `tileToWorld`, `worldToTile`, `inBounds`, `isWalkable`, `makeNoise` (Perlin-like value noise generator), `uid`. |
| `js/world.js` | Procedural map generation using layered noise. Creates tile map with grass/dirt/water terrain distribution. Places nature objects (trees, rocks, iron ore, berry bushes, shrubs) with clustering via noise. Clears a starting area at map center. Ensures minimum nearby resources. |
| `js/pathfinding.js` | EasyStar.js integration. `initPathfinding()` builds walkability grid from tile map. `findPath()` returns synchronous A* path. `findNearestWalkable()` for fallback targeting. |
| `js/characters.js` | Settler creation with randomized names, gender, personality, and stats. `spawnStartingSettlers()` places 3–5 settlers near map center. `updateSettlers()` runs per-frame: hunger drain, health regen/damage, AI decisions, path movement. Priority-based AI: EAT (hunger < 30) → GATHER (lowest resource) → IDLE (wander). Settlers harvest nature objects over time and deposit resources into stockpile. |
| `js/buildings.js` | Stub — Phase 3. |
| `js/crafting.js` | Stub — Phase 3. |
| `js/resources.js` | Resource gathering system. `findNearestResource()` and `findNearestAnyResource()` locate harvestable nature objects. `harvestObject()` drains object HP over time and adds resources to stockpile on depletion. `updateNatureObjects()` handles regrowth of depleted trees and berry bushes. |
| `js/enemies.js` | Stub — Phase 5. |
| `js/combat.js` | Stub — Phase 5. |
| `js/dayNight.js` | Stub — Phase 4. |
| `js/audio.js` | Stub — Phase 7. |
| `js/camera.js` | Stub — camera controls are in GameScene for now. |
| `js/playerActions.js` | Stub — Phase 8. |
| `js/save.js` | Stub — Phase 9. |
| `js/ui.js` | HUD update (`updateHUD` syncs resource/population counts), settler info panel show/hide, main menu show/hide, in-game menu toggle, action panel toggle. |
| `js/events.js` | All DOM event listeners: main menu username input/buttons, HUD menu button, in-game menu buttons, action panel toggle, settler info close, Escape key handler. |
| `js/init.js` | Phaser game config and scene definitions. `BootScene` (asset loading placeholder), `GameScene` (tile rendering, nature object rendering, settler sprite creation, camera drag/zoom/edge-scroll, settler click selection, per-frame update loop). `startNewGame()` and `stopGame()` lifecycle. `bootApp()` entry point wires events and shows main menu. |

---

## Systems Overview

### World Generation
**Lives in:** `world.js`
**What it does:** Generates an 80×60 tile map using layered Perlin-like noise for terrain (grass/dirt/water) and places nature objects (trees, rocks, bushes, iron ore) with density controlled by separate noise layers. Ensures a clear starting area at map center with minimum nearby resources.
**Connects to:** `constants.js` (tile types, nature types), `utils.js` (noise, random), `state.js` (stores map data)
**Key functions:** `generateWorld(seed)`, `placeNatureObject()`, `getNatureAt()`, `ensureNearbyResources()`

### Pathfinding
**Lives in:** `pathfinding.js`
**What it does:** Wraps EasyStar.js to provide synchronous A* pathfinding on the tile grid. Builds a walkability grid from the tile map at init.
**Connects to:** `state.js` (tile map), `constants.js` (walkable tile set)
**Key functions:** `initPathfinding()`, `findPath()`, `findNearestWalkable()`

### Settlers
**Lives in:** `characters.js`
**What it does:** Creates settlers with unique names, gender, personality traits, and stats. Manages per-frame updates: hunger drain, health regen, AI decisions, path-following movement. Priority-based AI evaluates every ~1-2 seconds: EAT when hungry (stockpile or forage), GATHER the most-needed resource, or IDLE wander. Settlers path to nature objects, harvest them over time, and deposit resources into the community stockpile.
**Connects to:** `pathfinding.js` (path requests), `resources.js` (finding/harvesting nature objects), `constants.js` (names, personalities, stats), `state.js` (settler array, resource counts)
**Key functions:** `createSettler()`, `spawnStartingSettlers()`, `updateSettlers()`, `updateSettlerAI()`, `handleGathering()`, `handleForaging()`, `moveSettlerAlongPath()`

### Resource Gathering
**Lives in:** `resources.js`
**What it does:** Provides resource search and harvesting logic. Finds nearest harvestable nature objects by resource type or by most-needed resource. Harvests objects over time based on settler strength and tool power. Manages nature object depletion and regrowth timers.
**Connects to:** `state.js` (nature objects, resource counts), `constants.js` (HARVESTABLE definitions)
**Key functions:** `findNearestResource()`, `findNearestAnyResource()`, `harvestObject()`, `updateNatureObjects()`

### Rendering
**Lives in:** `init.js` (GameScene class)
**What it does:** Renders tiles as colored rectangles, nature objects as colored circles with detail (berries, trunks), settlers as colored shapes with name labels. Handles camera drag-to-pan, scroll-to-zoom, edge scrolling, and click-to-select settlers.
**Connects to:** All data systems via `_state`
**Key functions:** `renderTileMap()`, `renderNatureObjects()`, `createSettlerSprites()`, `updateSettlerSprites()`, `handleMapClick()`, `handleEdgeScroll()`

### UI
**Lives in:** `ui.js`, `events.js`
**What it does:** Updates HUD resource counts, manages settler info panel, toggles menus and action panel.
**Connects to:** `state.js` (reads data for display), `characters.js` (settler lookup)
**Key functions:** `updateHUD()`, `showSettlerInfo()`, `hideSettlerInfo()`, `toggleGameMenu()`, `toggleActionPanel()`

---

## Script Load Order

```
constants.js → state.js → utils.js → world.js → pathfinding.js →
characters.js → buildings.js → crafting.js → resources.js →
enemies.js → combat.js → dayNight.js → audio.js → camera.js →
playerActions.js → save.js → ui.js → events.js → init.js
```

---

## Naming Conventions

- CSS classes: `kebab-case` (`.hud-resource`, `.menu-btn`)
- CSS variables: `--kebab-case` (`--bg-dark`, `--green-primary`)
- HTML IDs: `camelCase` (`hudWood`, `settlerName`)
- JS variables: `camelCase`, constants: `SCREAMING_SNAKE`
- JS functions: `camelCase` with verb prefix (`createSettler`, `renderTileMap`)
- JS/CSS files: `camelCase` (`dayNight.js`, `playerActions.js`)
- Global namespace: `window.AX`

---

## Notes

- Uses colored shapes as placeholder graphics. AI-generated spritesheet assets exist in `assets/sprites/` but need to be sliced into individual frames before use.
- EasyStar.js runs in synchronous mode — no async path callbacks needed.
- Depleted nature objects show visual changes: trees become stumps, rocks/iron hide, berry bushes lose berries. Regrowable objects restore after their timer.
- All Phaser visual objects are created in GameScene. Data systems manage state only.
- The project follows the same session workflow as Tech Warrior Online (read CLAUDE.md → OVERVIEW.md → work → update OVERVIEW.md → increment version).
