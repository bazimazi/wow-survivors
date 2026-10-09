import type { GearDef } from "./content";

export const INVENTORY_CAP = 1000;
export function baseGearId(id: string): string {
  return id.split("~", 1)[0];
}
const protectedBase = (id: string) =>
  id.startsWith("starter_") ||
  ["cloth", "leather", "mail", "plate"].includes(id);
export function instanceCatalog(
  catalog: Record<string, GearDef>,
): Record<string, GearDef> {
  const cache = new Map<string, GearDef>();
  const resolve = (id: string): GearDef | undefined => {
    if (Object.hasOwn(catalog, id)) return catalog[id];
    if (id.length > 120 || !/^[a-z0-9_]+~[1-9][0-9]{0,5}$/.test(id))
      return undefined;
    const base = baseGearId(id);
    if (!Object.hasOwn(catalog, base) || protectedBase(base)) return undefined;
    if (!cache.has(id)) {
      if (cache.size >= INVENTORY_CAP) cache.delete(cache.keys().next().value!);
      cache.set(id, {
        ...catalog[base],
        id,
        name: `${catalog[base].name} #${id.split("~")[1]}`,
      });
    }
    return cache.get(id);
  };
  return new Proxy(catalog, {
    get: (_, key) => (typeof key === "string" ? resolve(key) : undefined),
    getOwnPropertyDescriptor: (_, key) => {
      const value = typeof key === "string" ? resolve(key) : undefined;
      return value
        ? { value, configurable: true, enumerable: true, writable: false }
        : undefined;
    },
  });
}
export function nextInstanceId(
  inventory: readonly string[],
  base: string,
): string | null {
  if (inventory.length >= INVENTORY_CAP || protectedBase(base)) return null;
  const used = new Set(inventory);
  for (let serial = 1; serial <= INVENTORY_CAP; serial++) {
    const id = `${base}~${serial}`;
    if (!used.has(id)) return id;
  }
  return null;
}
export function rollSeed(text: string): number {
  let hash = 2166136261;
  for (const letter of text)
    hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return hash >>> 0;
}
