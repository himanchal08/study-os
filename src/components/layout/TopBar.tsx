import type { Tables } from "@/types/database";
import { signOut } from "@/features/auth/actions";
import { getFormattedToday } from "@/lib/calculations/time";

interface TopBarProps {
  profile: Tables<"profiles"> | null;
  userId: string;
}

export function TopBar({ profile }: TopBarProps) {
  const today = getFormattedToday(profile);

  const dailyTarget = profile?.daily_target_hours ?? 8;

  return (
    <header
      className="h-14 flex items-center justify-between px-6 border-b shrink-0"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-center gap-4">
        <p className="text-sm" style={{ color: "rgba(226,226,240,0.5)" }}>
          {today}
        </p>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "#ededed",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          Target: {dailyTarget}h
        </span>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "#ededed", color: "#000" }}
        >
          Skip to main content
        </a>

        <form action={signOut}>
          <button
            id="sign-out-btn"
            type="submit"
            className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "rgba(226,226,240,0.55)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
