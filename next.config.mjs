/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/reading-attitude", destination: "/survey-2", permanent: false },
    ];
  },
};

export default nextConfig;
