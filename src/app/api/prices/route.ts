"use server";

import { NextResponse } from "next/server";
import { fetchPrices } from "@/lib/prices";

export async function GET() {
  const prices = await fetchPrices();

  return NextResponse.json(
    {
      success: true,
      data: prices,
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