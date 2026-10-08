# v0.17 — Controller support

## Design recorded before implementation

Continue the controller phase named in [the research plan](RESEARCH.md). Use the browser's [Gamepad API](https://www.w3.org/TR/gamepad/) and its standard positional mapping; [MDN's usage guide](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API) describes polling fresh state and browser exposure after device interaction. Support one active standard-mapped controller, including sparse device indices, without guessing vendor layouts. Controls are original game design. Keep save version 1 and all progression and encounter values.

Left stick or D-pad moves; a radial 20% dead zone removes drift and rescales the remaining analog range. Bottom face button (A / Cross) uses the class ability, right (B / Circle) dashes, left (X / Square) heals, top (Y / Triangle) throws a bomb. Left shoulder interacts, right shoulder toggles travel, View / Create toggles fieldwork and Menu / Options pauses.

Camp, settings, reviews, results and paused choices must be navigable. Stick or D-pad moves focus; bottom confirms, right goes back, shoulders switch camp tabs, triggers cycle every visible enabled control, and right stick scrolls. Left/right on a focused select changes its value through the existing change handler. Checkboxes and expandable guides retain native behavior. Focus stays within an open modal and survives camp rerenders where the same control remains. Show a clear focus outline, controller help and context-sensitive hints. Keyboard, mouse and touch remain available and restore their hints when used.

Actions fire on press, without repeated consumable use. Menu movement has a bounded repeat delay. Every modal or game transition requires neutral controls before accepting another controller action; held input cannot confirm a newly opened review, leak into combat or resume after focus loss. Disconnection clears movement and pauses an active expedition; reconnecting requires an explicit resume. Unsupported mappings or unavailable browser access get a readable help status. Polling failure must leave ordinary input usable.

## Verification plan

Test dead zones, finite/clamped movement, D-pad diagonals, sparse devices, ownership, edge presses, repeats, neutral gates, disconnect and suspended input. Browser fixtures replace only navigator device state and expose the engine through a routed test page. Exercise actual camp navigation, selects, settings, combat actions, supplies, choices, landmarks, dungeon recovery, pause/reconnect, mixed keyboard/touch use and responsive controller hints. Run strict type checking, build, simulation/progression and browser regression checks. Visually inspect desktop and phone focus/help/HUD captures. Physical controller and Bluetooth/browser-specific testing remain a manual evaluation.

## Implemented controls and integration

`controller.ts` contains a browser-independent sampler. It selects an active standard controller by interaction, keeps sparse indices and device identity, clamps finite analog input, normalizes D-pad diagonals, and emits button presses once per release. Navigation repeats after 350 ms, then at most once every 120 ms; elapsed time never produces a catch-up burst. Screen changes and focus loss require neutral buttons and both sticks before accepting input. The controller that exposes itself to the browser cannot immediately activate the first focused control.

`controller-ui.ts` handles visible, enabled buttons, links, selectors, checkboxes and guide summaries. Directional navigation follows rendered geometry; triggers provide a complete sequential path. Modal navigation stays inside the dialog. Left/right or confirm changes a focused selector through its existing change event. Stable IDs and action identities restore focus after camp renders. The right stick scrolls the closest scrollable menu or the camp page. Controllers call the same click/change handlers used by existing input, including transaction reviews, consumables and settlement.

The main loop polls before fixed-step simulation. Touch movement has priority when present, then held keyboard movement, then controller movement; neutral polling never cancels an active touch gesture. Keyboard or pointer activity restores keyboard hints. Controller activity restores positional prompts, focus outlines and a menu help strip. Settings and the field guide show detection, unsupported-layout and unavailable-access states. Missing or blocked browser APIs leave ordinary input available. Removing the active controller clears movement and opens the ordinary pause dialog; an existing upgrade, shrine or checkpoint remains frozen until an explicit choice.

Save schema/key v1, character progression, equipment, spells, encounter values and headless combat remain compatible. Package and camp version are 0.17. A Prettier `endOfLine: auto` configuration makes format checks respect Windows CRLF checkouts and Unix LF files without changing existing source formatting.

## Verification evidence

All **294 simulation/progression checks** pass, including thirteen controller checks. The new tests cover drift, analog strength/direction, malformed axes, D-pad diagonals, sparse indices, single-device ownership, unsupported layouts, press edges, trigger thresholds, delayed repeat, neutral transitions, hidden/focus suspension, disconnect/replacement and real engine movement. Strict TypeScript and production build pass. Repository formatting passes with the cross-platform line-ending configuration.

All **11 controller browser flows** pass. They replace navigator device state and expose the engine only through routed test responses; no production test hook is shipped. Fixtures isolate threats and progression clocks for input assertions. Real UI handlers, combat updates, class ability costs/cooldowns, dash, healing, bomb consumption, travel, landmark blessings, guardian defeat/recovery, upgrade selection, reviewed spell training, return settlement, save reload and touch gestures run through production code. Held buttons do not confirm newly opened screens, spend supplies repeatedly or activate combat abilities after a choice. Reconnect and focus-loss checks verify frozen time and explicit resume. Unsupported mappings and blocked access generate readable status with functional keyboard play.

The full browser regression suite passes **116/116 cases**, including those eleven flows, in 6.2 minutes. Existing keyboard gameplay, camp progression, saves, professions, equipment, travel, campaigns, all seven destinations and dense rendering remain covered. The log is `output/browser-0.17.log`; reproduce with `npm run test:e2e`.

Camp/settings and combat captures fit 360 / 390 / 760 / 800 / 1024 / 1440 widths. Focused dialogs fit within the viewport and controller help remains scrollable. Desktop/phone settings and phone combat captures were visually inspected. Screenshots are `output/screenshots/controller-settings-*.png` and `controller-combat-*.png`; reproduce them with `npx playwright test tests/e2e/controller.spec.ts --grep "six viewport"`.

## Remaining evaluation

Navigator fixtures verify software behavior, not physical USB/Bluetooth compatibility, browser-specific device mapping, real stick drift or controller feel. Test actual controllers on intended browsers before treating this as hardware certification. Custom bindings, nonstandard layouts and haptics remain future work. Native save-file picker/download interfaces are provided by the browser and operating system.
