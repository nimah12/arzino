export type PriceItem = {
  id: string;
  title: string;
  icon: string;
  price: string;
  change: number | null;
  changeAbs: number | null;
  updatedAt: string;
  history?: number[];
  buyPrice?: string;
  sellPrice?: string;
};

export type PriceHistoryItem = {
  timestamp: string;
  price: number;
};

const fallbackPrices: PriceItem[] = [
  { id: "usd", title: "دلار آمریکا", icon: "💵", price: "0", change: null, changeAbs: null, updatedAt: "", history: [] },
  { id: "eur", title: "یورو", icon: "💶", price: "0", change: null, changeAbs: null, updatedAt: "", history: [] },
  { id: "gbp", title: "پوند انگلیس", icon: "💷", price: "0", change: null, changeAbs: null, updatedAt: "", history: [] },
  { id: "aed", title: "درهم امارات", icon: "🇦🇪", price: "0", change: null, changeAbs: null, updatedAt: "", history: [] },
  { id: "try", title: "لیر ترکیه", icon: "🇹🇷", price: "0", change: null, changeAbs: null, updatedAt: "", history: [] },
  { id: "gold18", title: "طلای ۱۸ عیار", icon: "🥇", price: "0", change: null, changeAbs: null, updatedAt: "", history: [] },
  { id: "coin", title: "سکه امامی", icon: "🪙", price: "0", change: null, changeAbs: null, updatedAt: "", history: [] },
  { id: "half-coin", title: "نیم سکه", icon: "🪙", price: "0", change: null, changeAbs: null, updatedAt: "", history: [] },
  { id: "tether", title: "تتر (USDT)", icon: "💎", price: "0", change: null, changeAbs: null, updatedAt: "", history: [] },
  { id: "gold-gr", title: "طلا (گرمی)", icon: "✨", price: "0", change: null, changeAbs: null, updatedAt: "", history: [] },
  { id: "coin-fardi", title: "سکه فردایی", icon: "🏅", price: "0", change: null, changeAbs: null, updatedAt: "", history: [] },
];

export function toFaDigits(input: string): string {
  const faDigits = "۰۱۲۳۴۵۶۷۸۹";
  return input.replace(/[0-9]/g, (d) => faDigits[Number(d)]);
}

export function toEnDigits(input: string): string {
  const faDigits = "۰۱۲۳۴۵۶۷۸۹";
  return input.replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d)));
}

function formatPrice(raw: string | number | null | undefined): string {
  if (raw == null || raw === "" || raw === "0" || raw === undefined) return "—";
  const clean = String(raw).replace(/[^\d.-]/g, "");
  if (!clean || clean === "-") return "—";
  const n = parseFloat(clean);
  if (isNaN(n)) return "—";
  return toFaDigits(n.toLocaleString("en-US"));
}

function formatChangeAbs(n: number | null): number | null {
  if (n == null) return null;
  return Number(n.toFixed(0));
}

export async function fetchPrices(): Promise<PriceItem[]> {
  try {
    const { fetchFromTelegram, parseTelegramMessage } = await import("./telegram");
    const tgData = await fetchFromTelegram();

    if (tgData) {
      const prices: PriceItem[] = [
        {
          id: "usd",
          title: "دلار فردایی تهران",
          icon: "💵",
          price: formatPrice(tgData.usdDeal || tgData.usdBuy),
          buyPrice: formatPrice(tgData.usdBuy),
          sellPrice: formatPrice(tgData.usdSell),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp || "",
          history: [],
        },
        {
          id: "tether",
          title: "تتر (USDT)",
          icon: "💎",
          price: formatPrice(tgData.tetherSell || tgData.tetherBuy),
          buyPrice: formatPrice(tgData.tetherBuy),
          sellPrice: formatPrice(tgData.tetherSell),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp || "",
          history: [],
        },
        {
          id: "gold18",
          title: "طلای ۱۸ عیار (آبشده)",
          icon: "🥇",
          price: formatPrice(tgData.goldMelted),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp || "",
          history: [],
        },
        {
          id: "gold-gr",
          title: "طلا (گرمی)",
          icon: "✨",
          price: formatPrice(tgData.goldGram),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp || "",
          history: [],
        },
        {
          id: "coin",
          title: "سکه امامی (حواله)",
          icon: "🪙",
          price: formatPrice(tgData.goldCoin),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp || "",
          history: [],
        },
        {
          id: "coin-fardi",
          title: "سکه فردایی",
          icon: "🏅",
          price: formatPrice(tgData.goldCoinFardi),
          change: null,
          changeAbs: null,
          updatedAt: tgData.timestamp || "",
          history: [],
        },
      ];

      console.log("[prices] Telegram success, items:", prices.length);
      return prices;
    }
  } catch (e) {
    console.warn("[prices] Telegram parse failed:", e);
  }

  // Fallback to TGJU
  try {
    const tgjuData = await fetchFromTGJU();
    if (tgjuData.length >= 6) {
      console.log("[prices] TGJU success");
      return tgjuData;
    }
  } catch (e) {
    console.warn("[prices] TGJU failed:", e);
  }

  console.warn("[prices] Using fallback data");
  return fallbackPrices;
}

const SOURCES = {
  tgju: "https://api.tgju.org/v1/market/indicator",
  bonbast: "https://bonbast.com/json",
} as const;

async function fetchFromTGJU(): Promise<PriceItem[]> {
  const res = await fetch(SOURCES.tgju, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Arzino/1.0)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`TGJU: ${res.status}`);
  const data = await res.json();
  const items: any[] = data?.data?.current || [];

  if (!Array.isArray(items) || items.length === 0) throw new Error("TGJU: Empty data");

  const mapping: Record<string, { id: string; title: string; icon: string }> = {
    price_dollar_rl: { id: "usd", title: "دلار آمریکا", icon: "💵" },
    price_eur: { id: "eur", title: "یورو", icon: "💶" },
    price_gbp: { id: "gbp", title: "پوند انگلیس", icon: "💷" },
    price_aed: { id: "aed", title: "درهم امارات", icon: "🇦🇪" },
    price_try: { id: "try", title: "لیر ترکیه", icon: "🇹🇷" },
    geram18: { id: "gold18", title: "طلای ۱۸ عیار", icon: "🥇" },
    sekee: { id: "coin", title: "سکه امامی", icon: "🪙" },
    nim: { id: "half-coin", title: "نیم سکه", icon: "🪙" },
  };

  return items
    .filter((it) => mapping[it?.id])
    .map((it) => {
      const meta = mapping[it.id];
      const price = parseFloat(String(it.p).replace(/[^\d.-]/g, ""));
      const prevPrice = price / (1 + (it.d || 0) / 100);
      const changeAbs = price - prevPrice;

      return {
        id: meta.id,
        title: meta.title,
        icon: meta.icon,
        price: formatPrice(it.p),
        change: it.d != null ? Number(it.d) : null,
        changeAbs: formatChangeAbs(changeAbs),
        updatedAt: it.t || new Date().toLocaleTimeString("fa-IR"),
        history: [],
      };
    });
}

async function fetchFromBonBast(): Promise<Partial<Record<string, PriceItem>>> {
  const res = await fetch(SOURCES.bonbast, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Arzino/1.0)" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`BonBast: ${res.status}`);
  const data = await res.json();

  const mapping: Record<string, { id: string; title: string; icon: string }> = {
    usd: { id: "usd", title: "دلار آمریکا", icon: "💵" },
    eur: { id: "eur", title: "یورو", icon: "💶" },
    gbp: { id: "gbp", title: "پوند انگلیس", icon: "💷" },
    aed: { id: "aed", title: "درهم امارات", icon: "🇦🇪" },
    try: { id: "try", title: "لیر ترکیه", icon: "🇹🇷" },
    gold18: { id: "gold18", title: "طلای ۱۸ عیار", icon: "🥇" },
    coin: { id: "coin", title: "سکه امامی", icon: "🪙" },
    half_coin: { id: "half-coin", title: "نیم سکه", icon: "🪙" },
  };

  const result: Partial<Record<string, PriceItem>> = {};
  for (const [key, meta] of Object.entries(mapping)) {
    const value = data[key];
    if (value != null && value !== "") {
      const price = parseFloat(String(value).replace(/[^\d.-]/g, ""));
      if (!isNaN(price)) {
        result[meta.id] = {
          ...meta,
          price: formatPrice(value),
          change: null,
          changeAbs: null,
          updatedAt: new Date().toLocaleTimeString("fa-IR"),
          history: [],
        };
      }
    }
  }
  return result;
}

export async function fetchPriceHistory(id: string, hours: number = 24): Promise<PriceHistoryItem[]> {
  try {
    const res = await fetch(
      `https://api.tgju.org/v1/market/indicator/history?indicator=${id}&period=${hours}h`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Arzino/1.0)",
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data = await res.json();
      const historyItems = data?.data?.history;
      if (Array.isArray(historyItems) && historyItems.length > 0) {
        return historyItems
          .filter((h: any) => h?.p != null && h?.t != null)
          .map((h: any) => ({
            timestamp: new Date(h.t).toISOString(),
            price: parseFloat(String(h.p).replace(/[^\d.-]/g, "")),
          }))
          .filter((h: PriceHistoryItem) => !isNaN(h.price));
      }
    }
  } catch (e) {
    console.warn("[prices] History fetch failed:", e);
  }

  const fallbackItem = fallbackPrices.find((p) => p.id === id);
  const basePrice = fallbackItem?.price
    ? parseFloat(toEnDigits(fallbackItem.price).replace(/,/g, ""))
    : 50000;

  const history: PriceHistoryItem[] = [];
  const now = new Date();

  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const variation = (Math.random() - 0.5) * 0.02;
    const price = basePrice * (1 + variation * (i / hours));
    history.push({ timestamp: time.toISOString(), price: Math.round(price) });
  }

  return history;
}

