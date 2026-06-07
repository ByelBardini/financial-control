const expoPreset = require('jest-expo/jest-preset');

// jest-expo já transforma todos os react-native-* (inclui react-native-css-interop
// e react-native-worklets); falta só liberar a própria nativewind no allowlist.
const transformIgnorePatterns = expoPreset.transformIgnorePatterns.map((pattern) =>
  pattern.includes('native-base')
    ? pattern.replace('native-base', 'native-base|nativewind')
    : pattern,
);

module.exports = {
  ...expoPreset,
  transformIgnorePatterns,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // __tests__/_support/ guarda helpers de teste (render com provider, mocks), não suítes.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/_support/'],
  // A suíte cresceu; sob alta concorrência (todas as suítes em paralelo) as telas
  // mais pesadas (dashboard + React Query) passavam dos 5s default por contenção de
  // CPU, não por bug. 15s dá folga sem mascarar lentidão real.
  testTimeout: 15000,
};
