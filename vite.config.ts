import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  server: {
    // The hub runs on 3000.
    port: 4000,
    strictPort: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
});
