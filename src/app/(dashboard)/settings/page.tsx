import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsForm } from './SettingsForm';
import { GoogleCalendarPanel } from './GoogleCalendarPanel';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, exam_targets, daily_target_hours, day_boundary_offset_minutes, timezone, google_refresh_token, google_last_synced_at, tutorial_completed')
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

      {searchParams?.error && (
        <div className="mb-6 p-4 rounded-lg bg-red-950 border border-red-900 text-red-200 text-sm">
          Error: {searchParams.error} {searchParams.msg ? `(${searchParams.msg})` : ''}
        </div>
      )}
      {searchParams?.success && (
        <div className="mb-6 p-4 rounded-lg bg-green-950 border border-green-900 text-green-200 text-sm">
          Success! Connected.
        </div>
      )}

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
        <GoogleCalendarPanel
          isConnected={!!profile?.google_refresh_token}
          lastSyncedAt={profile?.google_last_synced_at ?? null}
        />

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

