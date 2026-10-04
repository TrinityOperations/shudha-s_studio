import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // src/db/index.ts reads the Supabase CA from disk at runtime; make sure it ships with every
  // server route on Netlify, where the function bundle is built from Next's file trace.
  outputFileTracingIncludes: {
    "/*": ["certs/supabase-ca.crt"],
  },
  experimental: {
    serverActions: {
      // Product image uploads (up to 10 MB per file, pre-resized client-side) go through a server action.
      bodySizeLimit: "12mb",
    },
  },
  images: {
    // Product and site images are served from Supabase Storage.
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/**" }]
      : [],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
