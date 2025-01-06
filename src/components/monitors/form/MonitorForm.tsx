import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Switch, TouchableOpacity } from 'react-native';

import { ControlledInput, Text, View } from '@/components/ui';
import { ControlledModalSelect } from '@/components/ui/modal-select';
import { MultiSelectTags } from '@/components/ui/multi-select-tags';
import { type MonitorFormData, monitorFormSchema } from '@/schemas/monitor';
import { monitorStore } from '@/store/monitorStore';

const monitorTypeOptions = [
  { label: 'HTTP(s)', value: 'http' },
  { label: 'Ping', value: 'ping' },
  { label: 'Port', value: 'port' },
  { label: 'DNS', value: 'dns' },
  { label: 'Docker', value: 'docker' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgres' },
  { label: 'MQTT', value: 'mqtt' },
  { label: 'Group', value: 'group' }
];

const httpMethodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'HEAD', value: 'HEAD' },
  { label: 'OPTIONS', value: 'OPTIONS' },
  { label: 'PATCH', value: 'PATCH' }
];

export const MonitorForm = ({
  onSubmit,
  defaultValues
}: {
  onSubmit: (data: MonitorFormData) => void;
  defaultValues: Partial<MonitorFormData> | undefined;
}) => {
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<MonitorFormData>({
    resolver: zodResolver(monitorFormSchema),
    defaultValues
  });

  const tags = monitorStore.getTags();

  useEffect(() => {
    if (defaultValues) {
      console.log(
        'Resetting form with default values:',
        JSON.stringify(defaultValues, null, 2)
      );
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  const onSubmitForm = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  });

  const handleDisabledPress = () => {
    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.entries(errors)
        .map(([field, error]) => `${field}: ${error.message}`)
        .join('\n');
      Alert.alert('Validation Errors', errorMessages);
    }
  };

  const monitorType = watch('type');

  const renderTypeSpecificFields = () => {
    switch (monitorType) {
      case 'http':
        return (
          <>
            <ControlledInput
              control={control}
              name="url"
              label="URL"
              placeholder="https://"
              keyboardType="url"
            />
            <View className="mb-4">
              <ControlledModalSelect
                control={control}
                name="method"
                options={httpMethodOptions}
                label="Method"
              />
            </View>
          </>
        );

      case 'ping':
        return (
          <ControlledInput
            control={control}
            name="hostname"
            label="Hostname"
            placeholder="example.com"
          />
        );

      case 'port':
        return (
          <>
            <ControlledInput
              control={control}
              name="hostname"
              label="Hostname"
              placeholder="example.com"
            />
            <ControlledInput
              control={control}
              name="port"
              label="Port"
              keyboardType="numeric"
              placeholder="80"
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <View className="p-4 pb-20">
      <View className="mb-4">
        <ControlledModalSelect
          control={control}
          name="type"
          options={monitorTypeOptions}
          label="Monitor Type"
        />
      </View>

      <ControlledInput
        control={control}
        name="name"
        label="Name"
        placeholder="Monitor name"
      />

      {renderTypeSpecificFields()}

      <ControlledInput
        control={control}
        name="interval"
        label="Check Interval (seconds)"
        keyboardType="numeric"
        placeholder="60"
      />

      <ControlledInput
        control={control}
        name="timeout"
        label="Timeout (seconds)"
        keyboardType="numeric"
        placeholder="48"
      />

      <ControlledInput
        control={control}
        name="maxretries"
        label="Max Retries"
        keyboardType="numeric"
        placeholder="0"
      />

      <ControlledInput
        control={control}
        name="retryInterval"
        label="Retry Interval (seconds)"
        keyboardType="numeric"
        placeholder="60"
      />

      <Controller
        control={control}
        name="upsideDown"
        render={({ field: { onChange, value } }) => (
          <View className="mb-4 flex-row items-center">
            <Text className="mr-2 text-base font-bold">Upside Down Mode</Text>
            <Switch value={value} onValueChange={onChange} />
          </View>
        )}
      />

      <MultiSelectTags control={control} name="tags" label="Tags" tags={tags} />

      <TouchableOpacity
        className="items-center rounded-lg bg-green-500 p-4 disabled:opacity-50"
        onPress={
          isSubmitting || Object.keys(errors).length > 0
            ? handleDisabledPress
            : onSubmitForm
        }
        disabled={isSubmitting}
      >
        <Text className="text-base font-bold text-white">
          {isSubmitting ? 'Saving...' : 'Save Monitor'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
