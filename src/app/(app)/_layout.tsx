/* eslint-disable react/no-unstable-nested-components */
import { Redirect, SplashScreen, Tabs } from 'expo-router';
import React, { useCallback, useEffect } from 'react';

import {
  Feed as FeedIcon,
  Settings as SettingsIcon,
} from '@/components/ui/icons';
import { CustomTabBar } from '@/components/ui/tab-bar';
import { useAuth } from '@/lib';

export default function TabLayout() {
  const status = useAuth.use.status();
  const authStatus = useAuth.use.status();
  const hideSplash = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (status !== 'idle') {
      setTimeout(() => {
        hideSplash();
      }, 1000);
    }
  }, [hideSplash, status]);

  if (authStatus === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerTransparent: true,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(monitors)"
        options={{
          title: 'Monitors',
          tabBarButtonTestID: 'index-tab',
          tabBarIcon: FeedIcon,
          href: '/(monitors)',
        }}
      />
      <Tabs.Screen
        name="(settings)"
        options={{
          title: 'Settings',
          tabBarButtonTestID: 'settings-tab',
          tabBarIcon: SettingsIcon,
          href: '/(settings)/index',
        }}
      />
    </Tabs>
  );
}
