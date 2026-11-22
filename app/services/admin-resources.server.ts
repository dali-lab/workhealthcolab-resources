import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "~/generated/prisma/client";
import { adminDatabaseUrl } from "./admin.server";

// What the admin portal does to resources. It uses its own database
// connection (ADMIN_DATABASE_URL, the role resources_admin), made only when
// the portal is first used; the public pages never touch it.
// Every caller checks requireAdmin(request) first.

const globalForDb = globalThis as typeof globalThis & { __adminPrisma?: PrismaClient };

function db() {
  const url = adminDatabaseUrl();
  if (!url) throw new Response("Not Found", { status: 404 });
  globalForDb.__adminPrisma ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  return globalForDb.__adminPrisma;
}

export type ResourceInput = { title: string; url: string; description: string | null; tagIds: string[] };
export type FieldErrors = Partial<Record<"title" | "url" | "description", string>>;

const withTags = { taggings: { select: { tag: { select: { id: true, name: true } } } } } as const;

/** Every resource, whatever its status, A to Z. */
export function listAllResources() {
  return db().resource.findMany({ include: withTags, orderBy: { title: "asc" } });
}

export function getResource(id: string) {
  return UUID.test(id) ? db().resource.findUnique({ where: { id }, include: withTags }) : null;
}

export function listTags() {
  return db().resourceTag.findMany({ select: { id: true, name: true }, orderBy: { key: "asc" } });
}

/** A resource added here is approved straight away: whoever has the password is an admin. */
export function createResource({ tagIds, ...fields }: ResourceInput) {
  return db().resource.create({
    data: {
      ...fields,
      status: "APPROVED",
      reviewed_at: new Date(),
      taggings: { create: tagIds.map((tag_id) => ({ tag_id })) },
    },
  });
}

export function updateResource(id: string, { tagIds, ...fields }: ResourceInput) {
  return db().resource.update({
    where: { id },
    data: { ...fields, taggings: { deleteMany: {}, create: tagIds.map((tag_id) => ({ tag_id })) } },
  });
}

export async function deleteResource(id: string) {
  if (UUID.test(id)) await db().resource.deleteMany({ where: { id } });
}

/** Approve, or take back off the public site (hide). */
export async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
  if (!UUID.test(id)) return;
  await db().resource.updateMany({
    where: { id },
    data: { status, reviewed_at: new Date(), ...(status === "APPROVED" ? { rejection_reason: null } : {}) },
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checks a submitted form; returns the clean input, or a message for each field that's wrong. */
export async function parseResource(form: FormData): Promise<{ input: ResourceInput; errors: null } | { input: null; errors: FieldErrors }> {
  const title = String(form.get("title") ?? "").trim();
  let url = String(form.get("url") ?? "").trim();
  const description = String(form.get("description") ?? "").trim() || null;
  const errors: FieldErrors = {};

  if (!title) errors.title = "Enter a title.";
  else if (title.length > 200) errors.title = "Keep the title under 200 characters.";

  // People paste "example.org/help"; assume https.
  if (url && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
  if (!url) errors.url = "Enter the link.";
  else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") errors.url = "Use a web link (https://…).";
      else url = parsed.toString();
    } catch {
      errors.url = "That doesn't look like a link.";
    }
  }

  if (description && description.length > 1000) errors.description = "Keep the description under 1,000 characters.";
  if (Object.keys(errors).length) return { input: null, errors };

  // Only tags that exist.
  const picked = form.getAll("tags").map(String).filter((id) => UUID.test(id));
  const tags = picked.length ? await db().resourceTag.findMany({ where: { id: { in: picked } }, select: { id: true } }) : [];
  return { input: { title, url, description, tagIds: tags.map((t) => t.id) }, errors: null };
}

// Tags: a fixed list, so they stay consistent. The same rules as the hub.

/** Every tag, A to Z, with how many resources carry it. */
export async function listTagsWithCounts() {
  const tags = await db().resourceTag.findMany({
    select: { id: true, name: true, _count: { select: { taggings: true } } },
    orderBy: { key: "asc" },
  });
  return tags.map((t) => ({ id: t.id, name: t.name, count: t._count.taggings }));
}

/** "  Legal   Help " → name "Legal Help", key "legal help" (what has to be unique). */
function tagName(raw: string) {
  const name = raw.trim().replace(/\s+/g, " ");
  return { name, key: name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() };
}

export type TagResult = { ok: true } | { ok: false; error: string };

function checkTagName(name: string): string | null {
  if (!name) return "Enter a name.";
  if (name.length > 40) return "Keep the name under 40 characters.";
  return null;
}

export async function createTag(raw: string): Promise<TagResult> {
  const { name, key } = tagName(raw);
  const problem = checkTagName(name);
  if (problem) return { ok: false, error: problem };
  const existing = await db().resourceTag.findUnique({ where: { key } });
  if (existing) return { ok: false, error: `There's already a tag called “${existing.name}”.` };
  await db().resourceTag.create({ data: { name, key } });
  return { ok: true };
}

/** Renames it on every resource at once: resources point at the tag, not at its name. */
export async function renameTag(id: string, raw: string): Promise<TagResult> {
  if (!UUID.test(id)) return { ok: false, error: "That tag no longer exists." };
  const { name, key } = tagName(raw);
  const problem = checkTagName(name);
  if (problem) return { ok: false, error: problem };
  const existing = await db().resourceTag.findUnique({ where: { key } });
  if (existing && existing.id !== id) {
    return { ok: false, error: `There's already a tag called “${existing.name}”. Merge into it instead.` };
  }
  const changed = await db().resourceTag.updateMany({ where: { id }, data: { name, key } });
  return changed.count ? { ok: true } : { ok: false, error: "That tag no longer exists." };
}

/** Moves every resource from one tag onto another, then deletes the first. */
export async function mergeTags(fromId: string, intoId: string): Promise<TagResult> {
  if (fromId === intoId || !UUID.test(fromId) || !UUID.test(intoId)) return { ok: false, error: "Pick a different tag to merge into." };
  const found = await db().resourceTag.count({ where: { id: { in: [fromId, intoId] } } });
  if (found !== 2) return { ok: false, error: "That tag no longer exists." };
  await db().$transaction([
    db().$executeRaw`
      INSERT INTO resource_taggings (resource_id, tag_id)
      SELECT resource_id, ${intoId}::uuid FROM resource_taggings WHERE tag_id = ${fromId}::uuid
      ON CONFLICT DO NOTHING`,
    db().resourceTag.delete({ where: { id: fromId } }),
  ]);
  return { ok: true };
}

/** Deletes the tag and takes it off every resource (the resources stay). */
export async function deleteTag(id: string) {
  if (UUID.test(id)) await db().resourceTag.deleteMany({ where: { id } });
}
