"use server";

import { NextResponse } from "next/server";
import { fetchPrices, getDataTime, getDataError, getNextRefreshAt } from "@/lib/prices-server";

export async function GET() {
  const prices = await fetchPrices();

  return NextResponse.json(
    {
      success: true,
      data: prices,
      // Exact last-update time from the Navasan response (e.g. "1405-05-25 19:00:39").
      dataTime: getDataTime(),
      // Why live data is unavailable: "invalid-key" | "http" | "network" | "empty" | null.
      error: getDataError(),
      // When the current 8h window expires / the next upstream fetch happens.
      nextRefresh: getNextRefreshAt(),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        "Content-Type": "application/json",
      },
    }
  );
}