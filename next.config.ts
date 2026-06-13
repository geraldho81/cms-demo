import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Markdown versions of every page/post for AI crawlers (linked from /llms.txt).
    // Plain rewrites run before dynamic routes, so these win over the (site) catch-all.
    return [
      { source: "/blog/:slug.md", destination: "/md/blog/:slug" },
      { source: "/:slug.md", destination: "/md/:slug" },
    ];
  },
};

export default nextConfig;
