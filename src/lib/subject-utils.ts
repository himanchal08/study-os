export function deduplicateSubjects<T extends { id: string; name: string }>(rawSubjects: T[]): T[] {
  const seen = new Set<string>();
  return rawSubjects.filter(s => {
    const key = s.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function deduplicateTopics<T extends { id: string; name: string; subject_id: string }>(
  rawTopics: T[],
  validSubjectIds?: Set<string>
): T[] {
  const seen = new Set<string>();
  return rawTopics.filter(t => {
    if (validSubjectIds && !validSubjectIds.has(t.subject_id)) return false;
    if (t.name.toLowerCase().includes("no specific")) return false;
    if (t.name.trim() === "") return false;
    const key = `${t.subject_id}-${t.name.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
}
