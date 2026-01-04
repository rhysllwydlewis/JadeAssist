import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'JadeWidget',
      formats: ['iife'],
      fileName: () => 'jade-widget.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Disabled since .map is in .gitignore
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'jade-widget.[ext]',
        exports: 'named',
        extend: true,
      },
    },
  },
});
