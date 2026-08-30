import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "In-Depth Tutorial | Study OS",
};

export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-16 pb-24">
      <header className="border-b border-neutral-800 pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-100">Study OS: The Complete Manual</h1>
        <p className="mt-3 text-neutral-400 text-lg">
          A definitive, button-by-button guide on exactly how to use every feature, dropdown, and tool in Study OS.
        </p>
      </header>

      <div className="prose prose-invert prose-neutral max-w-none space-y-12">
        
        {/* DASHBOARD */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">1</div>
            <h2 className="text-2xl font-semibold text-neutral-200 m-0">The Dashboard & KPIs</h2>
          </div>
          <p className="text-neutral-400">
            The <Link href="/" className="text-emerald-400 hover:underline">Dashboard</Link> is your daily command center. It aggregates everything you need to do today.
          </p>
          <div className="mt-6 space-y-4">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-medium text-neutral-200 mt-0">Today's Target Bar</h3>
              <p className="text-sm text-neutral-400 mt-2">Located at the very top, this visualizes your daily study goal.</p>
              <ul className="text-sm text-neutral-400 mt-2 list-disc list-inside">
                <li><strong>The Bar:</strong> Fills up dynamically as you log study sessions. It changes color from grey to purple to green when you hit 100%.</li>
                <li><strong>Settings:</strong> You can change your Daily Target (e.g. from 8h to 10h) by clicking the Settings (⚙️) icon in the bottom left of the sidebar menu.</li>
              </ul>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-medium text-neutral-200 mt-0">Today's Analytics (The KPI Strip)</h3>
              <p className="text-sm text-neutral-400 mt-2">Four cards that break down your immediate performance.</p>
              <ul className="text-sm text-neutral-400 mt-2 list-disc list-inside">
                <li><strong>Focus Score Card:</strong> Displays a percentage (e.g., 85%). If you pick up your phone (detected via the Android App) or open a distracting website (detected via the Browser Extension) while the timer is running, this score drops. Below the percentage, you will see exactly how many times you picked up your phone today.</li>
                <li><strong>Sessions Completed:</strong> Simply counts the number of times you've hit "Stop" on the timer today.</li>
                <li><strong>Completion Rate:</strong> Looks at your Planned Tasks for today. If you planned 4 tasks and checked off 3, it displays 75%.</li>
              </ul>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-medium text-neutral-200 mt-0">Recent Activity (Timesheet)</h3>
              <p className="text-sm text-neutral-400 mt-2">At the bottom of the dashboard, you will find a list of all your study sessions from the last 7 days.</p>
              <ul className="text-sm text-neutral-400 mt-2 list-disc list-inside">
                <li><strong>Delete Button (Trash Icon):</strong> If you hover your mouse over any row in this timesheet, a red trash can appears on the right. Clicking this will permanently delete that log if you accidentally left the timer running.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* GLOBAL TIMER */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">2</div>
            <h2 className="text-2xl font-semibold text-neutral-200 m-0">The Global Study Timer</h2>
          </div>
          <p className="text-neutral-400">
            The Timer is docked at the top right of the screen (or in the mobile hamburger menu). It persists across all pages, meaning you can navigate around the app without stopping your session.
          </p>
          <div className="mt-6 space-y-4">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-medium text-neutral-200 mt-0">Buttons & Dropdowns</h3>
              <ul className="text-sm text-neutral-400 mt-2 list-disc list-inside space-y-3">
                <li><strong>Activity Type Dropdown (Default: Practice):</strong> Click this to classify <em>how</em> you are studying. Options include:
                  <ul className="ml-6 mt-1 list-circle text-neutral-500">
                    <li><strong>Lecture:</strong> Watching a video or attending a class. (Browser extension gives leeway for YouTube).</li>
                    <li><strong>Practice:</strong> Solving problems or reading standard material.</li>
                    <li><strong>Mock:</strong> Taking a full-length test.</li>
                    <li><strong>Revision:</strong> Going back over old material.</li>
                  </ul>
                </li>
                <li><strong>Subject Dropdown:</strong> Select the broad Subject you are studying (e.g. Physics). You must create subjects in the Syllabus page first.</li>
                <li><strong>Topic Dropdown:</strong> Once a subject is selected, this dropdown populates with topics (e.g. Kinematics). <strong>Crucial:</strong> If you select a Topic before starting the timer, the app will automatically schedule Spaced Repetitions for this topic!</li>
                <li><strong>Notes Input:</strong> A small text field to type exactly what you are doing (e.g., "HC Verma Chapter 3").</li>
                <li><strong>Play Button (▶️):</strong> Starts the timer. You will see the clock start ticking.</li>
                <li><strong>Pause Button (⏸️):</strong> Pauses the timer if you take a bathroom break. The time paused is subtracted from your final total automatically.</li>
                <li><strong>Stop Button (⏹️):</strong> Ends the session and saves it to your database.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PLANNER */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold">3</div>
            <h2 className="text-2xl font-semibold text-neutral-200 m-0">The Planner (Tasks)</h2>
          </div>
          <p className="text-neutral-400">
            Located in the sidebar under <Link href="/tasks" className="text-emerald-400 hover:underline">Tasks</Link>. This is a calendar-based to-do list.
          </p>
          <div className="mt-6 space-y-4">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-medium text-neutral-200 mt-0">How to use it</h3>
              <ul className="text-sm text-neutral-400 mt-2 list-disc list-inside space-y-3">
                <li><strong>Calendar Ribbon:</strong> At the top, you see dates. Click any date (e.g., tomorrow) to view or add tasks for that specific day.</li>
                <li><strong>"+ Add Task" Button:</strong> Opens a dialog to create a new task.</li>
                <li><strong>Task Title:</strong> What you intend to do (e.g., "Solve 50 Algebra questions").</li>
                <li><strong>Priority Dropdown:</strong> Set to High, Medium, or Low. High priority tasks appear at the top of the list with a red indicator.</li>
                <li><strong>Time Estimate:</strong> Enter how many minutes you think this will take (e.g. 120). This helps the app calculate if you are over-planning your day.</li>
                <li><strong>Checkbox:</strong> Clicking the circle next to a task marks it as completed, striking it through and increasing your daily completion rate.</li>
                <li><strong>Timer Icon (Hover):</strong> If you hover over a task, a small play button appears. Clicking it will automatically start the Global Timer pre-filled with this task's details!</li>
              </ul>
            </div>
          </div>
        </section>

        {/* SYLLABUS */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">4</div>
            <h2 className="text-2xl font-semibold text-neutral-200 m-0">Syllabus & Topics</h2>
          </div>
          <p className="text-neutral-400">
            Located at <Link href="/syllabus" className="text-emerald-400 hover:underline">Syllabus</Link>. This is the structural backbone of your studies.
          </p>
          <div className="mt-6 space-y-4">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-medium text-neutral-200 mt-0">Managing the Structure</h3>
              <ul className="text-sm text-neutral-400 mt-2 list-disc list-inside space-y-3">
                <li><strong>+ New Subject:</strong> Creates a major category. You can pick a custom color (e.g., blue for Math) which will color-code everything in the app related to it.</li>
                <li><strong>+ Add Topic:</strong> Inside a Subject card, click this to add granular chapters (e.g. "Trigonometry").</li>
                <li><strong>Confidence Dropdowns (Weak/Medium/Strong):</strong> Next to every topic is a dropdown. You manually set how confident you feel about this topic. The system uses this to suggest what you should study if you ask for recommendations.</li>
                <li><strong>Invested Hours:</strong> You'll see a small grey number (e.g., 14h) next to topics. This is calculated automatically based on how long you've run the Global Timer with that topic selected.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* REVISIONS ENGINE */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">5</div>
            <h2 className="text-2xl font-semibold text-neutral-200 m-0">Revisions Engine</h2>
          </div>
          <p className="text-neutral-400">
            Study OS operates completely automatically in the background to ensure you don't forget what you've learned.
          </p>
          <div className="mt-6 space-y-4">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-medium text-neutral-200 mt-0">How it works</h3>
              <ul className="text-sm text-neutral-400 mt-2 list-disc list-inside space-y-3">
                <li><strong>Triggering:</strong> You do NOT manually create revisions. When you use the Global Timer and tag a <strong>Topic</strong>, the moment you click Stop, the app generates 3 background tasks.</li>
                <li><strong>The Spaced Repetition Schedule:</strong> It schedules a "Daily" revision for Tomorrow, a "Weekly" revision for 7 days from now, and a "Monthly" revision for 30 days from now.</li>
                <li><strong>Revision Queue (Dashboard):</strong> Look at the Revision Queue on the Dashboard. Any revision scheduled for today (or overdue) will appear here.</li>
                <li><strong>Checkbox:</strong> Clicking the checkbox on a revision marks it as completed.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ANALYTICS */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">6</div>
            <h2 className="text-2xl font-semibold text-neutral-200 m-0">Analytics & Deep Dive</h2>
          </div>
          <p className="text-neutral-400">
            Located at <Link href="/analytics" className="text-emerald-400 hover:underline">Analytics</Link>.
          </p>
          <div className="mt-6 space-y-4">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-medium text-neutral-200 mt-0">Interpreting the Charts</h3>
              <ul className="text-sm text-neutral-400 mt-2 list-disc list-inside space-y-3">
                <li><strong>Time of Day (Radar Chart):</strong> Shows a spider-web chart. Spikes at "08:00" mean you do your best studying at 8 AM. Use this to discover your peak biological focus hours.</li>
                <li><strong>Subject Allocation (Donut Chart):</strong> Shows exactly what percentage of your time is spent on Math vs Science. Hover over a slice to see the exact hours.</li>
                <li><strong>Focus & Distractions:</strong> If you use the Browser Extension, this lists exactly which websites (like Reddit) ruined your focus score, and how much time you wasted there. It also lists exactly how many times you picked up your phone in the last 30 days.</li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
