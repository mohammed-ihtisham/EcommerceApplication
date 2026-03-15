"use client";

export default function FilterSidebar() {
  const accordionItems = ["CATEGORY", "COLOR", "MATERIAL", "SIZE", "PRICE", "AVAILABILITY"];
  const keywords = ["Minimal", "Formal", "Everyday", "Statement", "Handcrafted", "New Arrival"];

  return (
    <div className="flex flex-col py-8 pl-3 pr-6 sm:pl-4 lg:pl-6 lg:pr-8">
      
      {/* Search Bar */}
      <div className="relative mb-10">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input 
          type="text" 
          placeholder="Search" 
          className="w-full border border-gray-200 bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-gray-400" 
        />
      </div>

      {/* Accordion Filters */}
      <div className="mb-8 flex flex-col space-y-6 border-b border-gray-200 pb-8">
        {accordionItems.map((item) => (
          <button key={item} className="group flex w-full items-center justify-between text-left focus:outline-none">
            <span className="text-xs font-medium tracking-[0.15em] text-gray-800 uppercase">
              {item}
            </span>
            <svg className="h-4 w-4 text-gray-400 transition-colors group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M6 12h12" />
            </svg>
          </button>
        ))}
      </div>

      {/* Keyword Filters */}
      <div className="mb-10 flex flex-col space-y-5">
        <button className="group flex w-full items-center justify-between text-left focus:outline-none">
          <span className="text-xs font-medium tracking-[0.15em] text-gray-800 uppercase">
            KEYWORD FILTERS
          </span>
          <svg className="h-4 w-4 text-gray-400 transition-colors group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <div className="flex flex-wrap gap-2.5">
          {keywords.map((kw) => (
            <button key={kw} className="border border-gray-200 bg-white px-3.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-gray-900 hover:text-gray-900 focus:outline-none">
              {kw}
            </button>
          ))}
        </div>
        
        <button className="flex w-fit items-center gap-2 text-[13px] text-gray-500 hover:text-gray-900 mt-2">
          <span>More filters</span>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Clear All */}
      <button className="w-full border border-gray-200 bg-[#FAFAFA] py-3 text-xs font-medium tracking-[0.15em] text-gray-500 uppercase transition-colors hover:bg-gray-100 hover:text-gray-900">
        CLEAR ALL
      </button>
    </div>
  );
}