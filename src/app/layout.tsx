import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { SupportedCurrencySchema } from "@/lib/zod";
import type { SupportedCurrency } from "@/lib/zod";
import SiteHeader from "@/components/SiteHeader";
import ScrollToTop from "@/components/ScrollToTop";
import SiteFooter from "@/components/SiteFooter";

const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Virellio Shoes",
  description: "Luxury footwear for the modern connoisseur",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("virellio-currency")?.value;
  const parsed = SupportedCurrencySchema.safeParse(raw);
  const initialCurrency: SupportedCurrency = parsed.success ? parsed.data : "USD";

  return (
    <html lang="en" className={cormorant.variable}>
      <body className="bg-white font-sans text-gray-900 antialiased">
        <CurrencyProvider initialCurrency={initialCurrency}>
          <CartProvider>
            <ScrollToTop />
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
          </CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
