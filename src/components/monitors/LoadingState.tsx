
import * as React from 'react';

import { Text, View } from '@/components/ui';

export const LoadingState = React.memo(() => (
  <View className="flex-1 items-center justify-center">
    <Text className="text-foreground">Loading...</Text>
  </View>
));