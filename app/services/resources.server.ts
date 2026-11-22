import { prisma } from "./db.server";

export type Resource = { id: string; title: string; url: string; description: string | null; host: string };

/** Every approved resource, A to Z. (The view only ever returns approved ones.) */
export async function listResources(): Promise<Resource[]> {
  const rows = await prisma.resource.findMany({
    select: { id: true, title: true, url: true, description: true },
    orderBy: { title: "asc" },
  });
  return rows.map((row) => ({ ...row, host: hostOf(row.url) }));
}

/** Keeps the resources where every word of `q` appears (ignoring case and accents). */
export function searchResources(resources: Resource[], q: string) {
  const words = normalize(q).split(/\s+/).filter(Boolean);
  if (words.length === 0) return resources;
  return resources.filter((r) => {
    const text = normalize(`${r.title} ${r.description ?? ""} ${r.host}`);
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
