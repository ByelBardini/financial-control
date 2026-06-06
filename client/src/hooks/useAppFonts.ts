import { useFonts } from 'expo-font';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';

// Carrega as famílias do protótipo. fontsReady controla o gate de splash no App.
export function useAppFonts(): { fontsReady: boolean } {
  const [fontsReady] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    Geist_500Medium,
    Geist_600SemiBold,
  });
  return { fontsReady };
}
