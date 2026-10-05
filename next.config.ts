import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// Vercel's preview toolbar (comments, feedback) loads from vercel.live on preview deployments only
const vercelLive = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";

// Everything is first-party: fonts are self-hosted by next/font, the AI and email calls happen on the
// server, and the resume is a same-origin file. 'unsafe-inline' scripts cover Next's inline bootstrap
// (a nonce would force every page to render dynamically); 'unsafe-eval' is for dev tooling only.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${vercelLive}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${vercelLive}`,
  `frame-src ${vercelLive.trim() || "'none'"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The chat route reads content/ at runtime (the offline agent, later the RAG builder's source)
  // and checks that the resume exists. On Vercel, public/ is served from the CDN rather than
  // bundled, so both are traced into the function explicitly.
  outputFileTracingIncludes: {
    "/api/chat": ["./content/**/*", "./public/resume/**/*", "./src/generated/rag-index.json"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
