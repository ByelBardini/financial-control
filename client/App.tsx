import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAppFonts } from './src/hooks/useAppFonts';
import { DashboardScreen } from './src/screens/DashboardScreen';

void SplashScreen.preventAutoHideAsync();

// Shell do app: provider de safe-area, error boundary, gate de fontes e status
// bar. Sem lógica de negócio — fica portável pra um futuro Expo Router (vira
// app/_layout.tsx + app/index.tsx).
export default function App() {
  const { fontsReady } = useAppFonts();

  const hideSplash = useCallback(() => {
    if (fontsReady) void SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <View onLayout={hideSplash} className="flex-1 bg-background">
          <DashboardScreen />
        </View>
        <StatusBar style="light" />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
