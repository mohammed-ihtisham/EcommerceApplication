import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import SiteHeader from "@/components/SiteHeader";
import ScrollToTop from "@/components/ScrollToTop";

const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Virellio Shoes",
  description: "Luxury footwear for the modern connoisseur",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cormorant.variable}>
      <body className="bg-white font-sans text-gray-900 antialiased">
        <CartProvider>
          <ScrollToTop />
          <SiteHeader />
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
