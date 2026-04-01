import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用Cross-Origin Isolation以支持SharedArrayBuffer (KataGo需要)
  async headers() {
    return [
      {
        // 为KataGo相关文件添加COEP: credentialless（更宽松）
        source: '/katago/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
      {
        // 其他页面使用标准COEP
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
        ],
      },
    ];
  },

  // 使用 standalone 输出模式减小部署大小
  output: 'standalone',

  // 优化函数打包大小，排除不需要的依赖
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        '.pnpm-store/**',
        '.git/**',
        'node_modules/@swc/**',
        'node_modules/@esbuild/**',
        'node_modules/sharp/**',
        'node_modules/@img/**',
        'node_modules/canvas/**',
        'node_modules/webpack/**',
        'node_modules/terser/**',
        'node_modules/rollup/**',
        'node_modules/typescript/**',
        'node_modules/eslint/**',
        'node_modules/@typescript-eslint/**',
        'node_modules/prettier/**',
        'node_modules/@playwright/**',
        'node_modules/playwright/**',
        'node_modules/drizzle-kit/**',
        'node_modules/tsx/**',
        'scripts/**',
        'src/rpg/**',
        'tmp/**',
        'test-results/**',
        'e2e/**',
        '.next/cache/**',
        'public/katago/**',
        'public/generated/**',
        'public/game/isometric/**',
      ],
    },
  },

  // 排除不需要的目录
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/scripts', '**/src/rpg', '**/tmp', '**/test-results'],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
