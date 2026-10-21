import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    basicSsl()
  ],
  server: {
    port: 5173,
    https: true,
    host: '127.0.0.1' // Matches https://127.0.0.1:5173/ exactly
  }
});
