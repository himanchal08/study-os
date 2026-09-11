export function SubjectOptions({ subjects }: { subjects: { id: string; name: string; exam_type?: string | null }[] }) {
  const bank = subjects.filter(s => s.exam_type === "banking");
  const ssc = subjects.filter(s => s.exam_type === "ssc");
  const other = subjects.filter(s => s.exam_type !== "banking" && s.exam_type !== "ssc");

  return (
    <>
      {bank.length > 0 && (
        <optgroup label="Banking">
          {bank.map(s => <option key={s.id} value={s.id} className="bg-neutral-900 text-white">{s.name}</option>)}
        </optgroup>
      )}
      {ssc.length > 0 && (
        <optgroup label="SSC CGL">
          {ssc.map(s => <option key={s.id} value={s.id} className="bg-neutral-900 text-white">{s.name}</option>)}
        </optgroup>
      )}
      {other.length > 0 && (
        <optgroup label="Other">
          {other.map(s => <option key={s.id} value={s.id} className="bg-neutral-900 text-white">{s.name}</option>)}
        </optgroup>
      )}
    </>
  );
}
