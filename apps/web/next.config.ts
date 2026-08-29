import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle, so a deploy is `node server.js` with no
  // install step and without shipping the whole monorepo.
  output: "standalone",
  // Tracing defaults to this app's own folder, which would leave the `@carbonloop/*`
  // workspace packages it imports out of that bundle. Trace from the repo root.
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
};

export default nextConfig;
