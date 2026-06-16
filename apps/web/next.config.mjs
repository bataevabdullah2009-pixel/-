import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@voice-sales-log/shared", "@voice-sales-log/bot"],
  turbopack: {
    root: repoRoot
  }
};

export default nextConfig;
