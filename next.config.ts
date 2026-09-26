import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OpenCascade's WASM build loads its .wasm next to its .js file at runtime,
  // so it must be required from node_modules rather than bundled.
  serverExternalPackages: ["occt-import-js"],
};

export default nextConfig;
