"use client";

export function TourButton() {
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined" && (window as any).startProductTour) {
          (window as any).startProductTour();
        } else {
          alert("Tour is loading... please try again in a moment.");
        }
      }}
      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
      style={{
        background: "rgba(16, 185, 129, 0.1)", // emerald-500/10
        color: "#10b981", // emerald-500
        border: "1px solid rgba(16, 185, 129, 0.2)"
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
      Take the Tour
    </button>
  );
}
