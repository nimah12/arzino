import {
  Award,
  Banknote,
  CircleDollarSign,
  Coins,
  DollarSign,
  Euro,
  Gem,
  Medal,
  PoundSterling,
  Sparkles,
  TurkishLira,
  type LucideIcon,
} from "lucide-react";

/** Lucide icon per asset id — replaces the old emoji row icons. */
const ASSET_ICONS: Record<string, LucideIcon> = {
  usd: DollarSign,
  eur: Euro,
  gbp: PoundSterling,
  aed: Banknote,
  try: TurkishLira,
  gold18: Medal,
  "gold-gr": Sparkles,
  coin: CircleDollarSign,
  "half-coin": Coins,
  tether: Gem,
  "coin-fardi": Award,
};

/**
 * Per-asset theme colors: gold instruments use --gold and currencies use
 * --accent. Pass `uniform` to AssetIcon to fall back to the single muted
 * --text-secondary color, or `color` to override any asset explicitly.
 */
export const ASSET_COLORS: Record<string, string> = {
  usd: "var(--accent)",
  eur: "var(--accent)",
  gbp: "var(--accent)",
  aed: "var(--accent)",
  try: "var(--accent)",
  tether: "var(--accent)",
  gold18: "var(--gold)",
  "gold-gr": "var(--gold)",
  coin: "var(--gold)",
  "half-coin": "var(--gold)",
  "coin-fardi": "var(--gold)",
};

const UNIFORM_COLOR = "var(--text-secondary)";

/**
 * Resolve the display color for an asset — the single source of truth for
 * both the icon and any surrounding label that should harmonize with it.
 * Same override rules as the AssetIcon component (`color` wins, `uniform`
 * forces the muted color).
 */
export function assetColor(
  name: string,
  opts: { color?: string; uniform?: boolean } = {}
): string {
  if (opts.uniform) return UNIFORM_COLOR;
  return opts.color ?? ASSET_COLORS[name] ?? UNIFORM_COLOR;
}

/**
 * Theme-colored asset icon. By default each asset uses its per-asset color
 * (gold → --gold, currencies → --accent); `uniform` restores the previous
 * single muted look, and `color` overrides everything. Pass a localized
 * `title` to add a native tooltip on hover.
 */
export default function AssetIcon({
  name,
  size = 16,
  className = "",
  color,
  uniform = false,
  strokeWidth = 1.75,
  title,
}: {
  name: string;
  size?: number;
  className?: string;
  /** Explicit CSS color override (e.g. "var(--gold)" or a hex value). */
  color?: string;
  /** Force the uniform muted color, ignoring the per-asset color map. */
  uniform?: boolean;
  /** Stroke width of the icon lines. */
  strokeWidth?: number;
  /** Optional native tooltip text (localized by the caller). */
  title?: string;
}) {
  const Icon = ASSET_ICONS[name] ?? Coins;
  const resolved = assetColor(name, { color, uniform });
  const icon = (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      style={{ color: resolved }}
      aria-hidden="true"
    />
  );
  if (!title) {
    // No tooltip — the className stays on the svg (it is the flex child).
    return <Icon size={size} strokeWidth={strokeWidth} className={className} style={{ color: resolved }} aria-hidden="true" />;
  }
  // With a tooltip the wrapper span becomes the flex child, so it carries
  // the className; the svg stays decorative.
  return (
    <span title={title} className={className} style={{ display: "inline-flex" }}>
      {icon}
    </span>
  );
}
