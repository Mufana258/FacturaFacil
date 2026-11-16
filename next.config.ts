import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  outputFileTracingIncludes: {
    "/api/cotacoes/[id]/pdf": ["./assets/fonts/**"],
    "/s/[token]/pdf": ["./assets/fonts/**"],
  },
};

export default nextConfig;
