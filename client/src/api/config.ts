// Base da API. EXPO_PUBLIC_* é embutido no bundle pelo Expo em build/start time
// (reinicie o Expo após mudar). Default localhost para web/dev no PC.
// CAVEAT device físico: localhost é o próprio aparelho — use o IP da LAN da máquina
// (ex.: EXPO_PUBLIC_API_URL=http://192.168.0.10:8080) ao rodar no celular.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
