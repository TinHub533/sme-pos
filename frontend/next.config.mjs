/** @type {import('next').NextConfig} */
const nextConfig = {
  // Traces the minimal set of files each route actually needs into
  // .next/standalone — the Docker runtime stage copies just that plus
  // .next/static, instead of shipping the full node_modules tree.
  output: "standalone",
};
export default nextConfig;
