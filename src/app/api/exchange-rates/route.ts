import { NextResponse } from "next/server";
import { getExchangeRates } from "@/server/services/exchangeRateService";

export async function GET() {
  const { rates, cachedAt, live } = await getExchangeRates();

  return NextResponse.json(
    { base: "USD", rates, cachedAt, live },
    {
      headers: {
        // Allow clients to cache for 10 minutes
        "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
      },
    }
  );
}
