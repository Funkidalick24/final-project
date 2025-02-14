import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base public path when served in production
  base: '/',
  
  // Configure server options
  server: {
    port: 3000,
    open: true, // Open browser on server start
    cors: true, // Enable CORS
  },
  
  // Build options
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate source maps for better debugging
    sourcemap: true,
    
    // Configure rollup options
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        bookings: resolve(__dirname, 'pages/bookings.html'),
        itinerary: resolve(__dirname, 'pages/itinerary.html'),
        explore: resolve(__dirname, 'pages/explore.html'),
        profile: resolve(__dirname, 'pages/profile.html')
      },
      output: {
        // Configure chunks
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
      external: [
        '/public/json/airports.json'
      ]
    },
  },
  
  // Resolve file extensions and aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@scripts': resolve(__dirname, './src/scripts'),
      '@styles': resolve(__dirname, './src/styles'),
      '@assets': resolve(__dirname, './src/assets'),
      '@public': resolve(__dirname, './public')
    },
  },
  
  // Configure plugins
  plugins: [],
  
  // Optimize dependencies
  optimizeDeps: {
    include: [], // Add any dependencies that need to be pre-bundled
  },
  
  // CSS configuration
  css: {
    devSourcemap: true,
    // Configure preprocessors if needed
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@styles/_variables.scss";`,
      },
    },
  },
}); 