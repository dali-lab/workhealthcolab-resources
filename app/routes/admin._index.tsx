import { ExternalLink, Plus } from "lucide-react";
import { Form, Link, redirect } from "react-router";
import { requireAdmin } from "~/services/admin.server";
import { deleteResource, listAllResources, setStatus } from "~/services/admin-resources.server";
import type { Route } from "./+types/admin._index";

// Every resource, whatever its status: add, edit, approve, hide, delete.

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const resources = await listAllResources();
  return {
    resources: resources.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      status: r.status,
      tags: r.taggings.map((t) => t.tag.name).sort((a, b) => a.localeCompare(b)),
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const intent = form.get("intent");
  if (intent === "approve") await setStatus(id, "APPROVED");
  else if (intent === "hide") await setStatus(id, "REJECTED");
  else if (intent === "delete") await deleteResource(id);
  else throw new Response("Bad Request", { status: 400 });
  return redirect("/admin");
}

const STATUS = {
  APPROVED: { label: "On the site", className: "bg-brand-soft text-brand" },
  PENDING: { label: "Waiting for review", className: "bg-warm-bg text-warm-fg" },
  REJECTED: { label: "Hidden", className: "bg-line text-ink-soft" },
} as const;

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function AdminResources({ loaderData }: Route.ComponentProps) {
  const { resources } = loaderData;
  const waiting = resources.filter((r) => r.status === "PENDING").length;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
          <p className="mt-1 text-[15px] text-ink-muted">
            {resources.length} in all{waiting > 0 && `, ${waiting} waiting for review`}. Only ones marked “On the site” are public.
          </p>
        </div>
        <Link to="/admin/new" className="button-primary">
          <Plus size={17} aria-hidden />
          Add resource
        </Link>
      </div>

      {resources.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-line bg-white px-6 py-12 text-center text-[16px] text-ink-muted">
          No resources yet. Add the first one with “Add resource”.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-[15px]">
            <thead>
              <tr className="border-b border-line bg-canvas text-[13px] text-ink-muted">
                <th scope="col" className="px-5 py-2.5 font-medium">Resource</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Tags</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-5 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id} className="border-t border-line align-top first:border-t-0">
                  <td className="max-w-[320px] px-5 py-3">
                    <Link to={`/admin/${r.id}`} className="font-semibold hover:text-brand hover:underline">
                      {r.title}
                    </Link>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-0.5 flex items-center gap-1 text-[13px] text-brand hover:underline"
                    >
                      <span className="truncate">{hostOf(r.url)}</span>
                      <ExternalLink size={12} aria-hidden className="flex-none" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </td>
                  <td className="max-w-[240px] px-3 py-3 text-[14px] text-ink-soft">{r.tags.join(", ") || "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12.5px] font-semibold whitespace-nowrap ${STATUS[r.status].className}`}>
                      {STATUS[r.status].label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Form method="post" className="flex items-center justify-end gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      {r.status === "APPROVED" ? (
                        <button name="intent" value="hide" className="button-secondary button-small" aria-label={`Hide “${r.title}” from the site`}>
                          Hide
                        </button>
                      ) : (
                        <button name="intent" value="approve" className="button-primary button-small" aria-label={`Approve “${r.title}”`}>
                          {r.status === "PENDING" ? "Approve" : "Put back"}
                        </button>
                      )}
                      <Link to={`/admin/${r.id}`} className="button-secondary button-small" aria-label={`Edit “${r.title}”`}>
                        Edit
                      </Link>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
