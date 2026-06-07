import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth.token';

// Persistência do token de sessão, cross-platform (web = localStorage, native =
// AsyncStorage). Único ponto do app que toca o AsyncStorage. A validade real do
// token (24h / 30d via "lembre de mim") é decidida no server pelo `exp` do JWT.
export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function storeToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
