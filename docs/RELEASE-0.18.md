# v0.18 — Free-port servers and original adaptive music

## Design recorded before implementation

Local development and preview should bind the first available port beginning at 5173 / 4173 and open the actual URL. Playwright and capture tools must also follow the URL they start rather than assuming 5176 or reusing an unrelated service. Vite's [server options](https://vite.dev/config/server-options) document fallback binding; Playwright's [webServer wait option](https://playwright.dev/docs/api/class-testconfig#test-config-web-server) supports named stdout captures exported to worker environment. Use that feature with the built-in baseURL fixture. Capture scripts should own their server/browser and close both, with an explicit URL override for an existing session.

Continue the research plan's authored music phase with original, locally synthesized compositions. Provide camp, woodland, frontier, haunted, mine, ember, boss, recovery, victory and defeat cues. Lead, pad and bass layers plus an optional danger pulse use bounded Web Audio scheduling, independent music enable/volume controls, and a default-off migration so an old muted save does not gain sound. The authored note sequences, rhythms and instruments are original game content; no external recordings, copied Warcraft themes or runtime downloads are needed.

Scene changes crossfade briefly. Critical health adds a restrained pulse within the selected expedition/boss cue. Pause, upgrade/blessing choices, hidden pages and focus loss silence expedition playback and stop scheduling; resume continues from the held musical position. Recovery and results have their own cues. Camp music continues through camp menus. Audio begins only after user interaction and cannot make gameplay or saving depend on browser audio support. Settings show playback status and accessible volume choices that work with keyboard, touch and the existing controller navigation. Keep save version/key v1 and all encounter/progression values.

## Verification plan

Occupy ports and verify fallback URLs, independent simultaneous servers, game responses and cleanup. Run browser cases while the preferred port is occupied to prove actual dynamic baseURL capture. Exercise capture ownership and an explicit URL override. Test all compositions for bounded valid notes, timing, scene selection, pause/continuation and save migration. Browser checks use actual Web Audio graphs plus isolated scheduling diagnostics to verify volume/mute, scene transitions, pause/focus safety, bounded voices, reload, independent effects and controller-accessible settings. Inspect desktop/phone audio controls, run all existing quality gates, and record remaining audible/device evaluation.

## Implemented compositions and playback

| Cue      | Original title     | Tempo (BPM) | Context                              |
| -------- | ------------------ | ----------- | ------------------------------------ |
| Camp     | Lanterns at Rest   | 66          | Camp and its menus                   |
| Woodland | Under Green Boughs | 80          | Elwynn Forest                        |
| Frontier | Dust on the Road   | 88          | Westfall                             |
| Haunted  | Beyond the Lantern | 64          | Tirisfal, Duskwood and Shadowfang    |
| Mine     | Timber and Iron    | 74          | Deadmines                            |
| Ember    | Beneath the Ember  | 92          | Ragefire Chasm                       |
| Boss     | Stand Your Ground  | 120         | Outdoor bosses and dungeon guardians |
| Recovery | A Small Fire       | 60          | Dungeon recovery choices             |
| Victory  | The Road Remembers | 96          | Successful results                   |
| Defeat   | Until Another Dawn | 54          | Defeat and partial-return results    |

`src/music.ts` records the original MIDI melodies, four chord roots, tempos, arrangement and scene selection. Each four-bar loop uses half-beat steps and a sixteen-step melody repeated over the harmony. Sine lead/bass/pulse and triangle pad oscillators use individual attack/decay envelopes through a low-pass filter and independent music master gain. These are compact synthesized arrangements, not orchestral recordings. Critical health below 25% adds the pulse; recovery and results omit it.

`src/music-player.ts` owns a lazy AudioContext, a 160 ms scheduling horizon, a maximum of 32 live voices and at most two scene buses. A scene change releases the previous voices over 200 ms and fades in the new score over 250 ms. Pause/mute releases sources over 60 ms. The transport rewinds unplayed lookahead steps when held, resumes from the retained step/delay, and skips missed beats rather than creating a catch-up burst. Ended sources and retired buses disconnect. Browser context creation/resume failures produce a readable Settings status; effects also swallow rejected resume requests.

Audio scheduling and node automation use the [Web Audio specification](https://www.w3.org/TR/webaudio-1.0/) and [MDN scheduling techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques). The note sequences, instrument envelopes, scene rules and musical timing are this game's original design.

Music starts off at volume 50%. The volume selector offers mute, 25%, 50%, 75% and 100%, retaining a nonstandard valid imported value as an extra option. Version-1 saves migrate without enabling music, preserve effect/visual choices and clamp volume to 0–100. Import and reload retain the controls. A user gesture unlocks audio; native pointer/keyboard input and controller settings use the existing UI handlers. Gameplay never waits for audio.

## Local server ownership

`npm run dev` and `npm run preview` open their actual URLs, starting the port search at 5173 and 4173 respectively. `--port N` changes the starting point and `--no-open` suppresses browser opening. Binding uses Vite's own retry, avoiding a separate free-port probe that could race another process.

Playwright captures `WOW_SURVIVORS_URL` from its own server's stdout into its baseURL environment. It always owns a new server. All fifteen capture scripts use `openCaptureSession`, follow its actual URL and close browser/server in `finally`. An explicit `WOW_SURVIVORS_URL` environment override uses an existing HTTP(S) server and closes only the owned browser. Tests and captures can coexist with development sessions.

## Verification and remaining evaluation

Verification results are recorded in [Validation](VALIDATION.md). Reproduce collision, preview and capture checks with `node scripts/check-local-server.mjs`; append `--browser` for the full browser suite while port 5173 is occupied. Build before checking preview.

All **307 unit checks** and **124 browser cases** pass, with the complete browser run using its captured fallback URL while 5173 is occupied. The eight music cases also pass after the final pause-envelope refinement. Development/preview fallback, owned/external capture cleanup and a standard capture run are verified; the collision harness exits cleanly after closing its blocker sockets. Type checking, production build and formatting pass. Music settings fit all six capture widths, and phone/desktop screenshots were visually inspected.

The browser music fixtures retain native AudioContext time and production controls, combat, guardian death, settlement and scene selection. Routed test references shorten arrival and guardian health and suppress incidental spawns; the application adds no runtime test hooks. OfflineAudioContext rendering checks all ten cues for finite, non-silent and bounded sample output. These checks establish playback and scheduling behavior, not subjective composition quality, headphone/speaker balance, physical-controller audio activation or certification across Safari, Firefox and mobile devices. Listening and device review remain a separate production pass.
