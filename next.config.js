/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['cheerio', 'exceljs'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Aumentar timeout para funciones de scraping
  serverRuntimeConfig: {
    maxDuration: 60,
  },
}

module.exports = nextConfig
