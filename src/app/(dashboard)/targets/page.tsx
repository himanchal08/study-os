import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { addExam, addHistoricalCutoff } from "./actions";

export const metadata: Metadata = { title: "Exams & Targets" };

export default async function TargetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: exams }, { data: cutoffs }] = await Promise.all([
    supabase.from("exams").select("*").eq("user_id", user.id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("cutoffs").select("*").eq("user_id", user.id).order("year", { ascending: false }),
  ]);

  return (
    <div className="space-y-10 animate-fade-in pb-12 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">Exams & Targets</h1>
        <p className="text-sm text-neutral-500">Set your safety targets and track historical cutoffs to see your safety gap.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Exams & Safety Targets */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4">Your Exams</h2>
            {exams?.length === 0 ? (
              <p className="text-sm text-neutral-600 italic">No exams tracked yet.</p>
            ) : (
              <div className="space-y-3">
                {exams?.map((exam) => (
                  <div key={exam.id} className="p-4 rounded-xl border flex items-center justify-between" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
                    <div>
                      <h3 className="text-sm font-medium text-neutral-200">{exam.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500">
                        <span className="uppercase">{exam.exam_type}</span>
                        {exam.stage && <span>· {exam.stage}</span>}
                        {exam.exam_date && <span>· {new Date(exam.exam_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500 mb-0.5">Safety Target</p>
                      <p className="text-lg font-bold text-emerald-400 tabular-nums">
                        {exam.safety_target_score} <span className="text-[10px] font-normal text-neutral-600">/ {exam.maximum_marks}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form action={addExam} className="p-4 rounded-xl border space-y-4" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
            <h3 className="text-sm font-medium text-neutral-300">Add Exam Target</h3>
            <div className="grid grid-cols-2 gap-3">
              <input name="name" placeholder="Exam Name (e.g., SBI PO 2024)" required className="col-span-2 bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-700" />
              <select name="exam_type" className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-700">
                <option value="banking">Banking</option>
                <option value="ssc">SSC</option>
                <option value="other">Other</option>
              </select>
              <input name="stage" placeholder="Stage (e.g., Prelims)" required className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-700" />
              <input name="maximum_marks" type="number" placeholder="Max Marks" required min="1" step="0.5" className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-700" />
              <input name="safety_target_score" type="number" placeholder="Safety Target" required min="1" step="0.5" className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-emerald-400 outline-none focus:border-neutral-700" />
              <input name="exam_date" type="date" className="col-span-2 bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-400 outline-none focus:border-neutral-700" />
            </div>
            <button type="submit" className="w-full text-xs font-medium py-2 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors">
              Save Exam Target
            </button>
          </form>
        </div>

        {/* Historical Cutoffs */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4">Historical Cutoffs</h2>
            {cutoffs?.length === 0 ? (
              <p className="text-sm text-neutral-600 italic">No historical cutoffs recorded.</p>
            ) : (
              <div className="space-y-3">
                {cutoffs?.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border flex items-center justify-between" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
                    <div>
                      <h3 className="text-sm font-medium text-neutral-200">{c.year} {c.stage}</h3>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500">
                        <span className="uppercase">{c.exam_type}</span>
                        <span>· {c.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500 mb-0.5">Cutoff</p>
                      <p className="text-lg font-bold text-rose-400 tabular-nums">
                        {c.cutoff} <span className="text-[10px] font-normal text-neutral-600">/ {c.maximum_marks}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form action={addHistoricalCutoff} className="p-4 rounded-xl border space-y-4" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
            <h3 className="text-sm font-medium text-neutral-300">Add Historical Cutoff</h3>
            <div className="grid grid-cols-2 gap-3">
              <select name="exam_type" className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-700">
                <option value="banking">Banking</option>
                <option value="ssc">SSC</option>
                <option value="other">Other</option>
              </select>
              <input name="stage" placeholder="Exam (e.g., SBI PO Prelims)" required className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-700" />
              <input name="year" type="number" placeholder="Year (e.g., 2023)" required min="2000" className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-700" />
              <input name="category" placeholder="Category (e.g., General)" defaultValue="General" className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-700" />
              <input name="maximum_marks" type="number" placeholder="Max Marks" required min="1" step="0.5" className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-700" />
              <input name="cutoff" type="number" placeholder="Cutoff Score" required min="0" step="0.5" className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-rose-400 outline-none focus:border-neutral-700" />
            </div>
            <button type="submit" className="w-full text-xs font-medium py-2 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors">
              Save Historical Cutoff
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
