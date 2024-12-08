import { useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { Pressable } from 'react-native';

import { Text, View } from '@/components/ui';
import { type Status, useStatusStore } from '@/store/statusStore';

interface StatusItemProps {
  item: Status;
}

function StatusItem({ item }: StatusItemProps) {
  const url = new URL(item.url);
  const slug = url.pathname.split('/').pop();
  const router = useRouter();

  return (
    <Pressable
      className="bg-background flex flex-col overflow-hidden rounded-lg 
          border border-gray-800 bg-gradient-to-br 
          from-gray-800/90 to-gray-900/90 p-4 transition-all duration-200"
      onPress={() =>
        router.push({
          pathname: `/(app)/(status)/detail`,
          params: { url: item.url },
        })
      }
    >
      <Text className="mb-2 text-xl font-bold">{slug}</Text>
      <View className="mb-2 flex-row items-center gap-2">
        <View className="rounded-full bg-muted px-2 py-1">
          <Text className="text-xs text-muted-foreground">{url.hostname}</Text>
        </View>
      </View>
      <Text className="text-sm text-muted-foreground">
        Monitors: {item.monitors?.length ?? 0}
      </Text>
    </Pressable>
  );
}

export default function StatusPage() {
  const { statusList, isLoading } = useStatusStore();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <FlatList
        data={statusList}
        keyExtractor={(item) => item.url}
        renderItem={({ item }) => <StatusItem item={item} />}
        ItemSeparatorComponent={() => <View className="h-4" />}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={
          <View className="p-4">
            <Text className="text-center text-muted-foreground">
              No status pages added
            </Text>
          </View>
        }
      />
    </View>
  );
}
