/* eslint-disable max-lines-per-function */
import { Env } from '@env';
import { useColorScheme } from 'nativewind';
import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Item } from '@/components/settings/item';
import { ItemsContainer } from '@/components/settings/items-container';
import { LanguageItem } from '@/components/settings/language-item';
import { ThemeItem } from '@/components/settings/theme-item';
import { ScrollView, View } from '@/components/ui';
import { useAuth } from '@/lib';

export default function Settings() {
  const signOut = useAuth.use.signOut();
  const { colorScheme } = useColorScheme();


  const credentials = useAuth.use.credentials();

  return (
    <View className="bg-background flex-1 pt-24">
      <ScrollView className="flex-1">
        <View className="flex-1 px-4">
          <Animated.View entering={FadeInDown.duration(1000).delay(100)}>
            <ItemsContainer title="settings.generale" className="mb-6">
              <LanguageItem
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
              <ThemeItem
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
            </ItemsContainer>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(1000).delay(200)}>
            <ItemsContainer className="mb-6">
              <Item
                text="settings.server"
                value={credentials?.host}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
              <Item
                text="settings.username"
                value={credentials?.username}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
            </ItemsContainer>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(1000).delay(300)}>
            <ItemsContainer title="settings.about" className="mb-6">
              <Item
                text="settings.app_name"
                value={Env.NAME}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
              <Item
                text="settings.version"
                value={Env.VERSION}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
            </ItemsContainer>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(1000).delay(400)}
            className="my-8"
          >
            <ItemsContainer>
              <Item
                text="settings.logout"
                onPress={signOut}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
            </ItemsContainer>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
