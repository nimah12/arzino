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
 * Theme-colored asset icon. Uses the muted --text-secondary token so rows and
 * overview cards look uniform in both light and dark themes.
 */
export default function AssetIcon({
  name,
  size = 16,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = ASSET_ICONS[name] ?? Coins;
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      className={className}
      style={{ color: "var(--text-secondary)" }}
      aria-hidden="true"
    />
  );
}
