"use client";

import { useState, useEffect } from "react";
import { NavLinks } from "./NavLinks";
import { usePathname } from "next/navigation";

interface MobileSidebarProps {
  userEmail: string;
}

export function MobileSidebar({ userEmail }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        id="mobile-menu-btn"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
        style={{ color: "#a1a1aa" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        aria-label="Main navigation"
        className="fixed top-0 left-0 h-full z-50 flex flex-col md:hidden transition-transform duration-300 ease-in-out"
        style={{
          width: "240px",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div
          className="px-5 py-5 flex items-center justify-between border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-sm text-neutral-100 block leading-tight">Study OS</span>
              <span className="text-[10px] leading-tight text-neutral-500">Banking · SSC</span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-200 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <NavLinks />

        <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
            style={{ background: "#111111", border: "1px solid var(--border)" }}
          >
            <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-300 shrink-0">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] truncate block text-neutral-400">{userEmail}</span>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
