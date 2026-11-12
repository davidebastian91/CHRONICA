import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { setupRoomWebSocketServer } from './server/roomServer.ts'

function chronicaWsPlugin(): Plugin {
  return {
    name: 'chronica-ws-server',
    configureServer(server) {
      if (server.httpServer) {
        setupRoomWebSocketServer(server.httpServer);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    chronicaWsPlugin(),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
