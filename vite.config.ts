import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 基础配置
  const config = {
    base: './', // 使用相对路径，适配构建产物校验
    plugins: [react()],
  };

  // 开发环境配置
  if (mode === 'development') {
    config.server = {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: 'https://open.larksuite.com/open-apis',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    };
  }

  // 生产环境配置
  if (mode === 'production') {
    config.build = {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: undefined, // 避免代码分割，确保所有代码在一个文件中
        },
      },
    };
  }

  return config;
});
