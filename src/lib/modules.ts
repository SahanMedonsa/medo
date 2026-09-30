export type Medium = "si" | "en";
export function contentMedium(item: { medium?: Medium }): Medium { return item.medium ?? "si"; }
function validateMedium(value: unknown): Medium {
  if (value === undefined) return "si";
  if (value !== "si" && value !== "en") throw new Error("Choose Sinhala or English medium.");
  return value;
}

export const moduleCategories = ["2026 O/L Maths", "Grade 10", "General maths", "AL Video Modules", "Tutes", "#tute", "A/L Past Papers", "O/L Past Papers"] as const;
export type VideoModule = {
  id: string;
  title: string;
  description: string;
  category: string;
  medium?: Medium;
  video_id: string;
  folder_id?: string | null;
  published: boolean;
  created_at: string;
};

export function youtubeId(input: string): string | null {
  try {
    const url = new URL(input);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1);
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (/^\/(shorts|embed|live)\//.test(url.pathname)) id = url.pathname.split("/")[2];
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function validateModule(input: Record<string, unknown>) {
  const video_id = typeof input.url === "string" ? youtubeId(input.url) : null;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!video_id) throw new Error("Enter a valid YouTube video link.");
  if (!title || title.length > 200) throw new Error("Enter a title of 1–200 characters.");
  if (description.length > 5000) throw new Error("Description must be 5,000 characters or fewer.");
  if (!moduleCategories.some((category) => category === input.category)) throw new Error("Choose a valid category.");
  if (typeof input.published !== "boolean") throw new Error("Choose draft or published.");
  if (input.folder_id !== undefined && input.folder_id !== null && (typeof input.folder_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.folder_id))) throw new Error("Choose a valid lesson folder.");
  return { medium: validateMedium(input.medium), video_id, title, description, category: input.category as string, published: input.published, folder_id: input.folder_id ?? null };
}

export type LessonFolder = {
  id: string;
  title: string;
  description: string;
  category: string;
  medium?: Medium;
  planned_videos: number;
  marks: number;
  created_at: string;
};

export function validateFolder(input: Record<string, unknown>) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!title || title.length > 200) throw new Error("Enter a folder title of 1–200 characters.");
  if (!description || description.length > 5000) throw new Error("Enter a description of 1–5,000 characters.");
  if (!moduleCategories.some((category) => category === input.category)) throw new Error("Choose a valid category.");
  if (typeof input.planned_videos !== "number" || !Number.isInteger(input.planned_videos) || input.planned_videos < 1 || input.planned_videos > 10000) throw new Error("Enter a planned video count between 1 and 10,000.");
  if (typeof input.marks !== "number" || !Number.isInteger(input.marks) || input.marks < 0 || input.marks > 1000) throw new Error("Enter marks between 0 and 1,000.");
  return { medium: validateMedium(input.medium), title, description, category: input.category as string, planned_videos: input.planned_videos, marks: input.marks };
}
