export type ContentOrder = "oldest" | "newest";

export function orderByCreated<T extends { created_at: string }>(items: T[], order: ContentOrder): T[] {
  return [...items].sort((a, b) => order === "oldest"
    ? a.created_at.localeCompare(b.created_at)
    : b.created_at.localeCompare(a.created_at));
}
