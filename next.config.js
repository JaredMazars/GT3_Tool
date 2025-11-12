/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
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
