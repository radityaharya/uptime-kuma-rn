import { useRouter } from 'expo-router';
import React from 'react';

import { Button,Text, View } from '@/components/ui';

export default function Onboarding() {
  const router = useRouter();

  const goToHome = () => {
    router.push('/');
  };

  return (
    <View className="bg-background flex h-full items-center justify-center">
      <Text className="text-5xl font-bold text-foreground">onboarding</Text>
      <Button onPress={goToHome}>
        <Text>Go to Home</Text>
      </Button>
    </View>
  );
}
