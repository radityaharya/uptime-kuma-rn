import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { StatusBar } from '@/components/ui';
import { hydrateAuth, loadSelectedTheme } from '@/lib';
import { useThemeConfig } from '@/lib/use-theme-config';
import { MonitorProvider } from '@/store/monitorContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(app)',
};

hydrateAuth();
loadSelectedTheme();
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export default function RootLayout() {
  return (
    <Providers>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
      <PortalHost />
    </Providers>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeConfig();
  return (
    <MonitorProvider>
      <StatusBar />
      <GestureHandlerRootView
        style={styles.container}
        className={theme.dark ? `dark` : undefined}
      >
        <KeyboardProvider>
          <ThemeProvider value={theme}>
            <BottomSheetModalProvider>
              {children}
              <FlashMessage position="top" />
            </BottomSheetModalProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </MonitorProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
