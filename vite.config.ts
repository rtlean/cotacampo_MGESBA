import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.EVOLUTION_API_URL': JSON.stringify(
      process.env.EVOLUTION_API_URL ||
        process.env.VITE_EVOLUTION_API_URL ||
        'https://iconickakapo-evolution.cloudfy.live/manager'
    ),
    'process.env.EVOLUTION_API_KEY': JSON.stringify(
      process.env.EVOLUTION_API_KEY ||
        process.env.VITE_EVOLUTION_API_KEY ||
        'YF8unjvXGuYzvVCzRjnyMnIAhDG9YsUO'
    ),
    'process.env.EVOLUTION_INSTANCE_NAME': JSON.stringify(
      process.env.EVOLUTION_INSTANCE_NAME ||
        process.env.VITE_EVOLUTION_INSTANCE_NAME ||
        'CotaCampo'
    ),
    'process.env.VITE_EVOLUTION_API_URL': JSON.stringify(
      process.env.VITE_EVOLUTION_API_URL ||
        process.env.EVOLUTION_API_URL ||
        'https://iconickakapo-evolution.cloudfy.live/manager'
    ),
    'process.env.VITE_EVOLUTION_API_KEY': JSON.stringify(
      process.env.VITE_EVOLUTION_API_KEY ||
        process.env.EVOLUTION_API_KEY ||
        'YF8unjvXGuYzvVCzRjnyMnIAhDG9YsUO'
    ),
    'process.env.VITE_EVOLUTION_INSTANCE_NAME': JSON.stringify(
      process.env.VITE_EVOLUTION_INSTANCE_NAME ||
        process.env.EVOLUTION_INSTANCE_NAME ||
        'CotaCampo'
    ),
    'process.env.WHATSAPP_TEST_RECIPIENT': JSON.stringify(
      process.env.WHATSAPP_TEST_RECIPIENT || process.env.VITE_WHATSAPP_TEST_RECIPIENT || ''
    ),
  },
  server: {
    port: 3000,
    host: true,
  },
});
