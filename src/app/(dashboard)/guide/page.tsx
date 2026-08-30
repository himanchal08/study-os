import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide & Tutorial | Study OS",
};

export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-100">Study OS Guide & Tutorial</h1>
        <p className="mt-2 text-neutral-400">Everything you need to know to master your study tracking.</p>
      </header>

      <div className="prose prose-invert prose-neutral max-w-none space-y-10">
        
        <section>
          <h2 className="text-2xl font-semibold text-neutral-200 border-b border-neutral-800 pb-2">1. The Dashboard & Timer</h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            The Dashboard is your command center. At the top right of the screen (on desktop) or in the mobile menu, you will always find the <strong>Global Study Timer</strong>.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-400 list-disc list-inside">
            <li><strong>Start Session:</strong> Click the play button to start tracking. It persists across page loads.</li>
            <li><strong>Activity Type:</strong> Before starting, you can tag the session as a <em>Lecture</em>, <em>Practice</em>, or <em>Mock</em>. This helps the AI Diagnosis Engine categorize your efforts.</li>
            <li><strong>Tagging Topics:</strong> Select a Subject and Topic from your Syllabus so the system knows exactly what you studied. This automatically schedules revisions for that topic!</li>
            <li><strong>Pause vs Stop:</strong> Pausing keeps the session alive. Stopping finishes the session and logs it to your Recent Activity timesheet.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-neutral-200 border-b border-neutral-800 pb-2">2. Syllabus & Subjects</h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            Go to the <a href="/syllabus" className="text-emerald-400 hover:underline">Syllabus</a> page to manage what you are studying.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-400 list-disc list-inside">
            <li><strong>Add a Subject:</strong> Use the button to create high-level categories (e.g. <em>Quant</em> or <em>Reasoning</em>).</li>
            <li><strong>Add Topics:</strong> Inside a subject, add topics like <em>Algebra</em> or <em>Number Systems</em>. You can mark topics as <em>Strong</em> or <em>Weak</em> manually to keep track of your proficiency.</li>
            <li>When you study a topic using the Timer, the app automatically tracks how many total hours you've invested in it.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-neutral-200 border-b border-neutral-800 pb-2">3. Revisions Engine</h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            Study OS features a Spaced-Repetition system designed to help you remember what you study.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-400 list-disc list-inside">
            <li>Whenever you finish a study session that is tagged with a Topic, the app automatically generates <strong>3 Revision Tasks</strong> for you.</li>
            <li>The revisions are scheduled for <strong>Tomorrow</strong>, <strong>Next Week</strong>, and <strong>Next Month</strong>.</li>
            <li>You can view and complete your due revisions on the Dashboard in the <strong>Revision Queue</strong> panel.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-neutral-200 border-b border-neutral-800 pb-2">4. Planning & Tasks</h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            Study OS is built on the philosophy of "The Night Before". 
          </p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-400 list-disc list-inside">
            <li>Navigate to the <a href="/tasks" className="text-emerald-400 hover:underline">Planner</a> to write down your Todo list for tomorrow.</li>
            <li>You can assign a specific date to a task. If it is scheduled for today, it will appear on your Dashboard.</li>
            <li>Checking off a task logs it into your daily analytics, boosting your completion rate.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-neutral-200 border-b border-neutral-800 pb-2">5. Distractions & Focus Score</h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            If you have the Study OS Browser Extension or Android App installed, it tracks your focus automatically!
          </p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-400 list-disc list-inside">
            <li><strong>Browser Distractions:</strong> If you open YouTube or Reddit during an active study session, the app flags it. But don't worry—if it detects an educational video (like a lecture), it won't penalize you!</li>
            <li><strong>Phone Pickups:</strong> The Android app tracks how many times you unlock your screen while studying.</li>
            <li>All this data is merged into your <strong>Focus Score</strong> on the dashboard, so you can honestly evaluate your study quality.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-neutral-200 border-b border-neutral-800 pb-2">6. Analytics</h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            The <a href="/analytics" className="text-emerald-400 hover:underline">Analytics</a> page gives you a deep dive into your data over the last 30 days.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-400 list-disc list-inside">
            <li><strong>Consistency Heatmap:</strong> A GitHub-style chart showing your study habit over the last year. Don't break the chain!</li>
            <li><strong>Time of Day:</strong> Discover whether you are more productive in the morning, afternoon, or late at night.</li>
            <li><strong>Subject Allocation:</strong> A beautiful donut chart showing exactly where your time goes.</li>
          </ul>
        </section>

      </div>
    </div>
  );
}
