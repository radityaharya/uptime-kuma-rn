import * as React from 'react';

import { Pressable, Text, View } from '@/components/ui';
import { ArrowRight } from '@/components/ui/icons';
import type { TxKeyPath } from '@/lib';
import { cn } from '@/lib/utils';

type ItemProps = {
  text: TxKeyPath;
  value?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  className?: string;
};

export const Item = ({ text, value, icon, onPress, className }: ItemProps) => {
  const isPressable = onPress !== undefined;

  return (
    <Pressable
      onPress={onPress}
      pointerEvents={isPressable ? 'auto' : 'none'}
      className={cn(
        'flex-row items-center justify-between px-4 py-3.5',
        isPressable && 'active:opacity-70',
        className,
      )}
    >
      <View className="flex flex-row items-center gap-4">
        {icon && <View>{icon}</View>}
        <Text tx={text} className="text-base text-foreground" />
      </View>
      <View className="flex flex-row items-center gap-4">
        {value && (
          <Text className="text-sm text-muted-foreground">{value}</Text>
        )}
        {isPressable && <ArrowRight className="text-muted-foreground" />}
      </View>
    </Pressable>
  );
};
