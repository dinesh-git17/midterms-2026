import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { cloudflare } from "@cloudflare/vite-plugin";

// The Cloudflare plugin runs worker/index.ts inside the dev server, so /api/* behaves
// the same in development as on midterms.dins.dev.
export default defineConfig({
  plugins: [svelte(), cloudflare()],
  server: { host: "127.0.0.1", port: 5189, strictPort: true },
  preview: { host: "127.0.0.1", port: 5190, strictPort: true },
});
