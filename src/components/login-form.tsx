import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as z from 'zod';

import { Button, ControlledInput, Text, View } from '@/components/ui';

const schema = z.object({
  name: z.string().optional(),
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email format'),
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(6, 'Password must be at least 6 characters'),
});

export type FormType = z.infer<typeof schema>;

export type LoginFormProps = {
  onSubmit?: SubmitHandler<FormType>;
};

// eslint-disable-next-line max-lines-per-function
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
      <View className="flex-1 justify-center bg-background px-6">
        <Animated.View
          entering={FadeInDown.duration(1000)}
          className="mb-8 items-center justify-center space-y-4"
        >
          <Text
            testID="form-title"
            className="text-4xl font-bold text-black dark:text-white"
          >
            Welcome Back
          </Text>

          <Text className="max-w-[280px] text-center text-black/40 dark:text-white/80">
            Welcome! 👋 Enter your credentials to access your account
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(1000).delay(200)}
          className="space-y-4"
        >
          <ControlledInput
            testID="name"
            control={control}
            name="name"
            label="Name"
            className="h-12 rounded-md text-black dark:bg-white/10 dark:text-white"
          />

          <ControlledInput
            testID="email-input"
            control={control}
            name="email"
            label="Email"
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
            <Text className="text-white">Login</Text>
          </Button>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
};
