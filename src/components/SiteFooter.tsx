import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
        <Link
          href="/"
          className="font-serif text-xl font-medium tracking-tight text-black"
        >
          VIRELLIO
        </Link>
        <nav className="flex items-center gap-8" aria-label="Footer">
          <Link
            href="/catalog"
            className="link-underline-lr text-xs font-medium uppercase tracking-wide text-black"
          >
            Catalog
          </Link>
          <Link
            href="/catalog"
            className="link-underline-lr text-xs font-medium uppercase tracking-wide text-black"
          >
            Collection
          </Link>
          <Link
            href="/#about"
            className="link-underline-lr text-xs font-medium uppercase tracking-wide text-black"
          >
            About
          </Link>
          <Link
            href="/#contact"
            className="link-underline-lr text-xs font-medium uppercase tracking-wide text-black"
          >
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}


