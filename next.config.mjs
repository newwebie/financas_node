/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
    outputFileTracingIncludes: {
      '/api/import/pdf': ['./node_modules/pdfjs-dist/legacy/build/**/*.mjs'],
    },
  },
};

export default nextConfig;
