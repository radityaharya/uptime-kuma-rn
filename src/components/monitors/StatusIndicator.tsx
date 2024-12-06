import { View } from '@/components/ui';

const getStatusColor = (active: boolean) => {
  return active ? 'bg-green-500' : 'bg-red-500';
};

export const StatusIndicator = ({ active }: { active: boolean }) => (
  <View className={`size-3 rounded-full ${getStatusColor(active)} mr-2`} />
);
