import type { Config } from "@react-router/dev/config";

export default {
  // Rendered on the server, so the list is in the page before any JavaScript loads.
  ssr: true,
  // Fly's proxy ends TLS, so the app sees requests as http while browsers send
  // an https Origin; without this, form posts are refused as cross-site.
  // Every address the site answers on.
  allowedActionOrigins: ["resources.workhealthcolab.com", "workhealthcolab-resources.fly.dev"],
} satisfies Config;
