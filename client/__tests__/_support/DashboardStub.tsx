import { Text } from 'react-native';

// Stub leve do DashboardScreen pros testes de navegação: evita puxar as queries
// reais do dashboard. Mora num módulo próprio (não inline no jest.mock) porque o
// transform do NativeWind injeta `_ReactNativeCSSInterop`, que fica fora de
// escopo na fábrica hoisted do jest.mock.
export function DashboardStub() {
  return <Text>Dashboard</Text>;
}
