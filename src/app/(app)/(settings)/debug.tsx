import * as Application from 'expo-application';
import { scheduleNotificationAsync } from 'expo-notifications';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { Platform } from 'react-native';

import { Item } from '@/components/settings/item';
import { ItemsContainer } from '@/components/settings/items-container';
import { ScrollView, View } from '@/components/ui';

export default function Debug() {
  const { colorScheme } = useColorScheme();

  return (
    <View className="bg-background flex-1 pt-24">
      <ScrollView className="flex-1">
        <View className="flex-1 px-4">
          <ItemsContainer title="debug.system" className="mb-4">
            <Item
              text="debug.device_info"
              value={Platform.OS}
              className={`rounded-xl p-4 ${
                colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
              }`}
            />
            <Item
              text="debug.build_version"
              value={Application.nativeApplicationVersion ?? 'N/A'}
              className={`rounded-xl p-4 ${
                colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
              }`}
            />
            <Item
              text="debug.color_scheme"
              value={colorScheme}
              className={`rounded-xl p-4 ${
                colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
              }`}
            />
          </ItemsContainer>
          <ItemsContainer title="debug.notifications" className="mb-4">
            <Item
              text="debug.send_test_notification"
              onPress={() => {
                scheduleNotificationAsync({
                  content: {
                    title: 'Test notification',
                    body: 'This is a test notification',
                  },
                  trigger: null,
                });
              }}
              className={`rounded-xl p-4 ${
                colorScheme === 'dark' ? 'bg-white/5' : 'bg-black/5'
              }`}
            />
          </ItemsContainer>
        </View>
      </ScrollView>
    </View>
  );
}
