"use client";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="mb-8 flex w-full items-start justify-between gap-4 border border-[#8A2A2A]/20 bg-[#FCFCFC] p-5">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex shrink-0 items-center justify-center text-[#8A2A2A]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>
        <div className="flex-1 text-[13px] leading-relaxed text-gray-900">
          {message}
        </div>
      </div>
      
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="mt-0.5 shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400 transition-colors hover:text-[#8A2A2A]"
          aria-label="Dismiss"
        >
          Close
        </button>
      )}
    </div>
  );
}