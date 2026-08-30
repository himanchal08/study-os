"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { createClient } from "@/lib/supabase/client";

interface SiteTutorialProps {
  userId: string;
  startImmediately: boolean;
}

export function SiteTutorial({ userId, startImmediately }: SiteTutorialProps) {
  useEffect(() => {
    if (!startImmediately) return;

    const supabase = createClient();
    const d = driver({
      showProgress: true,
      steps: [
        { element: '.nav-link-home', popover: { title: 'Home', description: 'Your command center. View your daily progress against your target hours at a glance.' } },
        { element: '.nav-link-planner', popover: { title: 'Planner', description: 'Schedule and manage your daily tasks. Plan your study sessions block by block.' } },
        { element: '.nav-link-calendar', popover: { title: 'Calendar', description: 'See your schedule in a timeline view and sync your tasks directly to Google Calendar.' } },
        { element: '.nav-link-questions', popover: { title: 'Questions', description: 'Take practice questions from your custom batches and track your accuracy.' } },
        { element: '.nav-link-vault', popover: { title: 'Vault', description: 'Save screenshots of questions you got wrong so you never make the same mistake twice.' } },
        { element: '.nav-link-revisions', popover: { title: 'Revisions', description: 'Our Spaced Repetition system. It automatically queues up topics you need to review.' } },
        { element: '.nav-link-mocks', popover: { title: 'Mocks', description: 'Log your high-stakes practice tests and analyze your performance section by section.' } },
        { element: '.nav-link-targets', popover: { title: 'Targets', description: 'Compare your mock scores against historical cutoffs to see if you are exam-ready.' } },
        { element: '.nav-link-syllabus', popover: { title: 'Syllabus', description: 'Track your completion status across all subjects and chapters in your exams.' } },
        { element: '.nav-link-analytics', popover: { title: 'Analytics', description: 'Deep dive into your study habits, task completion rates, and historical data.' } },
        { element: '.nav-link-reports', popover: { title: 'Reports', description: 'Generate comprehensive subject-level breakdowns of your strengths and weaknesses.' } },
        { element: '.nav-link-settings', popover: { title: 'Settings', description: 'Configure your timezone, target hours, integrations, and replay this tour.' } },
        { popover: { title: 'All Set!', description: 'You are ready to crush your exams with Study OS.' } }
      ],
      onDestroyed: async () => {
        await supabase.from("profiles").update({ tutorial_completed: true }).eq("user_id", userId);
      }
    });

    // Short delay to ensure DOM elements are rendered
    setTimeout(() => {
      d.drive();
    }, 500);

  }, [startImmediately, userId]);

  return null;
}
