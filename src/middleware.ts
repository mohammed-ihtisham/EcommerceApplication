import { NextRequest, NextResponse } from "next/server";
import { currencyFromAcceptLanguage, DEFAULT_CURRENCY } from "@/lib/currency";
import { SupportedCurrencySchema } from "@/lib/zod";

const COOKIE_NAME = "virellio-currency";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function middleware(req: NextRequest) {
  const response = NextResponse.next();

  // If cookie already set and valid, pass through
  const existing = req.cookies.get(COOKIE_NAME)?.value;
  if (existing && SupportedCurrencySchema.safeParse(existing).success) {
    return response;
  }

  // Auto-detect from Accept-Language header
  const acceptLang = req.headers.get("accept-language");
  const detected = currencyFromAcceptLanguage(acceptLang);
  const currency = detected ?? DEFAULT_CURRENCY;

  response.cookies.set(COOKIE_NAME, currency, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: false, // needs to be readable by client JS
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|payment-cards|api/).*)",
  ],
};
