import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Dev: proxy API + auth webhook to the backend on :3000.
    proxy: {
      "/api": "http://localhost:3000",
      "/internal": "http://localhost:3000",
    },
  },
  build: {
    outDir: "dist",
  },
});
