#!/usr/bin/env python3
"""
Extract individual sprites from spritesheets.
Backgrounds are already transparent (alpha=0).
Uses content-bounding-box detection to find the actual sprite grid area.
"""
from PIL import Image
import os

BASE = '/home/user/Alexander/assets/sprites'
OUT  = '/home/user/Alexander/assets/sprites/individual'


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def find_content_bounds(img):
    """Find the bounding box of all non-transparent pixels in the image."""
    W, H = img.size
    pixels = img.load()
    min_x, max_x = W, 0
    min_y, max_y = H, 0
    for py in range(H):
        for px in range(W):
            if pixels[px, py][3] >= 10:
                if px < min_x: min_x = px
                if px > max_x: max_x = px
                if py < min_y: min_y = py
                if py > max_y: max_y = py
    if min_x > max_x:
        return 0, 0, W, H
    return min_x, min_y, max_x + 1, max_y + 1


def auto_crop_cell(img, cell_left, cell_top, cell_right, cell_bottom):
    """Find tight bounding box of non-transparent pixels within a cell."""
    pixels = img.load()
    min_x, max_x = cell_right, cell_left - 1
    min_y, max_y = cell_bottom, cell_top - 1
    for py in range(max(0, cell_top), min(img.height, cell_bottom)):
        for px in range(max(0, cell_left), min(img.width, cell_right)):
            if pixels[px, py][3] < 10:
                continue
            if px < min_x: min_x = px
            if px > max_x: max_x = px
            if py < min_y: min_y = py
            if py > max_y: max_y = py
    if min_x > max_x or min_y > max_y:
        return cell_left, cell_top, cell_right, cell_bottom
    PAD = 2
    x1 = max(cell_left, min_x - PAD)
    y1 = max(cell_top, min_y - PAD)
    x2 = min(cell_right, max_x + PAD + 1)
    y2 = min(cell_bottom, max_y + PAD + 1)
    return x1, y1, x2, y2


def extract_sheet(sheet_path, cols, rows, names, out_dir, use_content_bounds=True):
    """
    Extract sprites from a sheet with cols x rows grid.
    If use_content_bounds=True, detects the actual content area first.
    """
    ensure_dir(out_dir)
    img = Image.open(sheet_path)
    W, H = img.size

    if use_content_bounds:
        bx, by, bx2, by2 = find_content_bounds(img)
        grid_w = bx2 - bx
        grid_h = by2 - by
        cell_w = grid_w / cols
        cell_h = grid_h / rows
        origin_x = bx
        origin_y = by
    else:
        cell_w = W / cols
        cell_h = H / rows
        origin_x = 0
        origin_y = 0

    idx = 0
    for row in range(rows):
        for col in range(cols):
            if idx >= len(names):
                break
            name = names[idx]
            idx += 1
            if name is None:
                continue

            cl = origin_x + round(col * cell_w)
            ct = origin_y + round(row * cell_h)
            cr = origin_x + round((col + 1) * cell_w)
            cb = origin_y + round((row + 1) * cell_h)

            x1, y1, x2, y2 = auto_crop_cell(img, cl, ct, cr, cb)
            sprite = img.crop((x1, y1, x2, y2))
            out_path = os.path.join(out_dir, name + '.png')
            sprite.save(out_path)
            print(f'  {name}.png  ({x2-x1}x{y2-y1})')


def create_solid_tile(color_rgb, out_path, size=64):
    """Create a solid-color 64x64 tile PNG."""
    img = Image.new('RGBA', (size, size), color_rgb + (255,))
    img.save(out_path)
    print(f'  {os.path.basename(out_path)}  (solid {color_rgb})')


# ── Tiles (no spritesheet — create solid-color placeholders) ─────────────────
TILE_COLORS = {
    'grass1':        (106, 168, 79),
    'grass2':        (90,  143, 60),
    'grass3':        (74,  122, 48),
    'grass_flowers': (126, 200, 80),
    'dirt1':         (180, 133, 74),
    'dirt2':         (160, 112, 64),
    'dirt_pebbles':  (138, 101, 53),
    'dirt_path':     (155, 112, 64),
    'water_deep':    (40,   90, 160),
    'water_shallow': (70,  140, 210),
    'water_ripple':  (80,  150, 213),
    'water_shore':   (91,  160, 216),
    'transition1':   (120, 130, 80),
    'transition2':   (110, 125, 75),
    'transition3':   (100, 120, 70),
    'transition4':   (115, 128, 78),
}

print('Creating tile PNGs...')
tile_dir = os.path.join(OUT, 'tiles')
ensure_dir(tile_dir)
for name, rgb in TILE_COLORS.items():
    create_solid_tile(rgb, os.path.join(tile_dir, name + '.png'))

# ── Nature objects (4x4 grid from nature_objects.png) ────────────────────────
NATURE_NAMES = [
    'tree_small',  'tree_large',  'tree_pine',   'tree_autumn',
    'rock_small',  'rock_large',  'rock_mossy',  'iron_ore',
    'bush_berry',  'bush_shrub',  'tall_grass',  'flower_bush',
    'stump',       'fallen_log',  'pond',        'mushrooms',
]
print('\nExtracting nature sprites...')
extract_sheet(
    os.path.join(BASE, 'tiles/nature_objects.png'),
    4, 4, NATURE_NAMES,
    os.path.join(OUT, 'nature')
)

# ── Settlers (8x4 grid from settler_characters.png) ──────────────────────────
SETTLER_NAMES = [
    'male_front',   'male_back',    'male_left',    'male_right',
    'male_chop',    'male_mine',    'male_carry',   'male_sleep',
    'female_front', 'female_back',  'female_left',  'female_right',
    'female_forage','female_build', 'female_carry', 'female_sleep',
    'male_walk1',   'male_walk2',   'male_walk3',   'male_walk4',
    'male_walkr1',  'male_walkr2',  'male_walkr3',  'male_walkr4',
    'female_walk1', 'female_walk2', 'female_walk3', 'female_walk4',
    'female_walkr1','female_walkr2','female_walkr3','female_walkr4',
]
print('\nExtracting settler sprites...')
extract_sheet(
    os.path.join(BASE, 'settlers/settler_characters.png'),
    8, 4, SETTLER_NAMES,
    os.path.join(OUT, 'settlers')
)

# ── Enemies (8x4 grid from enemy_characters.png) ─────────────────────────────
ENEMY_NAMES = [
    'zombie_1',     'zombie_2',     'zombie_3',     'zombie_4',
    'zombie_5',     'zombie_6',     'zombie_7',     'zombie_8',
    'skeleton_1',   'skeleton_2',   'skeleton_3',   'skeleton_4',
    'skeleton_5',   'skeleton_6',   'skeleton_7',   'skeleton_8',
    'wolf_1',       'wolf_2',       'wolf_3',       'wolf_4',
    'wolf_5',       'wolf_6',       'wolf_7',       'wolf_8',
    'zombie_death1','zombie_death2','skeleton_death1','skeleton_death2',
    'wolf_death1',  'wolf_death2',  None,           None,
]
print('\nExtracting enemy sprites...')
extract_sheet(
    os.path.join(BASE, 'enemies/enemy_characters.png'),
    8, 4, ENEMY_NAMES,
    os.path.join(OUT, 'enemies')
)

# ── Buildings (3x2 grid from hut_house.png) ──────────────────────────────────
BUILDING_NAMES = [
    'hut_foundation',  'hut_frame',  'hut_complete',
    'house_foundation','house_frame','house_complete',
]
print('\nExtracting building sprites...')
extract_sheet(
    os.path.join(BASE, 'buildings/hut_house.png'),
    3, 2, BUILDING_NAMES,
    os.path.join(OUT, 'buildings')
)

print('\nDone! All sprites extracted.')
