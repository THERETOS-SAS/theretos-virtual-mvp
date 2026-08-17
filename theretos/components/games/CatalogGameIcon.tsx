type OfficialGameSlug =
  | "atrapa-monedas"
  | "tap-frenetico"
  | "revienta-globos"
  | "golpea-topos"
  | "bolas";

type CatalogGameIconProps = {
  gameSlug: OfficialGameSlug;
};

const commonProps = {
  viewBox: "0 0 64 64",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
  className: "catalog-game-icon",
};

function CoinCatchIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="32" cy="14" r="8" fill="currentColor" fillOpacity=".12" />
      <path d="M32 10v8M28.5 12.5h5.2c2.8 0 2.8 3.5 0 3.5h-3.4" />
      <path d="M22 6l-2.5 4M42 6l2.5 4M32 27v5" strokeDasharray="2 4" />
      <path d="M14 36h36l-4.5 18h-27L14 36Z" fill="currentColor" fillOpacity=".08" />
      <path d="M20 36l3 18M44 36l-3 18M27 36l1 18M37 36l-1 18" />
      <path d="M11 31c4 2.5 7 3 11 3M53 31c-4 2.5-7 3-11 3" />
    </svg>
  );
}

function FreneticTapIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="29" cy="24" r="8" fill="currentColor" fillOpacity=".1" />
      <circle cx="29" cy="24" r="14" strokeDasharray="3 5" opacity=".72" />
      <path d="M29 8V4M13 24H9M18 13l-3-3M40 13l3-3" />
      <path d="M29 22v18l-4-5.5a4 4 0 0 0-6.5 4.6l9 12.9h16.2c3.5-5 5.3-9.4 5.3-13.4V31a3.2 3.2 0 0 0-6.4 0v4-6a3.2 3.2 0 0 0-6.4 0v5-8a3.2 3.2 0 0 0-6.4 0v8" fill="currentColor" fillOpacity=".08" />
      <path d="M51 10l-5 7h5l-4 7" />
    </svg>
  );
}

function BalloonPopIcon() {
  return (
    <svg {...commonProps}>
      <path d="M32 8c-10 0-17 8.3-17 18.5 0 9.2 6.7 16.7 15.5 18.2L28 49h8l-2.5-4.3C42.3 43.2 49 35.7 49 26.5 49 16.3 42 8 32 8Z" fill="currentColor" fillOpacity=".1" />
      <path d="M28 49c5 3 2 6 5 9" />
      <path d="M48 7l2.3 5.2L56 14l-5.7 1.8L48 21l-2.3-5.2L40 14l5.7-1.8L48 7Z" />
      <path d="M23 20c1.6-3.5 4.4-5.5 8-6" opacity=".75" />
    </svg>
  );
}

function WhackAMoleIcon() {
  return (
    <svg {...commonProps}>
      <ellipse cx="30" cy="51" rx="20" ry="6" fill="currentColor" fillOpacity=".08" />
      <path d="M19 48v-9c0-8 5-14 12-14s12 6 12 14v9" fill="currentColor" fillOpacity=".1" />
      <path d="M23 28l-4-7 8 3M39 28l4-7-8 3" />
      <circle cx="27" cy="36" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="35" cy="36" r="1.3" fill="currentColor" stroke="none" />
      <path d="M28 42c2 1.5 4 1.5 6 0" />
      <path d="M42 14L53 3l6 6-11 11" fill="currentColor" fillOpacity=".09" />
      <path d="M39 17l7 7M45 10l7 7" />
      <path d="M12 22l4 2-4 2M16 16l2 4" />
    </svg>
  );
}

function BallsIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="18" cy="43" r="8" fill="currentColor" fillOpacity=".14" />
      <path d="M17 34C19 20 29 12 42 14" strokeDasharray="3 4" />
      <path d="M37 9l6 5-7 4" />
      <rect x="40" y="30" width="10" height="10" rx="1.5" transform="rotate(12 45 35)" fill="currentColor" fillOpacity=".08" />
      <path d="M30 47h12v10H30z" fill="currentColor" fillOpacity=".08" />
      <path d="M50 19l5 5-5 5-5-5 5-5Z" fill="currentColor" fillOpacity=".08" />
      <path d="M9 31c2-3 4-5 7-7M22 52c3 1 6 1 9 0" />
    </svg>
  );
}

const catalogIcons: Record<OfficialGameSlug, () => React.JSX.Element> = {
  "atrapa-monedas": CoinCatchIcon,
  "tap-frenetico": FreneticTapIcon,
  "revienta-globos": BalloonPopIcon,
  "golpea-topos": WhackAMoleIcon,
  bolas: BallsIcon,
};

export function CatalogGameIcon({ gameSlug }: CatalogGameIconProps) {
  const Icon = catalogIcons[gameSlug];
  return <Icon />;
}

export function isOfficialGameSlug(slug: string): slug is OfficialGameSlug {
  return slug in catalogIcons;
}

