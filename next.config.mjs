/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Prevent CSS minification issues
    config.optimization.minimizer.forEach((minimizer) => {
      if (minimizer.constructor.name === 'CssMinimizerPlugin') {
        minimizer.options.minimizerOptions.preset[1].discardComments = false;
      }
    });
    return config;
  },
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
