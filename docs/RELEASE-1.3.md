# The Wilds Await — 1.3

The camp now centers on choosing a hero and a battle, with the selected hero standing in an illustrated forest camp. A responsive roster keeps all nine classes available, while the mission card shows the destination, challenge, oath, co-op selection and launch action. Camp services opens the existing class, profession, travel and faction journeys; Difficulty & build opens expedition preparation. Other camp screens retain their dedicated navigation and single reader.

## Combat rhythm

- The first outdoor horde arrives at 20 seconds; subsequent hordes arrive every 35 seconds. They approach in an arc from east, south, west and north in rotation.
- A four-second warning announces the approach and marks its side of the screen. Spawn pressure eases after a horde so the player can collect gems and reposition, then rises before the next one.
- Every 15 consecutive kills awards a Soul Surge: 2.5 seconds of increased pickup attraction. The existing five-second streak timeout and damage reset remain authoritative. Gems travel toward the hero; they are not instantly credited.
- Dungeons retain their existing room timing, guardian fights and recovery choices. The director is an explicit engine option so standalone simulations can still exercise the established pacing.

## Battlefield presentation

Painted ground replaces the block texture; outdoor props are now actually included in the depth-sorted actor list. The clearing is surrounded by trees and rocks with the existing occlusion fade and wind motion. A worn stone path, illustrated shrines, treasure, ritual stones and natural ponds give exploration points recognizable silhouettes.

Pickups glow by type, wounded ordinary enemies show small health bars, and hits emit bounded sparks. Criticals and player damage add a short camera kick when screen shake is enabled. A restrained low-health vignette, chapter/progress strip, directional warnings and dash countdown communicate the current situation. Announcements stop progressing with combat and expire on the simulation clock.

Hero previews wait for the source image to load before caching the crop. This prevents an empty preview being cached while the browser has image dimensions but has not finished decoding. They use the original high-resolution painted hero, a breathing cycle, grounded shadow and class-colored motes. Reduced motion holds the pose and removes moving motes.

## Compatibility and controls

Saved characters, gear, currencies, professions, campaigns and settings keep their existing schema. WASD moves, Space dashes, C uses the class signature, T uses equipment, Q heals, E throws a bomb and Escape pauses. Co-op, controller navigation, touch controls, import/export and the established reward settlement remain available.

Generated artwork ships as local WebP assets. No external service is required at runtime. See [art provenance and prompts](citadel-art.md).

## Validation

The production build and repository asset check pass. The unit suite covers both existing progression and the new director, including warning/spawn timing, pause, pickup attraction expiry and dungeon isolation. Browser checks cover departure layout at desktop and phone sizes, live preparation, real hordes, combat input, upgrades, crafting, equipment, saves, controller input, guardian journeys, interpolation, reduced motion and rendering with 400 enemies. Screenshots are retained under the ignored `output/citadel-qa/` directory.
