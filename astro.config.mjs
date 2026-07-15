import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  output: "static",
  site: "https://sergiojtsm.github.io",
  base: "/json-cv/",
  integrations: [react()],
});
