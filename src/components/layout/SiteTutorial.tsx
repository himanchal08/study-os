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
    const supabase = createClient();
    const d = driver({
      showProgress: true,
      steps: [
        {
          element: '#global-timer-card',
          popover: { title: 'Global Study Timer', description: 'This timer is always visible. You can start it, browse other pages, and it will keep tracking your study session in the background.', side: "bottom", align: 'start' }
        },
        {
          element: '#timer-activity-dropdown',
          popover: { title: 'Activity Type', description: 'Before you start, select what you are doing (e.g. Practice, Lecture, Mock). This helps the AI categorize your efforts.', side: "bottom", align: 'center' }
        },
        {
          element: '#timer-play-btn',
          popover: { title: 'Start Studying', description: 'Click Play when you are ready. You can pause it at any time, and click Stop when you finish. Stopping will automatically save your session to the database.', side: "bottom", align: 'end' }
        },
        {
          element: '#tour-daily-target',
          popover: { title: 'Daily Target', description: 'This bar tracks your total study hours for today against your goal. Watch it fill up and turn green as you study!', side: "top", align: 'center' }
        },
        {
          element: '#tour-today-tasks',
          popover: { title: 'Planned Tasks', description: 'Tasks scheduled for today appear here. You can add more tasks using the Planner (Tasks page in the sidebar).', side: "top", align: 'start' }
        },
        {
          element: '#tour-revision-queue',
          popover: { title: 'Auto-Revisions', description: 'When you study a Topic using the timer, Study OS automatically schedules Spaced-Repetition revisions for tomorrow, next week, and next month. They appear here when due!', side: "top", align: 'start' }
        },
        {
          element: '#tour-analytics-kpi',
          popover: { title: 'Daily KPIs', description: 'Your real-time metrics. The Focus Score decreases if you get distracted by your phone or open distracting websites during a session.', side: "top", align: 'start' }
        },
        { popover: { title: 'All Set!', description: 'You are ready to crush your exams with Study OS.' } }
      ],
      onDestroyed: async () => {
        await supabase.from("profiles").update({ tutorial_completed: true }).eq("user_id", userId);
      }
    });

    
    (window as any).startProductTour = () => d.drive();

    if (startImmediately) {
      
      setTimeout(() => {
        d.drive();
      }, 500);
    }
  }, [startImmediately, userId]);

  return null;
}
