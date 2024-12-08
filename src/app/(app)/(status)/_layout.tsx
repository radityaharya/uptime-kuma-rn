import { Stack } from 'expo-router';

import { useThemeConfig } from '@/lib/use-theme-config';

export default function StatusLayout() {
  const theme = useThemeConfig();

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'generic',
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Status Pages',
          headerBackButtonDisplayMode: 'generic',
        }}
      />
      <Stack.Screen
        name="detail"
        options={{
          title: 'Status Page',
          headerBackButtonDisplayMode: 'generic',
        }}
      />
    </Stack>
  );
}
