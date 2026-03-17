"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getProductById } from "@/lib/products";
import { useCart } from "@/components/CartProvider";
import { useCurrency } from "@/components/CurrencyProvider";
import type { SupportedCurrency } from "@/lib/zod";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const product = useMemo(() => {
    const idNumber = Number(idParam);
    if (!idParam || Number.isNaN(idNumber)) return undefined;
    return getProductById(idNumber);
  }, [idParam]);

  const { items, addItem, updateQuantity } = useCart();
  const { formatPrice } = useCurrency();

  const existingItem = useMemo(
    () =>
      product ? items.find((i) => i.productId === product.id) ?? null : null,
    [items, product],
  );

  const quantity = existingItem?.quantity ?? 0;

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-6">
        <div className="max-w-md text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-500">
            PRODUCT NOT FOUND
          </p>
          <h1 className="mt-4 font-serif text-3xl tracking-wide text-gray-900">
            We couldn't find this piece.
          </h1>
          <button
            type="button"
            onClick={() => router.push("/catalog")}
            className="mt-8 bg-black px-8 py-3 text-[11px] font-semibold tracking-[0.2em] text-white hover:bg-gray-800"
          >
            BACK TO COLLECTION
          </button>
        </div>
      </div>
    );
  }

  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = () => {
    if (existingItem) {
      const newQty = Math.min(existingItem.quantity + 1, 99);
      updateQuantity(product.id, newQty);
    } else {
      addItem({
        id: product.id,
        name: product.name,
        imgUrl: product.imgUrl,
        amount: product.amount,
        currency: product.currency,
      });
    }

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1200px] px-6 py-8 lg:px-10 lg:py-12">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
          <Link href="/catalog" className="transition-colors hover:text-gray-900">
            Shop
          </Link>
          <span className="text-gray-400">&gt;</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,0.85fr)] lg:items-start lg:gap-20">

          {/* Left Column: Single Image */}
          <div className="relative w-full bg-[#F6F6F6]">
            <div className="relative aspect-square w-full">
              <Image
                src={product.imgUrl}
                alt={product.name}
                fill
                priority
                className="object-contain p-12 mix-blend-multiply sm:p-16"
              />
            </div>
          </div>

          {/* Right Column: Product Details */}
          <section className="flex flex-col pt-2 lg:pt-6">
            <header>
              <h1 className="font-serif text-[32px] tracking-wide text-gray-900 uppercase sm:text-4xl">
                {product.name}
              </h1>
              <p className="mt-3 text-2xl font-light text-gray-800">
                {formatPrice(product.amount, product.currency as SupportedCurrency)}
              </p>
              <p className="mt-6 leading-relaxed text-[#555555] text-[15px]">
                {product.description}
              </p>
            </header>

            {/* Keywords/Tags */}
            <div className="mt-6 flex flex-wrap gap-2">
              {product.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="border border-gray-100 bg-[#FAFAFA] px-3.5 py-2 text-[11px] text-gray-600"
                >
                  {keyword}
                </span>
              ))}
            </div>

            {/* Action Row: Quantity & Add to Cart */}
            <div className="mt-10 flex h-12 gap-4">
              <div className="flex w-28 items-center border border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    if (!existingItem) return;
                    const next = existingItem.quantity - 1;
                    updateQuantity(product.id, next);
                  }}
                  className="flex h-full w-10 items-center justify-center text-lg text-gray-400 hover:text-gray-800 disabled:opacity-40 disabled:hover:text-gray-400"
                  disabled={quantity === 0}
                >
                  -
                </button>
                <span className="flex-1 text-center text-[13px] font-medium text-gray-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (existingItem) {
                      const next = Math.min(existingItem.quantity + 1, 99);
                      updateQuantity(product.id, next);
                    } else {
                      addItem({
                        id: product.id,
                        name: product.name,
                        imgUrl: product.imgUrl,
                        amount: product.amount,
                        currency: product.currency,
                      });
                    }
                  }}
                  className="flex h-full w-10 items-center justify-center text-lg text-gray-400 hover:text-gray-800"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="flex flex-1 items-center justify-center gap-3 bg-[#111] px-6 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-black"
              >
                {justAdded ? (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Added
                  </>
                ) : (
                  "Add to Cart"
                )}
                {!justAdded && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Modern, Sleek Trust Badges */}
            <div className="mt-12 flex flex-col border-t border-gray-200">
              
              {/* Shipping */}
              <div className="flex items-start gap-4 border-b border-gray-100 py-5">
                <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 8h-3V4H3v13h1a3 3 0 006 0h4a3 3 0 006 0h1v-5l-4-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8v4h4" />
                  <circle cx="7" cy="17" r="3" />
                  <circle cx="17" cy="17" r="3" />
                </svg>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-900">
                    Complimentary Delivery
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                    Free shipping on all orders, fully trackable with signature upon delivery.
                  </p>
                </div>
              </div>

              {/* Returns */}
              <div className="flex items-start gap-4 border-b border-gray-100 py-5">
                <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                </svg>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-900">
                    30-Day Returns
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                    Try it at home. Complimentary returns and exchanges within 30 days.
                  </p>
                </div>
              </div>

              {/* Security */}
              <div className="flex items-start gap-4 py-5">
                <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-900">
                    Secure Transactions
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                    Your payments are fully encrypted and protected by verified partners.
                  </p>
                </div>
              </div>

            </div>
          </section>
        </div>
      </main>
    </div>
  );
}