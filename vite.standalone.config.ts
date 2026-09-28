import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [svelte({ compilerOptions: { runes: true } }), tailwindcss(), viteSingleFile()],
  resolve: { alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) } },
  publicDir: false,
  build: {
    outDir: 'dist',
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    reportCompressedSize: true,
    rolldownOptions: { output: { codeSplitting: false } }
  }
});
