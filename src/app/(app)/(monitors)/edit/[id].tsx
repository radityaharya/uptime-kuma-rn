import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { MonitorForm } from '@/components/monitors/form/MonitorForm';
import { useMonitorMutation } from '@/hooks/use-monitor-mutation';
import { type MonitorFormData } from '@/schemas/monitor';
import { clientStore } from '@/store/clientStore';
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

const getDefaultValues = (
  isNewMonitor: boolean,
  monitor?: MonitorFormData
): Partial<MonitorFormData> => {
  if (isNewMonitor || !monitor) {
    return defaultNewMonitorValues;
  }

  const baseValues = {
    id: monitor.id,
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
    path: monitor.pathName,
    tags:
      monitor.tags?.map((tag) => ({
        ...tag,
        id: tag.tag_id as number
      })) || []
  };

  switch (monitor.type) {
    case 'http':
      return {
        ...baseValues,
        url: monitor.url,
        method: monitor.method,
        accepted_statuscodes: monitor.accepted_statuscodes
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
  const { mutateMonitor } = useMonitorMutation(isNewMonitor);

  const client = clientStore.getClient();
  if (!client) {
    router.back();
    return;
  }

  const handleSubmit = (data: MonitorFormData) => {
    mutateMonitor(data);
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
      <MonitorForm
        onSubmit={handleSubmit}
        defaultValues={getDefaultValues(isNewMonitor, monitor)}
      />
    </ScrollView>
  );
}
