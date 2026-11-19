import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ouvrir l'admin via http://127.0.0.1:3000 en développement (sinon Next
  // bloque ses propres scripts et la page ne s'hydrate jamais).
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
