import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { Pressable, ScrollView } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text, View } from './';
import { Modal, useModal } from './modal';

const selectTv = tv({
  slots: {
    container: '',
    label: 'mb-1.5 text-base font-medium text-foreground',
    trigger:
      'bg-background flex-row items-center justify-between rounded-md border border-input px-3 py-2.5',
    option: 'border-b border-input px-4 py-3.5'
  },
  variants: {
    error: {
      true: {
        trigger: 'border-danger-600',
        label: 'text-danger-600'
      }
    },
    selected: {
      true: {
        option: 'bg-primary/5'
      }
    }
  }
});

interface ModalSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  label: string;
  error?: string;
}

export const ModalSelect = ({
  value,
  onChange,
  options,
  label,
  error
}: ModalSelectProps) => {
  const { ref, present, dismiss } = useModal();
  const styles = selectTv({ error: Boolean(error) });

  return (
    <View className={styles.container()}>
      <Text className={styles.label()}>{label}</Text>
      <Pressable onPress={present} className={styles.trigger()}>
        <Text className="text-base text-foreground">
          {options.find((opt) => opt.value === value)?.label || 'Select...'}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          className="text-foreground/70"
        />
      </Pressable>

      <Modal ref={ref} snapPoints={['45%']}>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onChange(option.value);
                dismiss();
              }}
              className={selectTv({
                selected: value === option.value
              }).option()}
            >
              <Text
                className={`text-base text-foreground ${
                  value === option.value ? 'font-medium' : ''
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Modal>

      {error && <Text className="mt-1 text-sm text-danger-600">{error}</Text>}
    </View>
  );
};

interface ControlledModalSelectProps<T extends FieldValues>
  extends Omit<ModalSelectProps, 'value' | 'onChange' | 'error'> {
  name: Path<T>;
  control: Control<T>;
}

export function ControlledModalSelect<T extends FieldValues>({
  name,
  control,
  options,
  label
}: ControlledModalSelectProps<T>) {
  const {
    field,
    fieldState: { error }
  } = useController({
    name,
    control
  });

  return (
    <ModalSelect
      value={field.value}
      onChange={field.onChange}
      options={options}
      label={label}
      error={error?.message}
    />
  );
}
