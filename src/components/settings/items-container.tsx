import React from 'react';

import { Text, View } from '@/components/ui';
import type { TxKeyPath } from '@/lib';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  title?: TxKeyPath;
  className?: string;
};

export const ItemsContainer = ({ children, title, className }: Props) => {
  return (
    <>
      {title && <Text className="pb-2 pt-4 text-lg" tx={title} />}
      {<View className={cn('flex flex-col gap-2', className)}>{children}</View>}
    </>
  );
};
