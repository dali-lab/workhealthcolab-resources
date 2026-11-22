import { useState } from "react";
import { Form, data, redirect, useNavigation } from "react-router";
import { requireAdmin } from "~/services/admin.server";
import { createTag, deleteTag, listTagsWithCounts, mergeTags, renameTag } from "~/services/admin-resources.server";
import type { Route } from "./+types/admin.tags";

// The list of tags resources can carry. It's a fixed list so tags stay
// consistent: resources pick from it, and renaming or merging a tag here
// changes it on every resource that has it.

export function meta({}: Route.MetaArgs) {
  return [{ title: "Tags · Resource library admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { tags: await listTagsWithCounts() };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "");

  if (intent === "delete") {
    await deleteTag(id);
    return redirect("/admin/tags");
  }
  const result =
    intent === "create"
      ? await createTag(name)
      : intent === "rename"
        ? await renameTag(id, name)
        : intent === "merge"
          ? await mergeTags(id, String(form.get("into") ?? ""))
          : null;
  if (!result) throw new Response("Bad Request", { status: 400 });
  // Say which row the problem belongs to ("new" for the add box).
  if (!result.ok) return data({ error: result.error, at: intent === "create" ? "new" : id }, { status: 400 });
  return redirect("/admin/tags");
}

const resourcesWith = (count: number) => (count === 1 ? "1 resource" : `${count} resources`);

export default function AdminTags({ loaderData, actionData }: Route.ComponentProps) {
  const { tags } = loaderData;
  const busy = useNavigation().state !== "idle";
  // Which tag is being renamed, merged or deleted, if any.
  const [mode, setMode] = useState<{ id: string; kind: "rename" | "merge" | "delete" } | null>(null);
  const errorAt = (at: string) => (actionData?.at === at ? actionData.error : undefined);

  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
      <p className="mt-1 text-[15px] text-ink-muted">
        Resources pick from this list. Renaming or merging a tag updates every resource that has it.
      </p>

      {/* The key changes after each add, so the box comes back empty. */}
      <Form key={tags.length} method="post" className="mt-6 rounded-2xl border border-line bg-white p-6">
        <input type="hidden" name="intent" value="create" />
        <label htmlFor="new-tag" className="mb-1.5 block text-[14px] font-semibold">
          New tag
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="new-tag"
            name="name"
            maxLength={40}
            placeholder="e.g. Benefits"
            aria-invalid={errorAt("new") ? true : undefined}
            aria-describedby={errorAt("new") ? "new-tag-error" : undefined}
            className="input min-w-0 flex-1"
          />
          <button type="submit" disabled={busy} className="button-primary">
            Add tag
          </button>
        </div>
        {errorAt("new") && (
          <p id="new-tag-error" role="alert" className="mt-1.5 text-[13.5px] text-danger">
            {errorAt("new")}
          </p>
        )}
      </Form>

      {tags.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-line bg-white px-6 py-10 text-center text-[16px] text-ink-muted">No tags yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
          {tags.map((tag) => {
            const active = mode?.id === tag.id ? mode.kind : null;
            const others = tags.filter((t) => t.id !== tag.id);
            const error = errorAt(tag.id);
            return (
              <li key={tag.id} className="px-5 py-3.5">
                {active === "rename" ? (
                  <Form method="post" onSubmit={() => setMode(null)} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="intent" value="rename" />
                    <input type="hidden" name="id" value={tag.id} />
                    <input name="name" defaultValue={tag.name} maxLength={40} aria-label={`New name for “${tag.name}”`} autoFocus className="input min-w-0 flex-1" />
                    <button type="submit" className="button-primary">
                      Save
                    </button>
                    <button type="button" onClick={() => setMode(null)} className="button-secondary">
                      Cancel
                    </button>
                  </Form>
                ) : active === "merge" ? (
                  <Form method="post" onSubmit={() => setMode(null)} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="intent" value="merge" />
                    <input type="hidden" name="id" value={tag.id} />
                    <label className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-[15px]">
                      <span>
                        Merge <strong className="font-semibold">{tag.name}</strong> into
                      </span>
                      <select name="into" required defaultValue="" className="input w-auto min-w-40 flex-1">
                        <option value="" disabled>
                          Choose a tag
                        </option>
                        {others.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className="button-primary">
                      Merge
                    </button>
                    <button type="button" onClick={() => setMode(null)} className="button-secondary">
                      Cancel
                    </button>
                  </Form>
                ) : active === "delete" ? (
                  <Form method="post" onSubmit={() => setMode(null)} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={tag.id} />
                    <p className="min-w-0 flex-1 text-[15px]">
                      Delete <strong className="font-semibold">{tag.name}</strong>?{" "}
                      {tag.count > 0 ? `It comes off ${resourcesWith(tag.count)}; they stay in the library.` : "No resource uses it."}
                    </p>
                    <button type="submit" className="button-danger">
                      Delete
                    </button>
                    <button type="button" onClick={() => setMode(null)} className="button-secondary">
                      Cancel
                    </button>
                  </Form>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <p className="min-w-0 flex-1 text-[16px] font-semibold">
                      {tag.name} <span className="ml-1.5 text-[14px] font-normal text-ink-muted">{resourcesWith(tag.count)}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setMode({ id: tag.id, kind: "rename" })} className="button-secondary button-small" aria-label={`Rename “${tag.name}”`}>
                        Rename
                      </button>
                      {others.length > 0 && (
                        <button type="button" onClick={() => setMode({ id: tag.id, kind: "merge" })} className="button-secondary button-small" aria-label={`Merge “${tag.name}” into another tag`}>
                          Merge
                        </button>
                      )}
                      <button type="button" onClick={() => setMode({ id: tag.id, kind: "delete" })} className="button-secondary button-small text-danger" aria-label={`Delete “${tag.name}”`}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
                {error && (
                  <p role="alert" className="mt-1.5 text-[13.5px] text-danger">
                    {error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
