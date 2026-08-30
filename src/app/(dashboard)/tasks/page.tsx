import type { Metadata } from "next";

export const metadata: Metadata = { title: "Planner" };

export default function TasksPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold gradient-text mb-2">Daily Planner</h1>
      <p className="text-sm" style={{ color: "rgba(226,226,240,0.45)" }}>Phase 2 — coming soon.</p>
    </div>
  );
}
