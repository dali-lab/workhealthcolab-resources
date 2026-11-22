import { Form, Link, useNavigation } from "react-router";

// The add/edit form in the admin portal.

type Values = { title: string; url: string; description: string | null; tagIds: string[] };
type Errors = Partial<Record<"title" | "url" | "description", string>>;

export function ResourceForm({
  values,
  tags,
  errors = {},
  submitLabel,
}: {
  values?: Values;
  tags: { id: string; name: string }[];
  errors?: Errors;
  submitLabel: string;
}) {
  const busy = useNavigation().state === "submitting";
  return (
    <Form method="post" noValidate className="space-y-5 rounded-2xl border border-line bg-white p-6">
      <Field label="Title" name="title" error={errors.title}>
        <input id="title" name="title" defaultValue={values?.title} maxLength={200} aria-invalid={errors.title ? true : undefined} aria-describedby={errors.title ? "title-error" : undefined} className="input" />
      </Field>
      <Field label="Link" name="url" error={errors.url}>
        <input id="url" name="url" type="url" inputMode="url" defaultValue={values?.url} placeholder="https://…" aria-invalid={errors.url ? true : undefined} aria-describedby={errors.url ? "url-error" : undefined} className="input" />
      </Field>
      <Field label="Description" name="description" optional error={errors.description} hint="A line or two on what it offers and who it's for.">
        <textarea id="description" name="description" rows={3} maxLength={1000} defaultValue={values?.description ?? ""} aria-invalid={errors.description ? true : undefined} aria-describedby={errors.description ? "description-error" : "description-hint"} className="input h-auto py-2 leading-snug" />
      </Field>

      <fieldset>
        <legend className="mb-1.5 block text-[14px] font-semibold">
          Tags <span className="font-normal text-ink-muted">(optional)</span>
        </legend>
        {tags.length === 0 ? (
          <p className="text-[14px] text-ink-muted">
            No tags yet.{" "}
            <Link to="/admin/tags" className="font-semibold text-brand hover:underline">
              Add some
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <label
                key={tag.id}
                className="flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong bg-white px-4 text-[14.5px] font-medium select-none hover:border-brand has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand has-focus-visible:outline-3 has-focus-visible:outline-brand-200"
              >
                <input type="checkbox" name="tags" value={tag.id} defaultChecked={values?.tagIds.includes(tag.id)} className="sr-only" />
                {tag.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap gap-2 border-t border-line pt-5">
        <button type="submit" name="intent" value="save" disabled={busy} className="button-primary">
          {busy ? "Saving…" : submitLabel}
        </button>
        <Link to="/admin" className="button-secondary">
          Cancel
        </Link>
      </div>
    </Form>
  );
}

function Field({ label, name, optional, hint, error, children }: { label: string; name: string; optional?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[14px] font-semibold">
        {label}
        {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-[13.5px] text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${name}-hint`} className="mt-1 text-[13.5px] text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
