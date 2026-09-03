"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";

interface SettingsFormProps {
  initialProfile: {
    full_name: string | null;
    exam_targets: string[] | null;
    daily_target_hours: number;
    day_boundary_offset_minutes: number;
    timezone: string;
  };
}

const FIELD = {
  input: "input-premium placeholder:text-neutral-600",
  select: "input-premium appearance-none",
  label: "block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider",
  hint: "text-xs text-neutral-600 mt-1.5 leading-relaxed",
  section: "rounded-xl p-5 space-y-5",
  sectionStyle: { background: "#0a0a0a", border: "1px solid #1a1a1a" },
};

export function SettingsForm({ initialProfile }: SettingsFormProps) {
  const [state, action, isPending] = useActionState(updateProfile, null);

  const examTargets = initialProfile.exam_targets ?? [];

  return (
    <form action={action} className="space-y-3 max-w-lg">

      
      <section className={FIELD.section} style={FIELD.sectionStyle}>
        <div className="flex items-center gap-2 pb-2 mb-1" style={{ borderBottom: "1px solid #1a1a1a" }}>
          <span className="text-base">👤</span>
          <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-widest">Profile</h2>
        </div>

        <div>
          <label htmlFor="full_name" className={FIELD.label}>Your Name</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            defaultValue={initialProfile.full_name ?? ""}
            placeholder="e.g. Himanchal"
            className={FIELD.input}
          />
        </div>
      </section>

      
      <section className={FIELD.section} style={FIELD.sectionStyle}>
        <div className="flex items-center gap-2 pb-2 mb-1" style={{ borderBottom: "1px solid #1a1a1a" }}>
          <span className="text-base">🎯</span>
          <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-widest">What am I preparing for?</h2>
        </div>

        <p className={FIELD.hint} style={{ marginTop: 0 }}>
          Select the exams you&apos;re currently targeting. This controls which subjects and syllabus branches are shown to you.
        </p>

        <div className="grid grid-cols-2 gap-2 mt-1">
          {[
            { key: "exam_banking", label: "Banking", sub: "IBPS, SBI, RBI, LIC…", icon: "🏦" },
            { key: "exam_ssc", label: "SSC", sub: "CGL, CHSL, MTS, GD…", icon: "📋" },
          ].map(({ key, label, sub, icon }) => {
            const checked = examTargets.includes(label.toLowerCase());
            return (
              <label
                key={key}
                htmlFor={key}
                className="flex items-start gap-3 p-3.5 rounded-lg cursor-pointer transition-all"
                style={{
                  background: "#111111",
                  border: `1px solid ${checked ? "#333333" : "#1a1a1a"}`,
                }}
              >
                <input
                  id={key}
                  name={key}
                  type="checkbox"
                  defaultChecked={checked}
                  className="mt-0.5 shrink-0 accent-white"
                />
                <div>
                  <div className="text-sm font-medium text-neutral-200 flex items-center gap-1.5">
                    <span>{icon}</span> {label}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">{sub}</div>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      
      <section className={FIELD.section} style={FIELD.sectionStyle}>
        <div className="flex items-center gap-2 pb-2 mb-1" style={{ borderBottom: "1px solid #1a1a1a" }}>
          <span className="text-base">⏱</span>
          <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-widest">Study Targets</h2>
        </div>

        <div>
          <label htmlFor="daily_target_hours" className={FIELD.label}>
            Daily Target — hours
          </label>
          <input
            id="daily_target_hours"
            name="daily_target_hours"
            type="number"
            step="0.5"
            min="1"
            max="24"
            defaultValue={initialProfile.daily_target_hours}
            className={FIELD.input}
            required
          />
          <p className={FIELD.hint}>
            The Home &amp; Analytics progress bars track you against this number every day.
          </p>
        </div>

        <div>
          <label htmlFor="day_boundary_offset_minutes" className={FIELD.label}>
            Day resets at
          </label>
          <select
            id="day_boundary_offset_minutes"
            name="day_boundary_offset_minutes"
            defaultValue={initialProfile.day_boundary_offset_minutes}
            className={FIELD.select}
          >
            <option value="0">12:00 AM — Midnight</option>
            <option value="120">2:00 AM</option>
            <option value="180">3:00 AM</option>
            <option value="240">4:00 AM — Night owl</option>
            <option value="300">5:00 AM</option>
            <option value="360">6:00 AM — Early bird</option>
          </select>
          <p className={FIELD.hint}>
            If you study past midnight, pushing this forward keeps those sessions counted for the previous day.
          </p>
        </div>

        <div>
          <label htmlFor="timezone" className={FIELD.label}>Timezone</label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={initialProfile.timezone || "Asia/Kolkata"}
            className={FIELD.select}
          >
            <option value="Asia/Kolkata">India — IST (UTC +5:30)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern — ET</option>
            <option value="America/Los_Angeles">Pacific — PT</option>
            <option value="Europe/London">London — GMT</option>
          </select>
        </div>
      </section>

      
      {state?.error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "#1a0a0a", border: "1px solid #3f1515", color: "#f87171" }}>
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "#0a1a0f", border: "1px solid #14532d", color: "#4ade80" }}>
          ✓ Settings saved
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="btn-premium px-5"
        >
          {isPending ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
