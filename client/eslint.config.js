// Flat config (ESLint 9) — base oficial do Expo SDK 56 + desativação das regras
// que conflitam com o Prettier. Formatação é responsabilidade do Prettier
// (script `format`/`format:check`), não do ESLint — por isso só importamos
// `eslint-config-prettier` (desliga regras de estilo) e não o plugin que roda
// o Prettier como regra de lint.
// Doc: https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    ignores: ['dist/*', 'node_modules/*', 'coverage/*', '.expo/*'],
  },
]);
