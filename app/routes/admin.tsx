import { Form, Link, Outlet } from "react-router";
import { requireAdmin } from "~/services/admin.server";
import type { Route } from "./+types/admin";

// The admin portal's frame: every page under /admin (except sign-in) sits in
// it. Each page's own loader and action also call requireAdmin: loaders run
// side by side, so this one alone wouldn't protect them.

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin · Resource library" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return null;
}

export default function AdminLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1080px] flex-wrap items-center justify-between gap-3 px-6">
          <Link to="/admin" className="flex min-h-11 items-center gap-2.5">
            <img src="/colab-logo.png" alt="" className="size-8 rounded-lg" />
            <span className="text-[16px] font-semibold">
              Resource library <span className="font-medium text-ink-muted">admin</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="button-quiet">
              View the public site
            </a>
            <Form method="post" action="/admin/logout">
              <button type="submit" className="button-secondary">
                Sign out
              </button>
            </Form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1080px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
