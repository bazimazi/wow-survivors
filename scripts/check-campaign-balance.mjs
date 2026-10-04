import { spawn } from "node:child_process";
import fs from "node:fs/promises";
const profiles = [
  ["starter", []],
  ["core-heroic", ["--advanced"]],
  ["trainer-heroic", ["--spellbook"]],
  ...["timbermaw", "thorium", "argent"].map((f) => [
    `exalted-${f}`,
    [`--campaign=${f}`],
  ]),
];
const summary = [];
for (const [name, flags] of profiles) {
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
    outcomes = rows.flatMap((r) => r.outcomes),
    wins = outcomes.filter((o) => o.victory);
  await fs.writeFile(`output/balance-0.15-${name}.jsonl`, output);
  const baseline = !name.startsWith("exalted-")
    ? JSON.parse(
        `[${(await fs.readFile(`output/balance-0.14-${name}.jsonl`, "utf8")).trim().split(/\r?\n/).join(",")}]`,
      )
    : null;
  const report = {
    name,
    victories: wins.length,
    attempts: outcomes.length,
    timeouts: outcomes.filter((o) => o.timedOut).length,
    firstLevelRange: [
      Math.min(...rows.flatMap((r) => r.firstLevelSeconds)),
      Math.max(...rows.flatMap((r) => r.firstLevelSeconds)),
    ],
    successfulDuration: wins.length
      ? [
          Math.min(...wins.map((o) => o.seconds)),
          Math.max(...wins.map((o) => o.seconds)),
        ]
      : null,
    unchangedFrom014: baseline
      ? JSON.stringify(baseline) === JSON.stringify(rows)
      : null,
  };
  if (baseline && !report.unchangedFrom014)
    throw Error(`Changed baseline: ${name}`);
  summary.push(report);
  console.log(JSON.stringify(report));
}
await fs.writeFile(
  "output/campaign-balance-0.15.json",
  JSON.stringify(summary, null, 2),
);
