# 1.3 artwork provenance

Three new assets were generated with the built-in imagegen tool on October 11, 2026. They are original illustrations created for this project. The final runtime files are local WebP assets; the generated PNG sources are retained in ignored `output/citadel-art-sources/` and in the generation tool's original output folder.

## Forest camp

Runtime: `public/art/camp-dusk.webp` (1672 × 941).

Prompt: Wide 16:9 production background painting for a fantasy survival game's main menu. A polished hand-painted adventurer camp at dusk, with classic fantasy environment art, dark teal ancient oaks, layered canopy, distant misty mountains and a medieval village with warm windows. A worn stone clearing and small campfire in the middle ground, tents and banner farther right. Dark negative space on the left for menu typography, warm amber rim light, volumetric shafts, fireflies and rich painterly depth. No people, text, UI, logos or watermark.

Used as the departure scene and the subdued background of other camp screens. Hero illustrations remain the existing original atlas.

## Forest terrain

Runtime: `public/art/forest-floor.webp` (768 × 768).

Prompt: Square seamless repeating fantasy forest floor texture, directly overhead orthographic view, no horizon or perspective. Hand-painted dark sage moss, desaturated olive grass, broad soft patches of muted soil, curved grass tufts, small gray pebbles and fallen leaves. Rich organic detail with moderately low contrast for character readability. Even ambient lighting, matching edges. No trees, bushes, large rocks, water, buildings, objects, UI, text or grid.

The renderer bakes this into a 640-pixel repeating Canvas pattern and adapts its tint for each outdoor destination. The procedural floor remains a fallback if the asset fails to load. Dungeon floors retain their established artwork.

## Exploration props

Runtime: `public/art/camp-props.webp` (1254 × 1254, transparent).

Prompt: Transparent production fantasy environment atlas with four isolated hand-painted sprites in equal 2 × 2 quadrants, generous margins and empty gutters. Chunky classic fantasy materials and silhouettes, seen from high three-quarter overhead. Top left: a mossy weathered stone obelisk on a plinth with glowing turquoise engraved runes. Top right: an ornate wooden treasure chest with gold bindings and scattered coins. Bottom left: a small natural fishing pond with an irregular mossy stone shoreline, reeds, teal water, ripples and lily pads. Bottom right: six ancient mossy rune stones around a faint violet ritual circle. No scene background, text, numbers, UI or watermark; transparent alpha around all sprites.

The renderer crops the exact quadrants, shares the chest art between guarded caches and dropped treasure, and keeps code-drawn landmarks and ponds as a fallback. Existing shrine choices, ritual defenses and fishing requirements are unchanged.
