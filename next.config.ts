import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The chat route reads content/ at runtime (the offline agent, later the RAG builder's source)
  // and checks that the resume exists. On Vercel, public/ is served from the CDN rather than
  // bundled, so both are traced into the function explicitly.
  outputFileTracingIncludes: {
    "/api/chat": ["./content/**/*", "./public/resume/**/*", "./src/generated/rag-index.json"],
  },
};

export default nextConfig;
