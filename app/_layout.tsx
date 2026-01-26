import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Fix font loading timeout on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Suppress fontfaceobserver timeout errors (common in React Native Web)
      const originalError = console.error;
      console.error = function(...args: any[]) {
        // Filter out fontfaceobserver timeout errors
        const errorMessage = args[0]?.toString() || '';
        if (errorMessage.includes('timeout exceeded') && errorMessage.includes('fontfaceobserver')) {
          // Silently ignore font loading timeout errors - they're non-critical
          return;
        }
        originalError.apply(console, args);
      };

      // Catch uncaught errors related to font loading
      const errorHandler = (event: ErrorEvent) => {
        if (event.message && 
            event.message.includes('timeout exceeded') && 
            (event.message.includes('fontfaceobserver') || event.message.includes('6000ms'))) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      };
      
      window.addEventListener('error', errorHandler);

      return () => {
        console.error = originalError;
        window.removeEventListener('error', errorHandler);
      };
    }
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="auth/profile-setup" />
        <Stack.Screen name="pickup" />
        <Stack.Screen name="validator" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
