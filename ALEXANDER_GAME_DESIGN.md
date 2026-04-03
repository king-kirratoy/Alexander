# Alexander — Game Design Document

> An idle civilization-building survival simulation where a small group of settlers autonomously gathers resources, builds a community, and defends against nighttime threats — with or without your help.

**Codename:** Alexander
**Genre:** Idle / Simulation / Survival
**Engine:** Phaser 3.60.0
**Platform:** Browser (HTML5)
**Visual Style:** Pixel art, bright & colorful, Stardew Valley-inspired
**Perspective:** Top-down, scrollable & zoomable map
**Core Loop:** Watch, or participate. The game plays itself.

---

## 1. Core Philosophy

The single most important design rule: **the game plays itself.** Every system must function autonomously. The player is an observer who *can* intervene but never *must*. Characters make their own decisions, prioritize their own needs, build their own community, and defend themselves at night. Player interaction is a gentle nudge — dropping resources on the ground — not direct control.

Simplicity is the second rule. No system should be complex enough to require a tutorial. The game should be immediately understandable by watching it run for 60 seconds.

---

## 2. World & Map

### 2.1 Map Generation

- **Procedurally generated** for each new game — no two playthroughs are identical
- **Size:** Large enough to scroll several screens in every direction, but not infinite. Roughly 80×60 tiles at 32px each (~2560×1920 world pixels) — tunable
- **Tile types:**
  - Grass (default ground, walkable)
  - Dirt (walkable, no resources)
  - Water (impassable barrier, can border map edges or form ponds/rivers)
  - Trees (harvestable for wood, regrow slowly over time)
  - Rocks/boulders (harvestable for stone)
  - Fruit bushes (harvestable for food, regrow over time)
- **Generation rules:**
  - Water features form naturally (ponds, streams) but never fully block access to large areas
  - Trees and rocks cluster in natural-looking groups with Perlin/simplex noise
  - A clear starting area near center with open grass, a few trees, and nearby resources
  - Fruit bushes scattered throughout, slightly rarer than trees
  - Dirt patches appear randomly as natural clearings

### 2.2 Camera & Navigation

- **Scrolling:** Click-and-drag or edge-of-screen scrolling to pan the camera
- **Zoom:** Mouse wheel to zoom in/out. Minimum zoom shows most of the map; maximum zoom shows individual character detail
- **Minimap:** Small corner minimap showing the full world with dots for characters and buildings
- **Camera follows:** Optional soft-follow on a selected character (click a character to follow them)

---

## 3. Characters (Settlers)

### 3.1 Starting Conditions

- Game begins with **3–5 adult settlers** (randomized count per game)
- Each settler is procedurally generated with unique traits

### 3.2 Identity

Every character has:

| Attribute | Details |
|-----------|---------|
| **Name** | Randomly generated from a name pool (first name only) |
| **Personality** | 1–2 trait words that subtly affect behavior (e.g., "Brave" — less likely to flee combat; "Lazy" — slightly slower work speed; "Glutton" — eats more; "Industrious" — works faster) |
| **Role preference** | Slight stat lean toward a role, but any character can do any job |
| **Appearance** | Randomized pixel-art sprite (hair color, skin tone, clothing color variations) |

### 3.3 Stats

Keep it simple — only stats that directly affect visible behavior:

| Stat | What It Does |
|------|-------------|
| **Health** | Takes damage from enemies. Reaches 0 → knocked out (life 1) or permadeath (life 2). Regenerates slowly when fed and resting. |
| **Hunger** | Depletes over time. When empty, health slowly drains. Eating food restores hunger. |
| **Speed** | How fast the character moves across the map. Slight random variance per character. |
| **Strength** | Affects gathering speed (chopping/mining) and melee damage. |
| **Lives** | Starts at 2. First knockout → other settlers can rescue/revive. Second knockout → permadeath. Dead character is removed permanently. |

### 3.4 Roles

Characters don't have locked classes — they dynamically fill roles based on community needs. However, stat leans make some characters naturally better at certain jobs:

| Role | Activity | Stat Lean |
|------|----------|-----------|
| **Woodcutter** | Chops trees → produces wood | Higher strength |
| **Miner** | Mines rocks → produces stone | Higher strength |
| **Forager** | Picks fruit from bushes → produces food | Higher speed |
| **Builder** | Constructs buildings using gathered resources | Balanced |
| **Fighter** | Equips weapons, patrols at night, engages enemies | Higher strength + brave personality |
| **Crafter** | Creates tools and weapons at workbench / forge | Balanced |

### 3.5 Status Indicators

Each character displays a small icon/symbol above their head showing current activity:

- 🪓 Chopping wood
- ⛏️ Mining stone
- 🍎 Foraging food
- 🔨 Building
- ⚔️ Fighting / on guard
- 🛠️ Crafting
- 💤 Sleeping
- 🍖 Eating
- ❤️‍🩹 Recovering (knocked out, being rescued)
- 🚶 Idle / walking to task

*(These will be simple pixel-art icons, not emoji — listed here for reference)*

### 3.6 AI Decision System

Characters use a **priority queue** to decide what to do. The AI checks needs every few seconds and picks the highest-priority unmet need:

**Priority order (highest first):**

1. **Flee / fight** — If enemies are nearby and it's night, armed characters fight, unarmed flee to shelter
2. **Eat** — If hunger is critically low, find food (from storage or forage)
3. **Sleep** — If nighttime and no enemies nearby, go to a hut/house to sleep
4. **Rescue** — If a knocked-out character is nearby, go revive them
5. **Prepare defenses** — If night is approaching and defenses are low, build walls or craft weapons
6. **Build** — If a building is queued/in progress and resources are available, go build
7. **Gather resources** — Pick the most needed resource (food if food is low, wood if wood is low, etc.)
8. **Craft** — If tools or weapons are needed, go to workbench/forge
9. **Idle/wander** — If nothing else to do, wander near the settlement

**Personality modifiers:**
- "Brave" settlers have higher fight priority (less likely to flee)
- "Lazy" settlers work slightly slower and take longer breaks
- "Industrious" settlers work faster and idle less
- "Glutton" settlers eat more often (higher eat priority threshold)

### 3.7 Population Growth

- **Reproduction:** When the population has at least 2 adults and a house with capacity, a new child can be born. Births are slow — one every several day/night cycles
- **Housing requirement:** Each house supports 2–4 residents. No room = no new births
- **Children:**
  - Appear as smaller sprites
  - Can only do basic tasks: foraging food, carrying small items
  - Cannot fight, mine, or chop
  - Grow into adults after several full day/night cycles
  - Get their own randomized name, personality, and stats upon reaching adulthood
- **No population cap** — growth is limited only by housing and food supply

---

## 4. Resources & Inventory

### 4.1 Resource Types

| Resource | Source | Used For |
|----------|--------|----------|
| **Wood** | Chopping trees | Building structures, crafting tools/weapons, campfire fuel |
| **Stone** | Mining rocks | Building structures, crafting tools/weapons |
| **Food** | Foraging fruit bushes, farming (later?) | Feeding settlers, preventing starvation |
| **Fiber** | Harvested from tall grass patches | Crafting rope, basic bindings for tools |
| **Iron ore** | Rare rock deposits (slightly different colored rocks) | Advanced tools and weapons (requires forge) |

### 4.2 Storage

- Resources are stored in **stockpile buildings** (storage huts)
- Without a stockpile, resources are dropped in a pile near the settlement center
- Characters automatically deposit gathered resources at the nearest stockpile
- Resource counts are displayed on the HUD

### 4.3 Resource Regeneration

- **Trees:** Slowly regrow from stumps after being chopped. Full regrowth takes several day/night cycles
- **Rocks:** Do not regrow (finite per map — encourages expansion)
- **Fruit bushes:** Regrow fruit periodically. Bush itself is permanent
- **Iron deposits:** Finite, rarer than stone. Late-game scarcity is intentional

---

## 5. Crafting System

### 5.1 Design Philosophy

Simple recipe-based crafting. No complex tech trees. Characters auto-craft when they need a tool and materials are available.

### 5.2 Basic Crafting (No Building Required)

Characters can craft these anywhere with materials in hand:

| Item | Recipe | Use |
|------|--------|-----|
| **Wooden axe** | 3 wood + 1 stone | Faster wood chopping |
| **Stone pickaxe** | 2 wood + 3 stone | Faster stone mining |
| **Wooden spear** | 2 wood + 1 stone | Basic melee weapon |
| **Wooden shield** | 4 wood + 1 fiber | Reduces incoming damage |
| **Torch** | 1 wood + 1 fiber | Carried light source at night, slight enemy deterrent |
| **Rope** | 3 fiber | Component for other recipes |

### 5.3 Advanced Crafting (Requires Workbench)

| Item | Recipe | Use |
|------|--------|-----|
| **Stone axe** | 2 wood + 4 stone + 1 rope | Much faster chopping |
| **Stone sword** | 1 wood + 5 stone + 1 rope | Better melee weapon |
| **Reinforced shield** | 3 wood + 3 stone + 2 rope | Better damage reduction |
| **Wooden bow** | 3 wood + 2 fiber + 1 rope | Ranged weapon (limited ammo from wood) |

### 5.4 Forge Crafting (Requires Forge + Iron Ore)

| Item | Recipe | Use |
|------|--------|-----|
| **Iron axe** | 1 wood + 3 iron ore | Best chopping tool |
| **Iron pickaxe** | 1 wood + 3 iron ore | Best mining tool |
| **Iron sword** | 1 wood + 4 iron ore | Best melee weapon |
| **Iron shield** | 2 iron ore + 1 wood | Best damage reduction |

### 5.5 Auto-Equip Behavior

- Characters automatically equip the best available tool/weapon from storage
- Fighters prioritize weapons; gatherers prioritize tools
- If a character needs to chop wood and an axe exists in storage, they grab it first

### 5.6 Crafting Animations & Audio

- Characters performing crafting play a repeating **hammering/assembly animation** with corresponding sound effects
- A small progress bar appears above the character while crafting
- A brief sparkle/flash effect plays when crafting completes

---

## 6. Buildings & Construction

### 6.1 Building Types

| Building | Cost | Capacity/Function | Unlocked By |
|----------|------|-------------------|-------------|
| **Campfire** | 5 wood, 2 stone | Cooks food (raw → cooked = more nutrition), provides light at night, warmth | Default (first building) |
| **Hut** | 10 wood, 5 stone | Houses 2 settlers. Required for sleep and population growth | Default |
| **Storage shed** | 8 wood, 4 stone | Stores up to 100 units of resources. Without this, resources pile on ground | Default |
| **Workbench** | 6 wood, 4 stone | Enables advanced crafting recipes | Default |
| **Wooden wall segment** | 3 wood | Defensive barrier. Enemies must break through. Connects to adjacent walls | Default |
| **Stone wall segment** | 5 stone | Stronger defensive barrier | Having a workbench |
| **Watchtower** | 8 wood, 6 stone | Stationed fighter gets range bonus, can spot enemies earlier | 10+ population |
| **House** | 15 wood, 10 stone | Houses 4 settlers. Upgraded hut | 8+ population |
| **Forge** | 10 stone, 5 iron ore, 5 wood | Enables iron-tier crafting | Having iron ore in storage |
| **Farm plot** | 5 wood, 2 stone | Grows food slowly over time. Passive food source | 6+ population |
| **Gate** | 6 wood, 2 stone | Opens for settlers, closes for enemies. Placed in wall gaps | Having walls |

### 6.2 Construction Process

- **Phase 1 — Foundation:** Ground is cleared, outline appears (light/transparent). ~20% of build time
- **Phase 2 — Frame:** Basic structure skeleton visible (partial walls, support beams). ~40% of build time
- **Phase 3 — Walls/Roof:** Structure fills in, nearing completion. ~30% of build time
- **Phase 4 — Complete:** Final sprite with slight randomized cosmetic variation (window placement, roof color, flower box, etc.)

Each phase has a distinct visual state so the player can see progress. Multiple builders on the same project speed it up.

### 6.3 Building Placement

- The AI chooses building locations automatically based on simple rules:
  - Near existing buildings (cluster the settlement)
  - Not on water, trees, or rocks
  - Walls placed at settlement perimeter
- Buildings snap to a tile grid

### 6.4 Cosmetic Variation

To keep each playthrough visually unique:
- Roof color randomly chosen from a palette (brown, red, blue, green, gray)
- Window placement varies (left, right, center, double)
- Small decorative elements randomized (flower pot, barrel, sign)
- Huts vs houses have distinctly different base sprites, but each instance gets cosmetic variance

---

## 7. Day/Night Cycle

### 7.1 Timing

- One full day/night cycle takes **approximately 10–15 real-time minutes** (tunable)
- **Daytime:** ~70% of the cycle. Bright, colorful. Safe. Settlers work, gather, build
- **Dusk/Dawn:** ~10% each. Gradual color/lighting transition. Settlers start preparing
- **Nighttime:** ~20% of the cycle. Dark overlay with limited visibility. Enemies can spawn

### 7.2 Visual Changes

- **Day:** Full bright palette, birds chirping ambient audio, cheerful
- **Dusk:** Orange/amber tint gradually overlays the world. Settlers head to shelter. Warning chime sound
- **Night:** Dark blue/purple overlay. Visibility reduced to circles around campfires, torches, and buildings. Cricket/owl ambient audio. Eerie atmosphere
- **Dawn:** Gradual brightening. Enemies retreat/despawn. Birds return. Relief feeling

### 7.3 Lighting System

- Campfires, torches, and buildings emit circular light during night
- Characters carrying torches have a small light radius around them
- Unexplored/unlit areas of the map are dimmed but not fully hidden (player can still see, settlers can't "see" enemies in the dark as easily)

---

## 8. Enemies & Combat

### 8.1 Design Philosophy

Combat is a background threat, not the core gameplay. Nights should feel tense but manageable. The player should think "I hope my settlers are prepared" — not "I need to micro-manage this battle."

### 8.2 Enemy Types (V1)

| Enemy | Behavior | Threat Level |
|-------|----------|-------------|
| **Zombie** | Slow, walks toward nearest settler or building. Low damage, low health. Comes in small groups | Low |
| **Skeleton** | Slightly faster than zombie. Carries a weapon. Medium damage | Medium |
| **Wolf** | Fast, targets isolated settlers away from the group. Flees if outnumbered | Medium |

### 8.3 Spawn Rules

- Enemies only spawn at night
- Spawn at map edges, outside the visible settlement area
- **Scaling:** Number of enemies per night increases very gradually based on population size
  - Population 3–5: 1–3 enemies per night
  - Population 6–10: 2–5 enemies per night
  - Population 11–20: 4–8 enemies per night
  - Population 20+: 6–12 enemies per night
- Enemy type variety increases over time (only zombies at first, skeletons after day 5, wolves after day 10)
- Some nights can be calm (no spawns) — randomized for tension/relief pacing

### 8.4 Combat Mechanics

- **Auto-combat:** Armed settlers automatically engage enemies within detection range
- **Melee:** Settlers and enemies swing/attack on a cooldown timer. Damage = weapon damage + strength modifier
- **Ranged:** Settlers with bows can attack from a distance (limited ammo)
- **Walls:** Enemies must attack and break through walls before reaching the settlement interior. Walls have HP
- **Watchtowers:** Stationed settlers in watchtowers get a range bonus and can shoot over walls
- **Fleeing:** Unarmed settlers or settlers with low health flee to the nearest building
- **Knockout & rescue:** When a settler hits 0 HP:
  - If they have 2 lives remaining → knocked out, collapses in place. Other settlers can run to them and revive after a short channel. Revived with low health
  - If they have 1 life remaining → permadeath. Character is gone. Brief memorial notification

### 8.5 Combat Audio & Visual

- Attack animations: swing, stab, or bow-pull depending on weapon
- Hit effects: small flash + damage number popup
- Enemy death: brief dissolve/fade animation + small resource drop (bone, cloth scrap — flavor items for now)
- Settler knockout: collapse animation, pulsing "rescue me" icon
- Settler death: somber flash, brief name popup ("RIP [Name]"), body fades

---

## 9. Audio Design

### 9.1 Ambient Sounds

| Time of Day | Sounds |
|-------------|--------|
| **Day** | Birds chirping, gentle wind, distant water (if near pond), leaves rustling |
| **Dusk** | Birds fading, warning chime/bell, wind picking up |
| **Night** | Crickets, owls, eerie wind, occasional wolf howl in the distance |
| **Dawn** | Rooster crow (if population > 5), birds gradually returning |

### 9.2 Activity Sounds

| Activity | Sound |
|----------|-------|
| Chopping wood | Rhythmic axe-on-wood thuds |
| Mining stone | Pickaxe clinks on rock |
| Building | Hammer tapping, wood creaking |
| Crafting | Hammering, assembling sounds |
| Eating | Subtle munch/crunch |
| Combat (melee) | Weapon swing whoosh + impact thud |
| Combat (ranged) | Bow twang + arrow whistle |
| Enemy hit | Thud/squish depending on type |
| Enemy death | Brief dissolve/crumble sound |
| Settler knockout | Thump + gasp |
| Settler death | Somber tone |
| Building complete | Cheerful jingle/chime |
| New birth | Soft chime + baby coo |
| Resource deposited | Light thunk/clink |

### 9.3 Music

- **Daytime:** Soft, looping lo-fi or folk-style background track. Cozy, unobtrusive
- **Nighttime:** Darker, more tense ambient track. Low strings or pads
- **Combat:** Slightly intensified version of night track (not a dramatic shift — subtle percussion added)
- Music volume should be low by default. The ambient sounds carry the atmosphere

### 9.4 Implementation Notes

- Use Phaser's built-in audio system
- All sounds should be short clips (< 3 seconds for effects, looping for ambient)
- Positional audio where possible — chopping sounds louder when camera is near the woodcutter
- Volume attenuation based on zoom level (zoomed out = quieter individual sounds, ambient dominates)
- Sound effects should be generated or sourced from free/open libraries (freesound.org, OpenGameArt)

---

## 10. Player Interaction

### 10.1 Philosophy

The player is a benevolent observer. They can help, but they can't control. Think of it like watching an ant farm where you can occasionally drop food in.

### 10.2 Available Actions

Accessed via a **minimal floating action menu** (small icon in the corner → expands to show options):

| Action | How It Works |
|--------|-------------|
| **Drop Wood** | Click action, then click a ground location. A pile of wood appears. Costs nothing (the player is "god") |
| **Drop Stone** | Same as above, with stone |
| **Drop Food** | Same as above, with food |
| **Drop Iron** | Same as above, with iron ore |

Settlers will notice dropped resources and collect them if needed.

### 10.3 Observation Tools

| Tool | Function |
|------|----------|
| **Click settler** | Shows their name, personality, stats, current activity, and life count in a small info panel |
| **Click building** | Shows building type, health/durability, occupants |
| **Follow mode** | Click a settler → camera softly follows them as they go about their day |
| **Speed controls** | 1x, 2x, 3x simulation speed (optional — may add complexity) |

### 10.4 What the Player CANNOT Do

- Cannot directly order settlers (no "go here" or "do this")
- Cannot place buildings (settlers choose where to build)
- Cannot attack enemies
- Cannot pause the simulation (only exit to menu)
- Cannot destroy buildings or harm settlers

---

## 11. UI / HUD

### 11.1 Design Philosophy

Minimal. The game world is the star. HUD elements should be small, translucent, and tucked into corners. No clutter.

### 11.2 HUD Elements

**Top-left: Resource bar (horizontal, compact)**
```
🪵 142  🪨 89  🍎 64  ⛏️ 12
```
Small pixel-art icons with counts. Semi-transparent background.

**Top-right: Population & time**
```
👤 12    ☀️ Day 7
```
Population count + current day number + day/night icon.

**Bottom-left: Minimap**
Small square showing full world. Dots for settlers (green), enemies (red), buildings (brown).

**Bottom-right: Action menu**
Small circular button → expands to show drop actions. Collapses when not in use.

**Center-bottom (on character select): Info panel**
Appears when clicking a settler. Shows name, portrait, stats, activity. Click away to dismiss.

### 11.3 Menu System

**Main Menu (before game starts):**
- Title: "ALEXANDER" in stylized pixel font
- "New Game" button
- "Continue" button (if save exists)
- "Settings" button (volume sliders, etc.)
- Username input field (for Supabase save)

**In-game menu (accessed via small gear icon → opens overlay):**
- Resume
- Settings (volume, zoom sensitivity)
- Save & Exit to Main Menu
- Confirm dialog on exit ("Are you sure? Your game will be saved.")

---

## 12. Save System

### 12.1 Architecture

- **Backend:** Supabase (PostgreSQL)
- **Auth:** Simple username-based lookup (same as Tech Warrior Online — no password, just match on username string)
- **Auto-save:** Game auto-saves every 60 seconds while running
- **Manual save:** Triggered on exit to main menu

### 12.2 Save Data Structure

```
Table: alexander_saves
- username (text, primary key)
- save_data (jsonb) — contains:
  - world seed + tile map state
  - all character data (stats, inventory, position, lives)
  - all building data (type, position, construction progress, cosmetic variant)
  - resource stockpile counts
  - current day number + time-of-day position
  - crafted items in storage
  - game settings/preferences
- updated_at (timestamp)
```

### 12.3 Load Flow

1. Player enters username at main menu
2. Query Supabase for matching username
3. If found → "Continue" button enabled, loads save_data
4. If not found → new account created, only "New Game" available

---

## 13. Technical Architecture

### 13.1 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Engine** | Phaser 3.60.0 |
| **Language** | Vanilla JavaScript (ES6+) |
| **Structure** | Multi-file (following Zac's code style standards) |
| **Rendering** | Phaser WebGL/Canvas |
| **Tilemap** | Phaser Tilemap system for world grid |
| **Pathfinding** | EasyStar.js or custom A* on tile grid |
| **Audio** | Phaser audio system |
| **Backend** | Supabase (save/load) |
| **Hosting** | TBD (likely same setup as Tech Warrior) |

### 13.2 Project File Structure

```
alexander/
├── index.html              ← Pure shell: loads all CSS and JS
├── CLAUDE.md               ← Architecture rules, hard constraints
├── OVERVIEW.md             ← Living project map
├── css/
│   ├── base.css            ← Variables, reset, typography, shared components
│   ├── hud.css             ← HUD overlay styles
│   └── menus.css           ← Main menu, settings, in-game menu
├── js/
│   ├── constants.js        ← Game config, recipes, building defs, enemy stats
│   ├── state.js            ← Global mutable game state
│   ├── utils.js            ← Pure helpers (math, random, distance, etc.)
│   ├── world.js            ← Procedural map generation, tile system
│   ├── pathfinding.js      ← A* or EasyStar integration on tile grid
│   ├── characters.js       ← Settler class, AI decision tree, stats, roles
│   ├── buildings.js        ← Building definitions, construction phases, placement
│   ├── crafting.js         ← Recipe system, crafting logic, auto-equip
│   ├── resources.js        ← Resource nodes, regeneration, stockpiles
│   ├── enemies.js          ← Enemy types, spawn logic, combat AI
│   ├── combat.js           ← Damage calculation, knockout/death, rescue
│   ├── dayNight.js         ← Cycle timer, lighting transitions, spawn triggers
│   ├── audio.js            ← Sound management, positional audio, ambient layers
│   ├── camera.js           ← Scroll, zoom, follow mode, minimap
│   ├── playerActions.js    ← Resource dropping, settler selection, info panel
│   ├── save.js             ← Supabase integration, auto-save, load
│   ├── ui.js               ← Shared UI helpers, menus, HUD rendering
│   ├── events.js           ← All event listeners
│   └── init.js             ← Boot sequence, Phaser config, scene setup
└── assets/
    ├── sprites/            ← Character sprites, buildings, enemies, items
    │   ├── settlers/       ← Settler sprite sheets (with variants)
    │   ├── buildings/      ← Building sprites (each phase + cosmetic variants)
    │   ├── enemies/        ← Zombie, skeleton, wolf sprites
    │   ├── items/          ← Tools, weapons, resource icons
    │   └── tiles/          ← Ground tiles, water, decorations
    ├── audio/
    │   ├── ambient/        ← Day/night ambient loops
    │   ├── sfx/            ← All sound effects
    │   └── music/          ← Background music tracks
    └── ui/                 ← HUD icons, menu backgrounds, fonts
```

### 13.3 Global Namespace

```javascript
// constants.js
window.AX = {};  // Alexander namespace — all public APIs attach here
```

### 13.4 Script Load Order

```
constants.js → state.js → utils.js → world.js → pathfinding.js →
characters.js → buildings.js → crafting.js → resources.js →
enemies.js → combat.js → dayNight.js → audio.js → camera.js →
playerActions.js → save.js → ui.js → events.js → init.js
```

### 13.5 Phaser Scene Structure

Single scene architecture to start:

- **BootScene** — loads all assets, shows loading bar
- **MenuScene** — main menu, username input, new/continue
- **GameScene** — the actual game world. Contains all game logic. Never destroyed while playing

---

## 14. Art & Asset Requirements

### 14.1 Sprite Specifications

- **Tile size:** 32×32 pixels
- **Character size:** 16×32 pixels (standing), with animation frames for walking (4 directions × 4 frames), working (4 frames), fighting (4 frames), sleeping (2 frames)
- **Buildings:** Variable size (smallest 32×32, largest 96×96), with 4 construction phase sprites each + 3–4 cosmetic variants for the final phase
- **Enemies:** 16×32 pixels, similar animation frame counts to settlers
- **Items:** 16×16 pixel icons for HUD and when dropped on ground
- **Status icons:** 8×8 or 12×12 pixel icons displayed above characters

### 14.2 Color Palette

Bright, warm, Stardew-inspired. Suggested base:
- **Grass:** Multiple greens (#5a8f3c, #7ec850, #a8d86e)
- **Dirt:** Warm browns (#8b6d45, #a67c52)
- **Water:** Blues (#3b7dd8, #5b9bd5, #85c1e9)
- **Wood/buildings:** Warm tans and browns (#c4a264, #8b6914, #5c3d1a)
- **Stone:** Cool grays (#808080, #a0a0a0, #c0c0c0)
- **Night overlay:** Deep blue/purple tint (#1a1a3e at ~50% opacity)
- **Character skin tones:** Diverse range
- **Character clothing:** Bright, distinguishable colors per character

### 14.3 Asset Strategy

For V1 / prototyping:
- Use placeholder pixel art (simple geometric shapes with color coding)
- Iterate on art quality once gameplay systems are solid
- Can source from OpenGameArt or commission custom spritesheets later

---

## 15. Development Phases

### Phase 1 — Foundation (Get Something On Screen)
- [ ] Project scaffolding (file structure, Phaser boot, scene framework)
- [ ] Procedural map generation (grass, water, trees, rocks, bushes, dirt)
- [ ] Camera controls (scroll, zoom)
- [ ] Basic placeholder sprites
- [ ] Single settler walking around randomly on the map

### Phase 2 — Core Settler AI
- [ ] Settler stats, names, personalities
- [ ] Priority-based AI decision system
- [ ] Resource gathering (walk to tree → chop → carry wood back)
- [ ] Hunger system (find food, eat)
- [ ] Basic pathfinding (A* on tile grid)
- [ ] Status icons above characters

### Phase 3 — Buildings & Crafting
- [ ] Building placement AI (settlers choose where to build)
- [ ] Construction phases (visual progression)
- [ ] Campfire, hut, storage shed, workbench
- [ ] Basic crafting (tools, weapons)
- [ ] Auto-equip system
- [ ] Resource storage in buildings

### Phase 4 — Day/Night Cycle
- [ ] Time system with configurable cycle length
- [ ] Visual lighting transitions (tinting, overlay)
- [ ] Light sources (campfires, torches, buildings)
- [ ] Settler behavior changes at night (sleep, shelter-seeking)

### Phase 5 — Enemies & Combat
- [ ] Enemy spawning at night (map edges)
- [ ] Enemy AI (pathfind toward settlement)
- [ ] Auto-combat for armed settlers
- [ ] Walls as defensive barriers
- [ ] Knockout, rescue, permadeath mechanics
- [ ] Scaling enemy count based on population

### Phase 6 — Population & Growth
- [ ] Reproduction system (children born, grow to adults)
- [ ] Child behavior (limited tasks)
- [ ] Housing capacity requirements
- [ ] Advanced buildings (house, forge, farm, watchtower, gate)

### Phase 7 — Audio
- [ ] Ambient sound layers (day/dusk/night/dawn)
- [ ] Activity sound effects (chopping, mining, building, crafting)
- [ ] Combat audio (attacks, hits, deaths)
- [ ] UI sounds (menu clicks, notifications)
- [ ] Positional audio + volume attenuation

### Phase 8 — Player Interaction & HUD
- [ ] Resource drop actions (click to place wood/stone/food/iron on map)
- [ ] Settler selection + info panel
- [ ] Follow mode (camera tracks selected settler)
- [ ] HUD (resource bar, population, day counter, minimap)
- [ ] In-game menu (settings, exit)

### Phase 9 — Save System
- [ ] Supabase table setup
- [ ] Username-based login
- [ ] Save serialization (world + settlers + buildings + resources + time)
- [ ] Auto-save every 60 seconds
- [ ] Load on continue
- [ ] Main menu flow (new game / continue)

### Phase 10 — Polish & Balance
- [ ] Tune AI priorities and timing
- [ ] Balance resource costs, gathering speeds, enemy difficulty
- [ ] Cosmetic building variations
- [ ] Smooth camera transitions
- [ ] Loading screen
- [ ] Tutorial hints (optional — brief text popups for first-time players)
- [ ] Performance optimization (object pooling, culling off-screen sprites)

---

## 16. Future Ideas (Post-V1)

These are NOT for initial development — just a parking lot for later:

- **Seasons** (spring/summer/fall/winter with different resource availability)
- **Trading** (NPC caravan arrives periodically to trade resources)
- **Technology research** (slow unlock tree for new buildings/items)
- **Multiple settlements** (expand to new areas of the map)
- **Boss enemies** (rare, large enemy on certain nights)
- **Settler relationships** (friendships, families, morale system)
- **Achievements / milestones** (survive 50 days, reach 50 population, etc.)
- **Offline progress** (calculate what happened while tab was closed)
- **Speed controls** (1x, 2x, 3x simulation speed)
- **Map events** (wandering merchant, natural disasters, resource discovery)

---

## 17. Open Questions

1. **Art pipeline:** Create placeholder art first and iterate, or source a tileset from OpenGameArt to start with something that already looks decent?
2. **Phaser tilemap approach:** Use Phaser's built-in tilemap with a dynamically generated data array, or roll a custom tile renderer?
3. **Pathfinding library:** Bundle EasyStar.js (proven, easy) or write custom A* (more control, no dependency)?
4. **Sound generation:** Source free sounds from libraries, or use a tool like sfxr/jsfxr to generate retro-style effects?
5. **Supabase table:** Create a new `alexander_saves` table, or extend the existing TW Supabase setup?

---

*This document is the design blueprint. All development decisions should reference this doc. Update it as decisions are made and systems evolve.*
