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
        borderColor: "var(--border-subtle)",
      }}
    >
      <div
        className="px-5 py-5 flex items-center gap-3 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shrink-0">
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
        <span className="font-bold text-sm gradient-text">Study OS</span>
      </div>

      <Suspense fallback={<NavLinksSkeleton />}>
        <NavLinks />
      </Suspense>

      <div
        className="px-3 py-3 border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <div
            className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-xs font-bold text-white shrink-0"
            aria-hidden="true"
          >
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <span
            className="text-xs truncate"
            style={{ color: "rgba(226,226,240,0.5)" }}
          >
            {userEmail}
          </span>
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
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ height: "40px" }}
          >
            <div
              className="w-4.5 h-4.5 rounded"
              style={{ background: "rgba(255,255,255,0.06)", width: 18, height: 18 }}
            />
            <div
              className="h-3 rounded"
              style={{
                background: "rgba(255,255,255,0.06)",
                width: `${60 + (i % 3) * 16}px`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
