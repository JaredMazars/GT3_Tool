/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features
  experimental: {
    // Optimize for production
    optimizePackageImports: ['@heroicons/react', '@headlessui/react'],
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.blob.core.windows.net',
      },
    ],
  },
  
  // Security headers
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.azure.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.blob.core.windows.net; font-src 'self' data:; connect-src 'self' https://*.azure.com https://*.microsoft.com;",
          },
        ],
      },
    ];
  },
};

// Bundle analyzer support - run with ANALYZE=true npm run build
// Only load if the package is installed and ANALYZE is true
let config = nextConfig;
if (process.env.ANALYZE === 'true') {
  try {
    const withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
    config = withBundleAnalyzer(nextConfig);
  } catch (e) {
    console.warn('Bundle analyzer not installed. Run: npm install --save-dev @next/bundle-analyzer');
  }
}

module.exports = config;
