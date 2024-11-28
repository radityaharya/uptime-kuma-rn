/* eslint-disable max-lines-per-function */
import { Env } from '@env';
import { useColorScheme } from 'nativewind';
import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Item } from '@/components/settings/item';
import { ItemsContainer } from '@/components/settings/items-container';
import { LanguageItem } from '@/components/settings/language-item';
import { ThemeItem } from '@/components/settings/theme-item';
import { colors, FocusAwareStatusBar, ScrollView, View } from '@/components/ui';
import { Github, Rate, Share, Support, Website } from '@/components/ui/icons';
import { useAuth } from '@/lib';

export default function Settings() {
  const signOut = useAuth.use.signOut();
  const { colorScheme } = useColorScheme();
  const iconColor =
    colorScheme === 'dark' ? colors.neutral[400] : colors.neutral[500];

  return (
    <View className="flex-1 bg-background pt-24">
      <FocusAwareStatusBar />
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

          <Animated.View entering={FadeInDown.duration(1000).delay(400)}>
            <ItemsContainer title="settings.support_us" className="mb-6">
              <Item
                text="settings.share"
                icon={<Share color={iconColor} />}
                onPress={() => {}}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
              <Item
                text="settings.rate"
                icon={<Rate color={iconColor} />}
                onPress={() => {}}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
              <Item
                text="settings.support"
                icon={<Support color={iconColor} />}
                onPress={() => {}}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
            </ItemsContainer>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(1000).delay(500)}>
            <ItemsContainer title="settings.links" className="mb-6">
              <Item
                text="settings.privacy"
                onPress={() => {}}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
              <Item
                text="settings.terms"
                onPress={() => {}}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
              <Item
                text="settings.github"
                icon={<Github color={iconColor} />}
                onPress={() => {}}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
              <Item
                text="settings.website"
                icon={<Website color={iconColor} />}
                onPress={() => {}}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
            </ItemsContainer>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(1000).delay(600)}
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
