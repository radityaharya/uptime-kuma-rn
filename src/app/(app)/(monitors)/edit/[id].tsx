import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { toast } from 'sonner-native';

import { MonitorForm } from '@/components/monitors/form/MonitorForm';
import {
  type HttpMonitorFormData,
  type MonitorFormData
} from '@/schemas/monitor';
import { useMonitor } from '@/store/monitorContext';

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

export default function EditMonitor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const monitor = useMonitor(Number(id ?? 0));
  const isNewMonitor = id === 'new';

  const handleSubmit = (data: MonitorFormData) => {
    console.log(isNewMonitor ? 'Creating monitor:' : 'Updating monitor:', data);
    // Alert.alert(
    //   isNewMonitor ? 'Monitor Created' : 'Monitor Updated',
    //   'Operation completed successfully'
    // );
    toast.success(isNewMonitor ? 'Monitor Created' : 'Monitor Updated');
    router.back();
  };

  const getDefaultValues = (): Partial<MonitorFormData> => {
    if (isNewMonitor || !monitor) {
      return defaultNewMonitorValues;
    }

    const baseValues = {
      name: monitor.name,
      description: monitor.description,
      interval: monitor.interval,
      timeout: monitor.timeout,
      maxretries: monitor.maxretries,
      retryInterval: monitor.retryInterval,
      resendInterval: monitor.resendInterval,
      upsideDown: monitor.upsideDown,
      notificationIDList: monitor.notificationIDList
      // tags: monitor.tags?.map((t) => t.tag_id) ?? []
    };

    switch (monitor.type) {
      case 'http':
        return {
          ...baseValues,
          type: 'http',
          url: monitor.url,
          method: monitor.method as HttpMonitorFormData['method'],
          headers: monitor.headers ?? undefined,
          body: monitor.body ?? undefined,
          httpBodyEncoding: monitor.httpBodyEncoding,
          ignoreTls: monitor.ignoreTls,
          maxredirects: monitor.maxredirects,
          proxyId: monitor.proxyId ?? undefined,
          authMethod: monitor.authMethod ?? undefined,
          basic_auth_user: monitor.basic_auth_user ?? undefined,
          basic_auth_pass: monitor.basic_auth_pass ?? undefined
        };

      case 'ping':
        return {
          ...baseValues,
          type: 'ping',
          hostname: monitor.hostname ?? '',
          packetSize: monitor.packetSize
        };

      case 'port':
        return {
          ...baseValues,
          type: 'port',
          hostname: monitor.hostname ?? '',
          port: monitor.port ?? 80
        };

      default:
        return {
          ...baseValues,
          type: 'http'
        };
    }
  };

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        name="EditMonitor"
        options={{
          title: isNewMonitor
            ? 'Create Monitor'
            : `Edit Monitor: ${monitor?.name}`
        }}
      />
      <MonitorForm onSubmit={handleSubmit} defaultValues={getDefaultValues()} />
    </View>
  );
}
