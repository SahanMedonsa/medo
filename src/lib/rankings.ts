import { googleDriveFileUrl } from "./pdfs";
import { youtubeId } from "./modules";

export type RankingPaper = { id: string; name: string; date: string; created_at: string; drive_url?: string; answers_url?: string };
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
  let drive_url = "", answers_url = "";
  if (data.drive_url !== undefined) {
    if (typeof data.drive_url !== "string" || data.drive_url.length > 2000) throw new Error("Paste a Google Drive paper link.");
    if (data.drive_url.trim()) drive_url = googleDriveFileUrl(data.drive_url.trim());
  }
  if (data.answers_url !== undefined) {
    if (typeof data.answers_url !== "string" || data.answers_url.length > 2000) throw new Error("Paste a YouTube answers link.");
    if (data.answers_url.trim()) {
      const id = youtubeId(data.answers_url.trim());
      if (!id) throw new Error("Enter a valid YouTube answers video link.");
      answers_url = `https://www.youtube.com/watch?v=${id}`;
    }
  }
  return { name, date: data.date, drive_url, answers_url };
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
