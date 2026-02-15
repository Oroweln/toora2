import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '@/src/i18n'; // Initialize i18n before anything renders
import '@/src/services/backgroundTasks'; // Register background task definitions

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useVisitStore } from '@/src/stores/useVisitStore';
import { useLanguageStore } from '@/src/stores/useLanguageStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const loadFromStorage = useVisitStore((s) => s.loadFromStorage);
  const loadLanguage = useLanguageStore((s) => s.loadLanguage);

  useEffect(() => {
    loadFromStorage();
    loadLanguage();
  }, [loadFromStorage, loadLanguage]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="itinerary/[id]"
          options={{
            headerShown: true,
            headerTransparent: true,
            headerTitle: '',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="route/[id]"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="hotspot/[hotspotId]"
          options={{
            headerShown: true,
            headerTitle: '',
            headerBackTitle: 'Map',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="complete/[id]"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
