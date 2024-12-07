/* eslint-disable react/no-unstable-nested-components */
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { Route } from '@react-navigation/native';
import { Redirect, SplashScreen, Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect } from 'react';
import { SafeAreaView, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { Pressable, Text } from '@/components/ui';
import {
  Feed as FeedIcon,
  Settings as SettingsIcon,
} from '@/components/ui/icons';
import { useAuth } from '@/lib';

interface CustomHeaderProps {
  route: Route<string>;
}

const CustomHeader = ({ route }: CustomHeaderProps) => {
  const { colorScheme } = useColorScheme();
  return (
    <SafeAreaView>
      <View className="bg-background flex h-24 flex-row justify-between px-4 pt-12">
        <Text
          className={`text-xl font-semibold ${
            colorScheme === 'dark' ? 'text-white' : 'text-black'
          }`}
        >
          {route.name === 'index' ? '' : 'Settings'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const CustomTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const { colorScheme } = useColorScheme();
  const { width } = useWindowDimensions();

  const getRootRouteName = (routeName: string) => {
    const segments = routeName.split('/');
    return segments[0].replace(/^\((.+)\)$/, '$1');
  };

  const getActiveIndex = () => {
    const currentRootRoute = getRootRouteName(state.routes[state.index].name);
    return mainRoutes.findIndex(
      (route) => getRootRouteName(route.name) === currentRootRoute,
    );
  };

  const mainRoutes = state.routes.filter((route) => {
    const routeParts = route.name.split('/');
    return (
      routeParts.length === 1 ||
      (routeParts.length === 2 && routeParts[1] === 'index')
    );
  });

  const tabWidth = width / mainRoutes.length;
  const activeIndex = getActiveIndex();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withSpring(activeIndex * tabWidth, {
          damping: 15,
          stiffness: 100,
        }),
      },
    ],
  }));

  return (
    <View className="bg-background h-20 flex-row">
      <Animated.View
        className={`absolute top-3 size-14 rounded-2xl ${
          colorScheme === 'dark' ? 'bg-white/10' : 'bg-black/10'
        } backdrop-blur-lg`}
        style={[{ width: tabWidth - 32, marginHorizontal: 16 }, animatedStyle]}
      />
      {mainRoutes.map((route: Route<string>, _index: number) => {
        const currentRootRoute = getRootRouteName(
          state.routes[state.index].name,
        );
        const routeRootName = getRootRouteName(route.name);
        const isFocused = currentRootRoute === routeRootName;

        const activeColor = colorScheme === 'dark' ? '#fff' : '#000';
        const inactiveColor = colorScheme === 'dark' ? '#666' : '#999';

        const icon =
          route.name === 'index' ? (
            <FeedIcon color={isFocused ? activeColor : inactiveColor} />
          ) : (
            <SettingsIcon color={isFocused ? activeColor : inactiveColor} />
          );

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            className="flex-1 items-center justify-center"
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
};

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
        header: ({ route }) => <CustomHeader route={route} />,
        headerTransparent: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarButtonTestID: 'index-tab',
        }}
      />
      <Tabs.Screen
        name="(settings)/index"
        options={{
          title: 'Settings',
          tabBarButtonTestID: 'settings-tab',
        }}
      />
    </Tabs>
  );
}
