import Image from "next/image";
import Link from "next/link";
import { getProducts } from "@/lib/products";
import LandingProductCard from "@/components/LandingProductCard";

export default function LandingPage() {
  const products = getProducts();
  const latestArrivals = products.slice(0, 4);

  return (
    <>
      {/* Hero: full-width image with centered text and button */}
      <section className="relative h-[80vh] w-full overflow-hidden md:h-[85vh]">
        <div className="absolute inset-0">
          <Image
            src="/hero.png"
            alt="Luxury black sneakers with gold detail"
            fill
            className="object-cover object-center w-full scale-100 object-[center_85%]"
            priority
            sizes="100vw"
            quality={92}
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center -translate-x-12 -translate-y-10 md:-translate-x-80 md:-translate-y-12">
          <h1 className="text-center font-serif text-4xl font-medium tracking-tight text-black md:text-5xl lg:text-6xl">
            <span className="block">CRAFTED FOR</span>
            <span className="mt-2 block">QUIET POWER</span>
          </h1>
          <Link
            href="/catalog"
            className="mt-6 inline-block whitespace-nowrap border-2 border-[#333] bg-transparent px-8 py-2.5 text-sm font-normal uppercase tracking-wide text-[#333] transition-all duration-200 hover:scale-105 hover:border-black hover:bg-black hover:text-white hover:shadow-lg"
          >
            SHOP COLLECTION
          </Link>
        </div>
      </section>

      {/* Latest Arrivals */}
      <section className="mx-auto max-w-7xl px-6 pt-10 pb-10 md:pt-14 md:pb-14">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-medium tracking-tight text-black md:text-3xl">
            LATEST ARRIVALS
          </h2>
          <Link
            href="/catalog"
            className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-black transition-colors"
          >
            <span className="link-underline-lr">View All</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 md:mt-8">
          {latestArrivals.map((product) => (
            <LandingProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              imgUrl={product.imgUrl}
              amount={product.amount}
              currency={product.currency}
            />
          ))}
        </div>
      </section>

      {/* Discover Luxury Craftsmanship */}
      <section
        id="about"
        className="border-t border-gray-200 px-6 pt-10 pb-12 md:pt-14 md:pb-20"
      >
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center font-serif text-2xl font-medium tracking-tight text-black md:text-3xl">
            Discover Luxury Craftsmanship
          </h2>
        <div className="relative mt-12 aspect-[16/9] w-full overflow-hidden bg-gray-200">
          <Image
            src="/hero-footer.png"
            alt="Hands crafting leather footwear"
            fill
            className="object-cover grayscale"
            sizes="(max-width: 1280px) 100vw, 1280px"
          />
        </div>
        </div>
      </section>

      {/* Footer */}
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
              Shop
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
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline-lr text-xs font-medium uppercase tracking-wide text-black"
            >
              Instagram
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
