import { data, redirect } from "react-router";
import { ResourceForm } from "~/components/resource-form";
import { requireAdmin } from "~/services/admin.server";
import { createResource, listTags, parseResource } from "~/services/admin-resources.server";
import type { Route } from "./+types/admin.new";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { tags: await listTags() };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const parsed = await parseResource(await request.formData());
  if (!parsed.input) return data({ errors: parsed.errors }, { status: 400 });
  await createResource(parsed.input);
  return redirect("/admin");
}

export default function NewResource({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <div className="mx-auto max-w-[640px]">
      <h1 className="text-2xl font-semibold tracking-tight">Add resource</h1>
      <p className="mt-1 mb-6 text-[15px] text-ink-muted">It goes on the public site as soon as you save it.</p>
      <ResourceForm tags={loaderData.tags} errors={actionData?.errors} submitLabel="Add resource" />
    </div>
  );
}
