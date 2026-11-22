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
