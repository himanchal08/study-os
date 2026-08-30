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
        { element: '.nav-link-tasks', popover: { title: 'Planner', description: 'Schedule and manage your daily tasks here. Hit your targets every day!' } },
        { element: '.nav-link-analytics', popover: { title: 'Analytics', description: 'Track your study hours and accuracy with deep dive metrics.' } },
        { element: '.nav-link-mocks', popover: { title: 'Mocks & Targets', description: 'Log your practice tests and compare them against historical cutoffs.' } },
        { element: '.nav-link-vault', popover: { title: 'Error Vault', description: 'Save screenshots of questions you got wrong to review later.' } },
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
