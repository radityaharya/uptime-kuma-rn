import * as React from 'react';

import { ActivityIndicator, Text, View } from '@/components/ui';

export const LoadingState = React.memo(({ message }: { message?: string }) => (
  <View className="flex-1 items-center justify-center">
    <ActivityIndicator size="large" />
    <Text className="mt-2">{message}</Text>
  </View>
));
