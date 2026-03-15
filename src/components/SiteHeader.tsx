"use client";

import Link from "next/link";
import CartDrawer from "./CartDrawer";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <nav className="flex items-center gap-8" aria-label="Main">
          <Link
            href="/catalog"
            className="link-underline-lr text-xs font-medium uppercase tracking-wide text-gray-900"
          >
            Shop
          </Link>
          <Link
            href="/catalog"
            className="link-underline-lr text-xs font-medium uppercase tracking-wide text-gray-900"
          >
            Collections
          </Link>
          <Link
            href="/#about"
            className="link-underline-lr text-xs font-medium uppercase tracking-wide text-gray-900"
          >
            About
          </Link>
        </nav>
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 font-serif text-2xl font-medium tracking-tight text-black"
        >
          VIRELLIO
        </Link>
        <div className="flex items-center">
          <CartDrawer variant="header" />
        </div>
      </div>
    </header>
  );
}
