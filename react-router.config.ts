import type { Config } from "@react-router/dev/config";

export default {
  // Rendered on the server, so the list is in the page before any JavaScript loads.
  ssr: true,
} satisfies Config;
