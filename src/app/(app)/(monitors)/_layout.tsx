import { Stack } from 'expo-router';

import { useThemeConfig } from '@/lib/use-theme-config';

export default function MonitorsLayout() {
  const theme = useThemeConfig();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackButtonDisplayMode: 'generic',
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ title: 'Monitor', headerShown: true }} />
    </Stack>
  );
}
