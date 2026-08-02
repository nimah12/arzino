/**
 * Telegram channel scraper for @se_pz (قیمت لحظه‌ای دلار طلا خودرو).
 * Parses public preview messages from t.me/s/se_pz.
 */

const TG_CHANNEL = "https://t.me/s/se_pz";

export type TgPriceData = {
  usdBuy: string | null;
  usdSell: string | null;
  usdDeal: string | null;
  tetherSell: string | null;
  tetherBuy: string | null;
  goldGram: string | null;
  goldCoin: string | null;
  goldCoinFardi: string | null;
  goldMelted: string | null;
  usdtIndex: string | null;
  timestamp: string | null;
  rawText: string;
};

function cleanNumber(str: string): string {
  return str.replace(/[^\d]/g, "").trim();
}

/** Strip HTML from a block but keep line breaks; drop ZWNJ chars Telegram
 *  inserts inside numbers (e.g. 194,‌‌500). */
function stripTags(block: string): string {
  return block
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/‌/g, "");
}

function hasPriceLine(raw: string): boolean {
  return /(دلار.{0,10}تهران|تتر.{0,10}USDT|#طلا_گرمی|#آبشده_نقدی|سکه|🔴)/.test(raw);
}

function parsePriceMessage(raw: string): TgPriceData | null {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!hasPriceLine(raw)) return null;

  let usdBuy: string | null = null;
  let usdSell: string | null = null;
  let usdDeal: string | null = null;
  let tetherBuy: string | null = null;
  let tetherSell: string | null = null;
  let goldGram: string | null = null;
  let goldMelted: string | null = null;
  let coinFardi: string | null = null;
  let coinHawale: string | null = null;
  let usdtIndex: string | null = null;
  let timestamp: string | null = null;

  for (const line of lines) {
    if (line.includes("دلار") && line.includes("تهران")) {
      if (line.includes("خرید") && !usdBuy) {
        const m = line.match(/([\d,]+)\s*خرید/);
        if (m) usdBuy = cleanNumber(m[1]);
      }
      if (line.includes("فروش") && !usdSell) {
        const m = line.match(/([\d,]+)\s*فروش/);
        if (m) usdSell = cleanNumber(m[1]);
      }
      if (line.includes("معامله") && !usdDeal) {
        const m = line.match(/([\d,]+)\s*معامله/);
        if (m) usdDeal = cleanNumber(m[1]);
      }
    }

    if (line.includes("تتر") && line.includes("USDT")) {
      if (line.includes("خرید") && !tetherBuy) {
        const m = line.match(/([\d,]+)\s*خرید/);
        if (m) tetherBuy = cleanNumber(m[1]);
      }
      if (line.includes("فروش") && !tetherSell) {
        const m = line.match(/([\d,]+)\s*فروش/);
        if (m) tetherSell = cleanNumber(m[1]);
      }
    }

    if (line.includes("طلا_گرمی") && !goldGram) {
      const m = line.match(/([\d,]+)/);
      if (m) goldGram = cleanNumber(m[1]);
    }

    if (line.includes("آبشده_نقدی") && !goldMelted) {
      const m = line.match(/([\d,]+)/);
      if (m) goldMelted = cleanNumber(m[1]);
    }

    if (line.includes("سکه") && line.includes("فردایی") && !coinFardi) {
      const m = line.match(/([\d,]+)\s*معامله/);
      if (m) coinFardi = cleanNumber(m[1]);
    }

    if (line.includes("سکه") && line.includes("حواله") && !coinHawale) {
      const m = line.match(/([\d,]+)\s*فروش/);
      if (m) coinHawale = cleanNumber(m[1]);
    }

    if (line.includes("🔴") && !usdtIndex) {
      const m = line.match(/🔴\s*([\d.]+)/);
      if (m) usdtIndex = m[1];
    }

    if (!timestamp) {
      const m = line.match(/\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]/);
      if (m) timestamp = m[1];
    }
  }

  const hasUsdData = usdBuy != null || usdSell != null || usdDeal != null;
  const hasTetherData = tetherBuy != null || tetherSell != null;
  if (!hasUsdData && !hasTetherData) {
    // A real price block should always produce at least the dollar figure.
    return null;
  }

  return {
    usdBuy,
    usdSell,
    usdDeal,
    tetherSell,
    tetherBuy,
    goldGram,
    goldCoin: coinHawale,
    goldCoinFardi: coinFardi,
    goldMelted,
    usdtIndex,
    timestamp,
    rawText: lines.join("\n"),
  };
}

/**
 * Scan ALL message-text blocks and parse the FIRST one that contains a real
 * price update. Telegram often renders an ad post ahead of the actual update,
 * and the reactions block is not always present, so anchoring on the first
 * block or on `tgme_widget_message_reactions` is unreliable.
 */
export function parseTelegramMessage(html: string): TgPriceData | null {
  const blocks = html.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g);
  if (!blocks || blocks.length === 0) return null;

  for (const block of blocks) {
    const parsed = parsePriceMessage(stripTags(block));
    if (parsed) return parsed;
  }
  return null;
}

/**
 * Fetch latest price data from the Telegram channel preview page.
 */
export async function fetchFromTelegram(): Promise<TgPriceData | null> {
  try {
    const res = await fetch(TG_CHANNEL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("[telegram] HTTP", res.status);
      return null;
    }

    const html = await res.text();
    return parseTelegramMessage(html);
  } catch (e) {
    console.warn("[telegram] fetch error:", e);
    return null;
  }
}