import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { toast } from 'sonner-native';

import { MonitorForm } from '@/components/monitors/form/MonitorForm';
import { type MonitorFormData } from '@/schemas/monitor';
import { monitorStore } from '@/store/monitorStore';

const defaultNewMonitorValues: Partial<MonitorFormData> = {
  type: 'http',
  name: '',
  description: null,
  interval: 60,
  timeout: 30,
  maxretries: 0,
  retryInterval: 60,
  resendInterval: 0,
  upsideDown: false,
  notificationIDList: {},
  tags: []
};

const getDefaultValues = (isNewMonitor: boolean, monitor?: MonitorFormData): Partial<MonitorFormData> => {
  if (isNewMonitor || !monitor) {
    return defaultNewMonitorValues;
  }

  const baseValues = {
    type: monitor.type,
    name: monitor.name,
    description: monitor.description,
    interval: monitor.interval,
    timeout: monitor.timeout,
    maxretries: monitor.maxretries,
    retryInterval: monitor.retryInterval,
    resendInterval: monitor.resendInterval,
    upsideDown: monitor.upsideDown,
    notificationIDList: monitor.notificationIDList,
    tags: monitor.tags?.map((tag) => ({
      ...tag,
      id: tag.tag_id as number
    })) || []
  };

  switch (monitor.type) {
    case 'http':
      return {
        ...baseValues,
        url: monitor.url,
        method: monitor.method
      };
    case 'ping':
      return {
        ...baseValues,
        hostname: monitor.hostname
      };
    case 'port':
      return {
        ...baseValues,
        hostname: monitor.hostname,
        port: monitor.port
      };
    default:
      return baseValues;
  }
};

export default function EditMonitor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const monitor = monitorStore.getMonitor(Number(id ?? 0));
  const isNewMonitor = id === 'new';

  const handleSubmit = (data: MonitorFormData) => {
    console.log(isNewMonitor ? 'Creating monitor:' : 'Updating monitor:', data);
    toast.success(isNewMonitor ? 'Monitor Created' : 'Monitor Updated');
    router.back();
  };

  if (!isNewMonitor && !monitor) {
    return (
      <ScrollView className="bg-background flex-1">
        <Text>Loading...</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="bg-background flex-1">
      <Stack.Screen
        name="EditMonitor"
        options={{
          title: isNewMonitor
            ? 'Create Monitor'
            : `Edit Monitor: ${monitor?.name}`
        }}
      />
      <MonitorForm onSubmit={handleSubmit} defaultValues={getDefaultValues(isNewMonitor, monitor)} />
    </ScrollView>
  );
}
