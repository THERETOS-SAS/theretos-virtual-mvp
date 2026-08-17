export const playableGameSlugs = [
  "atrapa-monedas",
  "tap-frenetico",
  "revienta-globos",
  "golpea-topos",
  "bolas",
] as const;

export type PlayableGameSlug = (typeof playableGameSlugs)[number];

export function isPlayableGameSlug(slug: string): slug is PlayableGameSlug {
  return playableGameSlugs.includes(slug as PlayableGameSlug);
}
