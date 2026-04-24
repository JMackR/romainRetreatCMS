/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['next/core-web-vitals', 'next/typescript'],
  ignorePatterns: [
    '**/payload-types.ts',
    '**/.next/**',
    'node_modules',
    'src/app/**/importMap.js',
  ],
  root: true,
}
