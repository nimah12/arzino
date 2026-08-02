import { NextResponse } from "next/server";
import { fetchPriceHistory } from "@/lib/prices";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const parsedHours = parseInt(searchParams.get("hours") || "24", 10);
  const ALLOWED_HOURS = [1, 6, 12, 24, 72, 168];
  const hours =
    Number.isFinite(parsedHours) && ALLOWED_HOURS.includes(parsedHours) ? parsedHours : 24;

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Missing id parameter" },
      { status: 400 }
    );
  }

  try {
    const history = await fetchPriceHistory(id, hours);

    return NextResponse.json(
      {
        success: true,
        data: history,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[history] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}