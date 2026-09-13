export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const STATUS_ORDER = { draft: 0, active: 1, archived: 2 } as const;

export function isValidStatusTransition(
  current: "draft" | "active" | "archived",
  next: "draft" | "active" | "archived"
): boolean {
  return STATUS_ORDER[next] > STATUS_ORDER[current];
}
