/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    FRONTEND_URL: process.env.FRONTEND_URL
  },

  // Redirect root URL to the frontend (e.g., Vite dev or deployed app)
  async redirects() {
    return [
      {
        source: '/',
        destination: process.env.FRONTEND_URL || 'http://localhost:8080',
        permanent: false
      }
    ];
  },

  // Rewrites (optional): Map API routes to internal logic or external services
  async rewrites() {
    return [
      {
        source: '/api/properties',
        destination: '/api/properties/index' // or to an external API
      },
      // {
      //   source: '/api/contacts/:id',
      //   destination: '/api/contacts?id=:id' 
      // }    
    ];
  },

  // Custom headers for all routes
  async headers() {
    return [
      {
        source: '/(.*)', // applies to all routes
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ]
      }
    ];
  },

  // Allow images from external domains (e.g., cloudinary, AWS S3, etc.)
  images: {
    domains: ['res.cloudinary.com', 'your-image-domain.com']
  },

  // TypeScript config
  typescript: {
    ignoreBuildErrors: false
  }
};

module.exports = nextConfig;
