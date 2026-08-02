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
  return str
    .replace(/[^\d,]/g, "")
    .replace(/,/g, "")
    .trim();
}

export function parseTelegramMessage(html: string): TgPriceData | null {
  // Extract the text of the FIRST price message, whatever element follows
  // it. Telegram sometimes omits the reactions block, so we can't anchor on
  // `tgme_widget_message_reactions` — the div must be matched independently.
  const textBlocks = html.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g);
  if (!textBlocks || textBlocks.length === 0) return null;

  let raw = textBlocks[0];
  // Strip HTML tags but keep <br>
  raw = raw.replace(/<br\s*\/?>/gi, "\n");
  raw = raw.replace(/<[^>]+>/g, "");
  raw = raw.replace(/&nbsp;/g, " ");
  raw = raw.replace(/&amp;/g, "&");
  raw = raw.replace(/&lt;/g, "<");
  raw = raw.replace(/&gt;/g, ">");

  // Remove zero-width space (Telegram inserts ZWS inside numbers)
  raw = raw.replace(/‌/g, "");

  // Split into lines and process each line individually
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rawText = lines.join("\n");

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

  // Parse line by line - much more precise than greedy regex across whole text
  for (const line of lines) {
    // USD lines: 🔴دلار فردایی تهران 193,500 خرید
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

    // Tether/USDT line: 💰#تتر[USDT] 193,599خرید🔹
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

    // Gold Gram: ✨#طلا_گرمی 18,605,859
    if (line.includes("طلا_گرمی") && !goldGram) {
      const m = line.match(/([\d,]+)/);
      if (m) goldGram = cleanNumber(m[1]);
    }

    // Gold Melted: #آبشده_نقدی 80,595,000 فروش
    if (line.includes("آبشده_نقدی") && !goldMelted) {
      const m = line.match(/([\d,]+)/);
      if (m) goldMelted = cleanNumber(m[1]);
    }

    // Coin Fardi: سکه... فردایی ... 192,885,000 معامله
    if (line.includes("سکه") && line.includes("فردایی") && !coinFardi) {
      const m = line.match(/([\d,]+)\s*معامله/);
      if (m) coinFardi = cleanNumber(m[1]);
    }

    // Coin Hawale: سکه... حواله ... 188,600,000 فروش
    if (line.includes("سکه") && line.includes("حواله") && !coinHawale) {
      const m = line.match(/([\d,]+)\s*فروش/);
      if (m) coinHawale = cleanNumber(m[1]);
    }

    // USDT Index: 🔴4054.28 [1405-05-09 21:21:49]
    if (line.includes("🔴") && !usdtIndex) {
      const m = line.match(/🔴\s*([\d.]+)/);
      if (m) usdtIndex = m[1];
    }

    // Timestamp: [1405-05-09 21:21:49]
    if (!timestamp) {
      const m = line.match(/\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]/);
      if (m) timestamp = m[1];
    }
  }

  // If the message format changed (channel redesign, ad inserted, etc.)
  // our regexes will match nothing and we'd otherwise report a "successful"
  // parse that's actually empty. Treat that as a failure so the caller
  // falls through to the next data source instead of showing a card full
  // of dashes.
  const hasUsdData = usdBuy != null || usdSell != null || usdDeal != null;
  const hasTetherData = tetherBuy != null || tetherSell != null;
  if (!hasUsdData && !hasTetherData) {
    console.warn("[telegram] Parsed message but found no recognizable price fields — treating as failed parse");
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
    rawText,
  };
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