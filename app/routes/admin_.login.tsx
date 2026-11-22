import { Form, data, redirect, useNavigation } from "react-router";
import { isSignedIn, requireAdminEnabled, signIn } from "~/services/admin.server";
import type { Route } from "./+types/admin_.login";

// Sign in to the admin portal with the one password (ADMIN_PASSWORD).

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin sign in · Resource library" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  requireAdminEnabled();
  if (await isSignedIn(request)) throw redirect("/admin");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  requireAdminEnabled();
  const form = await request.formData();
  const result = await signIn(request, String(form.get("password") ?? ""));
  if (!result.ok) return data({ error: result.error }, { status: 401 });
  return redirect("/admin", { headers: { "Set-Cookie": result.cookie } });
}

export default function AdminLogin({ actionData }: Route.ComponentProps) {
  const busy = useNavigation().state === "submitting";
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <img src="/colab-logo.png" alt="" className="mx-auto size-12 rounded-lg" />
        <p className="mt-3 text-center text-[15px] font-semibold text-brand">Work Health CoLab</p>
        <h1 className="mt-4 text-center text-2xl font-semibold tracking-tight">Resource library admin</h1>

        <Form method="post" className="mt-6 space-y-4">
          {actionData?.error && (
            <p role="alert" className="rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-[14px] text-danger">
              {actionData.error}
            </p>
          )}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-[14px] font-semibold">
              Password
            </label>
            <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus className="input h-11" />
          </div>
          <button type="submit" disabled={busy} className="button-primary h-11 w-full">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </Form>

        <p className="mt-6 text-center text-[14px]">
          <a href="/" className="font-semibold text-brand hover:underline">
            Back to the resource library
          </a>
        </p>
      </div>
    </main>
  );
}
