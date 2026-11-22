import { useState } from "react";
import { Form, data, redirect } from "react-router";
import { ResourceForm } from "~/components/resource-form";
import { requireAdmin } from "~/services/admin.server";
import { deleteResource, getResource, listTags, parseResource, updateResource } from "~/services/admin-resources.server";
import type { Route } from "./+types/admin.$id";

// Edit one resource, or delete it.

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const [resource, tags] = await Promise.all([getResource(params.id), listTags()]);
  if (!resource) throw new Response("Not Found", { status: 404 });
  return {
    tags,
    resource: {
      title: resource.title,
      url: resource.url,
      description: resource.description,
      tagIds: resource.taggings.map((t) => t.tag.id),
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdmin(request);
  const form = await request.formData();
  if (form.get("intent") === "delete") {
    await deleteResource(params.id);
    return redirect("/admin");
  }
  if (!(await getResource(params.id))) throw new Response("Not Found", { status: 404 });
  const parsed = await parseResource(form);
  if (!parsed.input) return data({ errors: parsed.errors }, { status: 400 });
  await updateResource(params.id, parsed.input);
  return redirect("/admin");
}

export default function EditResource({ loaderData, actionData }: Route.ComponentProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mx-auto max-w-[640px]">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Edit resource</h1>
      <ResourceForm values={loaderData.resource} tags={loaderData.tags} errors={actionData?.errors} submitLabel="Save" />

      <section aria-labelledby="delete" className="mt-6 rounded-2xl border border-line bg-white p-6">
        <h2 id="delete" className="text-[17px] font-semibold">
          Delete this resource
        </h2>
        <p className="mt-1 text-[15px] text-ink-muted">It comes off the public site and can't be brought back.</p>
        <Form method="post" className="mt-4 flex flex-wrap gap-2">
          {confirming ? (
            <>
              <button type="submit" name="intent" value="delete" className="button-danger">
                Yes, delete it
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="button-secondary">
                Keep it
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="button-secondary text-danger">
              Delete resource
            </button>
          )}
        </Form>
      </section>
    </div>
  );
}
