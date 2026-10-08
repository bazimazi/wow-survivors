import { readFile } from "node:fs/promises";

/** Releases 0.12–0.15 intentionally share the same three unchanged profiles. */
export function readBalanceBaseline(name) {
  const common =
    /^balance-0\.(?:12|13|14|15)-(starter|core-heroic|trainer-heroic)\.jsonl$/.exec(
      name,
    );
  const file = common ? `${common[1]}.jsonl` : name;
  if (!/^[a-z0-9.-]+\.(?:json|jsonl)$/.test(file))
    throw new Error(`Invalid balance baseline: ${name}`);
  return readFile(
    new URL(`../tests/fixtures/balance/${file}`, import.meta.url),
    "utf8",
  );
}
