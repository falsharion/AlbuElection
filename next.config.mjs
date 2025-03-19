/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {

      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'krnxzlhaeqbikbrdfhyw.supabase.co',
        },
      ],
    },
  };
  
  export default nextConfig;
