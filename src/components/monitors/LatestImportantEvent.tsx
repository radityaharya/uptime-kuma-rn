import { formatDistance } from 'date-fns';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, TouchableOpacity } from 'react-native';

import { Text, View } from '@/components/ui';
import { type HeartBeat } from '@/schemas/monitor';
import { useLatestImportantEvents } from '@/store/monitorContext';

import { Stacked } from '../ui/stack';

interface LatestImportantEventProps {
  event: {
    monitorId?: number;
    monitorName: string;
    heartbeat: HeartBeat;
  };
}

export function LatestImportantEvent({ event }: LatestImportantEventProps) {
  const router = useRouter();
  const eventTime = event.heartbeat.time;

  // FIX: event time broken

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(app)/(monitors)/[id]',
          params: { id: Number(event.monitorId) }
        })
      }
    >
      <View
        // className={`w-full flex-row items-center justify-between rounded-md px-4 py-3 ${event.heartbeat.status === 1 ? 'bg-green-500' : 'bg-red-500'}`}
        className={`w-full flex-row items-center justify-start gap-3 rounded-md border border-black/50 bg-card px-4 py-3 dark:border-white/50`}
      >
        {/* status dot */}
        <View
          className={`size-2 rounded-full ${
            event.heartbeat.status === 1 ? 'bg-green-500' : 'bg-red-500'
          }`}
        ></View>
        <View className="">
          <Text className="text-xs text-foreground/60">
            {formatDistance(eventTime, new Date(), { addSuffix: true })}
          </Text>
          <Text
            className="clamp-1 mb-1 text-sm font-medium text-foreground"
            numberOfLines={1}
          >
            {event.monitorName} - {event.heartbeat.msg.slice(0, 50)}
          </Text>
        </View>
        <Text className="ml-3 text-xs text-foreground/60"></Text>
      </View>
    </Pressable>
  );
}

export function LatestImportantEvents() {
  const importantEvents = useLatestImportantEvents(5);

  if (!importantEvents) {
    return null;
  }

  const cards = importantEvents.map((event, index) => (
    <LatestImportantEvent key={index} event={event} />
  ));

  return (
    <View className="mt-2 w-full">
      <Stacked cards={cards} />
      <View className="mt-4">
        {/* <View className="w-fit rounded-md bg-secondary p-2 text-sm font-medium text-foreground/60">
          <Text>View all events &gt;</Text>
        </View> */}
        <TouchableOpacity>
          <Text className="text-sm text-foreground/60">
            View all events &gt;
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
