import { readBalanceBaseline } from "./balance-baselines.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
const cloudAware = process.argv.includes("--cloud-aware");
await fs.mkdir("output", { recursive: true });
const profiles = cloudAware
  ? [
      ["duskwood-cloud-aware", ["--duskwood", "--entry", "--cloud-aware"]],
      [
        "duskwood-cloud-aware-wardrobe",
        ["--duskwood", "--entry", "--wardrobe", "--cloud-aware"],
      ],
    ]
  : [
      ["starter", []],
      ["core-heroic", ["--advanced"]],
      ["trainer-heroic", ["--spellbook"]],
      ["duskwood-entry", ["--duskwood", "--entry"]],
      ["duskwood-wardrobe", ["--duskwood", "--entry", "--wardrobe"]],
    ];
const reports = [];
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
  const baseline = name.startsWith("duskwood")
    ? null
    : (await readBalanceBaseline(`balance-0.15-${name}.jsonl`))
        .trim()
        .split(/\r?\n/)
        .map(JSON.parse);
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
    unchanged: baseline
      ? JSON.stringify(rows) === JSON.stringify(baseline)
      : null,
  };
  await fs.writeFile(`output/balance-0.16-${name}.jsonl`, output);
  reports.push(report);
  console.log(JSON.stringify(report));
  if (baseline && !report.unchanged)
    throw Error(`Unexpected baseline change: ${name}`);
}
if (cloudAware) {
  const earlier = JSON.parse(
    await readBalanceBaseline("duskwood-balance-0.16.json"),
  );
  reports.unshift(
    ...earlier.filter((r) => !reports.some((next) => next.name === r.name)),
  );
}
await fs.writeFile(
  "output/duskwood-balance-0.16.json",
  JSON.stringify(reports, null, 2) + "\n",
);
