const paths: Record<string, string> = {
  shoulders:
    '<path d="m3 8 5-4 4 3 4-3 5 4-2 7-4-2-3 3-3-3-4 2Z"/><path d="m4 11 4-2m8 0 4 2M8 4l1 9m7-9-1 9"/>',
  cape: '<path d="m9 3 3 2 3-2 5 18-8-3-8 3Z"/><path d="M9 3c0-2 6-2 6 0M12 5v13M7 14l2-6m8 6-2-6"/>',
  belt: '<path d="M3 7h18v10H3Z"/><path d="M9 6h6v12H9Zm0 6h6m-3-2v4M3 10h3m12 0h3M3 14h3m12 0h3"/>',
  legs: '<path d="M5 3h14l1 18h-6l-2-12-2 12H4Z"/><path d="M5 6h14M6 16h4m4 0h4M12 3v6"/>',
  horse:
    '<path d="m6 21 2-8-3-2 1-5 5-4 1 4 5 3 3 1-1 4-6 1-1 6M8 13l5 2M6 6l-2-3 6 1"/><circle cx="13" cy="8" r=".6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  chest:
    '<path d="M3 10V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v14H3Zm0 0h18M9 3v18m6-18v18"/><path d="M10 10h4v5h-4Z"/>',
  rune: '<path d="m12 2 8 5v10l-8 5-8-5V7Z"/><path d="M12 6v12m-4-8 4-3 4 3m-8 4 4 3 4-3"/>',
  helmet:
    '<path d="M4 18v-7a8 8 0 0 1 16 0v7l-5 4v-8h-6v8Z"/><path d="M4 11h16M12 3v8"/>',
  gloves:
    '<path d="M7 22h11v-6l3-5c1-2-1-3-2-2l-2 2V4c0-2-3-2-3 0v5-6c0-2-3-2-3 0v6-4c0-2-3-2-3 0v7l-2-2c-2-2-4 0-2 2l3 5Z"/>',
  sword:
    '<path d="m14 3 7-1-1 7-10 10-5-5Z"/><path d="m4 13 7 7M7 17l-4 4M2 20l2 2"/>',
  staff:
    '<path d="m7 22 6-13M12 9c-4-1-4-6 0-7 3-1 6 1 5 4-1 3-4 4-5 3Z"/><path d="m9 16 4 2"/>',
  dagger:
    '<path d="m16 2 4 3-8 12-4-3Z"/><path d="m6 12 8 6M9 16l-4 6M3 20l4 3"/>',
  snow: '<path d="M12 2v20M3 7l18 10M3 17 21 7M8 4l4 3 4-3M8 20l4-3 4 3M3 11l4-1-1-4M21 13l-4 1 1 4M6 18l1-4-4-1M18 6l-1 4 4 1"/>',
  bow: '<path d="M5 2c16 4 16 16 0 20l4-10Z"/><path d="M5 12h17m-4-4 4 4-4 4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  moon: '<path d="M19 15A9 9 0 0 1 9 3a9 9 0 1 0 10 12Z"/><path d="m17 3 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/>',
  leaf: '<path d="M21 3C8 1 1 7 4 16c4 9 18 3 17-13Z"/><path d="M3 22 17 8M8 15l-1-5m6 0 5 1"/>',
  flame:
    '<path d="M13 2c1 5 5 5 6 10 2 6-2 10-7 10S3 18 5 12c1-3 4-4 4-8 2 1 3 3 3 6 3-3 1-5 1-8Z"/><path d="M12 13c-5 5-1 9 2 7 3-2 0-4-2-7Z"/>',
  lightning: '<path d="m14 2-9 12h6l-1 8 9-12h-6Z"/>',
  skull:
    '<path d="M6 15c-5-9 0-13 6-13s11 4 6 13v5H6Z"/><circle cx="8" cy="10" r="2"/><circle cx="16" cy="10" r="2"/><path d="m10 15 2-2 2 2M9 20v2m6-2v2"/>',
  paw: '<ellipse cx="12" cy="16" rx="7" ry="5"/><ellipse cx="4" cy="9" rx="2" ry="3"/><ellipse cx="10" cy="5" rx="2" ry="3"/><ellipse cx="16" cy="5" rx="2" ry="3"/><ellipse cx="21" cy="10" rx="2" ry="3"/>',
  shield:
    '<path d="m12 2 9 4v7c0 5-9 9-9 9s-9-4-9-9V6Z"/><path d="m8 12 3 3 6-6"/>',
  heart:
    '<path d="M12 21 3 12C-3 4 7-1 12 6c5-7 15-2 9 6Z"/><path d="M5 12h4l2-4 2 8 2-4h4"/>',
  boot: '<path d="M7 2h9v10l5 3v6H3v-6l4-4Z"/><path d="M7 6h9M8 15h6M3 18h18"/>',
  robe: '<path d="m8 2-6 6 4 5 2-2-2 11h12l-2-11 2 2 4-5-6-6-4 3Z"/><path d="M8 9h8m-8 5h8"/>',
  drop: '<path d="M12 2C8 8 3 12 5 17c3 8 14 5 14-2 0-4-4-8-7-13Z"/><path d="M8 15c0 2 1 3 3 3"/>',
  spark:
    '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="m20 2 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/>',
  whirl:
    '<path d="M12 3c10 0 12 16 1 18C3 23-2 9 8 6c7-2 12 7 6 10-4 2-8-4-4-6"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m12 12 9-9M18 2l4 0v4"/>',
  pickaxe:
    '<path d="M4 8C10 1 19 2 22 10L12 6Z"/><path d="m14 7-9 15-3-2L11 6"/>',
  anvil:
    '<path d="M2 6h20v4l-7 3v4l5 3v2H4v-2l5-3v-4l-7-3Z"/><path d="M9 2h10v4"/>',
  gear: '<path d="m9 2 1 3h4l1-3 4 2-1 3 2 3 3 1v4l-3 1-2 3 1 3-4 1-1-3h-4l-1 3-4-2 1-3-2-3-3-1v-4l3-1 2-3-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  fish: '<path d="M20 12c-5-11-13-5-15 0 2 5 10 11 15 0Zm-15 0-4-4v8Z"/><circle cx="15" cy="11" r="1"/><path d="m10 6-1-4 5 3"/>',
  potion:
    '<path d="M8 2h8v4l-2 1v4c9 6 5 11-2 11S1 17 10 11V7L8 6Z"/><path d="M7 16h10M9 3h6"/>',
  bomb: '<circle cx="11" cy="14" r="8"/><path d="m15 7 3-5M18 2h3m-3 0V0M7 11l-1 3"/>',
  gem: '<path d="m6 2 12 0 5 7-11 14L1 9Z"/><path d="M1 9h22M6 2l2 7 4 14 4-14 2-7"/>',
  totem:
    '<path d="M6 22V4l6-2 6 2v18ZM3 9h18M3 16h18M9 6l3 2 3-2M9 12l3 2 3-2M9 19h6"/>',
  crown: '<path d="m2 6 5 5 5-8 5 8 5-5-3 14H5Z"/><path d="M6 16h12"/>',
  camp: '<path d="m3 15 9-13 9 13H3Zm3 6 6-9 6 9M1 22h22M17 5l3-3"/>',
  map: '<path d="m2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3Z"/><path d="M9 2v17M15 5v17"/>',
  book: '<path d="M2 3c5-2 8 0 10 2 2-2 5-4 10-2v17c-5-2-8 0-10 2-2-2-5-4-10-2Z"/><path d="M12 5v17M5 7h4M5 11h4M15 7h4M15 11h4"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 5v14m4-11c-4-5-11 3-4 4 7 1 0 8-4 4"/>',
  arrow: '<path d="M3 12h18m-7-7 7 7-7 7"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  lock: '<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v4"/>',
  close: '<path d="m5 5 14 14M5 19 19 5"/>',
  volume:
    '<path d="M3 9h5l6-5v16l-6-5H3Z"/><path d="M18 8c3 2 3 6 0 8M20 4c5 4 5 12 0 16"/>',
  mute: '<path d="M3 9h5l6-5v16l-6-5H3ZM18 9l4 6M18 15l4-6"/>',
  pause: '<path d="M7 4v16M17 4v16"/>',
  play: '<path d="m7 3 14 9-14 9Z"/>',
  download: '<path d="M12 2v13m-5-5 5 5 5-5M3 17v5h18v-5"/>',
  upload: '<path d="M12 17V3m-5 5 5-5 5 5M3 17v5h18v-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
};
const aliases: Record<string, string> = {
  warrior: "sword",
  mage: "snow",
  rogue: "dagger",
  hunter: "bow",
  paladin: "shield",
  priest: "sun",
  shaman: "lightning",
  warlock: "skull",
  druid: "leaf",
};
export function icon(name: string, size = 20, css = ""): string {
  return `<svg class="icon ${css}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[aliases[name] || name] || paths.spark}</svg>`;
}
export const logo =
  '<svg class="brand-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 4 43 26 57 18 48 44 32 59 16 44 7 18 21 26Z" stroke="currentColor" stroke-width="1.6"/><path d="m19 27 7 18 6-10 6 10 7-18M17 48h30" stroke="currentColor" stroke-width="2"/><path d="M32 12v9" stroke="currentColor"/></svg>';
