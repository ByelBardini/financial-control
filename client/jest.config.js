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
};
