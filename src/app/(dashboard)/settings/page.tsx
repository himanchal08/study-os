import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsForm } from './SettingsForm';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, exam_targets, daily_target_hours, day_boundary_offset_minutes, timezone, google_refresh_token, tutorial_completed')
    .eq('user_id', user.id)
    .single();

  return (
    <div className='animate-fade-in pb-12'>
      <div className="mb-6">
        <h1 className='text-xl font-semibold text-neutral-100 tracking-tight mb-1'>Settings</h1>
        <p className='text-sm text-neutral-500'>
          Configure your exam targets, study goals, and preferences.
        </p>
      </div>

      <SettingsForm
        initialProfile={{
          full_name: profile?.full_name ?? null,
          exam_targets: profile?.exam_targets ?? null,
          daily_target_hours: profile?.daily_target_hours ?? 8,
          day_boundary_offset_minutes: profile?.day_boundary_offset_minutes ?? 0,
          timezone: profile?.timezone ?? 'Asia/Kolkata',
        }}
      />

      <div className="mt-8 space-y-6">
        <div className="rounded-xl p-5 space-y-5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <h2 className="text-sm font-semibold text-neutral-200">External Integrations</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-300">Google Calendar Sync</p>
              <p className="text-xs text-neutral-500 mt-1">Automatically push your planned tasks to Google Calendar.</p>
            </div>
            {profile?.google_refresh_token ? (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                Connected
              </span>
            ) : (
              <a href="/api/calendar/auth" className="px-4 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-neutral-200 transition-colors">
                Connect Calendar
              </a>
            )}
          </div>
        </div>

        <div className="rounded-xl p-5 space-y-5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <h2 className="text-sm font-semibold text-neutral-200">Dashboard Tour</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-300">Restart Site Tutorial</p>
              <p className="text-xs text-neutral-500 mt-1">Run the guided onboarding tour again.</p>
            </div>
            <form action={async () => {
              "use server";
              const supabaseClient = await createClient();
              await supabaseClient.from("profiles").update({ tutorial_completed: false }).eq("user_id", user.id);
              redirect("/");
            }}>
              <button type="submit" className="px-4 py-2 rounded-lg border text-xs font-medium hover:bg-white hover:text-black transition-colors" style={{ borderColor: "#262626", color: "#a1a1aa" }}>
                Restart Tour
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

