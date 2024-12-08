import { Stack } from 'expo-router';

import { useThemeConfig } from '@/lib/use-theme-config';

export default function SettingsLayout() {
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
          title: 'Settings',
          headerBackButtonDisplayMode: 'generic',
        }}
      />
      <Stack.Screen
        name="debug"
        options={{ title: 'Debug', headerBackButtonDisplayMode: 'generic' }}
      />
    </Stack>
  );
}
