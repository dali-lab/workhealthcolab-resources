import { defineConfig } from "prisma/config";

// Only `prisma generate` is ever run here. This repo holds no migrations and
// must never push a schema: the database belongs to workhealthcolab-hub.
export default defineConfig({
  schema: "prisma/schema.prisma",
});
