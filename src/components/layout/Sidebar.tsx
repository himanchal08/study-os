import { Suspense } from "react";
import { NavLinks } from "./NavLinks";

interface SidebarProps {
  userEmail: string;
}

export function Sidebar({ userEmail }: SidebarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="w-56 shrink-0 flex flex-col border-r h-full"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5 flex items-center gap-3 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shrink-0 shadow-md">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <div>
          <span className="font-bold text-sm gradient-text block leading-tight">Study OS</span>
          <span className="text-[10px] leading-tight" style={{ color: "rgba(232,232,240,0.3)" }}>
            Banking · SSC
          </span>
        </div>
      </div>

      <Suspense fallback={<NavLinksSkeleton />}>
        <NavLinks />
      </Suspense>

      {/* User chip */}
      <div
        className="px-3 py-4 border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-xs font-bold text-white shrink-0"
            aria-hidden="true"
          >
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span
              className="text-[11px] truncate block"
              style={{ color: "rgba(232,232,240,0.45)" }}
            >
              {userEmail}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLinksSkeleton() {
  const items = Array.from({ length: 9 });
  return (
    <ul
      className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5"
      role="list"
      aria-hidden="true"
    >
      {items.map((_, i) => (
        <li key={i}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ height: "40px" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", width: 18, height: 18, borderRadius: 4 }} />
            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                height: 10,
                borderRadius: 4,
                width: `${56 + (i % 3) * 18}px`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
