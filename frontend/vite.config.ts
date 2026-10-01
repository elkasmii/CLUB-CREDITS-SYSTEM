import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev`       -> http://localhost:5173 (camera works on localhost)
// `npm run dev:https` -> https://<your-LAN-IP>:5173 so phones on the same Wi-Fi can use
//                        the camera (browsers only allow camera access over HTTPS).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: {
    port: 5173,
    // The dev server forwards API + image requests to the backend, so the
    // frontend can use relative URLs and there are no CORS issues in development.
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
}));
