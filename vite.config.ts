import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Using '.' instead of process.cwd() to avoid type issues if Node types aren't fully loaded.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // This injects the VITE_API_KEY from Cloudflare into the code where process.env.API_KEY is used
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
    },
  };
});