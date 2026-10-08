import { readdir, readFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(join(directory, entry.name))
          : [join(directory, entry.name)],
      ),
    )
  ).flat();
}
const sourceFiles = [
  ...(await files(join(root, "src"))),
  join(root, "index.html"),
];
const sources = (
  await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")))
).join("\n");
const assets = await files(join(root, "public"));
const unused = assets.filter(
  (file) =>
    !file.endsWith("-OFL.txt") &&
    !sources.includes(
      "/" + relative(join(root, "public"), file).replaceAll("\\", "/"),
    ),
);
if (unused.length)
  throw new Error(
    `Unreferenced runtime assets: ${unused.map((file) => relative(root, file)).join(", ")}`,
  );
execFileSync(
  "git",
  ["check-ignore", "--no-index", "output/generated-check.json"],
  { cwd: root, stdio: "pipe" },
);
const trackedOutput = execFileSync("git", ["ls-files", "output"], {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
const surviving = [];
for (const file of trackedOutput) {
  try {
    await stat(join(root, file));
    surviving.push(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (surviving.length)
  throw new Error(
    `${surviving.length} generated files are still tracked and present. Remove generated output before committing the cleanup.`,
  );
const bytes = (
  await Promise.all(assets.map(async (file) => (await stat(file)).size))
).reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify(
    {
      referencedRuntimeAssets: assets.length,
      runtimeBytes: bytes,
      generatedOutputIgnored: true,
      generatedFilesRemoved: trackedOutput.length,
      balanceFixtures: (await files(join(root, "tests/fixtures/balance")))
        .length,
    },
    null,
    2,
  ),
);
