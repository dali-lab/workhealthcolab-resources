# workhealthcolab-resources

The public resource library for [Work Health CoLab](https://workhealthcolab.com): services and information for people staying at work, or getting back to it, while managing a health condition.

It's a small, read-only website. Coaches and admins add and approve resources in CoLab's private case-management app (the "hub"); this site lists the approved ones, with search.

## How it gets its data

The site reads CoLab's database directly, but only one thing in it:

- The hub owns the database. It defines a view, `public_resources`, that returns approved resources only: `id`, `title`, `url`, `description`, `updated_at`.
- This site connects as a database role, `resources_reader`, that can read that view and nothing else. It can't see any other table or change anything.
- `prisma/schema.prisma` here is a partial schema: one model, `Resource`, mapped to that view.

> **Never run `prisma db push` or `prisma migrate` from this repo.** With a one-model schema, Prisma would try to delete every other table. The read-only role would refuse, but don't rely on that alone. Schema changes happen in the hub. If the view's columns change there, update the `Resource` model here to match.

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
  services/resources.server.ts   reads and searches resources
  services/db.server.ts          the Prisma client
  root.tsx                       HTML shell and error page
  app.css                        Tailwind and the CoLab colors
prisma/schema.prisma             the partial schema
```

Search is a plain form (`/?q=benefits`) answered by the server, so the page works without JavaScript; with it, results update as you type.
