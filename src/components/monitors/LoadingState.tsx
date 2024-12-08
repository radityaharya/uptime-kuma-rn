import * as React from 'react';

import { ActivityIndicator, View } from '@/components/ui';

export const LoadingState = React.memo(() => (
  <View className="flex-1 items-center justify-center">
    <ActivityIndicator size="large" />
  </View>
));
