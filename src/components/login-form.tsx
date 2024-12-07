import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { Keyboard, KeyboardAvoidingView, Platform,TouchableWithoutFeedback } from 'react-native';
import * as z from 'zod';

import { Button, ControlledInput, Text, View } from '@/components/ui';

const schema = z.object({
  host: z
    .string({
      required_error: 'Host URL is required',
    })
    .url('Invalid URL format'),
  username: z
    .string({
      required_error: 'Username is required',
    })
    .min(1, 'Username is required'),
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(1, 'Password is required'),
});

export type FormType = z.infer<typeof schema>;

export type LoginFormProps = {
  onSubmit?: SubmitHandler<FormType>;
};

export const LoginForm = ({ onSubmit = () => {} }: LoginFormProps) => {
  const { handleSubmit, control } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="bg-background flex-1 justify-center px-6">
          <View className="mb-8 items-center justify-center space-y-4">
            <Text
              testID="form-title"
              className="text-4xl font-bold text-black dark:text-white"
            >
              Uptime Kuma
            </Text>

            <Text className="max-w-[280px] text-center text-black/40 dark:text-white/80">
              Enter your Uptime Kuma server details to connect
            </Text>
          </View>

          <View className="space-y-4">
            <ControlledInput
              testID="host-input"
              control={control}
              name="host"
              label="Host URL"
              placeholder="https://your-uptime-kuma.com"
            />

            <ControlledInput
              testID="username-input"
              control={control}
              name="username"
              label="Username"
            />

            <ControlledInput
              testID="password-input"
              control={control}
              name="password"
              label="Password"
              secureTextEntry={true}
            />

            <Button
              testID="login-button"
              onPress={handleSubmit(onSubmit)}
              className="mt-4"
              variant="default"
            >
              <Text>Connect</Text>
            </Button>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};
