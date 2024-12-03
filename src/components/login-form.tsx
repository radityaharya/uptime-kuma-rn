import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={10}
    >
      <View className="bg-background flex-1 justify-center px-6">
        <Animated.View
          entering={FadeInDown.duration(1000)}
          className="mb-8 items-center justify-center space-y-4"
        >
          <Text
            testID="form-title"
            className="text-4xl font-bold text-black dark:text-white"
          >
            Uptime Kuma Login
          </Text>

          <Text className="max-w-[280px] text-center text-black/40 dark:text-white/80">
            Enter your Uptime Kuma server details to connect
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(1000).delay(200)}
          className="space-y-4"
        >
          <ControlledInput
            testID="host-input"
            control={control}
            name="host"
            label="Host URL"
            placeholder="https://your-uptime-kuma.com"
            className="h-12 rounded-md text-black dark:bg-white/10 dark:text-white"
          />

          <ControlledInput
            testID="username-input"
            control={control}
            name="username"
            label="Username"
            className="h-12 rounded-md text-black dark:bg-white/10 dark:text-white"
          />

          <ControlledInput
            testID="password-input"
            control={control}
            name="password"
            label="Password"
            secureTextEntry={true}
            className="h-12 rounded-md text-black dark:bg-white/10 dark:text-white"
          />

          <Button
            testID="login-button"
            onPress={handleSubmit(onSubmit)}
            className="mt-4"
            variant="default"
          >
            <Text className="text-white">Connect</Text>
          </Button>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
};
