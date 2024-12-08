import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { Route } from '@react-navigation/routers';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

export const CustomTabBar = ({
  state,
  navigation,
  descriptors,
}: BottomTabBarProps) => {
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
        className={`absolute top-3 size-14 rounded-2xl ${colorScheme === 'dark' ? 'bg-white/10' : 'bg-black/10'} backdrop-blur-lg`}
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

        const descriptor = descriptors[route.key];
        const TabBarIcon = descriptor.options.tabBarIcon;

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            className="flex-1 items-center justify-center"
          >
            {TabBarIcon && (
              <TabBarIcon
                focused={isFocused}
                color={isFocused ? activeColor : inactiveColor}
                size={24}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
};
