import { Env } from '@env';
import { useColorScheme } from 'nativewind';
import React from 'react';

import { Item } from '@/components/settings/item';
import { ItemsContainer } from '@/components/settings/items-container';
import { LanguageItem } from '@/components/settings/language-item';
import { ThemeItem } from '@/components/settings/theme-item';
import { ScrollView, View } from '@/components/ui';
import { useAuth } from '@/lib';
import { infoStore } from '@/store/infoStore';

export default function Settings() {
  const signOut = useAuth.use.signOut();
  const { colorScheme } = useColorScheme();
  const credentials = useAuth.use.credentials();
  const { info } = infoStore();

  return (
    <View className="bg-background flex-1 pt-24">
      <ScrollView className="flex-1">
        <View className="flex-1 px-4">
          <View>
            <ItemsContainer title="settings.generale" className="mb-4">
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
          </View>

          <View>
            <ItemsContainer className="mb-4" title="settings.server">
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
              <Item
                text="settings.version"
                value={info?.version}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
              <Item
                text="settings.server_timezone"
                value={info?.serverTimezone}
                className={`rounded-xl p-4 ${
                  colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}
              />
            </ItemsContainer>
          </View>

          <View>
            <ItemsContainer title="settings.about" className="mb-4">
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
          </View>

          <View>
            <ItemsContainer>
              <Item
                text="settings.logout"
                onPress={signOut}
                className="rounded-xl bg-red-600 p-4"
              />
            </ItemsContainer>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
