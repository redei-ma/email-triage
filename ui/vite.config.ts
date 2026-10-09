import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path matches the GitHub Pages project URL: <user>.github.io/email-triage/
export default defineConfig({
  base: "/email-triage/",
  plugins: [react()],
  // The Try it tab imports ../src/rules.ts, outside ui/: the dev server must be allowed to serve it.
  server: { fs: { allow: [".."] } },
});
