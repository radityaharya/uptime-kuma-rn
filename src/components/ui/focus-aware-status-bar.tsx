import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import * as React from 'react';

type Props = { hidden?: boolean };
export const FocusAwareStatusBar = ({ hidden = false }: Props) => {
  const _isFocused = useIsFocused();
  const _isHidden = hidden || !_isFocused;
  const { colorScheme } = useColorScheme();


  return <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />;
};
