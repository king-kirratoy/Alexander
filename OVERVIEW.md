# Alexander — Overview

> An idle civilization-building survival simulation where settlers autonomously gather resources, build a community, and defend against nighttime threats.

**Current version:** v0.9
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
| `js/state.js` | Global mutable state object `_state`: game meta (username, day, phase), tile map array, nature objects, settlers, buildings, resources, enemies, inventory, camera/UI state, population growth (birthCooldown, notifications). |
| `js/utils.js` | Pure helpers: `randInt`, `randFloat`, `randPick`, `shuffle`, `clamp`, `dist`, `tileToWorld`, `worldToTile`, `inBounds`, `isWalkable`, `makeNoise` (Perlin-like value noise generator), `uid`. |
| `js/world.js` | Procedural map generation using layered noise. Creates tile map with grass/dirt/water terrain distribution. Places nature objects (trees, rocks, iron ore, berry bushes, shrubs) with clustering via noise. Clears a starting area at map center. Ensures minimum nearby resources. |
| `js/pathfinding.js` | EasyStar.js integration. `initPathfinding()` builds walkability grid from tile map. `findPath()` returns synchronous A* path. `findNearestWalkable()` for fallback targeting. |
| `js/characters.js` | Settler creation with randomized names, gender, personality, and stats. `spawnStartingSettlers()` places 3–5 settlers near map center. `updateSettlers()` runs per-frame: hunger drain, health regen/damage, AI decisions, path movement. Priority-based AI: FLEE → FIGHT → EAT → RESCUE → SLEEP → BUILD → GATHER → CRAFT → IDLE. Children (isChild) can only forage/eat/wander/sleep/flee. Population growth system: births every 3-5 day cycles when conditions met (2+ adults, shelter capacity, food >= 10). Children age each day and grow into adults at age 5. |
| `js/buildings.js` | Building creation, placement, and construction. `createBuilding()` adds buildings to state with phase tracking. `findBuildSite()` finds valid placement near existing buildings (clustering). `advanceBuild()` progresses construction through FOUNDATION → FRAME → WALLS → COMPLETE phases. `decideBuildPriority()` determines what to build next: campfire → storage → hut → workbench → more shelter → house (pop 8) → farm (pop 6) → forge (pop 6 + iron) → watchtower (pop 10) → additional shelter/farms as needed. Respects unlockPop and requires fields. |
| `js/crafting.js` | Crafting system with tiered recipes. `getAvailableRecipes()` filters by tier (BASIC always, WORKBENCH/FORGE require buildings). `craftItem()` deducts costs and adds items to inventory. `findBestTool()`/`findBestWeapon()` search inventory by power. `decideWhatToCraft()` prioritizes tools (axe → pickaxe) then weapons, then upgrades. |
| `js/resources.js` | Resource gathering system. `findNearestResource()` and `findNearestAnyResource()` locate harvestable nature objects. `harvestObject()` drains object HP over time and adds resources to stockpile on depletion. `updateNatureObjects()` handles regrowth of depleted trees and berry bushes. `updateFarms()` generates passive food from completed farms during daytime (0.05/sec per farm). |
| `js/enemies.js` | Enemy spawning and AI. `spawnEnemies()` spawns enemies at night edges, scaling with population. Enemy types unlock by day (zombie d1, skeleton d5, wolf d10). `updateEnemies()` handles pathfinding (2-3s cooldown), movement, and targeting. `despawnAllEnemies()` clears enemies at dawn. |
| `js/combat.js` | Combat system. `processSettlerAttack()` (1s cooldown, strength+weapon damage) and `processEnemyAttack()` (1.5s cooldown). `checkSettlerKnockout()` handles knockout (lives>1) vs permadeath (lives<=1). `processRescue()` revives knocked-out settlers over 3s. `updateCombat()` runs per-frame combat loop. `destroyBuilding()` removes buildings at 0 hp. |
| `js/dayNight.js` | Day/night cycle system. Tracks cycleTime and currentPhase (day/dusk/night/dawn). Calculates phase from cycle position using DAY_PHASE_RATIOS. Provides getDaylightTint() for overlay rendering and phase query helpers (isNight, isDusk, isDawn). |
| `js/audio.js` | Procedural audio system using Web Audio API. Master volume control, sound effect generation (14 effects: chop, mine, forage, build, craft, eat, hit, enemyDeath, settlerHurt, settlerDeath, buildComplete, birthChime, uiClick, notification), ambient sound layers (day/dusk/night/dawn) with crossfade transitions, throttle system for activity sounds. |
| `js/camera.js` | Follow-camera system. `initCamera()` stores scene reference. `toggleFollowCamera()` toggles follow mode for the selected settler. `updateFollowCamera()` smoothly lerps camera toward followed settler each frame. `stopFollowCamera()` cancels follow. Shows/hides a "Following [Name]" HUD indicator. Follow cancelled by: F key, clicking empty ground, dragging camera, settler death. |
| `js/playerActions.js` | Resource dropping system. `initPlayerActions()` stores scene reference. `startDropAction()` activates drop mode with crosshair cursor and button highlight. `executeDropAction()` places resources at clicked world position (10 wood/stone/food, 5 iron) with visual feedback and sound. `cancelDropAction()` resets state. Drop mode stays active for multiple drops; cancelled by Escape/right-click/panel close. Includes cursor tooltip. |
| `js/save.js` | Save/load system using Supabase REST API. `initSupabase()` checks config, `saveGame()`/`loadGame()` handle upsert/restore, `serializeState()`/`deserializeState()` convert game state to/from JSON-safe snapshots, `startAutosave()`/`stopAutosave()` manage 60-second auto-save timer, `checkForExistingSave()` queries for existing saves, `deleteSave()` removes saves. Gracefully disables when Supabase URL/key are unconfigured. |
| `js/ui.js` | HUD update (`updateHUD` syncs resource/population counts), settler info panel show/hide with real-time updates (equipped tool/weapon, child age progress, red heart styling), main menu show/hide, in-game menu toggle, action panel toggle. |
| `js/events.js` | All DOM event listeners: main menu username input/buttons (with debounced save lookup and Continue enable/disable), HUD menu button, in-game menu buttons (Save & Exit awaits save before quitting), action panel toggle, settler info close, Escape key handler. Initializes Supabase on load. |
| `js/init.js` | Phaser game config and scene definitions. `BootScene` (asset loading placeholder), `GameScene` (tile rendering, nature object rendering, settler sprite creation with child scaling at 60%, camera drag/zoom/edge-scroll, settler click selection, per-frame update loop, notification display system, minimap with click-to-navigate). Handles phase transitions including day-change events for population growth. Integrates player actions (drop mode) and follow camera. `GameScene.create()` detects loaded saves (skips world generation, renders from existing state). `startNewGame()` and `stopGame()` lifecycle (stopGame stops autosave). `bootApp()` entry point wires events and shows main menu. |

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
**What it does:** Creates settlers with unique names, gender, personality traits, and stats. Manages per-frame updates: hunger drain, health regen, AI decisions, path-following movement. Priority-based AI evaluates every ~1-2 seconds: EAT when hungry → BUILD structures → GATHER resources → CRAFT tools/weapons → IDLE wander. Children (isChild) have restricted AI: only forage/eat/wander/sleep/flee. Population growth system triggers births when 2+ adults, shelter capacity, and food >= 10. Children age each day and grow into adults at age 5 with full randomized stats.
**Connects to:** `pathfinding.js` (path requests), `resources.js` (finding/harvesting nature objects), `buildings.js` (build decisions, construction, shelter capacity), `crafting.js` (craft decisions, tool lookup), `constants.js` (names, personalities, stats), `state.js` (settler array, resource counts, birthCooldown, notifications)
**Key functions:** `createSettler()`, `spawnStartingSettlers()`, `updateSettlers()`, `updateSettlerAI()`, `handleGathering()`, `handleForaging()`, `handleBuilding()`, `handleCrafting()`, `tryBuild()`, `tryCraft()`, `autoEquipTool()`, `tryFight()`, `tryRescue()`, `handleFighting()`, `handleFleeing()`, `handleRescuing()`, `updatePopulationGrowth()`, `handleDayTransition()`, `updateChildGrowth()`, `tryForageChild()`

### Buildings
**Lives in:** `buildings.js`
**What it does:** Manages building creation, site selection, and construction progression. Buildings are placed near existing structures to form clusters. Construction advances through four phases (foundation, frame, walls, complete) based on settler work. Provides priority logic for autonomous settlement growth.
**Connects to:** `constants.js` (BUILDING_DEFS, BUILD_PHASE), `state.js` (buildings array, resources), `world.js` (getNatureAt for site validation), `utils.js` (random, distance)
**Key functions:** `createBuilding()`, `findBuildSite()`, `advanceBuild()`, `decideBuildPriority()`, `getBuildingAt()`, `getBuildingsOfType()`, `hasBuilding()`

### Crafting
**Lives in:** `crafting.js`
**What it does:** Manages tiered crafting recipes. Basic recipes are always available; workbench and forge tiers unlock when those buildings are complete. Settlers autonomously decide what to craft based on settlement needs (tools first, then weapons). Items are stored in shared inventory.
**Connects to:** `constants.js` (RECIPES, RECIPE_TIER), `state.js` (resources, inventory), `buildings.js` (hasBuilding for tier checks), `utils.js` (uid)
**Key functions:** `getAvailableRecipes()`, `canAffordRecipe()`, `craftItem()`, `findBestTool()`, `findBestWeapon()`, `decideWhatToCraft()`

### Resource Gathering
**Lives in:** `resources.js`
**What it does:** Provides resource search and harvesting logic. Finds nearest harvestable nature objects by resource type or by most-needed resource. Harvests objects over time based on settler strength and tool power. Manages nature object depletion and regrowth timers. Completed farms passively generate food during daytime.
**Connects to:** `state.js` (nature objects, resource counts), `constants.js` (HARVESTABLE definitions, BUILDING_DEFS), `buildings.js` (farm buildings), `dayNight.js` (daytime check)
**Key functions:** `findNearestResource()`, `findNearestAnyResource()`, `harvestObject()`, `updateNatureObjects()`, `updateFarms()`

### Enemies & Combat
**Lives in:** `enemies.js`, `combat.js`, `characters.js` (AI integration), `init.js` (rendering)
**What it does:** Enemies spawn at map edges when night begins, scaling with population. Types unlock progressively (zombie d1, skeleton d5, wolf d10). Enemies pathfind toward settlers/buildings and attack on contact. Armed settlers automatically engage; unarmed settlers flee. Settlers can be knocked out (lives > 1) or permanently die (lives <= 1). Adjacent settlers can rescue knocked-out allies over 3 seconds. Walls and buildings take damage and can be destroyed.
**Connects to:** `constants.js` (ENEMY_DEFS, ENEMY_TYPE, AI_PRIORITY), `state.js` (enemies array), `pathfinding.js` (path requests), `dayNight.js` (phase detection), `buildings.js` (wall targeting, building destruction), `crafting.js` (weapon lookup)
**Key functions:** `spawnEnemies()`, `updateEnemies()`, `despawnAllEnemies()`, `updateCombat()`, `processSettlerAttack()`, `processEnemyAttack()`, `checkSettlerKnockout()`, `processRescue()`, `tryFight()`, `tryFlee()`, `tryRescue()`

### Audio
**Lives in:** `audio.js`, integrated via `characters.js`, `combat.js`, `events.js`, `init.js`
**What it does:** Procedural audio system using Web Audio API (not Phaser audio). Generates all sounds programmatically using oscillators, noise buffers, and filters. Provides 14 sound effects for activities (chop, mine, forage, build, craft, eat), combat (hit, enemyDeath, settlerHurt, settlerDeath), events (buildComplete, birthChime), and UI (uiClick, notification). Four ambient sound layers (dayAmbient, nightAmbient, duskAmbient, dawnAmbient) crossfade on phase transitions. Activity sounds throttled to max once per second. Audio initializes on game start, respects browser autoplay policy via user-interaction resume.
**Connects to:** `constants.js` (DAY_PHASE), `init.js` (phase transitions trigger ambient layer changes, audio init on game start), `characters.js` (activity/birth sounds), `combat.js` (combat sounds), `events.js` (UI click sounds)
**Key functions:** `initAudio()`, `playSound()`, `setAmbientLayer()`, `toggleAudio()`, `setMasterVolume()`, `canPlaySound()`

### Day/Night Cycle
**Lives in:** `dayNight.js`, `init.js` (GameScene overlay/lighting), `characters.js` (sleep behavior)
**What it does:** Cycles through day (55%), dusk (10%), night (25%), and dawn (10%) phases over DAY_CYCLE_DURATION (12 minutes). Night overlay darkens the world with a semi-transparent tinted rectangle. Light sources (campfires, buildings) create soft glowing circles above the overlay. Settlers seek shelter and sleep during dusk/night; armed settlers patrol on guard duty. Sleeping reduces hunger drain by 75%.
**Connects to:** `constants.js` (DAY_PHASE, DAY_CYCLE_DURATION, DAY_PHASE_RATIOS), `state.js` (cycleTime, currentPhase, dayNumber), `buildings.js` (shelter capacity, occupants)
**Key functions:** `initDayNight()`, `updateDayNight()`, `getCurrentPhase()`, `getDaylightTint()`, `isNight()`, `trySleep()`, `handleSleeping()`, `wakeSettler()`

### Rendering
**Lives in:** `init.js` (GameScene class)
**What it does:** Renders tiles as colored rectangles, nature objects as colored circles with detail (berries, trunks), buildings as colored rectangles with opacity based on build phase, settlers as colored shapes with name/activity labels (children at 60% scale). Handles camera drag-to-pan, scroll-to-zoom, edge scrolling, and click-to-select settlers. Displays floating notifications (births, growth, deaths) at screen top with fade-out.
**Connects to:** All data systems via `_state`
**Key functions:** `renderTileMap()`, `renderNatureObjects()`, `renderBuildings()`, `createBuildingSprite()`, `updateBuildingSprites()`, `createSettlerSprites()`, `updateSettlerSprites()`, `createEnemySprite()`, `updateEnemySprites()`, `handlePhaseTransitions()`, `updateKnockoutIndicators()`, `showDeathNotification()`, `updateNotifications()`, `handleMapClick()`, `initMinimap()`, `updateMinimap()`, `updateMinimapViewport()`

### Player Actions
**Lives in:** `playerActions.js`, integrated via `events.js`, `init.js`
**What it does:** Allows the player to drop resources onto the map as a "god" ability. Clicking an action button enters drop mode (crosshair cursor, highlighted button, tooltip). Clicking on a walkable tile adds resources to the stockpile (10 wood/stone/food, 5 iron) with a visual fade-out indicator and notification sound. Drop mode persists for multiple drops; cancelled by Escape, right-click, or closing the action panel.
**Connects to:** `state.js` (activeAction, resources), `utils.js` (worldToTile, isWalkable), `audio.js` (notification sound)
**Key functions:** `initPlayerActions()`, `startDropAction()`, `executeDropAction()`, `cancelDropAction()`, `moveDropTooltip()`

### Follow Camera
**Lives in:** `camera.js`, integrated via `events.js`, `init.js`
**What it does:** Allows the player to follow a selected settler with the camera. Press F to toggle follow mode. Camera smoothly lerps toward the followed settler each frame. Follow is cancelled by pressing F again, clicking empty ground, dragging the camera, clicking the minimap, or if the settler dies.
**Connects to:** `state.js` (cameraFollowing, selectedSettler), `characters.js` (getSettlerById)
**Key functions:** `initCamera()`, `toggleFollowCamera()`, `stopFollowCamera()`, `updateFollowCamera()`

### Minimap
**Lives in:** `init.js` (GameScene methods)
**What it does:** Displays a 180×135 pixel minimap in the bottom-left corner showing terrain colors, building footprints, settler dots (green), and enemy dots (red, during night). A white rectangle indicates the current camera viewport. Updates content every 500ms; viewport rectangle updates every frame. Clicking on the minimap navigates the camera to that world position.
**Connects to:** `state.js` (tileMap, buildings, settlers, enemies), `constants.js` (tile/building colors, world size)
**Key functions:** `initMinimap()`, `updateMinimap()`, `updateMinimapViewport()`

### Save System
**Lives in:** `save.js`, integrated via `events.js`, `init.js`
**What it does:** Saves and loads game state using the Supabase REST API (no SDK dependency). `initSupabase()` checks if SUPABASE_URL and SUPABASE_KEY are configured; if not, disables save/load gracefully. `serializeState()` creates a JSON-safe snapshot of all persistent game data (tile map, nature objects, settlers, buildings, resources, inventory, day/night state). `deserializeState()` restores state from a snapshot, resetting transient properties (sprites, paths, AI cooldowns). Auto-save triggers every 60 seconds with a visual "Saving..." indicator. Save on exit via the in-game menu. Continue button on main menu is enabled when an existing save is found (debounced lookup on username input). Username-based lookup with no password — same pattern as Tech Warrior Online.
**Connects to:** `state.js` (all game state), `constants.js` (SUPABASE_URL, SUPABASE_KEY, AUTOSAVE_INTERVAL), `events.js` (menu integration), `init.js` (GameScene load detection)
**Key functions:** `initSupabase()`, `checkForExistingSave()`, `saveGame()`, `loadGame()`, `deleteSave()`, `serializeState()`, `deserializeState()`, `startAutosave()`, `stopAutosave()`, `showSaveIndicator()`

### UI
**Lives in:** `ui.js`, `events.js`
**What it does:** Updates HUD resource counts, manages settler info panel (with equipped tool/weapon, child age progress, red heart styling), toggles menus and action panel. Settler info updates in real-time every 500ms.
**Connects to:** `state.js` (reads data for display), `characters.js` (settler lookup), `playerActions.js` (cancelDropAction on panel close)
**Key functions:** `updateHUD()`, `showSettlerInfo()`, `hideSettlerInfo()`, `updateSettlerInfoPanel()`, `toggleGameMenu()`, `toggleActionPanel()`

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
