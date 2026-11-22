# workhealthcolab-resources

The public resource library for [Work Health CoLab](https://workhealthcolab.com): services and information for people staying at work, or getting back to it, while managing a health condition.

It's a small, read-only website. Coaches and admins add and approve resources in CoLab's private case-management app (the "hub"); this site lists the approved ones, with search.

## How it gets its data

The site reads CoLab's database directly, but only one thing in it:

- The hub owns the database. It defines a view, `public_resources`, that returns approved resources only: `id`, `title`, `url`, `description`, `updated_at`, and `tags` (a list of tag names).
- This site connects as a database role, `resources_reader`, that can read that view and nothing else. It can't see any other table or change anything.
- `prisma/schema.prisma` here is a partial schema: `PublicResource`, mapped to that view, plus the three resource tables the optional admin portal uses.

> **Never run `prisma db push` or `prisma migrate` from this repo.** With a one-model schema, Prisma would try to delete every other table. The read-only role would refuse, but don't rely on that alone. Schema changes happen in the hub. If the view's columns or the resource tables change there, update the models here to match.

## Admin portal (optional)

A simple page at `/admin` to add, edit, approve, hide and delete resources, and manage their tags. It's protected by one shared password: there are no usernames or emails.

It's **off by default**. `/admin` answers "not found" unless all three of these are set:

| Variable | What it is |
| --- | --- |
| `ADMIN_ENABLED` | `true` to switch the portal on. Anything else, or unset, keeps it off. |
| `ADMIN_PASSWORD` | The password. In production it must be at least 12 characters: use a long random one. Local development accepts any. |
| `ADMIN_DATABASE_URL` | A connection as the role `resources_admin`, which can change resources and nothing else. |

Good to know:

- The public pages never use the admin connection; they stay read-only.
- Signing in lasts 8 hours. Changing `ADMIN_PASSWORD` signs everyone out.
- Five wrong passwords in a row close sign-in to that visitor for 15 minutes.
- Anyone with the password can change what the public site shows, so share it with as few people as possible, and switch the portal off (`ADMIN_ENABLED=false`) when it isn't needed.
- A resource added here goes on the site straight away.
- Tags are a fixed list, managed at `/admin/tags` (add, rename, merge, delete) and in the hub. Resources pick from that list, which keeps tags consistent.
- Behind a proxy that ends TLS (Fly, for example), list the site's address under `allowedActionOrigins` in `react-router.config.ts`, or the portal's forms are refused.

## Run it

You need Node 22 or newer and a connection string for the `resources_reader` role.

```sh
npm install
cp .env.example .env.local   # then put the real DATABASE_URL in .env.local
npm run dev                  # http://localhost:4000
```

`npm run typecheck` checks types. `npm run build` then `npm start` runs the production build.

## Layout

It's a [React Router](https://reactrouter.com) app in framework mode with file-based routing: each file in `app/routes` is a page.

```
app/
  routes/_index.tsx              the library page (loader + UI)
  routes/admin*.tsx              the admin portal: sign-in, list, add, edit
  services/resources.server.ts   reads and searches resources (public pages)
  services/db.server.ts          the read-only Prisma client
  services/admin.server.ts       the portal's on/off switch, password and sign-in
  services/admin-resources.server.ts   the portal's changes to resources
  root.tsx                       HTML shell and error page
  app.css                        Tailwind and the CoLab colors
prisma/schema.prisma             the partial schema
```

Search is a plain form (`/?q=benefits`) and each tag filter is a link (`/?tag=Benefits`), both answered by the server, so the page works without JavaScript; with it, results update as you type. Tags are created and managed in the hub.
