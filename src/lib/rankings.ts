export type RankingPaper = { id: string; name: string; date: string; created_at: string };
export type RankingEntry = { id: string; paper_id: string; name: string; school: string; medium?: "si" | "en"; marks: number; created_at: string };
export function rankingId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid ranking ID.");
}
function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 200) throw new Error(`Enter ${label} of 1–200 characters.`);
  return value.trim();
}
export function validateRankingPaper(data: Record<string, unknown>) {
  const name = text(data.name, "a paper name");
  if (typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0, 10) !== data.date) throw new Error("Choose a valid paper date.");
  return { name, date: data.date };
}
export function validateRankingEntry(data: Record<string, unknown>) {
  rankingId(data.paper_id);
  const name = text(data.name, "a student name"), school = text(data.school, "a school name");
  if (typeof data.marks !== "number" || !Number.isFinite(data.marks) || data.marks < 0 || data.marks > 10000) throw new Error("Enter marks between 0 and 10,000.");
  const medium = data.medium === undefined ? "si" : data.medium;
  if (medium !== "si" && medium !== "en") throw new Error("Choose Sinhala or English medium.");
  return { paper_id: data.paper_id, name, school, marks: data.marks, medium };
}
export function rankStudents(entries: RankingEntry[]) {
  const sorted = [...entries].sort((a, b) => b.marks - a.marks || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  let rank = 0;
  return sorted.map((entry, index) => {
    if (index === 0 || entry.marks !== sorted[index - 1].marks) rank = index + 1;
    return { ...entry, rank };
  });
}
