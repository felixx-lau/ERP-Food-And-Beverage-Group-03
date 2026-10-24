/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./prisma/erp.db'],
  },
};

export default nextConfig;
