import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearStoredToken, getStoredToken, storeToken } from '../../src/lib/tokenStorage';

describe('tokenStorage', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('guarda e lê o token', async () => {
    await storeToken('tok-123');
    expect(await getStoredToken()).toBe('tok-123');
  });

  it('devolve null quando não há token', async () => {
    expect(await getStoredToken()).toBeNull();
  });

  it('limpa o token guardado', async () => {
    await storeToken('tok-123');
    await clearStoredToken();
    expect(await getStoredToken()).toBeNull();
  });

  it('sobrescreve o token anterior ao guardar de novo', async () => {
    await storeToken('tok-antigo');
    await storeToken('tok-novo');
    expect(await getStoredToken()).toBe('tok-novo');
  });

  it('limpar sem token guardado não quebra', async () => {
    await expect(clearStoredToken()).resolves.toBeUndefined();
    expect(await getStoredToken()).toBeNull();
  });
});
