
import * as React from 'react';

import { Text, View } from '@/components/ui';

interface ErrorMessageProps {
  error: string;
}

export const ErrorMessage = React.memo(({ error }: ErrorMessageProps) => (
  <View className="p-4">
    <Text className="text-red-500">{error}</Text>
  </View>
));