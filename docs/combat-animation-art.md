# Combat animation artwork — 1.4

Generated on October 12, 2026 with the built-in image generation tool, using `public/art/hero-sprites.png` as the character identity reference. Runtime files are local WebP assets with preserved alpha. The original PNGs remain in the tool's generated image folder. No image generation service is used at runtime.

## Hero animation sheets

Each sheet contains sixteen equal cells: front run, back run, front action, back action; four poses in each row. The renderer mirrors them for left-facing motion. These are short illustrated cycles, not a full skeletal animation set. At load time it measures alpha bounds to register feet and prepares sixteen 128-pixel surfaces, avoiding full-atlas resampling during combat. The original rigs still cover mounts, creatures, shapeshift forms, reduced motion and missing assets.

### mage

Runtime: `public/art/mage-motion.webp` (1254 × 1254).

Generated source: `C:\Users\msynk\.codex\generated_images\01a1295b-2eb6-7083-8e57-73962abc141c\exec-640117b1-cfe4-4274-bc30-9b1cff15c8ae.png`.

Prompt:

> Create a production 2D game animation sprite sheet, square canvas, transparent background. Reference image is identity/style reference ONLY: use ONLY the blue-robed silver-haired female MAGE at top middle. EXACTLY 16 individual full-body sprites in a perfectly uniform 4 columns by 4 rows grid. Each cell occupies exactly one quarter of canvas width and height; generous empty transparent margins; no body/staff/effect crosses its cell. Same character scale and foot baseline (at 85% of each cell height), consistent costume, face, proportions and crisp painted fantasy game style. Character around 72% cell height. No labels, borders, background, floor shadow, text or UI. Animation must have clearly different anatomical poses, visible foot strides and large expressive arm gestures, NOT copies of standing portrait. ROW 1: four successive running poses facing diagonally DOWN RIGHT (three-quarter front), left leg forward, passing, right leg forward, passing; torso leaning forward, arms counter-swing, flowing cape/robe, staff moving with hand. ROW 2: four successive running poses facing diagonally UP RIGHT (three-quarter BACK), same gait. ROW 3: four spell-casting action poses facing down-right: gather power with both arms close, draw staff and free hand back and twist torso, forcefully thrust glowing free hand forward, extended follow-through lowering staff. ROW 4: same four casting poses facing UP RIGHT, back view. Include only very small cyan hand glow, no large detached spell effects. Keep feet registered and same scale throughout. Prioritize strict 4x4 alignment and complete silhouettes. This is an animation sheet that will be sliced by code into exact equal cells.

### warrior

Runtime: `public/art/warrior-motion.webp` (1254 × 1254).

Generated source: `C:\Users\msynk\.codex\generated_images\01a1295b-2eb6-7083-8e57-73962abc141c\exec-8d643ec4-38ba-43b6-b4e2-e5840478529d.png`.

Prompt:

> Production 2D fantasy game animation sprite sheet on transparent background, square canvas. Reference is identity and style reference ONLY. Use ONLY the red-haired bearded human WARRIOR at top left, steel armor, blue tabard, sword. EXACTLY 16 full-body sprites in uniform 4 columns by 4 rows grid, each cell exactly one quarter canvas width and height. Consistent costume, anatomy, scale, face, painted style. Feet at 88% of cell height, character 73% of cell height, centered horizontally; generous transparent margins. No sprite, weapon, cape or effect crosses cell boundaries. No labels, grid lines, text, floor shadow or background. Clear anatomical pose changes and distinct leg strides, NOT repeated standing portraits. ROW 1 four chronological RUN cycle poses facing DOWN RIGHT three-quarter front: left foot forward with right leg bent behind, passing pose, right foot forward with left leg bent behind, passing pose. Arms counter-swing, torso leans, cloak moves. ROW 2 same four RUN poses facing UP RIGHT three-quarter BACK. ROW 3 four distinct sword attack: crouched guard, twist torso drawing sword far back, powerful sweeping sword strike with bent leading knee, low follow-through poses facing DOWN RIGHT, front three-quarter. ROW 4 same four sword attack: crouched guard, twist torso drawing sword far back, powerful sweeping sword strike with bent leading knee, low follow-through poses facing UP RIGHT, three-quarter BACK. All images of SAME character. Keep cell registration exact. Very small magic glow only; no detached large effects. Clean crisp silhouettes, game animation production art.

### rogue

Runtime: `public/art/rogue-motion.webp` (1254 × 1254).

Generated source: `C:\Users\msynk\.codex\generated_images\01a1295b-2eb6-7083-8e57-73962abc141c\exec-663e4f26-3f6f-4846-9faf-156bc0ed003a.png`.

Prompt:

> Production 2D fantasy game animation sprite sheet on transparent background, square canvas. Reference is identity and style reference ONLY. Use ONLY the hooded leather-armored masked ROGUE at top right, two green daggers. EXACTLY 16 full-body sprites in uniform 4 columns by 4 rows grid, each cell exactly one quarter canvas width and height. Consistent costume, anatomy, scale, face, painted style. Feet at 88% of cell height, character 73% of cell height, centered horizontally; generous transparent margins. No sprite, weapon, cape or effect crosses cell boundaries. No labels, grid lines, text, floor shadow or background. Clear anatomical pose changes and distinct leg strides, NOT repeated standing portraits. ROW 1 four chronological RUN cycle poses facing DOWN RIGHT three-quarter front: left foot forward with right leg bent behind, passing pose, right foot forward with left leg bent behind, passing pose. Arms counter-swing, torso leans, cloak moves. ROW 2 same four RUN poses facing UP RIGHT three-quarter BACK. ROW 3 four distinct dual dagger attack: low guard, coil torso with both daggers pulled back, lunging crossed dagger slash, crouched follow-through poses facing DOWN RIGHT, front three-quarter. ROW 4 same four dual dagger attack: low guard, coil torso with both daggers pulled back, lunging crossed dagger slash, crouched follow-through poses facing UP RIGHT, three-quarter BACK. All images of SAME character. Keep cell registration exact. Very small magic glow only; no detached large effects. Clean crisp silhouettes, game animation production art.

### hunter

Runtime: `public/art/hunter-motion.webp` (1254 × 1254).

Generated source: `C:\Users\msynk\.codex\generated_images\01a1295b-2eb6-7083-8e57-73962abc141c\exec-2b5764ca-856a-4ce5-be53-1d4df317c5b6.png`.

Prompt:

> Production 2D fantasy game animation sprite sheet on transparent background, square canvas. Reference is identity and style reference ONLY. Use ONLY the red-bearded hooded dwarf HUNTER at middle left, green cloak and bow. EXACTLY 16 full-body sprites in uniform 4 columns by 4 rows grid, each cell exactly one quarter canvas width and height. Consistent costume, anatomy, scale, face, painted style. Feet at 88% of cell height, character 73% of cell height, centered horizontally; generous transparent margins. No sprite, weapon, cape or effect crosses cell boundaries. No labels, grid lines, text, floor shadow or background. Clear anatomical pose changes and distinct leg strides, NOT repeated standing portraits. ROW 1 four chronological RUN cycle poses facing DOWN RIGHT three-quarter front: left foot forward with right leg bent behind, passing pose, right foot forward with left leg bent behind, passing pose. Arms counter-swing, torso leans, cloak moves. ROW 2 same four RUN poses facing UP RIGHT three-quarter BACK. ROW 3 four distinct bow shot: bow lowered, raise bow and draw string with bent elbow, release arrow with fully extended bow arm, recoil and lower bow poses facing DOWN RIGHT, front three-quarter. ROW 4 same four bow shot: bow lowered, raise bow and draw string with bent elbow, release arrow with fully extended bow arm, recoil and lower bow poses facing UP RIGHT, three-quarter BACK. All images of SAME character. Keep cell registration exact. Very small magic glow only; no detached large effects. Clean crisp silhouettes, game animation production art.

### paladin

Runtime: `public/art/paladin-motion.webp` (1254 × 1254).

Generated source: `C:\Users\msynk\.codex\generated_images\01a1295b-2eb6-7083-8e57-73962abc141c\exec-4baf0993-f9da-464b-af05-90d49e582c35.png`.

Prompt:

> Production 2D fantasy game animation sprite sheet on transparent background, square canvas. Reference is identity and style reference ONLY. Use ONLY the blond bearded human PALADIN at middle middle, gold plate armor, blue white tabard, hammer. EXACTLY 16 full-body sprites in uniform 4 columns by 4 rows grid, each cell exactly one quarter canvas width and height. Consistent costume, anatomy, scale, face, painted style. Feet at 88% of cell height, character 73% of cell height, centered horizontally; generous transparent margins. No sprite, weapon, cape or effect crosses cell boundaries. No labels, grid lines, text, floor shadow or background. Clear anatomical pose changes and distinct leg strides, NOT repeated standing portraits. ROW 1 four chronological RUN cycle poses facing DOWN RIGHT three-quarter front: left foot forward with right leg bent behind, passing pose, right foot forward with left leg bent behind, passing pose. Arms counter-swing, torso leans, cloak moves. ROW 2 same four RUN poses facing UP RIGHT three-quarter BACK. ROW 3 four distinct hammer attack: wide grounded guard, lift hammer high overhead with twisting torso, forceful descending hammer strike, low hammer follow-through poses facing DOWN RIGHT, front three-quarter. ROW 4 same four hammer attack: wide grounded guard, lift hammer high overhead with twisting torso, forceful descending hammer strike, low hammer follow-through poses facing UP RIGHT, three-quarter BACK. All images of SAME character. Keep cell registration exact. Very small magic glow only; no detached large effects. Clean crisp silhouettes, game animation production art.

### priest

Runtime: `public/art/priest-motion.webp` (1254 × 1254).

Generated source: `C:\Users\msynk\.codex\generated_images\01a1295b-2eb6-7083-8e57-73962abc141c\exec-c80d3980-1930-4abf-917b-ee0bb5895249.png`.

Prompt:

> Production 2D fantasy game animation sprite sheet on transparent background, square canvas. Reference is identity and style reference ONLY. Use ONLY the blond human female PRIEST at middle right, ivory and gold robes, golden staff. EXACTLY 16 full-body sprites in uniform 4 columns by 4 rows grid, each cell exactly one quarter canvas width and height. Consistent costume, anatomy, scale, face, painted style. Feet at 88% of cell height, character 73% of cell height, centered horizontally; generous transparent margins. No sprite, weapon, cape or effect crosses cell boundaries. No labels, grid lines, text, floor shadow or background. Clear anatomical pose changes and distinct leg strides, NOT repeated standing portraits. ROW 1 four chronological RUN cycle poses facing DOWN RIGHT three-quarter front: left foot forward with right leg bent behind, passing pose, right foot forward with left leg bent behind, passing pose. Arms counter-swing, torso leans, cloak moves. ROW 2 same four RUN poses facing UP RIGHT three-quarter BACK. ROW 3 four distinct holy spell cast: hands close to chest, lift staff and draw free hand back, thrust free hand forward with small gold glow, arms lower through follow-through poses facing DOWN RIGHT, front three-quarter. ROW 4 same four holy spell cast: hands close to chest, lift staff and draw free hand back, thrust free hand forward with small gold glow, arms lower through follow-through poses facing UP RIGHT, three-quarter BACK. All images of SAME character. Keep cell registration exact. Very small magic glow only; no detached large effects. Clean crisp silhouettes, game animation production art.

### shaman

Runtime: `public/art/shaman-motion.webp` (1254 × 1254).

Generated source: `C:\Users\msynk\.codex\generated_images\01a1295b-2eb6-7083-8e57-73962abc141c\exec-06b70ce2-441f-4c8a-b064-3539837bfdad.png`.

Prompt:

> Production 2D fantasy game animation sprite sheet on transparent background, square canvas. Reference is identity and style reference ONLY. Use ONLY the green-skinned orc SHAMAN at bottom left, fur shoulders, tribal totem and hammer. EXACTLY 16 full-body sprites in uniform 4 columns by 4 rows grid, each cell exactly one quarter canvas width and height. Consistent costume, anatomy, scale, face, painted style. Feet at 88% of cell height, character 73% of cell height, centered horizontally; generous transparent margins. No sprite, weapon, cape or effect crosses cell boundaries. No labels, grid lines, text, floor shadow or background. Clear anatomical pose changes and distinct leg strides, NOT repeated standing portraits. ROW 1 four chronological RUN cycle poses facing DOWN RIGHT three-quarter front: left foot forward with right leg bent behind, passing pose, right foot forward with left leg bent behind, passing pose. Arms counter-swing, torso leans, cloak moves. ROW 2 same four RUN poses facing UP RIGHT three-quarter BACK. ROW 3 four distinct storm strike: low guard, pull hammer behind shoulder, sweeping forward hammer strike with small blue spark, recoil and settle poses facing DOWN RIGHT, front three-quarter. ROW 4 same four storm strike: low guard, pull hammer behind shoulder, sweeping forward hammer strike with small blue spark, recoil and settle poses facing UP RIGHT, three-quarter BACK. All images of SAME character. Keep cell registration exact. Very small magic glow only; no detached large effects. Clean crisp silhouettes, game animation production art.

### warlock

Runtime: `public/art/warlock-motion.webp` (1254 × 1254).

Generated source: `C:\Users\msynk\.codex\generated_images\01a1295b-2eb6-7083-8e57-73962abc141c\exec-64e6f450-bab8-4404-9e8a-5d47280fa4c7.png`.

Prompt:

> Production 2D fantasy game animation sprite sheet on transparent background, square canvas. Reference is identity and style reference ONLY. Use ONLY the pale undead male WARLOCK at bottom middle, long white hair, purple dark robes, skull staff. EXACTLY 16 full-body sprites in uniform 4 columns by 4 rows grid, each cell exactly one quarter canvas width and height. Consistent costume, anatomy, scale, face, painted style. Feet at 88% of cell height, character 73% of cell height, centered horizontally; generous transparent margins. No sprite, weapon, cape or effect crosses cell boundaries. No labels, grid lines, text, floor shadow or background. Clear anatomical pose changes and distinct leg strides, NOT repeated standing portraits. ROW 1 four chronological RUN cycle poses facing DOWN RIGHT three-quarter front: left foot forward with right leg bent behind, passing pose, right foot forward with left leg bent behind, passing pose. Arms counter-swing, torso leans, cloak moves. ROW 2 same four RUN poses facing UP RIGHT three-quarter BACK. ROW 3 four distinct fel spell cast: gather with hand near chest, raise skull staff and draw hand back, thrust free hand with small green flame forward, extended follow-through poses facing DOWN RIGHT, front three-quarter. ROW 4 same four fel spell cast: gather with hand near chest, raise skull staff and draw hand back, thrust free hand with small green flame forward, extended follow-through poses facing UP RIGHT, three-quarter BACK. All images of SAME character. Keep cell registration exact. Very small magic glow only; no detached large effects. Clean crisp silhouettes, game animation production art.

### druid

Runtime: `public/art/druid-motion.webp` (1254 × 1254).

Generated source: `C:\Users\msynk\.codex\generated_images\01a1295b-2eb6-7083-8e57-73962abc141c\exec-bce377d7-5ef7-4fc4-bc2f-5eba9b0f8f2c.png`.

Prompt:

> Production 2D fantasy game animation sprite sheet on transparent background, square canvas. Reference is identity and style reference ONLY. Use ONLY the purple-skinned female night-elf DRUID at bottom right, long green hair, antler crown, leaf armor and wooden staff. EXACTLY 16 full-body sprites in uniform 4 columns by 4 rows grid, each cell exactly one quarter canvas width and height. Consistent costume, anatomy, scale, face, painted style. Feet at 88% of cell height, character 73% of cell height, centered horizontally; generous transparent margins. No sprite, weapon, cape or effect crosses cell boundaries. No labels, grid lines, text, floor shadow or background. Clear anatomical pose changes and distinct leg strides, NOT repeated standing portraits. ROW 1 four chronological RUN cycle poses facing DOWN RIGHT three-quarter front: left foot forward with right leg bent behind, passing pose, right foot forward with left leg bent behind, passing pose. Arms counter-swing, torso leans, cloak moves. ROW 2 same four RUN poses facing UP RIGHT three-quarter BACK. ROW 3 four distinct nature spell cast: gather with hand near chest, twist torso and sweep staff behind shoulder, thrust staff and open hand forward with tiny green glow, lower staff follow-through poses facing DOWN RIGHT, front three-quarter. ROW 4 same four nature spell cast: gather with hand near chest, twist torso and sweep staff behind shoulder, thrust staff and open hand forward with tiny green glow, lower staff follow-through poses facing UP RIGHT, three-quarter BACK. All images of SAME character. Keep cell registration exact. Very small magic glow only; no detached large effects. Clean crisp silhouettes, game animation production art.

## Elemental impacts

Runtime: `public/art/elemental-impacts.webp` (1254 × 1254). Rows: holy, shadow, storm and nature. Four stages per row. Blending and fade are driven by simulation time. Frost, fire and arcane retain their existing sixteen-frame artwork.

Prompt:

> Production transparent 2D fantasy spell-impact animation atlas, EXACT uniform 4 columns x 4 rows on square canvas. Each cell equal square, fully isolated with transparent gutters, centered at same point and scale. No characters, text, labels, borders or background. Painted high-end action RPG VFX with brilliant core, richly textured luminous volume, subtle wispy falloff, clean readable silhouette. Each row is one different spell school progressing chronologically across 4 columns: compressed initial impact -> brilliant peak impact -> expanding dissipating volume -> scattered fading fragments. ROW 1 HOLY: warm ivory gold radiant sunburst with featherlike golden rays and tiny luminous motes. ROW 2 SHADOW: dark violet smoky implosion with magenta core, curling black-purple wisps, fractured spectral energy. ROW 3 STORM: electric cyan blue jagged lightning burst with branching lightning forks and a white core. ROW 4 NATURE: emerald luminous thorn-and-leaf burst, curved sharp green thorns, flying leaf fragments, warm lime core. Individual effect fits inside central 78% of each cell. Consistent center registration, no effect crosses a cell boundary. True transparent alpha, no black rectangular backgrounds.
