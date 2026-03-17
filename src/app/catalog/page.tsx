"use client";

import { useMemo, useState } from "react";
import { getProducts, type Product } from "@/lib/products";
import { useCurrency } from "@/components/CurrencyProvider";
import { convertAmount } from "@/lib/currency";
import type { SupportedCurrency } from "@/lib/zod";
import ProductGrid from "@/components/ProductGrid";
import FilterSidebar from "@/components/FilterSidebar";

const allProducts = getProducts();

function normalize(text: string) {
  return text.toLowerCase().replace(/&/g, "and");
}

/** Map every sidebar filter label → a product matcher. */
function productMatchesFilter(
  filter: string,
  product: Product,
  normalizedText: string,
  rates: Record<string, number>,
  displayCurrency: SupportedCurrency,
): boolean {
  const matchAny = (...words: string[]) => words.some((w) => normalizedText.includes(w));

  // — PRICE (normalised to display currency via live rates) —
  if (filter.startsWith("price:")) {
    const displayAmount = convertAmount(product.amount, product.currency as SupportedCurrency, displayCurrency, rates);
    const low = convertAmount(1000, "USD", displayCurrency, rates);
    const high = convertAmount(3000, "USD", displayCurrency, rates);
    if (filter === "price:under-1000")  return displayAmount < low;
    if (filter === "price:1000-3000")   return displayAmount >= low && displayAmount <= high;
    if (filter === "price:over-3000")   return displayAmount > high;
  }

  const f = normalize(filter);

  // — TYPE —
  if (f === "sneakers")  return matchAny("sneaker", "runner");
  if (f === "sandals")   return matchAny("sandal");
  if (f === "loafers")   return matchAny("loafer", "slip-on", "slip on");
  if (f === "oxfords")   return matchAny("oxford", "dress shoe");
  if (f === "heels")     return matchAny("heel", "stiletto");

  // — MATERIAL —
  if (f === "leather")       return matchAny("leather");
  if (f === "suede")         return matchAny("suede");
  if (f === "metallic")      return matchAny("metallic", "silver", "iridescent");
  if (f === "croc-embossed") return matchAny("croc");

  // — STYLE —
  if (f === "minimal")    return matchAny("minimal", "clean", "refined");
  if (f === "statement")  return matchAny("statement", "bold", "futurist");
  if (f === "formal")     return matchAny("formal", "dress", "business", "evening", "executive");
  if (f === "streetwear") return matchAny("streetwear", "chunky", "futurist");

  // — KEYWORD PILLS —
  if (f === "gold accents")  return matchAny("gold");
  if (f === "chunky sole")   return matchAny("chunky");
  if (f === "slip-on")       return matchAny("slip-on", "slip on", "loafer");
  if (f === "evening wear")  return matchAny("evening", "glamour");
  if (f === "futuristic")    return matchAny("futurist", "neo-future", "iridescent");
  if (f === "cap toe")       return matchAny("cap toe", "cap-toe");

  // Fallback: literal substring match
  return normalizedText.includes(f);
}

export default function CatalogPage() {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { rates, displayCurrency } = useCurrency();

  const filteredProducts = useMemo(() => {
    const search = normalize(searchQuery.trim());

    return allProducts.filter((product) => {
      // Create a giant string of all searchable text for this product
      const normalizedText = normalize(
        `${product.name} ${product.description} ${product.keywords.join(" ")}`
      );

      // Filter by Search Input
      if (search && !normalizedText.includes(search)) {
        return false;
      }

      // If no checkboxes are selected, show everything that passed the search
      if (selectedFilters.length === 0) {
        return true;
      }

      // AND Filter: Product must contain EVERY tag the user clicked
      return selectedFilters.every((filter) =>
        productMatchesFilter(filter, product, normalizedText, rates, displayCurrency)
      );
    });
  }, [searchQuery, selectedFilters, rates, displayCurrency]);

  const handleToggleFilter = (option: string) => {
    setSelectedFilters((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
    );
  };

  const handleClearAll = () => {
    setSelectedFilters([]);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAFA] font-sans text-gray-900">
      <div className="border-b border-gray-200 bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1440px] px-6 py-8 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="-ml-4 sm:-ml-5">
              <h1 className="font-serif text-4xl tracking-wide text-gray-900 sm:text-5xl">
                SHOP ALL
              </h1>
              <p className="mt-3 text-[14px] tracking-wide text-gray-600">
                A curated collection of modern luxury footwear crafted for quiet power.
              </p>
            </div>
            <div className="pb-1 text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
              {filteredProducts.length} Products
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col lg:flex-row">
          <aside className="w-full border-b border-gray-200 lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
            <FilterSidebar
              selectedFilters={selectedFilters}
              onToggleFilterAction={handleToggleFilter}
              onClearAllAction={handleClearAll}
              searchQuery={searchQuery}
              onSearchChangeAction={setSearchQuery}
            />
          </aside>

          <main className="relative flex-1 bg-white py-8 px-6 sm:px-8 lg:px-12">
            <div className="absolute inset-y-0 left-full w-screen bg-white" aria-hidden="true" />
            
            <ProductGrid
              products={filteredProducts}
              selectedFilters={selectedFilters}
              onToggleFilter={handleToggleFilter}
            />
          </main>

        </div>
      </div>
    </div>
  );
}