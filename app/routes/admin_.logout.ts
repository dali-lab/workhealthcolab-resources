import { redirect } from "react-router";
import { signOutCookie } from "~/services/admin.server";
import type { Route } from "./+types/admin_.logout";

export async function action({ request }: Route.ActionArgs) {
  return redirect("/admin/login", { headers: { "Set-Cookie": await signOutCookie(request) } });
}

export async function loader() {
  return redirect("/admin");
}
