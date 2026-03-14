import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

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
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <CartProvider>
          <header className="border-b border-gray-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <a href="/" className="text-2xl font-bold tracking-tight">
                VIRELLIO
              </a>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
