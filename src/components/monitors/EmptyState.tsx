
import * as React from 'react';

import { Text, View } from '@/components/ui';

export const EmptyState = React.memo(() => (
  <View className="flex-1 items-center justify-center">
    <Text className="text-white">No monitors available</Text>
  </View>
));