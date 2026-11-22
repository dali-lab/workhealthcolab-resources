import { prisma } from "./db.server";

export type Resource = { id: string; title: string; url: string; description: string | null; tags: string[]; host: string };

/** Every approved resource, A to Z. (The view only ever returns approved ones.) */
export async function listResources(): Promise<Resource[]> {
  const rows = await prisma.publicResource.findMany({
    select: { id: true, title: true, url: true, description: true, tags: true },
    orderBy: { title: "asc" },
  });
  return rows.map((row) => ({ ...row, host: hostOf(row.url) }));
}

/** Every tag in use, A to Z, with how many resources carry it. */
export function tagsOf(resources: Resource[]) {
  const counts = new Map<string, number>();
  for (const r of resources) for (const tag of r.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Keeps the resources that carry `tag` (if given) and where every word of `q`
 * appears in the title, description, website or tags (ignoring case and accents).
 */
export function searchResources(resources: Resource[], q: string, tag: string | null) {
  const words = normalize(q).split(/\s+/).filter(Boolean);
  return resources.filter((r) => {
    if (tag && !r.tags.includes(tag)) return false;
    if (words.length === 0) return true;
    const text = normalize(`${r.title} ${r.description ?? ""} ${r.host} ${r.tags.join(" ")}`);
    return words.every((word) => text.includes(word));
  });
}

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "https://www.ssa.gov/disability" → "ssa.gov" */
function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
