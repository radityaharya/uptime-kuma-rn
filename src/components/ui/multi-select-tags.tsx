import React from 'react';
import { type Control, Controller } from 'react-hook-form';
import { TouchableOpacity, View } from 'react-native';
import { twMerge } from 'tailwind-merge';

import { Text } from '@/components/ui';
import { type Tag } from '@/schemas/monitor';

interface MultiSelectTagsProps {
  tags: Tag[];
  name: string;
  label: string;
  control: Control<any>;
  required?: boolean;
  defaultValue?: string[];
  className?: string;
}

export function MultiSelectTags({
  tags,
  name,
  label,
  control,
  required = false,
  defaultValue = [],
  className
}: MultiSelectTagsProps) {
  return (
    <Controller
      name={name}
      control={control}
      defaultValue={defaultValue}
      rules={{ required }}
      render={({ field: { value, onChange } }) => (
        <View className="mb-4">
          <View className="mb-2 flex-row justify-between">
            {label && (
              <Text className="text-base font-medium text-gray-700">
                {label}
              </Text>
            )}
            <Text className="text-sm text-gray-500">
              {value?.length || 0} selected
            </Text>
          </View>
          <View className={twMerge('flex-row flex-wrap gap-2 p-1', className)}>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag.id}
                className={twMerge(
                  'rounded-full py-1.5 px-3',
                  value?.includes(tag.id) ? 'opacity-100' : 'opacity-60'
                )}
                style={{
                  backgroundColor: tag.color
                }}
                onPress={() => {
                  const newValue = value || [];
                  const index = newValue.indexOf(tag.id);
                  if (index === -1) {
                    onChange([...newValue, tag.id]);
                  } else {
                    onChange(newValue.filter((v: number) => v !== tag.id));
                  }
                }}
              >
                <Text
                  className={twMerge(
                    'text-sm text-white',
                    value?.includes(tag.value) && 'font-bold'
                  )}
                >
                  {tag.name}
                  {tag.value && ` : ${tag.value}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    />
  );
}
