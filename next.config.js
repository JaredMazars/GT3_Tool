/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Experimental features
  experimental: {
    // Optimize for production
    optimizePackageImports: ['lucide-react', '@headlessui/react'],
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
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle Azure SDK packages
    if (isServer) {
      // Externalize Azure SDK packages for server-side rendering
      config.externals = config.externals || [];
      config.externals.push({
        '@azure/openai': 'commonjs @azure/openai',
        '@azure/identity': 'commonjs @azure/identity',
        '@azure/storage-blob': 'commonjs @azure/storage-blob',
        '@azure/search-documents': 'commonjs @azure/search-documents',
        '@azure/msal-node': 'commonjs @azure/msal-node',
      });
    }
    
    return config;
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
            value: process.env.NODE_ENV === 'development' 
              ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.azure.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.blob.core.windows.net; font-src 'self' data:; connect-src 'self' https://*.azure.com https://*.microsoft.com http://127.0.0.1:* http://localhost:*; frame-src 'self' https://*.blob.core.windows.net;"
              : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.azure.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.blob.core.windows.net; font-src 'self' data:; connect-src 'self' https://*.azure.com https://*.microsoft.com; frame-src 'self' https://*.blob.core.windows.net;",
          },
        ],
      },
      // Analytics API routes - optimized caching and compression
      {
        source: '/api/clients/:id/analytics/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=600', // 10 minutes cache
          },
        ],
      },
      {
        source: '/api/clients/:id/wip',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=600', // 10 minutes cache
          },
        ],
      },
      {
        source: '/api/clients/:id/debtors',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=600', // 10 minutes cache
          },
        ],
      },
      // Group analytics API routes - optimized caching
      {
        source: '/api/groups/:groupCode/analytics/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=600', // 10 minutes cache
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
