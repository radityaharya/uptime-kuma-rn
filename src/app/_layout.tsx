import '../../global.css';

import { useMMKVDevTools } from '@dev-plugins/react-native-mmkv';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel
} from 'react-native-reanimated';
import { Toaster } from 'sonner-native';

import { StatusBar } from '@/components/ui';
import { loadSelectedTheme, useAuth } from '@/lib';
import { startBackgroundService } from '@/lib/background-service';
import { log } from '@/lib/log';
import {
  cancelAllScheduledNotifications,
  handleNotificationResponse,
  registerForPushNotificationsAsync
} from '@/lib/notification';
import { storage } from '@/lib/storage';
import { useThemeConfig } from '@/lib/use-theme-config';
import { clientStore } from '@/store/clientStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(app)'
};

loadSelectedTheme();
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 500,
  fade: true
});

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false
});

export default function RootLayout() {
  const auth = useAuth();
  const [isReady, setIsReady] = React.useState(false);
  const hasHydrated = React.useRef(false);

  useMMKVDevTools({ storage: storage });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (!hasHydrated.current) {
          hasHydrated.current = true;
          await auth.hydrate();
        }

        log.debug('Auth status:', auth.status);

        if (auth.status === 'authenticated') {
          await startBackgroundService();
          await new Promise<void>((resolve, reject) => {
            const maxAttempts = 10;
            let attempts = 0;

            const checkClient = () => {
              const client = clientStore.getClient();
              if (client?.isSocketConnected()) {
                resolve();
              } else if (attempts >= maxAttempts) {
                reject(new Error('Failed to connect client'));
              } else {
                attempts++;
                setTimeout(checkClient, 1000);
              }
            };

            checkClient();
          });
        }
      } catch (error) {
        log.error('Failed to initialize app:', error);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    initializeApp();
  }, [auth.status]);

  if (!isReady) {
    return null;
  }

  return (
    <Providers>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
      <PortalHost />
    </Providers>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeConfig();
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    const setup = async () => {
      await cancelAllScheduledNotifications();
      await registerForPushNotificationsAsync();

      notificationListener.current =
        Notifications.addNotificationReceivedListener((notification) => {
          log.debug('Received notification:', notification);
        });

      responseListener.current =
        Notifications.addNotificationResponseReceivedListener(
          handleNotificationResponse
        );
    };

    setup();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <>
      <StatusBar />
      <GestureHandlerRootView
        style={styles.container}
        className={theme.dark ? `dark` : undefined}
      >
        <ThemeProvider value={theme}>
          <BottomSheetModalProvider>
            {children}
            <FlashMessage position="top" />
            <Toaster offset={60} />
          </BottomSheetModalProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
