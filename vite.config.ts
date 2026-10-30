import babel from '@rolldown/plugin-babel';
// import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { createLogger } from 'vite';
import { compression } from 'vite-plugin-compression2';
import { defineConfig } from 'vitest/config';

const environmentNames: Readonly<Record<string, string>> = {
  development: '开发环境',
  test: '测试环境',
  staging: '预发布环境',
  production: '生产环境',
};

// https://vite.dev/config/
export default defineConfig(({ command, mode, isPreview }) => {
  if (!isPreview && !process.env['VITEST']) {
    const action = command === 'build' ? '打包' : '启动';
    const environmentName = environmentNames[mode] ?? mode;
    createLogger().info(`\n[Workbase] ${action}环境：${environmentName}（mode: ${mode}）\n`);
  }

  return {
    clearScreen: false,
    base: '/workbase/',
    resolve: {
      tsconfigPaths: true,
      dedupe: ['react', 'react-dom'],
    },
    plugins: [
      compression({
        algorithms: ['gzip'], // 开启 Gzip 压缩
        threshold: 10240, // 仅对超过 10KB 的文件进行压缩
        deleteOriginalAssets: false, // 保留原始文件，以兼容不支持 Gzip 的环境
      }),
      // tanstackRouter({
      //   target: 'react',
      //   autoCodeSplitting: true,
      // }),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    optimizeDeps: {
      entries: ['index.html'],
      include: [
        'react',
        'react-dom/client',
        'react/jsx-runtime',
        '@tanstack/react-router',
        '@tanstack/react-query',
        '@ant-design/icons',
        '@ant-design/pro-components',
        'antd',
        'react-intl',
        'zustand',
      ],
    },
    server: {
      host: '0.0.0.0',
      port: 8888,
      strictPort: true,
      watch: {
        ignored: ['**/coverage/**', '**/playwright-report/**'],
      },
      warmup: {
        clientFiles: ['./src/main.tsx'],
      },
      proxy: {
        '^/api(?:/|\\?|$)': {
          target: 'http://127.0.0.1:9999',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '') || '/',
        },
      },
    },
    css: {
      preprocessorMaxWorkers: true,
      devSourcemap: true,
      modules: {
        generateScopedName:
          command === 'build' ? '_[hash:base64:8]' : '[name]__[local]__[hash:base64:5]',
      },
    },
    build: {
      target: 'baseline-widely-available',
      outDir: 'workbase',
      emptyOutDir: true,
      manifest: true,
      assetsDir: 'assets',
      minify: 'oxc',
      cssMinify: 'lightningcss',
      cssCodeSplit: true,
      sourcemap: false,
      assetsInlineLimit: 4096,
      modulePreload: { polyfill: true },
      reportCompressedSize: true,
      chunkSizeWarningLimit: 500,
      rolldownOptions: {
        output: {
          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash][extname]',
          codeSplitting: {
            // entriesAware 保留静态 / 动态入口边界；业务端仍需 import() 或 React.lazy。
            // 仅手动拆分 React 和 Ant Design，其余依赖由 Rolldown 自动分包。
            groups: [
              {
                name: 'react-vendor',
                test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
                priority: 100,
                entriesAware: true,
              },
              {
                name: 'antd-vendor',
                test: /node_modules[\\/](?:antd|@ant-design[\\/][^\\/]+|@rc-component[\\/][^\\/]+|rc-[^\\/]+)[\\/]/,
                priority: 80,
                entriesAware: true,
              },
            ],
          },
        },
      },
    },
    worker: { format: 'es' },
    test: {
      globals: false,
      clearMocks: true,
      restoreMocks: true,
      projects: [
        {
          extends: true,
          test: {
            name: 'lint',
            environment: 'node',
            include: ['tests/lint-config.test.mjs'],
          },
        },
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            include: ['tests/unit/**/*.{test,spec}.{js,jsx,ts,tsx}'],
            setupFiles: ['./tests/setup.ts'],
          },
        },
      ],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.d.ts', 'src/generated/**'],
        reporter: ['text', 'html', 'lcov'],
      },
    },
  };
});
