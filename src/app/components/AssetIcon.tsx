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
import Tooltip from "./Tooltip";

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
  strokeWidth,
  title,
}: {
  name: string;
  size?: number;
  className?: string;
  /** Explicit CSS color override (e.g. "var(--gold)" or a hex value). */
  color?: string;
  /** Force the uniform muted color, ignoring the per-asset color map. */
  uniform?: boolean;
  /**
   * Stroke width of the icon lines. Defaults to the theme token
   * `--icon-stroke` (defined identically in both themes) so the icon weight
   * stays consistent; pass a number to override.
   */
  strokeWidth?: number;
  /** Optional tooltip text (localized by the caller) — custom themed tooltip. */
  title?: string;
}) {
  const Icon = ASSET_ICONS[name] ?? Coins;
  const resolved = assetColor(name, { color, uniform });
  const svg = (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={title ? undefined : className}
      style={{
        color: resolved,
        // When no explicit strokeWidth is given, the theme token drives the
        // stroke weight (inline style beats the SVG presentation attribute).
        strokeWidth: strokeWidth != null ? undefined : "var(--icon-stroke)",
      }}
      aria-hidden="true"
    />
  );
  if (!title) {
    // No tooltip — the svg keeps the className (it is the flex child).
    return svg;
  }
  // With a tooltip the Tooltip wrapper becomes the flex child, so it carries
  // the className; the svg stays decorative.
  return (
    <Tooltip label={title} className={className}>
      {svg}
    </Tooltip>
  );
}
