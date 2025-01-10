/* eslint-disable react/no-unstable-nested-components */
import { Redirect, Tabs } from 'expo-router';
import { RssIcon } from 'lucide-react-native';
import React from 'react';

import {
  Feed as FeedIcon,
  Settings as SettingsIcon
} from '@/components/ui/icons';
import { CustomTabBar } from '@/components/ui/tab-bar';
import { useMonitors } from '@/hooks/use-monitors';
import { useAuth } from '@/lib';

export default function TabLayout() {
  const status = useAuth.use.status();
  const { isLoading } = useMonitors();

  if (status === 'idle' || isLoading) {
    return null;
  }

  if (status === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerTransparent: true,
        headerShown: false
      }}
    >
      <Tabs.Screen
        name="(monitors)"
        options={{
          title: 'Monitors',
          tabBarButtonTestID: 'index-tab',
          tabBarIcon: FeedIcon,
          href: '/(monitors)'
        }}
      />
      <Tabs.Screen
        name="(status)"
        options={{
          title: 'Status Pages',
          tabBarButtonTestID: 'status-tab',
          tabBarIcon: RssIcon,
          href: '/(status)'
        }}
      />
      <Tabs.Screen
        name="(settings)"
        options={{
          title: 'Settings',
          tabBarButtonTestID: 'settings-tab',
          tabBarIcon: SettingsIcon,
          href: '/(settings)/index'
        }}
      />
    </Tabs>
  );
}
