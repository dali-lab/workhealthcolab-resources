// Fly's health check. It answers without touching the database, so the site
// counts as up even when the database can't be reached.
export function loader() {
  return Response.json({ ok: true });
}
