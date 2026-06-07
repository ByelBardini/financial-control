// Fontes e splash são I/O nativo: mockados com fakes nomeados para os testes
// não dependerem de carregamento real (ver docs/context/gotchas.md).
jest.mock('expo-font', () => {
  const actual = jest.requireActual('expo-font');
  return { ...actual, useFonts: () => [true, null] };
});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
  setOptions: jest.fn(),
}));

// Sem o mock oficial, o SafeAreaProvider não renderiza os filhos até medir os
// insets (que nunca chega no jest) — o mock injeta métricas iniciais.
jest.mock(
  'react-native-safe-area-context',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fábrica do jest.mock exige require
    require('react-native-safe-area-context/jest/mock').default,
);

// Mock oficial do AsyncStorage (KV em memória) pros testes de tokenStorage/AuthContext.
jest.mock(
  '@react-native-async-storage/async-storage',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fábrica do jest.mock exige require
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
