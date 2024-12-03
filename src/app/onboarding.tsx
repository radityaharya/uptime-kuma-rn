import React from 'react';
import { Text, View, Button } from '@/components/ui';
import { useRouter } from 'expo-router';

export default function Onboarding() {
  const router = useRouter();

  const goToHome = () => {
    router.push('/');
  };

  return (
    <View className="flex h-full items-center justify-center bg-background">
      <Text className="text-5xl font-bold text-foreground">onboarding</Text>
      <Button onPress={goToHome}>
        <Text>Go to Home</Text>
      </Button>
    </View>
  );
}
