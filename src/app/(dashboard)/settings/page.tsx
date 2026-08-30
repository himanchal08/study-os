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
    .select('full_name, exam_targets, daily_target_hours, day_boundary_offset_minutes, timezone')
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
    </div>
  );
}

