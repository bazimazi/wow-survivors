import { spawn } from "node:child_process";
import fs from "node:fs/promises";
const profiles = [
  ["starter", [], "starter"],
  ["core-heroic", ["--advanced"], "core-heroic"],
  ["trainer-heroic", ["--spellbook"], "trainer-heroic"],
  ["wardrobe-heroic", ["--wardrobe"]],
  ["wardrobe-deadmines-entry", ["--wardrobe", "--dungeon", "--entry"]],
  [
    "wardrobe-ragefire-entry",
    ["--wardrobe", "--dungeon", "--entry", "--ragefire"],
  ],
];
const summary = [];
for (const [name, flags, baseline] of profiles) {
  const output = await new Promise((resolve, reject) => {
    const p = spawn(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/balance.ts", ...flags],
      { windowsHide: true },
    );
    let stdout = "",
      stderr = "";
    p.stdout.on("data", (v) => (stdout += v));
    p.stderr.on("data", (v) => (stderr += v));
    p.on("error", reject);
    p.on("close", (code) => (code ? reject(Error(stderr)) : resolve(stdout)));
  });
  const rows = output.trim().split(/\r?\n/).map(JSON.parse),
    outcomes = rows.flatMap((r) => r.outcomes);
  const path = `output/balance-0.13-${name}.jsonl`;
  await fs.writeFile(path, output);
  const previous = baseline
    ? (await fs.readFile(`output/balance-0.12-${baseline}.jsonl`, "utf8"))
        .trim()
        .split(/\r?\n/)
        .map(JSON.parse)
    : null;
  const successful = outcomes.filter((o) => o.victory);
  const report = {
    name,
    victories: successful.length,
    attempts: outcomes.length,
    timeouts: outcomes.filter((o) => o.timedOut).length,
    firstLevelRange: [
      Math.min(...rows.flatMap((r) => r.firstLevelSeconds)),
      Math.max(...rows.flatMap((r) => r.firstLevelSeconds)),
    ],
    successfulDuration: successful.length
      ? [
          Math.min(...successful.map((o) => o.seconds)),
          Math.max(...successful.map((o) => o.seconds)),
        ]
      : null,
    unchangedFrom012: previous
      ? JSON.stringify(previous) === JSON.stringify(rows)
      : null,
  };
  summary.push(report);
  console.log(JSON.stringify(report));
}
await fs.writeFile(
  "output/wardrobe-balance-0.13.json",
  JSON.stringify(summary, null, 2),
);
