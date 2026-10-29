// Configuración de Vite (servidor de desarrollo y compilador del frontend).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Plugin de React: JSX y recarga en caliente.
  plugins: [react()],
  server: {
    // host 0.0.0.0: acepta conexiones desde otras máquinas de la red (no solo localhost).
    host: '0.0.0.0',
    // Puerto fijo 4200 con strictPort: si está ocupado, Vite falla en vez de usar otro puerto.
    // Es importante porque http://localhost:4200/ es la redirect URI registrada en Entra ID y Cognito,
    // el origen permitido por CORS en el BFF y en el API Gateway.
    port: 4200,
    strictPort: true
  }
});
